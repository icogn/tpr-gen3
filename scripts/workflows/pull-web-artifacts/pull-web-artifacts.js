const core = require('@actions/core');

const allowedWebBranches = input('allowedWebBranches', '');
const artifactInfo = input('artifactInfo', '');

console.log(`allowedWebBranches:${allowedWebBranches}`);

const parsedArtifactInfo = JSON.parse(artifactInfo);
console.log(parsedArtifactInfo);

function input(name, def) {
  let inp = core.getInput(name).trim();
  if (inp === '' || inp.toLowerCase() === 'false') {
    return def;
  }

  return inp;
}
