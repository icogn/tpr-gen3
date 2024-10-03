const fs = require('fs-extra');
const core = require('@actions/core');
const { match } = require('path-to-regexp');

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
  const branchConfig = fs.readJsonSync('./config_branch/config_branch.json');

  const artifactUrl = parsedArtifactInfo['web-zip-url']['ubuntu-latest'];

  const fn = match('/:owner/:repo/actions/runs/:run_id/artifacts/:artifact_id');

  try {
    const url = new URL(artifactUrl);

    if (url.origin !== 'https://github.com') {
      throw new Error(
        `Origin must be https://github.com, but was '${url.origin}'.`
      );
    }

    const obj = fn(url.pathname);
    console.log('obj');
    console.log(obj);
  } catch (e) {
    console.error(e);
    throw e;
  }

  // // print files in checked out config_branch branch.
  // console.log('reading dir `.`');
  // fs.readdirSync('.').forEach((file) => {
  //   console.log(file);
  // });

  // console.log('reading dir `config_branch`');
  // fs.readdirSync('./config_branch').forEach((file) => {
  //   console.log(file);
  // });
}

main();
