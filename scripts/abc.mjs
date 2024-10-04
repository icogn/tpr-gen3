import { createSign, generateKeyPairSync, verify } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
// import glob from '@actions/glob';

async function main() {
  process.chdir('./scripts');

  // glob testing

  // const fileName = 'asdf-ubuntu-latest.zip';

  // const globber = await glob.create(fileName, { matchDirectories: false });
  // const files = await globber.glob();
  // console.log('files');
  // console.log(files);

  // Key stuff

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    namedCurve: 'sect239k1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 'top secret',
    },
  });

  const sign = createSign('RSA-SHA256');

  const inpFilePath = fileName;

  const inpFile = fs.createReadStream(inpFilePath);

  await new Promise((resolve) => inpFile.pipe(sign).once('finish', resolve));

  const outputFolder = '.';
  const extension = '.sig';
  const outFilePath =
    path.join(outputFolder, path.basename(inpFilePath)) + extension;

  await fs.promises.writeFile(
    outFilePath,
    sign.sign({
      key: privateKey,
      passphrase: 'top secret',
    }),
    'utf8'
  );

  // // const pem = fs.readFileSync('PUBLIC_KEY_FILE_PATH_GOES_HERE');
  // // const pubKey = pem.toString('ascii');
  // let pubKey = publicKey;
  // // pubKey = pubKey.substring(0, 99) + 'a' + pubKey.substring(100);
  // // const verifier = crypto.createVerify('RSA-SHA256');

  const dataToVerify = fs.readFileSync(fileName);
  const signatureData = fs.readFileSync(fileName + '.sig');

  let pubKey = fs.readFileSync('publicKey.txt').toString();
  // pubKey = pubKey.substring(0, 99) + 'a' + pubKey.substring(100);

  const aaa = await new Promise((resolve, reject) => {
    verify('RSA-SHA256', dataToVerify, pubKey, signatureData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

  // verifier.update(input, 'ascii');

  // const publicKeyBuf = new Buffer(publicKey, 'ascii');
  // const signatureBuf = new Buffer(signatureSignedByPrivateKey, 'hex');
  // const result = verifier.verify(publicKeyBuf, signatureBuf);

  console.log(aaa);
}

await main();
