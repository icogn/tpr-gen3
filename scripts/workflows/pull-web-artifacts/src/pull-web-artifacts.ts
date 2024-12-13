import path from 'node:path';
import fs from 'fs-extra';
import artifactClient from '@actions/artifact';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { match, MatchResult } from 'path-to-regexp';
import { createVerify, sign, verify } from 'node:crypto';
import stableStringify from 'json-stable-stringify';
import { z } from 'zod';
import { GitHub } from '@actions/github/lib/utils';
import * as semver from 'semver';
import { TextDecoder } from 'node:util';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
const CONFIG_FILEPATH = './config_branch/config_branch.json';
const DOWNLOAD_DIR = 'my_download_dir';
const OLD_ASSET_INFO_DIR = 'old_asset_info_dir';

const thisOwner = github.context.repo.owner;
const thisRepo = github.context.repo.repo;

const siteArtifactMatchFn = match<SiteArtifactMatch>(
  '/:owner/:repo/actions/runs/:run_id/artifacts/:artifact_id'
);

let octokit: InstanceType<typeof GitHub>;

function getOctokit() {
  return octokit;
}

function failAndExit(msg: string): never {
  core.setFailed(msg);
  process.exit(1);
}

type SiteArtifactMatch = {
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

type SiteZipInfo = {
  triple: string;
  filepath: string;
  signature: string;
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

const siteArtifactInfoSchema = z.object({
  'web-zip-url': zString,
  'web-zip-sig': zString,
  name: zString,
});

type SiteArtifactInfoSchema = z.infer<typeof siteArtifactInfoSchema>;

const clientPayloadSchema = z.object({
  branch: zString,
  version: zString,
  centralNames: zString,
  artifactInfo: z.object({
    byTriple: z.record(zString, siteArtifactInfoSchema),
  }),
  signature: zString.optional(),
  timestamp: zString,
});

type ClientPayload = z.infer<typeof clientPayloadSchema>;

const assetInfoBranchSchema = z.object({
  version: zString,
  siteZips: z.record(
    zString,
    z.object({
      asset_id: z.number().nonnegative(),
      signature: zString,
    })
  ),
});

type AssetInfoBranch = z.infer<typeof assetInfoBranchSchema>;

const assetInfoSchema = z.object({
  branches: z.record(zString, assetInfoBranchSchema),
});

type AssetInfo = z.infer<typeof assetInfoSchema>;

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

function validateVersion(clientPayload: ClientPayload) {
  const { branch, version } = clientPayload;

  if (!semver.valid(version)) {
    failAndExit(`clientPayload.version '${version}' was not a valid semver.`);
  }
  const prereleaseChunks = semver.prerelease(clientPayload.version);
  if (prereleaseChunks == null || prereleaseChunks.length !== 2) {
    failAndExit(
      `Expected 2 chunks, but prereleaseChunks was ${prereleaseChunks}.`
    );
  }
  if (prereleaseChunks[0] !== clientPayload.branch) {
    failAndExit(`First prerelease el must be '${branch}'.`);
  }
  if (typeof prereleaseChunks[1] !== 'number') {
    failAndExit(
      `Second prerelease el must be a number, but was '${prereleaseChunks[1]}'.`
    );
  }
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

  validateVersion(clientPayload);

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
  releaseId: number;
  assetInfoAssetId?: number;
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

      let assetInfoAssetId: number | undefined;
      for (let assetIdx = 0; assetIdx < res.data.assets.length; assetIdx++) {
        const asset = res.data.assets[0];
        if (asset.name === 'asset_info.json') {
          assetInfoAssetId = asset.id;
          break;
        }
      }

      results.push({
        centralName: central,
        releaseId: res.data.id,
        assetInfoAssetId,
      });
    }
  }

  console.log('getCentralNamesData results:');
  console.log(results);

  return results;
}

async function downloadSiteArtifact(
  token: string,
  branchData: BranchData,
  siteArtifactInfo: SiteArtifactInfoSchema
) {
  const artifactUrl = siteArtifactInfo['web-zip-url'];

  const url = new URL(artifactUrl);

  if (url.origin !== 'https://github.com') {
    failAndExit(`Origin must be https://github.com, but was '${url.origin}'.`);
  }

  const siteArtifactMatchBase = siteArtifactMatchFn(url.pathname);
  if (!siteArtifactMatchBase) {
    failAndExit(`Failed to parse artifact URL '${artifactUrl}'.`);
  }
  const siteArtifactMatch =
    siteArtifactMatchBase as MatchResult<SiteArtifactMatch>;

  const { owner, repo } = siteArtifactMatch.params;
  if (owner !== branchData.owner) {
    failAndExit(
      `siteArtifactInfo owner was '${owner}', but should have been '${branchData.owner}'.`
    );
  }
  if (repo !== branchData.repo) {
    failAndExit(
      `siteArtifactInfo repo was '${repo}', but should have been '${branchData.repo}'.`
    );
  }

  const options = {
    findBy: {
      token,
      // run_id is actually used
      workflowRunId: parseInt(siteArtifactMatch.params.run_id, 10),
      repositoryName: siteArtifactMatch.params.repo,
      repositoryOwner: siteArtifactMatch.params.owner,
    },
  };

  const { artifact: targetArtifact } = await artifactClient.getArtifact(
    siteArtifactInfo.name,
    options
  );

  if (!targetArtifact) {
    failAndExit(`Artifact with name '${siteArtifactInfo.name}' not found.`);
  }
  console.log('targetArtifact');
  console.log(targetArtifact);

  await artifactClient.downloadArtifact(
    parseInt(siteArtifactMatch.params.artifact_id, 10),
    {
      ...options,
      path: DOWNLOAD_DIR,
    }
  );
}

