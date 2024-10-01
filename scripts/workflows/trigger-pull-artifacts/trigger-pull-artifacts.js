const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = github.getOctokit(token, { required: true });

const artifactInfo = core.getInput('artifactInfo', { required: true });
const parsedArtifactInfo = JSON.parse(artifactInfo);
console.log('parsedArtifactInfo:');
console.log(parsedArtifactInfo);

const bootstrap = async () => {
  const response = await octokit.rest.repos.createDispatchEvent({
    owner: 'icogn',
    repo: 'tpr-gen3',
    event_type: 'pull_artifacts',
    client_payload: {
      artifactInfo: parsedArtifactInfo,
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
