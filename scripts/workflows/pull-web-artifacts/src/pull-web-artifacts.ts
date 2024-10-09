// const fs = require('fs-extra');
// const artifactClient = require('@actions/artifact').default;
// const core = require('@actions/core');
// const { match } = require('path-to-regexp');
// const { verify } = require('node:crypto');
// const stableStringify = require('json-stable-stringify');
import fs from 'fs-extra';
import artifactClient from '@actions/artifact';
import * as core from '@actions/core';
import { match, MatchResult } from 'path-to-regexp';
import { verify } from 'node:crypto';
import stableStringify from 'json-stable-stringify';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

type ArtifactInfo = {
  byTriple: {
    [key: string]: {
      name: string;
      'web-zip-sig': string;
      'web-zip-url': string;
    };
  };
  signature: string | undefined;
  timestamp: string;
};

type MatchStuff = {
  repo: string;
  owner: string;
  run_id: string;
  artifact_id: string;
};

type ClientPayload = {
  centralNames: string;
  artifactInfo: ArtifactInfo;
};

const clientPayloadFromFile = input('clientPayloadFromFile', '') === 'true';
let clientPayload: ClientPayload;

if (clientPayloadFromFile) {
  clientPayload = fs.readJSONSync(
    './config_branch/test_trigger_data.json'
  ) as ClientPayload;
} else {
  const clientPayloadInput = input('clientPayload', '');
  clientPayload = JSON.parse(clientPayloadInput) as ClientPayload;
}

console.log('clientPayload:');
console.log(clientPayload);
const parsedArtifactInfo = clientPayload.artifactInfo;

// const parsedArtifactInfo: ArtifactInfo = {
//   byTriple: {
//     'x86_64-pc-windows-msvc': {
//       name: 'web-windows-latest',
//       'web-zip-sig':
//         'JifDBVCvl05aczmfJV+AByJ3ZIDh3rzvL3+koiGfeGpW6j8mFUPzPO7TsiOAwoCxUuSGwuXQ1dvNicQf0rmvPSKaYP2jTwuo208vsBcWk4qUsKzGE0X0FuBbNJ26WV7dwyU/5QKL8VjJZ/quC7av4qcaopwXCuKMc+Ei3x+Q+qFXe1O2w5lSTroEVC3pmy9MsMVauEPW1dD7L06lhQzEEskl5YtFhbAvCQUrLA8spHzDH0wuEHu6xjZtPSEE2OYR2Q3vEypifITN7y3rCe/AADs+odog38BqvEUaCe3RqXC8u7zXOaDIvgHmIjL9EcfSxSR0safOsxjDV6PPij7ZjPlSnfmk3lRMJbq9QMDxDR7x+qFX5577eIEI0sy2dywfxg+zBW9r6J1iWTojn7YRFZrHb9CqvLUGIgWxTjXPGxELwPN6QhNo1M42OqyS7Y7mT7Oqmn5enoKDgvz+YkDWTYK0XEy0HiGfgIKu86L9MWk3mzzQBMHTX0k7DC8YHFLTUHo7V6abLT7zX3caCZfjn55N/gfd84X8omHd7ePXON9M+ybhjQt5AQdIn5G0CDvTI9NPj19hSnhxen/ucyF2TX89rVTd8Dl38SUc1lVDsKDXPXtpy5g44hFbyUSPvKlkLud2CwhMfnyzPPIv7+HtUwStF98exYSkBK0DXi1PPDM=',
//       'web-zip-url':
//         'https://github.com/icogn/tpr-gen3/actions/runs/11184566516/artifacts/2017054138',
//     },
//     'x86_64-unknown-linux-gnu': {
//       name: 'web-ubuntu-latest',
//       'web-zip-sig':
//         'UgG/Z/0vlTN4QQkSf6zyFcH+774vj7Br8SUafd32lvGR5habFeD1GaHTq/I0az0yfyhfYFNsUHRQVimDIBoM6r8Hsg480f8Ll7yXljZS2Ew/fae+kQh/ulgdv1GTKHiZCoiIPD/kGwKCiDVE5Yknu0P38j6nZ/Hiyx4FisuvSUWXTzY+RbZMmpL21RPm+EOxnDk/C2bmADV7Eq6RGKpNfSlDzDFvR21kKrCV2BbUaJ9x+Sz3ARgo86dHL5fd8bu/N2CT2an53bvN6xeE2gHcbg7Dk+JPPq4iROoju8StozhOor23oWOUb33OA1XHfxyzaBZbnDhPlxJP4xlPItWbTqfK+ijRxUWPoWiY/cg8J2JLMAZ4EzHHuTg7DJe+UGuSHzQQ6JFU31gUdWjIQU9TeNZeqAiLU3DXmuTJg8UpWafo5RghcNIuMASEYWng+AtrA5YmPVxUtWRQ6o1j3kDFaRnm60G934TVZmPUljS7VcyJroa+I5q9CEvwgiWTiP8SeX8ElVxGbrIx89wFJUNgbLyLRuDbdc9pjkMAhSBEi9NtRKVvmdCa7INopaDit80T9+XhdgmJTl9bGM9PrXK5TQtoQ5NVL/pTX/XLHWxsusc6I2hfE1ey80ofpnGvrMc/7RVHlByt/OMFLJRg7olrPSWvndCla/mYtCCAraDNF74=',
//       'web-zip-url':
//         'https://github.com/icogn/tpr-gen3/actions/runs/11184566516/artifacts/2017051285',
//     },
//   },
//   signature:
//     'v0BxCx0USKrNvWE9SxIGR2LkGB++HUURJNR26OkrwynEdNpbBLoNoXKHw6oeDT1EhuOD7nHZ6DZGnTuUTb4EWNJHiJ/rfNSlA5WcT9fvrkFUMhtMwJALBPfMvMQj4Rh2RIqAT95Tf5f01aD4HrRoz1Mn8jnbuUFUD+TceO+amFJOGRwBALVRCXYGkrfcNAu4Vh4W+Qstp3xg6wIdgIN1U2CKJzcKLj2jZBfL5dAtgVOOzqG0aqlyIwl5yC3NBHyC343EEZl9UvC1Q1IiIlwnmzNyd03EEzSbzymlE8bATadWeVMW61/i4IDDAKz4WYE8djCf4pbGaBaW1VI+ww0IXUBk9GeOwpstXIswQaQVKeq9K+WC6ZanauHeXSftHLtkBJpPef4QZ1XH6WGU0l1BZXiuB1DBLB+Eve0wlRWSMq0BY6oSrX2quGW2zB6PCuxGrtIicwQUkLtSCZW9SvTSEd1z1coT9ZMr/6KXyTBLvoVbPFy7yJ95vse5c7h4t6dsDLHEbfpFKyQQQhUFCUNRvE19MDm4vYehNrhg9ec+Rbp/JD8Gf3RQkzF8Kqirs1QHn5MIUpQ4tj2Ba3lE4/BLeloaj6gcSKLZNejFm7XXIZkD99RsXFshJTDa6bVdtbu0ZM+ISg2U5pSXxZvk7fintWn6hxueAqJ4JYC+3SSN9Ck=',
//   timestamp: '2024-10-04T17:52:14.178Z',
// };