async function verifyFileSignature(
  publicKey: string,
  signature: string,
  filepath: string
) {
  const verifier = createVerify('RSA-SHA256');

  await new Promise((resolve) =>
    fs.createReadStream(filepath).pipe(verifier).once('finish', resolve)
  );

  return verifier.verify(publicKey, signature, 'base64');
}

async function processSiteArtifacts(
  inputs: Inputs,
  config: Config,
  centralNamesInfos: CentralNameInfo[]
) {
  const results: SiteZipInfo[] = [];

  const { byTriple } = inputs.clientPayload.artifactInfo;

  if (Object.keys(byTriple).length < 1) {
    failAndExit('No site zips were in the clientPayload.');
  }

  const branchData = config.branches[inputs.clientPayload.branch];
  const triples = Object.keys(byTriple);

  // Need to return info about the files we downloaded.
  // the triple, filepath, signature

  // Probably want the filename in the release to be something like:
  // dev-1.0.0-dev.255-x86_64-pc-windows-msvc.zip

  for (let i = 0; i < triples.length; i++) {
    const triple = triples[i];
    const siteArtifactInfo = byTriple[triple];
    const signature = siteArtifactInfo['web-zip-sig'];

    const filepath = path.join(DOWNLOAD_DIR, `${siteArtifactInfo.name}.zip`);
    if (fs.existsSync(filepath)) {
      failAndExit(`Tried to download multiple artifacts to '${filepath}'.`);
    }

    await downloadSiteArtifact(inputs.token, branchData, siteArtifactInfo);

    const isVerified = await verifyFileSignature(
      branchData.publicKey,
      signature,
      filepath
    );
    console.log(`isVerified: ${isVerified}`);
    if (!isVerified) {
      failAndExit(`Failed to verify '${siteArtifactInfo.name}.zip'.`);
    }

    results.push({
      triple,
      filepath,
      signature,
    });
  }

  return results;
}

