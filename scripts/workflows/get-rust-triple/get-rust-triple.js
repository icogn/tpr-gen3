const { execSync } = require('node:child_process');
const core = require('@actions/core');

const rustInfo = execSync('rustc -vV');
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];

if (!targetTriple) {
  core.setFailed('Failed to determine platform target triple');
} else {
  core.setOutput('triple', targetTriple);
}
