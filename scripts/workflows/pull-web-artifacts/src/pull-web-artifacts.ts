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
import { z } from 'zod';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

type MatchStuff = {
  repo: string;
  owner: string;
  run_id: string;
  artifact_id: string;
};

type ArtifactInfo = {
  byTriple: {
    [key: string]: {
      name: string;
      'web-zip-sig': string;
      'web-zip-url': string;
    };
  };
};

type ClientPayload = {
  branch: string;
  centralNames: string;
  artifactInfo: ArtifactInfo;
  timestamp: string;
  signature: string | undefined;
};

type BranchData = {
  owner: string;
  repo: string;
  publicKey: string;
};

const configSchema = z.object({
  branches: z.record(
    z.string(),
    z.object({
      name: z.string(),
      owner: z.string(),
      repo: z.string(),
      publicKey: z.string(),
    })
  ),
  central: z.record(
    z.string(),
    z.object({
      releaseTag: z.string(),
      branches: z.array(z.string()),
    })
  ),
  triggers: z.record(z.string(), z.array(z.string())),
});

type Config = z.infer<typeof configSchema>;

// type Config = {
//   branches: Record<string, BranchData | undefined>;
//   central: {
//     [key: string]: string[];
//   };
// };

const CONFIG_FILEPATH = './config_branch/config_branch.json';

if (!fs.existsSync(CONFIG_FILEPATH)) {
  console.log('config_branch.json file not found.');
  process.exit(0);
}

const configIn = fs.readJsonSync(CONFIG_FILEPATH);

// const { success, error } = configSchema.safeParse(configIn);
const { error, data } = configSchema.safeParse(configIn);
if (error) {
  console.error(error.message);
  core.setFailed(error.message);
  process.exit(1);
}

const config = data;

if (!config.branches || !config.central) {
  console.log('Skipping because missing config.branches or config.central.');
  process.exit(0);
}

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

async function verifyClientPayload(payload: ClientPayload) {
  if (typeof payload.signature !== 'string') {
    core.setFailed('payload.signature was not a string');
    return;
  }
  if (typeof payload.branch !== 'string') {
    core.setFailed('payload.branch was not a string');
    return;
  }

  const signature = payload.signature as string;
  // Set to undefined so not included when we stringify the object.
  payload.signature = undefined;

  const { branch } = payload;

  const branchData = config.branches[branch];
  if (!branchData) {
    throw new Error(`Failed to find branchData for branch '${branch}'.`);
  }

  const { publicKey } = branchData;

  // This is a hardcoded test value
  // const publicKey =
  //   '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3BIwGEBi9flZfX6W5y09\nM0S9kV8mXZSL1mkOVx/B18v7kBCRsquCzSs5ot7DChJcyYqanuzWyM14HK7gnLBp\nWEU5PQOhag+WW8pkWgHjlTauB+sEd9X7MPPU5o5OR61nCzYIToNGxLx5NXksj5A4\nuUkS4eKaZ336aZBAj/dvOEPQA1m3azwIBbmxdDadDki76Ykjz35yUgtZyF/x8Bpt\n7YRY0kBwHdq57EVBaMQl0uSfCaFGPx7ez36OkWvhUyfCUy5ApyPoeDK36gIcOuMr\nS6CyLEh+Y0JmZSAzLgSPnh1N7S7F4Lf+IKoiws5Be6xvot16nSRpZc5NJAfyu/MU\nfmy5kcB5TqcQcWh61d4s4p8a1FnU9M0prTOVOHWtkG08tmlniHQXX8igrnRgvcIo\nHbMCVcIrOSrwsSeyabtxXfDpwp2+orr6RNJQKOlc8iCCf8y6CYyFlmftO0WN/+gc\ndc3hIRwmlefg/wmTyS68SvXLA1AvM9tlQ4n0oiYpL6MO5c2828jg3Ytr76FAqHtp\nfrXwRHqAAqq5yvQjuWt5r942ozIBbsElq0cHyguchMw2MXz9m6+rBnuJy8SL1M47\ndgy287Skw4QWKq6G4LnIZp9Na0+svZSiPVD/fQ1sDFOHifUJITNNXXyDdRFd+8DT\nTMiwi2Fsd1kDmGS0eP/TcX0CAwEAAQ==\n-----END PUBLIC KEY-----\n';

  const dataToVerify = stableStringify(payload);
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
    core.setFailed('payload had an invalid signature!');
    return false;
  }
  console.log(`payload signature was valid.`);

  return verifyTimestamp(payload.timestamp);
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

  const clientPayloadVerified = await verifyClientPayload(clientPayload);
  if (!clientPayloadVerified) {
    return;
  }

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