async function updateReleaseAssets(
  inputs: Inputs,
  config: Config,
  centralNamesInfos: CentralNameInfo[],
  siteZipInfos: SiteZipInfo[]
) {
  const { branch, version } = inputs.clientPayload;

  const branchAssetPrefix = `b_${branch}_`;

  for (let i = 0; i < centralNamesInfos.length; i++) {
    const centralNamesInfo = centralNamesInfos[i];
    console.log('---');
    console.log(`Processing centralName '${centralNamesInfo.centralName}'...`);

    // Delete release assets
    const assets = await getOctokit().paginate(
      'GET /repos/{owner}/{repo}/releases/{release_id}/assets',
      {
        owner: thisOwner,
        repo: thisRepo,
        release_id: centralNamesInfo.releaseId,
        per_page: 100,
      }
    );

    let numDeleted = 0;
    for (let assetIdx = 0; assetIdx < assets.length; assetIdx++) {
      const asset = assets[assetIdx];
      if (asset.name.startsWith(branchAssetPrefix)) {
        console.log(`Deleting asset name:${asset.name},id:${asset.id}...`);
        const rmRes = await getOctokit().rest.repos.deleteReleaseAsset({
          owner: thisOwner,
          repo: thisRepo,
          asset_id: asset.id,
        });

        if (rmRes.status !== 204) {
          failAndExit(
            `deleteReleaseAsset expected status 204, but was '${rmRes.status}'.`
          );
        }
        numDeleted += 1;
      }
    }
    console.log(`Deleted ${numDeleted} of ${assets.length} asset(s).`);

    const siteZipAssetIds: number[] = [];

    // Upload release assets
    for (let uploadIdx = 0; uploadIdx < siteZipInfos.length; uploadIdx++) {
      const siteZipInfo = siteZipInfos[uploadIdx];

      const fileData = fs.readFileSync(siteZipInfo.filepath);
      const uploadName = `b_${branch}_${version}-${siteZipInfo.triple}.zip`;

      console.log(`Uploading release asset: '${uploadName}'...`);
      const uploadRes = await getOctokit().rest.repos.uploadReleaseAsset({
        owner: thisOwner,
        repo: thisRepo,
        release_id: centralNamesInfo.releaseId,
        name: uploadName,
        // TS expects `data` to be a string, but we pass a Buffer. This works
        // out because we set mediaType.format to 'raw' I think, so it seems
        // like the types here are just wrong. The code works though.
        data: fileData as unknown as string,
        mediaType: {
          format: 'raw',
        },
      });

      if (uploadRes.status !== 201) {
        failAndExit(
          `uploadReleaseAsset for '${uploadName}' has status ${uploadRes.status} instead of 201.`
        );
      }

      siteZipAssetIds.push(uploadRes.data.id);
    }

    // Create/replace asset_info.json
    let newAssetInfoJson: AssetInfo = { branches: {} };

    if (centralNamesInfo.assetInfoAssetId != null) {
      console.log('Going to replace existing asset_info.json...');
      const res = await getOctokit().rest.repos.getReleaseAsset({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        asset_id: centralNamesInfo.assetInfoAssetId,
        headers: {
          Accept: 'application/octet-stream',
        },
      });

      if (res.status !== 200) {
        failAndExit(
          `Get asset_info.json has status ${res.status} instead of 200.`
        );
      }

      // Another case where I think the types are wrong.
      const arrBuf = res.data as unknown as ArrayBuffer;

      let oldAssetInfoJson;
      try {
        oldAssetInfoJson = JSON.parse(new TextDecoder().decode(arrBuf));
      } catch (e) {
        failAndExit(`Failed to parse asset_info.json.`);
      }

      console.log('oldAssetInfoJson:');
      console.log(oldAssetInfoJson);

      // Store old asset_info.json as an artifact in case we need to get it if
      // something goes wrong.
      const assetInfoOldFilename = `${centralNamesInfo.centralName}_asset_info_old.json`;
      const assetInfoOldPath = path.join(
        OLD_ASSET_INFO_DIR,
        assetInfoOldFilename
      );

      // We use mkdirp since the directory will already exist if we have
      // multiple centralNames meaning multiple iterations.
      fs.mkdirpSync(OLD_ASSET_INFO_DIR);
      fs.writeJsonSync(assetInfoOldPath, oldAssetInfoJson);
      await artifactClient.uploadArtifact(
        assetInfoOldFilename,
        [assetInfoOldPath],
        OLD_ASSET_INFO_DIR,
        { retentionDays: 90 }
      );

      const { error, data } = assetInfoSchema.safeParse(oldAssetInfoJson);
      if (error) {
        console.log('config zod error:');
        failAndExit(error.message);
      }

      newAssetInfoJson = JSON.parse(JSON.stringify(data)) as AssetInfo;

      console.log(`Deleting asset_info.json...`);
      const delAssetInfoRes = await getOctokit().rest.repos.deleteReleaseAsset({
        owner: thisOwner,
        repo: thisRepo,
        asset_id: centralNamesInfo.assetInfoAssetId,
      });

      if (delAssetInfoRes.status !== 204) {
        failAndExit(
          `updateRes has status ${delAssetInfoRes.status} instead of 204.`
        );
      }
    } else {
      console.log('Need to create asset_info.json since does not exist...');
    }

    const assetInfoBranch = buildAssetInfoBranchObj(
      version,
      siteZipInfos,
      siteZipAssetIds
    );
    newAssetInfoJson.branches[branch] = assetInfoBranch;

    console.log(`Uploading new asset_info.json...`);
    const uploadAssetInfoRes = await getOctokit().rest.repos.uploadReleaseAsset(
      {
        owner: thisOwner,
        repo: thisRepo,
        release_id: centralNamesInfo.releaseId,
        name: 'asset_info.json',
        // TS expects `data` to be a string, but we pass an object. I think
        // there is an issue with the types. This code works as intended.
        data: newAssetInfoJson as unknown as string,
      }
    );
  }
}

function buildAssetInfoBranchObj(
  version: string,
  siteZipInfos: SiteZipInfo[],
  assetIds: number[]
): AssetInfoBranch {
  const result: AssetInfoBranch = {
    version,
    siteZips: {},
  };

  for (let i = 0; i < siteZipInfos.length; i++) {
    const siteZipInfo = siteZipInfos[i];
    const assetId = assetIds[i];

    result.siteZips[siteZipInfo.triple] = {
      asset_id: assetId,
      signature: siteZipInfo.signature,
    };
  }

  return result;
}

async function run() {
  const inputs = parseInputs();
  const config = loadConfig();

  const clientPayloadVerified = await verifyClientPayload(config, inputs);
  if (!clientPayloadVerified) {
    return;
  }

  const centralNameInfos = await getCentralNamesData(config, inputs);
  if (centralNameInfos.length < 1) {
    console.log('No centralNames to process.');
    process.exit(0);
  }

  const siteZipInfos = await processSiteArtifacts(
    inputs,
    config,
    centralNameInfos
  );
  console.log('siteZipInfos:');
  console.log(siteZipInfos);

  await updateReleaseAssets(inputs, config, centralNameInfos, siteZipInfos);
}

run().catch((err) => {
  console.error(err);
  core.setFailed('Failed in pull-web-artifacts.js');
});
