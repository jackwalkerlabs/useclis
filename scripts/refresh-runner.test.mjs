import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
test('Daily runner attempts remaining providers after a thrown provider error and reports failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'useclis-daily-runner-'));
  try {
    await mkdir(join(root, 'lib'));
    await copyFile(new URL('./refresh-directory.mjs', import.meta.url), join(root, 'refresh-directory.mjs'));
    await copyFile(new URL('./lib/github-rate-limit.mjs', import.meta.url), join(root, 'lib/github-rate-limit.mjs'));
    const scripts = ['refresh-data', 'refresh-activity', 'snapshot-stars', 'refresh-homebrew', 'refresh-profiles', 'refresh-downloads'];
    for (const name of scripts) await writeFile(join(root, `${name}.mjs`), `import {appendFile} from 'node:fs/promises'; await appendFile(${JSON.stringify(join(root, 'attempts'))}, '${name}\\n'); ${name === 'refresh-data' ? "throw new Error('provider failed');" : ''}`);
    await assert.rejects(promisify(execFile)(process.execPath, [join(root, 'refresh-directory.mjs')]), { code: 1 });
    assert.deepEqual((await readFile(join(root, 'attempts'), 'utf8')).trim().split('\n'), scripts);
  } finally { await rm(root, { recursive: true, force: true }); }
});
