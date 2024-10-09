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

const privateKey = getInput('privateKey', '', true);
let passphrase: string | undefined = getInput('passphrase', '');
if (!passphrase) {
  passphrase = undefined;
}

// // This is fake test data
// const privateKey =
//   '-----BEGIN ENCRYPTED PRIVATE KEY-----\n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\n-----END ENCRYPTED PRIVATE KEY-----\n';

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
  centralNames: string,
  artifactInfo: ArtifactInfo
) {
  const clientPayload: ClientPayload = {
    branch,
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
  // TODO: pass `branch` in as an input
  const branch = 'dev';

  const targets = getTargets(branch, config.triggers);
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
      branch,
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
