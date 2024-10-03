const fs = require('fs-extra');
const artifactClient = require('@actions/artifact').default;
const core = require('@actions/core');
const { match } = require('path-to-regexp');

// const allowedWebBranches = input('allowedWebBranches', '');
// const artifactInfo = input('artifactInfo', '');

// console.log(`allowedWebBranches:${allowedWebBranches}`);

const parsedArtifactInfoIn = JSON.parse(artifactInfo);
console.log('parsedArtifactInfoIn');
console.log(parsedArtifactInfoIn);

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

// This is the thing we need to send to the target workflow.
const desiredOutputConfig = {
  artifacts: {
    'x86_64-pc-windows-msvc': {
      name: 'asdf-windows-latest',
      artifactUrl:
        'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009161024',
      signature:
        'pvWamXR38lWQp9mNPhy4TRgtFHaxSaDXlOW1qluW5eWVh7J0bV3FwK4O8arxqPQ9EqyZSgbWezXLB7WT9is2DA3Nx+akCCCCpdCDd461OKdsv5m9ZGvYv/OIACWIGOjnts7kDDrYZlxCHx6yf1ODfxMooTbQhPqBC+ORiL30YDxc8CrDv/1Ds3dsr9vvqxn7Ws1Hxp8nFGOYagJluexz75cs0pFGus4Uamt6FBBVkumbub073dBjO5i03dQ3AMHBfeErwCeFDH9KKPJk6VGzQ7KobV/z3sVgnNCFH44hwtkdOg8YW9Fxz7xa7Z4NYSR4RalhgAGEI8HlPD2khiKsnBs3bi6w8F1f+qY7GrJXwNlqHgDV1b8VI6aStAI2rhi4HJN4c89qNxjB+6y4hUoZApKim5e6H/UywhnN6Mjpe5/UqSuYInfeDNwYIt4ymO7C0NC7AUR703K1uluEtAoep7omwpBZfjZHFmC0GNjEfeQzN6QJ+U8vd6VeYmLLPrsIQoK3iYAe7HGAOpZa4fA72mP9yI0YqieKQN06TxXYsQaaOlynJ8OYWR2LG95hNdXqOcDiR5APLTE/hrLbTQ+9eLXi10yKuhtdKzs7/td1pgkawRDuBDycPDNzNnKtkw7G79S0vQBEWZ/KqoMoTds/iRbQ7+RB3s+WcYEWzM4AC9Y=',
    },
    'x86_64-unknown-linux-gnu': {
      name: 'asdf-ubuntu-latest',
      artifactUrl:
        'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009160000',
      signature:
        'OcLUmY+dgSmeBOYmDBZ/mljwXTLzJUlHztm7C93EUvRpn9iWP+7d8dOIRAZ7NWek+OVJY9csCdxKtMepLtLnkIYplg/cVeYlA+I9XjkxhiOLpvZrVR6MfAesi95JkXUnF4lC6vcF+wcNptw1tkrkk0c4VD5GQE8PuBUk8d6Zv/aoJVsS+wcWsYPXIWhOZ9GtwxfhvrjSwvuRoxAX1i86s+3ankXb+D9USejlZXcDW6gxdzIljCc+ZY9/aLinctMjvFJ4wXnNPyGypjq6et71Yuw69eZvi6YLMqXLj8bOaE5yOgrt8WK6BnaF5GvePxE5dB5pcV1krc+01i6ZRvy6iXGP8IliYYQnuX7NbwhYLwj5rW9/UlS0BhJ7QL82ZS1ZqbdCt0/XsScD6BNPmnUuoPzkJefhb+h3AIJCFHcLVWsgJGMMJfXKVFbaNjwnNtmnNgyvdNawKlQ3ZbTxYoMkAPorclC5a7Sk65WqxBRU4xUjAQ4svE0Lf0GFRWZSdl0IDmMPvykBqzLo8ygDCrSdFub+JUQOppxKXrWXtQPZeOcoszn4BTHtPMpzEdb2e8Pu/ND6hdvl934+Ln+z0wY0tPnyml3sbqCaqkKQCysf34rxmqh7YmAw1aAZ2M3NRp2yldvCk8mm8r4T9eCPlttVCxzd8u/uBmYcYc3MXoXweD0=',
    },
  },
  timestamp: '2024-10-03T04:21:02.717Z',
  signature: 'signature of rest of object stringified',
};

