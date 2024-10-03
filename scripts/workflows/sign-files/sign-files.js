const fs = require('fs');
const { createSign } = require('crypto');
const core = require('@actions/core');

const getInput = (name, defVal, required = false) => {
  const val = process.env['INPUT_' + name.toUpperCase()];
  if (required && (val == null || val === '')) {
    throw name + ' input must be supplied!';
  }
  return val || defVal;
};

const algorithm = getInput('algorithm', 'RSA-SHA256');
const privateKey = getInput('privateKey', null, true);
const passphrase = getInput('passphrase');
const encoding = getInput('encoding', 'base64');
const filePath = getInput('file', null, true);

async function signFile(inpFilePath) {
  const inpFile = fs.createReadStream(inpFilePath);
  const sign = createSign(algorithm);

  await new Promise((resolve) => inpFile.pipe(sign).once('finish', resolve));
  return sign.sign({ key: privateKey, passphrase: passphrase }, encoding);
}

async function run() {
  const result = await signFile(filePath);
  core.setOutput('value', result);
}

run();
