import { posix } from 'node:path';
import { parse } from 'smol-toml';

const commandPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.+-]{0,63}$/;
const packagePattern = /^(?:@[a-z0-9_.-]+\/)?[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
const plain = value => typeof value === 'string' && value.length >= 12 && value.length <= 350 && !/[<>\x00-\x1f]/.test(value);
const quote = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function repoFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const repo = `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
    return /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : null;
  } catch { return null; }
}

export function validateConfig(config) {
  for (const key of ['minStars', 'minHomebrew30d', 'maxPerDay', 'maxCandidates', 'recheckDays']) {
    if (!Number.isSafeInteger(config[key]) || config[key] < 1) throw new Error(`Invalid discovery ${key}`);
  }
  if (config.maxPerDay > 50 || config.maxCandidates > 100) throw new Error('Discovery limits exceed supported bounds');
  if (!Array.isArray(config.queries) || !config.queries.length || config.queries.length > 5 || config.queries.some(q => typeof q !== 'string' || !q.trim())) throw new Error('Invalid discovery queries');
  return config;
}

/** Extract declarations, never execute package code or infer a bin from a repo name. */
export function packageCommands(path, text, paths) {
  const dir = posix.dirname(path);
  const exists = relative => typeof relative === 'string' && !relative.startsWith('/') && !relative.split('/').includes('..') && paths.has(posix.join(dir, relative));
  let data;
  try { data = path.endsWith('.json') ? JSON.parse(text) : parse(text); } catch { return []; }
  const commands = [];
  const add = (command, packageName, ecosystem, declaration, target) => {
    if (typeof command === 'string' && commandPattern.test(command) && typeof packageName === 'string' && packagePattern.test(packageName)) {
      commands.push({ command, packageName, ecosystem, declaration, target: target ?? null });
    }
  };
  if (path.endsWith('package.json') && !data.private && typeof data.name === 'string') {
    const bins = typeof data.bin === 'string' ? { [data.name.split('/').at(-1)]: data.bin } : data.bin;
    if (bins && typeof bins === 'object' && !Array.isArray(bins)) for (const [command, target] of Object.entries(bins)) {
      if (exists(target)) add(command, data.name, 'npm', JSON.stringify({ bin: { [command]: target } }), posix.join(dir, target));
    }
  }
  if (path.endsWith('pyproject.toml')) {
    for (const [scripts, name] of [[data.project?.scripts, data.project?.name], [data.tool?.poetry?.scripts, data.tool?.poetry?.name]]) {
      if (!scripts || typeof scripts !== 'object') continue;
      for (const [command, entry] of Object.entries(scripts)) {
        if (typeof entry !== 'string' || !/^[\w.]+:[\w.]+$/.test(entry)) continue;
        const module = entry.split(':')[0].replaceAll('.', '/');
        const target = [`${module}.py`, `${module}/__init__.py`, `src/${module}.py`, `src/${module}/__init__.py`].find(exists);
        if (target) add(command, name, 'python', `${command} = ${JSON.stringify(entry)}`, posix.join(dir, target));
      }
    }
  }
  if (path.endsWith('Cargo.toml') && data.package?.publish !== false) {
    for (const bin of Array.isArray(data.bin) ? data.bin : []) {
      if (bin['required-features']?.length) continue;
      const target = bin.path ?? [`src/bin/${bin.name}.rs`, `src/bin/${bin.name}/main.rs`, ...(bin.name === data.package?.name ? ['src/main.rs'] : [])].find(exists);
      if (exists(target)) add(bin.name, data.package?.name, 'cargo', `[[bin]] name=${JSON.stringify(bin.name)} path=${JSON.stringify(target)}`, posix.join(dir, target));
    }
    if (data.package?.autobins !== false && exists('src/main.rs') && !commands.some(c => c.target === posix.join(dir, 'src/main.rs'))) {
      add(data.package.name, data.package.name, 'cargo', `package.name=${JSON.stringify(data.package.name)}; src/main.rs`, posix.join(dir, 'src/main.rs'));
    }
  }
  return commands;
}

/** Only literal bin.install declarations qualify; Ruby formula code is never evaluated. */
export function formulaCommands(text, formula) {
  if (!/^[a-z0-9][a-z0-9+_.-]*$/.test(formula)) return [];
  const commands = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*bin\.install\s+["']([\w./+-]+)["'](?:\s*=>\s*["']([\w.+-]+)["'])?\s*(?:#.*)?$/);
    if (!match || match[1].split('/').includes('..')) continue;
    const command = match[2] ?? posix.basename(match[1]);
    if (commandPattern.test(command)) commands.push({ command, packageName: formula, ecosystem: 'brew', declaration: line.trim(), target: null });
  }
  return commands;
}

const categoryRules = [
  ['Agents & models', /\b(agent|llm|language model|inference|chatbot)\b/i],
  ['Browser automation', /\b(browser automation|headless browser|web scraping|scraper)\b/i],
  ['Git & collaboration', /\b(git|github|gitlab|pull request)\b/i],
  ['Code search', /\b(code search|grep|search.*code|code.*search)\b/i],
  ['Data & APIs', /\b(json|yaml|csv|sql|database|http|api|data processing)\b/i],
  ['Cloud & deployment', /\b(kubernetes|cloud|deploy|deployment|container|docker)\b/i],
  ['Packages & environments', /\b(package manager|packages|environment|dependencies|build tool)\b/i],
  ['Testing & quality', /\b(test|testing|linter|lint|formatter|benchmark|debugger)\b/i],
  ['Files & documents', /\b(file|files|directory|directories|document|pdf|markdown|archive|backup)\b/i],
  ['Productivity & communication', /\b(email|calendar|task manager|productivity|chat|messaging)\b/i],
  ['Security & secrets', /\b(security|encrypt|encryption|password|secrets|vulnerability)\b/i],
];

export function documentedCommand(declaration, docs) {
  const name = quote(declaration.packageName);
  const patterns = {
    npm: new RegExp(`\\b(?:npm (?:install|i)|pnpm (?:add|install)|yarn global add)\\s+(?:--global\\s+|-g\\s+)?${name}(?=\\s|@|$)`),
    python: new RegExp(`\\b(?:pip3? install|pipx install|uv tool install)\\s+${name}(?=\\s|[=\\[]|$)`),
    cargo: new RegExp(`\\bcargo install\\s+${name}(?=\\s|$)`),
    brew: new RegExp(`\\bbrew install\\s+${name}(?=\\s|$)`),
  };
  let install = null;
  let usage = null;
  for (const doc of docs) {
    for (const line of doc.text.split('\n')) {
      if (!install && patterns[declaration.ecosystem]?.test(line.replaceAll('`', ' '))) install = { url: doc.url, snippet: line.trim().slice(0, 350) };
    }
    // Restrict examples to code blocks/inline code, with a literal executable.
    const blocks = [...doc.text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(m => m[1]);
    blocks.push(...[...doc.text.matchAll(/`([^`\n]+)`/g)].map(m => m[1]));
    for (const block of blocks) for (const raw of block.split('\n')) {
      const line = raw.trim().replace(/^\$\s+/, '');
      if (!line.startsWith(`${declaration.command} `) || line.length > 180) continue;
      // A help/version response or GUI launch is not evidence of terminal functionality.
      const args = line.slice(declaration.command.length).trim();
      if (/^(?:--help|-h|help|--version|-V|version|gui|desktop|login|logout|auth|configure|config|install|uninstall|upgrade|update|completion|completions|self)(?:\s|$)/i.test(args)) continue;
      if (/(?:^|\s)(?:--open|--gui|--web|--ui)(?:\s|$)/i.test(args)) continue;
      // Keep copied examples simple: no shell operators, expansions, redirects, or placeholders.
      if (!/^[\w .,:/@=+'"*?%-]+$/.test(line) || /\b(?:YOUR_|REPLACE_|TOKEN|PASSWORD|SECRET)/i.test(line)) continue;
      if (!usage) usage = { url: doc.url, snippet: line };
    }
  }
  return install && usage ? { install, usage } : null;
}

export function evaluateCandidate({ repo, declarations, docs, brew, config, existing, rejected = false }) {
  const hold = reason => ({ status: 'held', reason });
  if (rejected) return { status: 'rejected', reason: 'Previously rejected' };
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo.full_name) || repoFromUrl(repo.html_url)?.toLowerCase() !== repo.full_name.toLowerCase()) return hold('Invalid repository identity');
  if (existing.some(tool => tool.repo.toLowerCase() === repo.full_name.toLowerCase())) return { status: 'duplicate', reason: 'Already listed' };
  if (repo.archived || repo.disabled || repo.fork || repo.private || repo.is_template) return hold('Archived, disabled, forked, private, or template repository');
  const starPass = Number.isSafeInteger(repo.stargazers_count) && repo.stargazers_count >= config.minStars;
  const brewPass = brew?.repo?.toLowerCase() === repo.full_name.toLowerCase() && Number.isSafeInteger(brew.count) && brew.count >= config.minHomebrew30d;
  if (!starPass && !brewPass) return hold('Below adoption thresholds');
  const description = repo.description;
  if (!plain(description) || !/\b(cli|command[- ]line|terminal|console)\b/i.test(description)) return hold('Description does not clearly identify a CLI');
  if (/\b(gui|graphical|desktop|electron|launcher)\b/i.test(description)) return hold('Possible graphical application or launcher');
  const category = categoryRules.find(([, pattern]) => pattern.test(description))?.[0];
  if (!category) return hold('Terminal use case needs classification');
  for (const declaration of declarations) {
    const documented = documentedCommand(declaration, docs);
    if (!documented) continue;
    const slug = repo.full_name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
    if (existing.some(tool => tool.slug === slug)) return hold('Slug collision');
    return {
      status: 'accepted', reason: starPass ? 'GitHub stars' : 'Homebrew install-on-request',
      entry: {
        slug, name: repo.name, repo: repo.full_name, category,
        command: declaration.command, useCase: description, description,
        agentUse: `Invoke ${declaration.command} from a shell for the documented use case: ${description}`,
        features: ['Command-line interface'], example: documented.usage.snippet,
        website: repo.html_url, docs: documented.usage.url,
      },
      evidence: {
        package: { url: declaration.url, snippet: declaration.declaration, target: declaration.target },
        installation: documented.install, usage: documented.usage,
        description: { url: `https://api.github.com/repos/${repo.full_name}`, snippet: description },
        adoption: { stars: repo.stargazers_count, githubSource: repo.html_url, homebrew: brew ?? null },
      },
    };
  }
  return hold('No matching package declaration, installation, and useful command example');
}

export function remainingToday(state, now, limit) {
  const date = now.slice(0, 10);
  return Math.max(0, limit - Object.values(state.candidates).filter(c => c.acceptedAt?.slice(0, 10) === date).length);
}
