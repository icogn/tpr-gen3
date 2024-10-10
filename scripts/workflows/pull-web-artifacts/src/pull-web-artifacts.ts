import fs from 'fs-extra';
import artifactClient from '@actions/artifact';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { match, MatchResult } from 'path-to-regexp';
import { verify } from 'node:crypto';
import stableStringify from 'json-stable-stringify';
import { z } from 'zod';
import { GitHub } from '@actions/github/lib/utils';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
const CONFIG_FILEPATH = './config_branch/config_branch.json';

let octokit: InstanceType<typeof GitHub>;

function getOctokit() {
  return octokit;
}

function failAndExit(msg: string) {
  core.setFailed(msg);
  process.exit(1);
}

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

const zString = z.string().trim().min(1);

const configSchema = z.object({
  branches: z.record(
    zString,
    z.object({
      name: zString,
      owner: zString,
      repo: zString,
      publicKey: zString,
    })
  ),
  central: z.record(
    zString,
    z.object({
      releaseTag: zString,
      branches: z.array(zString),
    })
  ),
  triggers: z.record(zString, z.array(zString)),
});

type Config = z.infer<typeof configSchema>;

type Inputs = ReturnType<typeof parseInputs>;

const clientPayloadSchema = z.object({
  branch: zString,
  centralNames: zString,
  artifactInfo: z.object({
    byTriple: z.record(
      zString,
      z.object({
        'web-zip-url': zString,
        'web-zip-sig': zString,
        name: zString,
      })
    ),
  }),
  signature: zString.optional(),
  timestamp: zString,
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
  const { clientPayload } = inputs;

  const signature = clientPayload.signature as string;
  // Set to undefined so not included when we stringify the object.
  clientPayload.signature = undefined;

  const { branch } = clientPayload;

  if (branch === 'stable') {
    core.setFailed(`'stable' is a reserved branch name.`);
    process.exit(1);
  }

  const branchData = config.branches[branch];
  if (!branchData) {
    throw new Error(`Failed to find branchData for branch '${branch}'.`);
  }

  const dataToVerify = stableStringify(clientPayload);
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

  return verifyTimestamp(clientPayload.timestamp, inputs);
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

  const token = input('github-token', '', true);
  octokit = github.getOctokit(token, { required: true });

  return {
    token,
    clientPayload: data,
    clientPayloadFromFile,
  };
}

type CentralNameInfo = {
  centralName: string;
  asset_info_browser_download_url?: string;
};

async function getCentralNamesData(config: Config, inputs: Inputs) {
  const results: CentralNameInfo[] = [];

  const { branch, centralNames } = inputs.clientPayload;
  const centrals = centralNames.trim().split('+');

  for (let i = 0; i < centrals.length; i++) {
    const central = centrals[i];

    // TODO: type seems wrong here. Does not think can be undefined.
    const centralInfo = config.central[central];
    if (centralInfo && centralInfo.branches.includes(branch)) {
      // Do call to get release info based on the tag.
      const res = await getOctokit().rest.repos.getReleaseByTag({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        tag: centralInfo.releaseTag,
      });

      if (res.status !== 200) {
        failAndExit(
          `getReleaseByTag status was '${res.status}' for tag '${centralInfo.releaseTag}'.`
        );
      }

      let browser_download_url = undefined;
      for (let assetIdx = 0; assetIdx < res.data.assets.length; assetIdx++) {
        const asset = res.data.assets[0];
        if (asset.name === 'asset_info.json') {
          browser_download_url = asset.browser_download_url;
          break;
        }
      }

      results.push({
        centralName: central,
        asset_info_browser_download_url: browser_download_url,
      });
    }
  }

  console.log('getCentralNamesData results:');
  console.log(results);

  return results;
}

async function run() {
  const inputs = parseInputs();
  const config = loadConfig();

  const clientPayloadVerified = await verifyClientPayload(config, inputs);
  if (!clientPayloadVerified) {
    return;
  }

  const centralNamesToProcess = await getCentralNamesData(config, inputs);

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
