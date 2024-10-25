import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { searchUpFileTree } from './searchUpFileTree.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedRootDir = null;

function getRootDir() {
  if (cachedRootDir) {
    return cachedRootDir;
  }

  const rootDir = searchUpFileTree(__dirname, (currPath) => {
    return fs.existsSync(path.join(currPath, '.git'));
  });
  if (rootDir == null) {
    throw new Error('Failed to find rootDir.');
  }
  cachedRootDir = path.resolve(rootDir);
  return rootDir;
}

export { getRootDir };
