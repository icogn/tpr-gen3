const fs = require('fs-extra');
const artifactClient = require('@actions/artifact');
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

async function run() {
  console.log('artifactClient');
  console.log(artifactClient);

  const inputs = {
    // name: core.getInput(Inputs.Name, { required: false }),
    // path: core.getInput(Inputs.Path, { required: false }),
    token: core.getInput('github-token', { required: true }),
    // repository: core.getInput(Inputs.Repository, { required: false }),
    // runID: parseInt(core.getInput(Inputs.RunID, { required: false })),
    // pattern: core.getInput(Inputs.Pattern, { required: false }),
    // mergeMultiple: core.getBooleanInput(Inputs.MergeMultiple, {
    //   required: false,
    // }),
  };

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

    const options = {
      findBy: {
        token: inputs.token,
        // workflowRunId: inputs.runID,
        workflowRunId: obj.run_id,
        repositoryName: obj.repo,
        repositoryOwner: obj.owner,
      },
    };

    const { artifact: targetArtifact } = await artifactClient.getArtifact(
      // inputs.name,
      'asdf-ubuntu-latest',
      options
    );

    if (!targetArtifact) {
      throw new Error(`Artifact not found`);
    }

    console.log('targetArtifact');
    console.log(targetArtifact);
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

run().catch((err) => {
  core.setFailed('Failed in pull-web-artifacts.js');
});
