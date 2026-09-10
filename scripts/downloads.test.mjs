import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { refreshDownloadEntry, periodCounts, mappingIdentity, verifyPackage, validateDownloadMappings } from '../src/lib/downloads.mjs';
import { filterTools } from '../src/lib/filter.mjs';
const now = '2026-09-10T03:00:00.000Z';
const repo = 'sample/query';
const mapping = { repo, npm: { package: '@sample/query' }, pypi: { package: 'query-cli' }, github: { assetPattern: '^query-linux-[a-z0-9]+\\.tar\\.gz$', evidence: `https://github.com/${repo}/releases/latest` } };
const metadata = { name: '@sample/query', repository: { url: `git+https://github.com/${repo}.git` }, bin: { query: 'cli.js' } };
const dates = (n, value = 2) => Object.fromEntries(Array.from({length:n}, (_,i) => [new Date(Date.parse('2026-09-09')-i*86400000).toISOString().slice(0,10),value]));
const npm = daily => ({ package: '@sample/query', start: Object.keys(daily).sort()[0], end: Object.keys(daily).sort().at(-1), downloads: Object.entries(daily).map(([day,downloads])=>({day,downloads})) });
const response = (data, headers) => new Response(JSON.stringify(data), { headers });
const npmFetch = daily => async url => response(url.includes('registry.npmjs.org') ? metadata : npm(daily));
const asset = (id, name = 'query-linux-amd64.tar.gz', downloads = 10) => ({id,name,download_count:downloads,browser_download_url:`https://github.com/${repo}/releases/download/v1/${name}`});
const release = (assets, extra={}) => ({id:1, html_url:`https://github.com/${repo}/releases/tag/v1`, draft:false, prerelease:false, assets,...extra});

test('Package windows require complete days and preserve real zero counts', () => {
  assert.deepEqual(periodCounts(dates(365),'2026-09-09'), {'30d':60,'90d':180,'365d':730});
  assert.deepEqual(periodCounts(dates(180,0),'2026-09-09'), {'30d':0,'90d':0,'365d':null});
  const gap=dates(365); delete gap['2026-09-01'];
  assert.deepEqual(periodCounts(gap,'2026-09-09'), {'30d':null,'90d':null,'365d':null});
});

test('Registry identities reject similarly named repos and packages without executables', () => {
  verifyPackage('npm',mapping,metadata);
  for(const value of [{...metadata,name:'query'},{...metadata,bin:null},{...metadata,repository:{url:'https://github.com/sample/query-other'}}]) assert.throws(()=>verifyPackage('npm',mapping,value));
  verifyPackage('pypi',mapping,{info:{name:'query_cli',project_urls:{Source:`https://github.com/${repo}`}}});
  assert.throws(()=>verifyPackage('pypi',mapping,{info:{name:'query-cli',home_page:'https://github.com/sample/query-other'}}));
});

test('npm refresh computes all windows and does not send GitHub tokens to registries', async () => {
  const fetcher=async (url,options) => { assert.equal(options.headers.Authorization,undefined); return npmFetch(dates(365))(url); };
  const result=await refreshDownloadEntry('npm',mapping,null,null,fetcher,now,'private-token');
  assert.equal(result.error,null); assert.equal(result.snapshot.counts['365d'],730);
  assert.equal(result.snapshot.end,'2026-09-09');
});

test('PyPI excludes mirror rows and accumulates historical days for annual windows', async () => {
  const retained={identity:mappingIdentity('pypi',mapping),daily:dates(365)};
  const fetcher=async url=>response(url.includes('pypistats.org') ? {package:'query_cli',type:'overall_downloads',data:[...Object.entries(dates(180)).map(([date,downloads])=>({date,downloads,category:'without_mirrors'})),{date:'2026-09-09',downloads:100000,category:'with_mirrors'}]} : {info:{name:'query-cli',project_urls:{Source:`https://github.com/${repo}`}}});
  const initial=await refreshDownloadEntry('pypi',mapping,null,null,fetcher,now);
  assert.equal(initial.snapshot.counts['30d'],60); assert.equal(initial.snapshot.counts['365d'],null);
  const accumulated=await refreshDownloadEntry('pypi',mapping,null,retained,fetcher,now);
  assert.equal(accumulated.snapshot.counts['365d'],730);
});

test('Source failures preserve successful counts and timestamps; mapping changes discard saved data', async () => {
  const previous=await refreshDownloadEntry('npm',mapping,null,null,npmFetch(dates(365)),now);
  for (const fetcher of [async()=>new Response('',{status:429}),async()=>{throw Error('timeout');},async()=>response({}),npmFetch(dates(365,-1)),npmFetch({'2025-01-01':3})]) {
    const result=await refreshDownloadEntry('npm',mapping,previous.snapshot,previous.history,fetcher,'2026-09-11T03:00:00Z');
    assert.ok(result.error); assert.equal(result.snapshot.status,'error');
    assert.equal(result.snapshot.checkedAt,now); assert.deepEqual(result.snapshot.counts,previous.snapshot.counts);
    assert.deepEqual(result.history,previous.history);
  }
  const changed=await refreshDownloadEntry('npm',{...mapping,npm:{package:'different'}},previous.snapshot,previous.history,async()=>new Response('',{status:503}),now);
  assert.equal(changed.snapshot.checkedAt,null); assert.equal(changed.snapshot.counts['30d'],null); assert.equal(changed.history,null);
});

