const fs = require('fs-extra');
const artifactClient = require('@actions/artifact').default;
const core = require('@actions/core');
const { match } = require('path-to-regexp');

// const allowedWebBranches = input('allowedWebBranches', '');
// const artifactInfo = input('artifactInfo', '');

// console.log(`allowedWebBranches:${allowedWebBranches}`);

// const parsedArtifactInfoIn = JSON.parse(artifactInfo);
// console.log('parsedArtifactInfoIn');
// console.log(parsedArtifactInfoIn);

const parsedArtifactInfo = {
  byTriple: {
    'x86_64-pc-windows-msvc': {
      name: 'web-windows-latest',
      'web-zip-sig':
        'WgXK0m70/HJtb8jVfzDRhNLnGAnhRjAR5GytY2XRLixm82dddijpm6vZnJXE2J+wnNQG2a4PCuczPE2jgLeS2c1KsyYh81cFv+OhFMP3SLXR1OFHqhQ7z0Cy2D/cK50lSKUPNSLisD4HIbGDxRqf9oJ97DoEOvEOpDtuTnwOH0K/pj2WdjzCiqxd8RnljHS8+K+eMdY/yqSWEQDeQO/TaEprIauEeS2oKqcYcetzhkW8KinQofjtFWnlZ01g1RUPM5kra2yzs0pGsxrtzvHRyUWFm808zRQQEUqsNgLzYRbfQYt2Q47g/XDZfdjzrH+f1lmud7SQPOzWkEmikf+RYcVx9jab1lAT5ap4GtAf0yF7zDJHhzK3udgnM2sqcJFcMZ9Oc6DVSXfo/4aXmSuGTEegI8N45YgJtkamV/FqiSCxGvYuzxCZLrOH+qr1YmN69kmVFEI4WvfuDg46OPc9j8j/7JLASKUd3VXEwnitqqyA3G+gPz/Irdxy5lygiYuxOjdSOJDChcpLI4P1YltPKEVAtw8Yo6eQtg0S4OYijlZfjzulsV+mOiL8zw4CvsuxFuEoOcnVZTvbbESZZxCSYVYuix3S/ijmV08lf+/utA1FfxIbbA2QZnSZuOtbQq2tcF6g67726vlFdVrpuHUBOylRjoB2XaibY+j9Nbc56pU=',
      'web-zip-url':
        'https://github.com/icogn/tpr-gen3/actions/runs/11171484607/artifacts/2013581135',
    },
    'x86_64-unknown-linux-gnu': {
      name: 'web-ubuntu-latest',
      'web-zip-sig':
        'iFxLPOvyx17Sot1+3ySPHF2EFVrYS4agJckbFgp/NsM5epwccloVyUs3V8/l1tZ7/pBSq40J//1bF0VFMSHnAMkV5UoCwLcLTbLaNPjqwLOyU7J/QoKUIRuVShVYADtwO8YEJW+qWxOyk+N02PdAEMtv2G2DtzIiH+G3hg4hoAWs8iquoV8L2rDGARMNAvV6tmHeFqZI7MVDriVTpaqU7etLVtz9Cla1RFlKcB0iil8UhOEdcgwUndjfqEDztT4j9Qyk+6JxG1V5HQ/XLWUy/bKjhiDx+gkT6VC4Lz71jcA+TQUW4Czdpl2wr2Qeex2ZyuOTDzNf7yUN2Sq0ftIHdfvOD/8Wo9VGtOm9pZehQbY6lraMFCTCBlT/bcR2KvCzn0ryj+adg8Cvl05xvmfY8j7Uf+uZyNssudILemAyPC3o+J0iL74DxtEFFkfKiNlUD8QEd+ZSuXorH0C4lXdX7brbnmPDL9SD7BuHGmAeE5isORjGLRi1zHpv0Nvxi0My5vid/s2iWk0ChLN0+dr4BgfrTN944izn+Hq3yPcchfzll7KLdGHpPOB1hQ70yow5ZR8o2d+HLhSREYWELukTcsfKcE+e/qM3516eVEy5TkyBdWSmPIxbTExja92Z5JCuVTU932fM5jaFAFtU6m/3fb/b/YAeyf4POz1o4+IhisE=',
      'web-zip-url':
        'https://github.com/icogn/tpr-gen3/actions/runs/11171484607/artifacts/2013579531',
    },
  },
  signature: 'exampleSig',
  timestamp: '2024-10-03T23:55:46.302Z',
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

  const osArtifactInfo =
    parsedArtifactInfo.byTriple['x86_64-unknown-linux-gnu'];

  const artifactUrl = osArtifactInfo['web-zip-url'];

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
        workflowRunId: obj.params.run_id,
        repositoryName: obj.params.repo,
        repositoryOwner: obj.params.owner,
      },
    };

    const { artifact: targetArtifact } = await artifactClient.getArtifact(
      // inputs.name,
      // 'asdf-ubuntu-latest',
      osArtifactInfo.name,
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
  console.error(err);
  core.setFailed('Failed in pull-web-artifacts.js');
});
