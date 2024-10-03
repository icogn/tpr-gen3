const fs = require('node:fs');
const core = require('@actions/core');

// const allowedWebBranches = input('allowedWebBranches', '');
// const artifactInfo = input('artifactInfo', '');

// console.log(`allowedWebBranches:${allowedWebBranches}`);

// const parsedArtifactInfo = JSON.parse(artifactInfo);
// console.log(parsedArtifactInfo);
const parsedArtifactInfo = {
  'web-zip-sig-url': {
    'ubuntu-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11154759297/artifacts/2008941732',
    'windows-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11154759297/artifacts/2008942833',
  },
  'web-zip-url': {
    'ubuntu-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11154759297/artifacts/2008941732',
    'windows-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11154759297/artifacts/2008942833',
  },
};

function input(name, def) {
  let inp = core.getInput(name).trim();
  if (inp === '' || inp.toLowerCase() === 'false') {
    return def;
  }

  return inp;
}

function main() {
  // print files in checked out config_branch branch.
  console.log('reading dir `.`');
  fs.readdirSync('.').forEach((file) => {
    console.log(file);
  });

  console.log('reading dir `config_branch`');
  fs.readdirSync('./config_branch').forEach((file) => {
    console.log(file);
  });
}

main();