function input(name: string, def: string) {
  let inp = core.getInput(name).trim();
  if (inp === '' || inp.toLowerCase() === 'false') {
    return def;
  }

  return inp;
}

// From https://stackoverflow.com/a/1353711
function isDateValid(date: Date) {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    // it is a date
    if (isNaN(date.valueOf())) {
      // date object is not valid
      return false;
    } else {
      // date object is valid
      return true;
    }
  } else {
    // not a date object
    return false;
  }
}

function verifyTimestamp(timestamp: unknown) {
  if (typeof timestamp !== 'string') {
    core.setFailed('timestamp was not a string');
    return false;
  }
  const timestampStr = timestamp as string;

  const timestampDate = new Date(timestampStr);
  if (!isDateValid(timestampDate)) {
    core.setFailed(
      `timestamp '${timestampStr}' did not construct a valid Date.`
    );
    return false;
  }

  const backToStr = timestampDate.toISOString();
  if (timestampStr !== backToStr) {
    core.setFailed(
      `timestamp '${timestampStr}' did not match backToStr '${backToStr}'.`
    );
    return false;
  }

  // Check if within past 15 minutes.
  const diff = Date.now() - timestampDate.getTime();
  console.log(`diff: ${diff}`);

  // TODO: temp allowing any amount of time in past
  if (diff < 0) {
    // if (diff < 0 || diff > FIFTEEN_MINUTES_IN_MS) {
    core.setFailed(`timestamp '${timestampStr}' was not in allowed window.`);
    return false;
  }

  return true;
}

