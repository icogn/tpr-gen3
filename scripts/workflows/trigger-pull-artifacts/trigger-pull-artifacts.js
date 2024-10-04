const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = github.getOctokit(token, { required: true });

const artifactInfo = core.getInput('artifactInfo', { required: true });
const parsedArtifactInfo = JSON.parse(artifactInfo);
console.log('parsedArtifactInfo:');
console.log(parsedArtifactInfo);

const algorithm = getInput('algorithm', 'RSA-SHA256');
// const privateKey = getInput('privateKey', null, true);
// const passphrase = getInput('passphrase');

// This is fake test data
const privateKey =
  '-----BEGIN ENCRYPTED PRIVATE KEY-----\n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\n-----END ENCRYPTED PRIVATE KEY-----\n';
const passphrase = 'top secret';

const encoding = getInput('encoding', 'base64');

const getInput = (name, defVal, required = false) => {
  const val = process.env['INPUT_' + name.toUpperCase()];
  if (required && (val == null || val === '')) {
    throw name + ' input must be supplied!';
  }
  return val || defVal;
};

async function signInput(input, options) {
  const sign = createSign(algorithm);

  if (options && options.isFilePath) {
    const inpFile = fs.createReadStream(input);
    await new Promise((resolve) => inpFile.pipe(sign).once('finish', resolve));
  } else {
    sign.update(input);
  }

  return sign.sign({ key: privateKey, passphrase: passphrase }, encoding);
}

function restructureClientPayload() {
  const keyMapping = parsedArtifactInfo.triple;

  const root = { byTriple: {} };
  const { byTriple } = root;

  Object.keys(parsedArtifactInfo).forEach((key) => {
    if (key !== 'triple') {
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

  const date = new Date();
  root.timestamp = date.toISOString();

  const asStr = JSON.stringify(root);

  const signature = signInput(asStr);

  // sign
  // const signature = 'exampleSig';
  root.signature = signature;

  return root;

  // const a = {
  //   'web-zip-url': {
  //     'ubuntu-latest':
  //       'https://github.com/icogn/tpr-gen3/actions/runs/11170907303/artifacts/2013424178',
  //     'windows-latest':
  //       'https://github.com/icogn/tpr-gen3/actions/runs/11170907303/artifacts/2013425768',
  //   },
  //   'web-zip-sig': {
  //     'ubuntu-latest':
  //       'WT1nKvxRbdG66W3n7liU+4hnQTCXOGLOtGPTUddcPdrKIbLGrFo+lMpz6GcMhEdGnLMawZFWqheBg26jQsmKyhoUZJDfXLfbGHOaS5hBwP5nIBc4BlXrUiLjqZObWjmSLIngRuE3kAKZvOwxC2QUl1wIsJ126wT+TD8qaQ2zf9pTSMqRnxlEfXXVN0CnsVaBtC/Eo4RxXg7DpqJ7MG+l/tmVNfVo2nOFOI+FIJmds7jLYNq6mERtmh1CQF8sABAav+vSUl3J9zWU865/BOvSmmj6KF4zTojiRnLcOsCGuHbun998odBMxnh3MkLNOyHREDDGAG25i6U4PhmALayQD7D/mT4MM8CSafqQyWmcrTSbrvzrW5CSELflqptGIurZ6U7NxQ0ROxfkZ5tOz7TRA3bbT/yuVRu5m8obcN/eiHi6QQxiEAgivwy2CW/mJL3+Vk+jrLeTRZ7pd6Svi5zGl2lclrSegP9coETICij2twpsFrNCb4W5oodBVumCxkpMvzWc4n401nZVgD275nzw3hznbzRObAhwzD5QDKqsKBc7eMmWIWnQo5w/h63hFyUqILGO14tdX5wf6Xw+bG9StaMcrLT3MG9F5ZfyZTwtgT5sn+Kh9OGg1BeN0JLQHUPdhhNvL1xhmQWWQTSC4u6eUkfWbYAdokjZNK2n4FJaisQ=',
  //     'windows-latest':
  //       'HMNRdkMPwAqpbwxvzo4sU1uw3lnEiB0G2PIMiJu/nNTI+H4Lw7OBT8neR1/WjIP7iBFY2vhzNzRR6UEGZvqGApKa553C9YVzxR/aasHgUqGSPs2sYmTjiBZl5tGXzTF0Smc65AJjsxc65ttLQ6TM5PRgiqvYRf1AIHgZKR+ekw+jeroIIMRYIHI4DrwMmt/oxSSur+SVbmC3CK48Fyq50atXbl6+PAK1oxHO3hooSy1XMtCy60QgxbOYRIUSO5seRf07n9/40RPVGBZo5nw3TYpNmWxeTJ7p7yLnK9GeqB11Xnds6o72dnUhdZgoGODgP0YMNqBLzCzRGkGVXa16yRDqKwGGjU18xnKZzh6HQR7xptVbwuEmmODiHoGTevlHLpCHJY/oRNS/Bd0FK4X/sL5LbLgdAETIHo5EixGT1NIUkDwEtUmo9R+EgiPz/yRhJDPUcPhvrkjyXsROt8NefdhYam176gQs/gXxYXMe8j1aaze8QfasCQXlzp3aRjlxcZWVaqKUxzbWq030exsiOhYMXTQIEKlCs2Jnmf9O2jlRq8kJEMg8faqShFaG57Z6eTKjXoZY8U0bm36+cydlOa3aBVc89vl0rj3bLANrdKN8v/ZjvEkJPYk2P5HII7ZfPzowtWnlMk8KNvacqHaRc1PlbEJr1Uu27S4ZT3fELHQ=',
  //   },
  //   triple: {
  //     'ubuntu-latest': 'x86_64-unknown-linux-gnu',
  //     'windows-latest': 'x86_64-pc-windows-msvc',
  //   },
  // };
}

const bootstrap = async () => {
  const newArtifactInfo = restructureClientPayload();

  const response = await octokit.rest.repos.createDispatchEvent({
    owner: 'icogn',
    repo: 'tpr-gen3',
    event_type: 'pull_artifacts',
    client_payload: {
      // artifactInfo: parsedArtifactInfo,
      artifactInfo: newArtifactInfo,
    },
  });

  if (response.status === 204) {
    return 'Trigger call was successful.';
  }

  throw new Error('ERROR: Wrong status was returned: ' + response.status);
};

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