test('New gaps replace older daily values and invalid dates or duplicates fail safely', async () => {
  const previous=await refreshDownloadEntry('npm',mapping,null,null,npmFetch(dates(365)),now);
  const missing=dates(365); delete missing['2026-09-01'];
  const result=await refreshDownloadEntry('npm',mapping,previous.snapshot,previous.history,npmFetch(missing),now);
  assert.equal(result.snapshot.counts['30d'],null);
  for(const row of [{day:'2026-02-30',downloads:1},{day:'2026-09-10',downloads:1},{day:'2026-09-09',downloads:1},{day:'2026-08-01',downloads:Number.MAX_SAFE_INTEGER}]) {
    const data=npm(dates(30));data.downloads.push(row);
    const result=await refreshDownloadEntry('npm',mapping,null,null,async url=>response(url.includes('registry.npmjs.org')?metadata:data),now);
    assert.ok(result.error);
  }
});

test('GitHub paginates releases, counts only mapped binaries, and labels cumulative totals', async () => {
  const calls=[];
  const result=await refreshDownloadEntry('github',mapping,null,null,async (url,options)=>{
    calls.push(url); assert.equal(options.headers.Authorization,'Bearer token');
    if(url.endsWith('page=1'))return response([release([asset(1),asset(2,'query-source.tar.gz',1000),asset(3,'query-linux-amd64.tar.gz.sha256',1000)]),release([asset(4)],{prerelease:true}),release([asset(5)],{draft:true})],{Link:'<https://api.github.com/next>; rel="next"'});
    return response([release([asset(6,'query-linux-arm64.tar.gz',5)],{id:2})]);
  },now,'token');
  assert.equal(result.error,null);assert.equal(calls.length,2);assert.equal(result.snapshot.total,15);assert.equal(result.snapshot.assetCount,2);
  assert.equal(result.snapshot.counts['30d'],null);assert.equal(result.history.observations['2026-09-10'],15);
});

test('GitHub partial pagination, duplicate assets, unrelated URLs and absent binaries fail instead of publishing partial totals', async () => {
  for(const fetcher of [
    async url=> url.endsWith('page=1')?response([release([asset(1)])],{Link:'<https://api.github.com/next>; rel="next"'}):new Response('',{status:500}),
    async()=>response([release([asset(1),asset(1)])]),
    async()=>response([release([{...asset(1),browser_download_url:'https://github.com/other/project/releases/download/x/a'}])]),
    async()=>response([release([asset(1,'source.tar.gz')])]),
  ]) {
    const result=await refreshDownloadEntry('github',mapping,null,null,fetcher,now);assert.ok(result.error);assert.equal(result.snapshot.total,null);
  }
});

test('GitHub embedded-asset pagination boundary loads the full asset list', async () => {
  const calls=[];
  const result=await refreshDownloadEntry('github',mapping,null,null,async url=>{
    calls.push(url);
    if(url.includes('/1/assets'))return response([asset(500)]);
    return response([release(Array.from({length:100},(_,i)=>asset(i+1)))]);
  },now);
  assert.equal(result.error,null);assert.equal(result.snapshot.assetCount,1);assert.equal(calls.length,2);
});

test('Each source sorts independently, with unavailable below measured zero', () => {
  const items=[{name:'Missing'},{name:'Zero',downloads:{npm:{counts:{'30d':0}},github:{total:100}}},{name:'Popular',downloads:{npm:{counts:{'30d':20}},github:{total:1}}}];
  assert.deepEqual(filterTools(items,{sort:'npm'}).map(t=>t.name),['Popular','Zero','Missing']);
  assert.deepEqual(filterTools(items,{sort:'github'}).map(t=>t.name),['Zero','Popular','Missing']);
});

test('Checked-in mappings and snapshots remain attached to catalog repositories', async () => {
  const read=async name=>JSON.parse(await readFile(new URL(`../src/data/${name}.json`,import.meta.url)));
  const catalog=await read('catalog');const mappings=await read('download-mappings');const snapshots=await read('downloads');
  validateDownloadMappings(catalog,mappings);
  for(const [slug,mapping] of Object.entries(mappings))for(const source of ['npm','pypi','github'].filter(source=>mapping[source])) {
    const snapshot=snapshots[slug]?.[source];assert.ok(snapshot,`${slug}/${source}`);
    assert.equal(snapshot.identity,mappingIdentity(source,mapping));
    assert.equal(snapshot.repo,mapping.repo);
    for(const value of [...Object.values(snapshot.counts),snapshot.total])assert.ok(value===null||(Number.isSafeInteger(value)&&value>=0));
  }
});
