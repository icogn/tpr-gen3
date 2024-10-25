import path from 'node:path';

function searchUpFileTree(startDir, cb) {
  let prevPath = null;
  let currPath = startDir;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (currPath === prevPath) {
      return null;
    }

    if (cb(currPath)) {
      return currPath;
    }

    prevPath = currPath;
    currPath = path.dirname(currPath);
  }
}

export { searchUpFileTree };