async function verifyArtifactInfo() {
  if (typeof parsedArtifactInfo.signature !== 'string') {
    core.setFailed('parsedArtifactInfo.signature was not a string');
    return;
  }
  const signature = parsedArtifactInfo.signature as string;
  // Set to undefined so not included when we stringify the object.
  parsedArtifactInfo.signature = undefined;

  // This is a hardcoded test value
  const publicKey =
    '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3BIwGEBi9flZfX6W5y09\nM0S9kV8mXZSL1mkOVx/B18v7kBCRsquCzSs5ot7DChJcyYqanuzWyM14HK7gnLBp\nWEU5PQOhag+WW8pkWgHjlTauB+sEd9X7MPPU5o5OR61nCzYIToNGxLx5NXksj5A4\nuUkS4eKaZ336aZBAj/dvOEPQA1m3azwIBbmxdDadDki76Ykjz35yUgtZyF/x8Bpt\n7YRY0kBwHdq57EVBaMQl0uSfCaFGPx7ez36OkWvhUyfCUy5ApyPoeDK36gIcOuMr\nS6CyLEh+Y0JmZSAzLgSPnh1N7S7F4Lf+IKoiws5Be6xvot16nSRpZc5NJAfyu/MU\nfmy5kcB5TqcQcWh61d4s4p8a1FnU9M0prTOVOHWtkG08tmlniHQXX8igrnRgvcIo\nHbMCVcIrOSrwsSeyabtxXfDpwp2+orr6RNJQKOlc8iCCf8y6CYyFlmftO0WN/+gc\ndc3hIRwmlefg/wmTyS68SvXLA1AvM9tlQ4n0oiYpL6MO5c2828jg3Ytr76FAqHtp\nfrXwRHqAAqq5yvQjuWt5r942ozIBbsElq0cHyguchMw2MXz9m6+rBnuJy8SL1M47\ndgy287Skw4QWKq6G4LnIZp9Na0+svZSiPVD/fQ1sDFOHifUJITNNXXyDdRFd+8DT\nTMiwi2Fsd1kDmGS0eP/TcX0CAwEAAQ==\n-----END PUBLIC KEY-----\n';

  const dataToVerify = stableStringify(parsedArtifactInfo);
  console.log('dataToVerify:');
  console.log(dataToVerify);

  const isValidSignature = await new Promise((resolve, reject) => {
    verify(
      'RSA-SHA256',
      Buffer.from(dataToVerify),
      publicKey,
      Buffer.from(signature, 'base64'),
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });

  if (!isValidSignature) {
    core.setFailed('artifactInfo had an invalid signature!');
    return false;
  }
  console.log(`artifactInfo signature was valid.`);

  return verifyTimestamp(parsedArtifactInfo.timestamp);
}

async function run() {
  const inputs = {
    // name: core.getInput(Inputs.Name, { required: false }),
    // path: core.getInput(Inputs.Path, { required: false }),
    token: core.getInput('github-token'),
    // repository: core.getInput(Inputs.Repository, { required: false }),
    // runID: parseInt(core.getInput(Inputs.RunID, { required: false })),
    // pattern: core.getInput(Inputs.Pattern, { required: false }),
    // mergeMultiple: core.getBooleanInput(Inputs.MergeMultiple, {
    //   required: false,
    // }),
  };

  const artifactInfoVerified = await verifyArtifactInfo();
  if (!artifactInfoVerified) {
    return;
  }

  const branchConfig = fs.readJsonSync('./config_branch/config_branch.json');

  const osArtifactInfo =
    parsedArtifactInfo.byTriple['x86_64-unknown-linux-gnu'];

  const artifactUrl = osArtifactInfo['web-zip-url'];

  const fn = match<MatchStuff>(
    '/:owner/:repo/actions/runs/:run_id/artifacts/:artifact_id'
  );

  try {
    const url = new URL(artifactUrl);

    if (url.origin !== 'https://github.com') {
      throw new Error(
        `Origin must be https://github.com, but was '${url.origin}'.`
      );
    }

    const objBase = fn(url.pathname);
    if (!objBase) {
      core.setFailed(`Failed to parse artifact URL '${artifactUrl}'.`);
      return;
    }
    const obj = objBase as MatchResult<MatchStuff>;
    console.log('obj');
    console.log(obj);

    const options = {
      findBy: {
        token: inputs.token,
        // run_id is actually used
        workflowRunId: parseInt(obj.params.run_id, 10),
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
    await artifactClient.downloadArtifact(
      parseInt(obj.params.artifact_id, 10),
      {
        ...options,
        path: 'my_download_dir',
        // isSingleArtifactDownload || inputs.mergeMultiple
        //   ? resolvedPath
        //   : path.join(resolvedPath, artifact.name),
      }
    );

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
