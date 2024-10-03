const core = require('@actions/core');

const input = core.getInput('input', { required: true });
core.setOutput('value', input);