const a = {
  'web-zip-url': {
    'windows-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009161024',
    'ubuntu-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009160000',
  },
  'web-zip-sig-url': {
    'windows-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009161024',
    'ubuntu-latest':
      'https://github.com/icogn/tpr-gen3/actions/runs/11155612954/artifacts/2009160000',
  },
  'web-zip-sig': {
    'windows-latest': [
      'pvWamXR38lWQp9mNPhy4TRgtFHaxSaDXlOW1qluW5eWVh7J0bV3FwK4O8arxqPQ9EqyZSgbWezXLB7WT9is2DA3Nx+akCCCCpdCDd461OKdsv5m9ZGvYv/OIACWIGOjnts7kDDrYZlxCHx6yf1ODfxMooTbQhPqBC+ORiL30YDxc8CrDv/1Ds3dsr9vvqxn7Ws1Hxp8nFGOYagJluexz75cs0pFGus4Uamt6FBBVkumbub073dBjO5i03dQ3AMHBfeErwCeFDH9KKPJk6VGzQ7KobV/z3sVgnNCFH44hwtkdOg8YW9Fxz7xa7Z4NYSR4RalhgAGEI8HlPD2khiKsnBs3bi6w8F1f+qY7GrJXwNlqHgDV1b8VI6aStAI2rhi4HJN4c89qNxjB+6y4hUoZApKim5e6H/UywhnN6Mjpe5/UqSuYInfeDNwYIt4ymO7C0NC7AUR703K1uluEtAoep7omwpBZfjZHFmC0GNjEfeQzN6QJ+U8vd6VeYmLLPrsIQoK3iYAe7HGAOpZa4fA72mP9yI0YqieKQN06TxXYsQaaOlynJ8OYWR2LG95hNdXqOcDiR5APLTE/hrLbTQ+9eLXi10yKuhtdKzs7/td1pgkawRDuBDycPDNzNnKtkw7G79S0vQBEWZ/KqoMoTds/iRbQ7+RB3s+WcYEWzM4AC9Y=',
    ],
    'ubuntu-latest': [
      'OcLUmY+dgSmeBOYmDBZ/mljwXTLzJUlHztm7C93EUvRpn9iWP+7d8dOIRAZ7NWek+OVJY9csCdxKtMepLtLnkIYplg/cVeYlA+I9XjkxhiOLpvZrVR6MfAesi95JkXUnF4lC6vcF+wcNptw1tkrkk0c4VD5GQE8PuBUk8d6Zv/aoJVsS+wcWsYPXIWhOZ9GtwxfhvrjSwvuRoxAX1i86s+3ankXb+D9USejlZXcDW6gxdzIljCc+ZY9/aLinctMjvFJ4wXnNPyGypjq6et71Yuw69eZvi6YLMqXLj8bOaE5yOgrt8WK6BnaF5GvePxE5dB5pcV1krc+01i6ZRvy6iXGP8IliYYQnuX7NbwhYLwj5rW9/UlS0BhJ7QL82ZS1ZqbdCt0/XsScD6BNPmnUuoPzkJefhb+h3AIJCFHcLVWsgJGMMJfXKVFbaNjwnNtmnNgyvdNawKlQ3ZbTxYoMkAPorclC5a7Sk65WqxBRU4xUjAQ4svE0Lf0GFRWZSdl0IDmMPvykBqzLo8ygDCrSdFub+JUQOppxKXrWXtQPZeOcoszn4BTHtPMpzEdb2e8Pu/ND6hdvl934+Ln+z0wY0tPnyml3sbqCaqkKQCysf34rxmqh7YmAw1aAZ2M3NRp2yldvCk8mm8r4T9eCPlttVCxzd8u/uBmYcYc3MXoXweD0=',
    ],
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
        // workflowRunId: obj.params.run_id,
        repositoryName: obj.params.repo,
        repositoryOwner: obj.params.owner,
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

    // await artifactClient.downloadArtifact(artifact.id, {
    await artifactClient.downloadArtifact(obj.params.artifact_id, {
      ...options,
      path: 'my_download_dir',
      // isSingleArtifactDownload || inputs.mergeMultiple
      //   ? resolvedPath
      //   : path.join(resolvedPath, artifact.name),
    });

    // await artifactClient.downloadArtifact(artifact.id, {
    //   ...options,
    //   path:
    //     isSingleArtifactDownload || inputs.mergeMultiple
    //       ? resolvedPath
    //       : path.join(resolvedPath, artifact.name),
    // });
  } catch (e) {
    console.error(e);
    throw e;
  }

  // print files in checked out config_branch branch.
  console.log('reading my_download_dir');
  fs.readdirSync('./my_download_dir').forEach((file) => {
    console.log(file);
  });

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
