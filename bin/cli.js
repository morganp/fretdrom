#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const json5 = require('json5');
const onml = require('onml');
const { renderAny } = require('../lib');
const allSkins = require('../lib/all-skins');

const args = process.argv.slice(2);
let inputFile = null;
let outputFile = null;
let skinName = 'default';

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if ((a === '--input' || a === '-i') && args[i + 1]) {
    inputFile = args[++i];
  } else if ((a === '--output' || a === '-o') && args[i + 1]) {
    outputFile = args[++i];
  } else if ((a === '--skin' || a === '-s') && args[i + 1]) {
    skinName = args[++i];
  } else if (!inputFile && !a.startsWith('-')) {
    inputFile = a;
  }
}

if (!inputFile) {
  process.stderr.write('Usage: fretdrom [--input/-i] <file.json5> [--output/-o <out.svg>] [--skin/-s <skin>]\n');
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(path.resolve(inputFile), 'utf8');
} catch (e) {
  process.stderr.write('Error reading file: ' + e.message + '\n');
  process.exit(1);
}

let source;
try {
  source = json5.parse(raw);
} catch (e) {
  process.stderr.write('Error parsing JSON5: ' + e.message + '\n');
  process.exit(1);
}

const skins = allSkins;
const tree = renderAny(0, source, skins);
const svg = onml.s(tree);

if (outputFile) {
  fs.writeFileSync(path.resolve(outputFile), svg, 'utf8');
  process.stdout.write('Written to ' + outputFile + '\n');
} else {
  process.stdout.write(svg + '\n');
}
