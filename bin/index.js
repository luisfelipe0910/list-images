#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const Table = require('cli-table');
const yargs = require('yargs');

const options = yargs
  .usage('Usage: -d <name>')
  .option('d', { alias: 'dir', describe: 'Diretório', type: 'string', demandOption: false }).argv;

const blacklistDir = dir => dir.includes('.git') || dir.includes('node_modules');
const shouldRead = file => file.indexOf('.yml') > 0 || file.indexOf('.yaml') > 0;

const walk = async (dir, filelist = []) => {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = await fs.stat(filepath);
    if (stat.isDirectory() && !blacklistDir(filepath)) {
      filelist = await walk(filepath, filelist);
    } else if (shouldRead(filepath)) {
      filelist.push(filepath);
    }
  }
  return filelist;
};
const getLinesUntilEmpty = (lines, index) => {
  const afterIndex = lines.slice(index);
  const lastIndex = afterIndex.findIndex(line => line.trim().length === 0);
  const result = lines.slice(index, index + lastIndex + 1);
  return result.map(line => line.trim()).join(' ');
};

const getImagesText = async filepath => {
  const allFileContents = await fs.readFile(filepath, 'utf-8');
  const lines = allFileContents.split(/\r?\n/);
  const returnLines = [];
  lines.forEach((line, i) => {
    line = line.trim();
    if (line.match(/image:\s?\W/)) {
      returnLines.push({ filepath, line });
    } else if (line.indexOf('image:') >= 0) {
      returnLines.push({ filepath, line: getLinesUntilEmpty(lines, i) });
    }
  });
  return returnLines;
};

(async () => {
  const dir = options.dir || './';
  const files = await walk(dir);
  const lines = await Promise.allSettled(files.map(getImagesText));
  const response = lines
    .filter(line => line.value.length > 0)
    .map(line => line.value)
    .reduce((prev, line) => {
      line.forEach(element => {
        prev.push([element.filepath, element.line]);
      });
      return prev;
    }, []);
  // instantiate
  const table = new Table({
    head: ['Path', 'Image'],
    rows: response,
  });
  console.log(table.toString());
})();
