const fs = require('fs-extra');
const artifactClient = require('@actions/artifact').default;
const core = require('@actions/core');
const { match } = require('path-to-regexp');
const { verify } = require('node:crypto');

// const allowedWebBranches = input('allowedWebBranches', '');
// console.log(`allowedWebBranches:${allowedWebBranches}`);

// const artifactInfo = input('artifactInfo', '');
// const parsedArtifactInfoIn = JSON.parse(artifactInfo);
// console.log('parsedArtifactInfoIn');
// console.log(parsedArtifactInfoIn);
// const parsedArtifactInfo = parsedArtifactInfoIn;

const parsedArtifactInfo = {
  byTriple: {
    'x86_64-pc-windows-msvc': {
      name: 'web-windows-latest',
      'web-zip-sig':
        'L7ASVXwGPDayCT6QdL2nZPSSfF0VmXl/GIn6vv/21o22e9oOM5OP27yhAYbu0+g6UriwbqhL4uBBoF40mAF926E54A1upa1y/sbe1+p51MVQbaArMa06HDVr8U7TPSQwxfNXKNr6DLO6Wfc7XFNVOcPSYeYbrsY1jxD3rTFguk6q9PcHtB1Tyshb/yj9T9e0g5QOt1+71qhLJDilRIy9U0IclOauqGH4O5qJUpqaZ2LxnzfkPwapwd8N6EINcOSReEjhcMjcujApqQWMOMhRiTfQQqM3z7PC9SE1/CGP+Mfa1acRVZKxJZ2SwPR8RSXFXuRAhmjowPWfgYWGBHo8YTRhGHhr+LmzoHikoeSjjMrjKuKkWpGejXUVf8lBaeUxa3JSdtHn6N2GsGd8Cxwxv58nbYXcJVopQ7acGCEij8pg6pif42bQZPUCUlO5w526ySmD40tPUV77iG449Phho2Dn3uyM73sI+aR/lH+uZhRCv1K6Ud47dpRrabdv27+QBSK8tGJUs2cyjUh0ppr+lWWZBbDW5zgmEKLHM/vnREcqaDCeF76FwLvKRYWRu9QaQTJk2w4WRpvso0TEUv3+xOfQVK98+p1qvKhFV2W9v/SzcEuocrAgejs56YeipUircGZ+f9ZG125+k5fno5gosmLEygp7F14+kXllf0fd+wo=',
      'web-zip-url':
        'https://github.com/icogn/tpr-gen3/actions/runs/11184341001/artifacts/2016988768',
    },
    'x86_64-unknown-linux-gnu': {
      name: 'web-ubuntu-latest',
      'web-zip-sig':
        'fwmGD2USd7dhL4j44GTK8Ofd+/NQDWEZy8xp6KehVkSinmtDlfkidJYsl/BpcydFtatSoRnyeJwi8DoWN0o3i4kssZQ1C5f2CXGiI1UmGNrPZZ84Qkr+TP/O99KF2GDkUiQfd4m8Kq87HJWxU9CeJMAR5zljnndOFrLIVMYl2wdX5MtADfGtFiTsaf9yW1TSOy0JZdNrqpgVwkCcnC0/P9p8i4fV/UNYDrRKNfZfL9D4Y2DUiW+7aGeYDN2pAW3kCiIt8pj8+X9NmlbBvJJjswmegSarmW4uzw1R75zXruuXpYyNEYnP94pV0Sx4Uxel6xpfdbhA9FRYAIAljphpmSKCPHGWpPLs2yRvPXz6JJkyhws7y1eyqa99r6M+QjP0Ari7VTmXaKycIxTpkK2cVATanca0uNLEiLyVpiyX4mwTvJlwqY7nCavDRrZ3NtA1YcZGzmkMMhaUh0hMjVerfz05Ykj5Mvc/uvKEI9eOQV1wxtRTa44Kb4NMl/b0hOGr1kLM3ypGBvU+Or2rmty5A+WRKJ7tkL6Dk2QMHrkoyOGQ6hmThtlhCPqoMu0xlKR/ro0hkDGqbRKnQhb0GGX6hvEShrJOlvleXGkj8CS/cQdV8lAq91VX3hBC5HPe/tG12FegZwg94/8PR9XtS3s+7rpAQtIgFCNIC+FSgqd5kPo=',
      'web-zip-url':
        'https://github.com/icogn/tpr-gen3/actions/runs/11184341001/artifacts/2016985763',
    },
  },
  signature:
    'hIacfZl23Ti42x2le0zHwvJKzJFbTcE4lYco4za9KOWjAt5ziuYPcv4R1INGR3HNUrqWpl8JFBWA8Y5NvrMaBxoQTNLOQspF+3unuD6OFEoZwGCNG9mbleqRkevi7o1P7GmNqmhgityfEUV+xsuabWWQBVcXcZQLHxz4cgzlXhvAVCJLfIuM38r5zExoDej+RrTuyffQPMvRMd4OEPtLuPkKjW7EySVBPR8Jl3xH2/dOjCypL5Wvb06n8+lnFoNgVEB1ZlZQJ97vOBvBKU1PC/YjQ58BUgvhHLaANHZEa5SummNcqKCM2/ZAzSxHj5aQhvgEfk+QfYRHC1S9QNlucGVycQWrATjjrvumey46vOfPLx3/qfCaZLuoCH3zs2jEWQ8V0ptdhBF55FNWZIdisf2vr/qsarkLlJj9P3Mnt9ttuf/VZvW4F9B2+6Rda0M7JN4NYTybzRb7x5dkV6l0cth1OEjjCtjKIYg7St+RDv85VN/tG6LAiAmJq1HqsDS3zclXuVnNpHxvLCmtcmfrphWLcJK+W69dQmUbcbcqIfKlA5Zgv/iL2MSLWBoYr1ocJKLrwlAp9EFtk9UQRyeGrsJzwYNAojMLy0tgC6Phv1eheX0PZdnhf9IbLhDWfUCqxp6FOdQR98ck7c73pdhvyIVh9agMLfYY/1nXzVuwGac=',
  timestamp: '2024-10-04T17:33:52.754Z',
};
const signature = parsedArtifactInfo.signature;
parsedArtifactInfo.signature = undefined;

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

  // start verify info signature
  // This is a hardcoded test value
  const publicKey =
    '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3BIwGEBi9flZfX6W5y09\nM0S9kV8mXZSL1mkOVx/B18v7kBCRsquCzSs5ot7DChJcyYqanuzWyM14HK7gnLBp\nWEU5PQOhag+WW8pkWgHjlTauB+sEd9X7MPPU5o5OR61nCzYIToNGxLx5NXksj5A4\nuUkS4eKaZ336aZBAj/dvOEPQA1m3azwIBbmxdDadDki76Ykjz35yUgtZyF/x8Bpt\n7YRY0kBwHdq57EVBaMQl0uSfCaFGPx7ez36OkWvhUyfCUy5ApyPoeDK36gIcOuMr\nS6CyLEh+Y0JmZSAzLgSPnh1N7S7F4Lf+IKoiws5Be6xvot16nSRpZc5NJAfyu/MU\nfmy5kcB5TqcQcWh61d4s4p8a1FnU9M0prTOVOHWtkG08tmlniHQXX8igrnRgvcIo\nHbMCVcIrOSrwsSeyabtxXfDpwp2+orr6RNJQKOlc8iCCf8y6CYyFlmftO0WN/+gc\ndc3hIRwmlefg/wmTyS68SvXLA1AvM9tlQ4n0oiYpL6MO5c2828jg3Ytr76FAqHtp\nfrXwRHqAAqq5yvQjuWt5r942ozIBbsElq0cHyguchMw2MXz9m6+rBnuJy8SL1M47\ndgy287Skw4QWKq6G4LnIZp9Na0+svZSiPVD/fQ1sDFOHifUJITNNXXyDdRFd+8DT\nTMiwi2Fsd1kDmGS0eP/TcX0CAwEAAQ==\n-----END PUBLIC KEY-----\n';

  const dataToVerify = JSON.stringify(parsedArtifactInfo);
  console.log('dataToVerify:');
  console.log(dataToVerify);

  const aaa = await new Promise((resolve, reject) => {
    verify(
      'RSA-SHA256',
      Buffer.from(dataToVerify),
      publicKey,
      signature,
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });

  console.log('aaa:');
  console.log(aaa);

  // end verify info signature

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
        // run_id is actually used
        workflowRunId: obj.params.run_id,
        repositoryName: obj.params.repo,
        repositoryOwner: obj.params.owner,
      },
    };

    const { artifact: targetArtifact } = await artifactClient.getArtifact(
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
