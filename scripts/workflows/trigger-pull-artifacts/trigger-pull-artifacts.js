const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = github.getOctokit(token, { required: true });

const artifactInfo = core.getInput('artifactInfo', { required: true });
const parsedArtifactInfo = JSON.parse(artifactInfo);
console.log('parsedArtifactInfo:');
console.log(parsedArtifactInfo);

function restructureClientPayload() {
  const a = {
    'web-zip-url': {
      'windows-latest':
        'https://github.com/icogn/tpr-gen3/actions/runs/11170809673/artifacts/2013398710',
      'ubuntu-latest':
        'https://github.com/icogn/tpr-gen3/actions/runs/11170809673/artifacts/2013396773',
    },
    'web-zip-sig': {
      'windows-latest':
        'XPNRx+e1+ivJDT72LtfjAgdbeFh+ypq5qbKFAKdO3jvFWiQI5RFabXMTDoYqLa+jdeVMT8jgjKl68yq6WqKLivVfkWhX6fl6FqI3k93m5CKs3qNDmbZF66JWc453sDe/Af2D5mtvWhJMAyVGiPfurzzbFWCL5wmwITZXHOS4gISANTlN2eZOHNRmbEPDHOqhRXMjnZ92wpgxCQNka7ZtsVfVbMMQr3SvryZoJ8adVsyU9gGR5WlLKiP0Wc0n23a3cNcKgstpb5Q/dqGIubKtL5aY431bciGaXv8JRtvfPCFJT+iRYxh5tQN35mJUL0e1nGqsvMeGjB0mxV1g3TKmqPyTeFLqEXN59OJxQvpQUfHJBrlzSDe5RpCxiZ9R47hGT7k6n+SzuO/0g7fVm51eJjO5Q1kCm0Ab2mEIjvSIOxxyqonIfdV70TgvD2wb+G4RXkkCivf92i8NM/j20k1XlVjpuS0aTDDYnJzUsh3xBtGwgZHrYHqpu0I8iUE1o+kXEx7GPjN8T+59if2jSJkfRizPHY6e0OqdGOIztVNzXAWSIX8It0BJKHmONFPOhDKpjcfXWhza1/v6rTH5llTo88x19B9ofzId7GOBSW3aUbfJdmPDOf+1ciCm0JjzY1uk9ldlq5Z3BVilwnLRjqJPu0eKvv5aRqJuH1nPesIYoEU=',
      'ubuntu-latest':
        'EszPAtVDsH/wpGCdPQFvUf4lC+Dth9+L5Pb21AHEVdR/uTX0/IGGJbKlHY+/rGlRXk+MhtLy6LPl2yR0yUobV6GQJUeOoPycM1DzBQk/i7agDt5kdUuuuf/UWL4pHdKNOPMMsN5GVtIm9kKU4HjG4QlQoTdPWR0vv14pf7fb2H0OAe8tdreQ4exHerZe9nGLFt/DbWz2svJmA3Du4bj41vgWLTABXdXgYgmw72droy3xDMOGFiCyF707VVt3UbCCVuyhgTwCAj2Cz2yS6BAUfz9ZLfPnpO5qb8NeUicMFm0IGDhEr27bhCSiwjkT2KM5cy6krb6u8JiSjpsZ1ceT0M89JmD8AZVEBgcRgJq/147v5YN49/Mk1QQ9StvHv5e4cSPTB1B4b/kN0whs09/AzqLlR1CX8HFcd4l/QI9trKait20wJKk00a1pBmzIICt1/sMmNIajJNTz4pD2i9F6av7Sg3elccZB5+aNSxtZLZ0pHQz1lZ4loCRh/c7vdPNX/Ihno8+i5JjX4IM+WvOUityZM3LEfz936POhZFO8pGadSj+XgThOj2QdNRhMJaChKx53uoCc/abXTp5Ty68u5r/nsH7YkwxEByzzmtlTUiDNwhbC1Rbm3y9JbYCADA7qoeaHMoM/k45WhhJCY+DLsZe+KJVrOn7A7lOur9AIzhM=',
    },
  };
}

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
