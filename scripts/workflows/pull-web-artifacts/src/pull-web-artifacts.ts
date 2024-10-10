import fs from 'fs-extra';
import artifactClient from '@actions/artifact';
import * as core from '@actions/core';
import { match, MatchResult } from 'path-to-regexp';
import { verify } from 'node:crypto';
import stableStringify from 'json-stable-stringify';
import { z } from 'zod';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
const CONFIG_FILEPATH = './config_branch/config_branch.json';

type MatchStuff = {
  repo: string;
  owner: string;
  run_id: string;
  artifact_id: string;
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

type Inputs = ReturnType<typeof parseInputs>;

const clientPayloadSchema = z.object({
  branch: z.string(),
  centralNames: z.string(),
  artifactInfo: z.object({
    byTriple: z.record(
      z.string(),
      z.object({
        'web-zip-url': z.string(),
        'web-zip-sig': z.string(),
        name: z.string(),
      })
    ),
  }),
  signature: z.string().optional(),
  timestamp: z.string(),
});

type ClientPayload = z.infer<typeof clientPayloadSchema>;

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILEPATH)) {
    console.log('config_branch.json file not found.');
    process.exit(0);
  }

  const configIn = fs.readJsonSync(CONFIG_FILEPATH);

  const { error, data } = configSchema.safeParse(configIn);
  if (error) {
    console.log('config zod error:');
    core.setFailed(error.message);
    process.exit(1);
  }

  return data;
}

function input(name: string, defVal: string, required = false) {
  const val = core.getInput(name).trim();
  if (required && (val == null || val === '')) {
    throw `Input '${name}' is required!`;
  }
  return val || defVal;
}

// From https://stackoverflow.com/a/1353711
function isDateValid(date: Date) {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return !isNaN(date.valueOf());
  }
  return false; // not a date object
}

function verifyTimestamp(timestamp: unknown, inputs: Inputs) {
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

  const diff = Date.now() - timestampDate.getTime();
  console.log(`diff: ${diff}`);

  if (
    diff < 0 ||
    (!inputs.clientPayloadFromFile && diff > FIFTEEN_MINUTES_IN_MS)
  ) {
    core.setFailed(`timestamp '${timestampStr}' was not in allowed window.`);
    return false;
  }

  return true;
}

async function verifyClientPayload(config: Config, inputs: Inputs) {
  const { clientPayload: payload } = inputs;
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

  const dataToVerify = stableStringify(payload);
  console.log('dataToVerify:');
  console.log(dataToVerify);

  const isValidSignature = await new Promise((resolve, reject) => {
    verify(
      'RSA-SHA256',
      Buffer.from(dataToVerify),
      branchData.publicKey,
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

  return verifyTimestamp(payload.timestamp, inputs);
}

function parseInputs() {
  const clientPayloadFromFile = input('clientPayloadFromFile', '') === 'true';
  let clientPayloadObj: any;

  if (clientPayloadFromFile) {
    clientPayloadObj = fs.readJSONSync(
      './config_branch/test_trigger_data.json'
    );
  } else {
    const clientPayloadInput = input('clientPayload', '');
    clientPayloadObj = JSON.parse(clientPayloadInput);
  }

  console.log('clientPayloadObj:');
  console.log(clientPayloadObj);

  const { error, data } = clientPayloadSchema.safeParse(clientPayloadObj);
  if (error) {
    console.log('clientPayload zod error:');
    core.setFailed(error.message);
    process.exit(1);
  }

  // Manually confirm signature is a string since our schema says it is optional.
  if (typeof data.signature !== 'string') {
    core.setFailed('clientPayload.signature must be a string.');
    process.exit(1);
  }

  return {
    token: input('github-token', '', true),
    clientPayload: data,
    clientPayloadFromFile,
  };
}

async function run() {
  const inputs = parseInputs();
  const config = loadConfig();

  const clientPayloadVerified = await verifyClientPayload(config, inputs);
  if (!clientPayloadVerified) {
    return;
  }

  const osArtifactInfo =
    inputs.clientPayload.artifactInfo.byTriple['x86_64-unknown-linux-gnu'];

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
