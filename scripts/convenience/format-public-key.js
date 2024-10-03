// To use, create a file in this directory named "publicKey.txt" and set its
// contents to the raw public key value. To get the key in a format you can put
// in the config_branch.json file, debug this file and put a breakpoint near the
// end. Then in VSCode debug console, you can run `copy(escaped);` to copy the
// text. This will give you a string which contains literal "\n" in it rather
// than newlines.

const { readFileSync } = require('node:fs');
const { EOL } = require('node:os');
const path = require('node:path');

const filePath = path.join(__dirname, 'publicKey.txt');

const rawStr = readFileSync(filePath).toString().trim();
const escaped = rawStr.replaceAll(EOL, '\\n');

console.log(escaped);
