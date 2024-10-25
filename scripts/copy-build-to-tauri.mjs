import fs from 'fs-extra';
import path from 'node:path';
import { getRootDir } from './util/getRootDir.mjs';

console.log('----------\nRunning copy-build-to-tauri...');

const rootDir = getRootDir();

const websiteDir = path.join(rootDir, 'website');
const standaloneDir = path.join(websiteDir, '.next/standalone');
const stWebDir = path.join(standaloneDir, 'website');

const srcPublic = path.join(websiteDir, 'public');
const destPublic = path.join(stWebDir, 'public');

console.log('Copying public folder...');
fs.copySync(srcPublic, destPublic);

const srcStatic = path.join(websiteDir, '.next/static');
const destStatic = path.join(stWebDir, '.next/static');

console.log('Copying static folder...');
fs.copySync(srcStatic, destStatic);

const outputDir = path.join(
  rootDir,
  'tauri-app/src-tauri/resources/standalone'
);

console.log(`Output dir: '${outputDir}'`);
if (fs.existsSync(outputDir)) {
  console.log('Output dir exists, so deleting first...');
  fs.removeSync(outputDir);
}

console.log('Copying standalone dir to outputDir...');
fs.copySync(standaloneDir, outputDir);
