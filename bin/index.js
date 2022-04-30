#!/usr/bin/env node
const Table = require('cli-table');
const yargs = require("yargs");
const fs = require('fs').promises;
const path = require('path');

const options = yargs
 .usage("Usage: -d <name>")
 .option("d", { alias: "dir", describe: "Diretório", type: "string", demandOption: false })
 .argv;

const blacklistDir = dir => {
    return dir.includes('.git') || dir.includes('node_modules');
};
const shouldRead = file => {
    return file.indexOf('.yml') > 0;
};

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
}

const getImagesText = async (filepath) => {
    const allFileContents = await fs.readFile(filepath, 'utf-8');
    const lines = allFileContents.split(/\r?\n/).filter(line =>  line.indexOf('image:') >= 0)
    return lines.map(line => ({filepath, line: line.trim() }));
} 
(async () => {
  const dir = options.dir || './'
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
    head: ["Caminho", "Imagem"],
    rows: response
  });
  console.log(table.toString());
})()
