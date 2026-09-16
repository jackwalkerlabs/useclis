import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { replaceFile } from './lib/atomic-file.mjs';
test('Failed partial writes preserve the previous logo and clean temporary files', async()=>{
 const root=await fs.mkdtemp(`${tmpdir()}/useclis-logo-`);
 const file=pathToFileURL(`${root}/logo.png`);
 try {
  await fs.writeFile(file,'last-good');
  await assert.rejects(replaceFile(file,'new',{...fs,writeFile:async temporary=>{await fs.writeFile(temporary,'partial');throw new Error('disk full');}}),/disk full/);
  assert.equal(await fs.readFile(file,'utf8'),'last-good');
  assert.deepEqual(await fs.readdir(root),['logo.png']);
  await replaceFile(file,'complete');
  assert.equal(await fs.readFile(file,'utf8'),'complete');
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
