import fs from 'fs-extra';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { createSign } from 'node:crypto';
import stableStringify from 'json-stable-stringify';

type ArtifactInfo = {
  byTriple: {
    [key: string]: {
      name?: string;
      'web-zip-sig'?: string;
      'web-zip-url'?: string;
    };
  };
};

type ClientPayload = {
  branch: string;
  version: string;
  centralNames: string;
  artifactInfo: ArtifactInfo;
  timestamp: string;
  signature: string | undefined;
};

type MatrixOutput = {
  'web-zip-url': {
    [key: string]: string;
  };
  'web-zip-sig': {
    [key: string]: string;
  };
  name: {
    [key: string]: string;
  };
  triple: {
    [key: string]: string;
  };
};

type Config = {
  triggers?: {
    [key: string]: string[];
  };
};

const config = fs.readJsonSync('./config_branch/config_branch.json') as Config;
console.log('config:');
console.log(config);

const token = core.getInput('token');
const octokit = github.getOctokit(token, { required: true });

const artifactInfoInput = getInput('artifactInfo', '', true);
const parsedArtifactInfo = JSON.parse(artifactInfoInput) as MatrixOutput;

const branchInput = getInput('branch', '', true);
const versionInput = getInput('version', '', true);
const privateKey = getInput('privateKey', '', true);
let passphrase: string | undefined = getInput('passphrase', '');
if (!passphrase) {
  passphrase = undefined;
}

function getInput(name: string, defVal: string, required = false) {
  const val = process.env['INPUT_' + name.toUpperCase()];
  if (required && (val == null || val === '')) {
    throw name + ' input must be supplied!';
  }
  return val || defVal;
}

type SignInputOptions = {
  isFilePath?: boolean;
};

async function signInput(input: string, options?: SignInputOptions) {
  const sign = createSign('RSA-SHA256');

  if (options && options.isFilePath) {
    const inpFile = fs.createReadStream(input);
    await new Promise((resolve) => inpFile.pipe(sign).once('finish', resolve));
  } else {
    sign.update(input);
  }

  return sign.sign({ key: privateKey, passphrase: passphrase }, 'base64');
}

async function restructureArtifactInfo() {
  const keyMapping = parsedArtifactInfo.triple;

  const artifactInfo: ArtifactInfo = {
    byTriple: {},
  };
  const { byTriple } = artifactInfo;

  Object.keys(parsedArtifactInfo).forEach((key) => {
    if (key === 'web-zip-sig' || key === 'web-zip-url' || key === 'name') {
      const innerObj = parsedArtifactInfo[key];
      Object.keys(innerObj).forEach((innerKey) => {
        const tripleKey = keyMapping[innerKey];
        if (!tripleKey) {
          throw new Error('Failed to map innerKey to tripleKey.');
        }

        let resObj = byTriple[tripleKey];
        if (!resObj) {
          byTriple[tripleKey] = {};
          resObj = byTriple[tripleKey];
        }

        resObj[key] = innerObj[innerKey];
      });
    }
  });

  return artifactInfo;
}

type Target = {
  owner: string;
  repo: string;
  centralNames: string;
};

const TARGETS_REGEX = /^(\S+)\/(\S+)\/(\S+)$/;

function getTargets(
  currentBranch: string,
  triggers: typeof config.triggers
): Target[] {
  const targets: Target[] = [];

  if (triggers) {
    const branchesWhichTrigger = Object.keys(triggers);

    for (let i = 0; i < branchesWhichTrigger.length; i++) {
      const branch = branchesWhichTrigger[i];

      if (branch === currentBranch) {
        triggers[branch].forEach((triggerItem) => {
          if (typeof triggerItem === 'string') {
            const match = triggerItem.match(TARGETS_REGEX);
            if (match) {
              targets.push({
                owner: match[1],
                repo: match[2],
                centralNames: match[3],
              });
            }
          }
        });

        break;
      }
    }
  }

  const foundOwnerRepos: { [key: string]: boolean } = {};

  // Make sure there are no duplicates
  targets.forEach(({ owner, repo }) => {
    const ownerRepo = `${owner}/${repo}`;

    if (foundOwnerRepos[ownerRepo]) {
      throw new Error(
        `Had multiple targets for the same repo '${ownerRepo}'. These should be combined like 'owner/repo/first+second'`
      );
    }

    foundOwnerRepos[ownerRepo] = true;
  });

  return targets;
}

async function buildClientPayload(
  branch: string,
  version: string,
  centralNames: string,
  artifactInfo: ArtifactInfo
) {
  const clientPayload: ClientPayload = {
    branch,
    version,
    centralNames,
    artifactInfo,
    signature: undefined,
    timestamp: new Date().toISOString(),
  };

  const asStr = stableStringify(clientPayload);
  clientPayload.signature = await signInput(asStr);

  return clientPayload;
}

async function bootstrap() {
  const targets = getTargets(branchInput, config.triggers);
  if (targets.length < 1) {
    console.log('No targets. Skipping...');
    return;
  }

  const newArtifactInfo = await restructureArtifactInfo();

  let numSuccess = 0;

  for (let i = 0; i < targets.length; i++) {
    const { owner, repo, centralNames } = targets[i];

    console.log(
      `Building clientPayload for '${owner}/${repo}/${centralNames}'...`
    );

    const clientPayload = await buildClientPayload(
      branchInput,
      versionInput,
      centralNames,
      newArtifactInfo
    );

    console.log('clientPayload:');
    console.log(clientPayload);

    console.log('newArtifactInfo:');
    console.log(newArtifactInfo);

    console.log(
      `Sending dispatch event for '${owner}/${repo}/${centralNames}'...`
    );

    const response = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: 'pull_artifacts',
      client_payload: clientPayload,
    });

    if (response.status === 204) {
      console.log('Trigger call was successful.');
      numSuccess += 1;
    } else {
      console.error('ERROR: Wrong status was returned: ' + response.status);
    }
  }

  if (numSuccess < 1) {
    throw new Error('All trigger calls failed.');
  }
}

bootstrap()
  .then(
    (result) => {
      // eslint-disable-next-line no-console
      if (result != null) {
        console.log(result);
      }
    },
    (err) => {
      // eslint-disable-next-line no-console
      core.setFailed(err.message);
      console.error(err);
    }
  )
  .then(() => {
    process.exit();
  });
