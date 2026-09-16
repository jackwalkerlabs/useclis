import { writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
// Downloaded bytes never overwrite the last-good file until the write completes.
export async function replaceFile(file, bytes, io = { writeFile, rename, rm }) {
  const temporary = new URL(`${file.href}.tmp-${randomUUID()}`);
  try {
    await io.writeFile(temporary, bytes, { flag: 'wx' });
    await io.rename(temporary, file);
  } finally { await io.rm(temporary, { force: true }); }
}
