const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = github.getOctokit(token, { required: true });

const artifactInfo = core.getInput('artifactInfo', { required: true });
const parsedArtifactInfo = JSON.parse(artifactInfo);
console.log('parsedArtifactInfo:');
console.log(parsedArtifactInfo);

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

  // sign
  const signature = 'exampleSig';
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
