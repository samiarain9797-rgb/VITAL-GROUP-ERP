const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');

function replaceInFile(path, search, replace) {
  let content = readFileSync(path, 'utf-8');
  content = content.replace(search, replace);
  writeFileSync(path, content);
}

replaceInFile('src/App.jsx', /from "\.\/trailbase"/g, 'from "./bknd"');
replaceInFile('src/App.jsx', /import\('\.\/trailbase'\)/g, "import('./bknd')");

replaceInFile('src/bknd-firestore-shim.js', /from '\.\/trailbase'/, "from './bknd'");
replaceInFile('src/bknd-firestore-shim.js', /trailbase\.records/g, "api.data");

console.log('Fixed imports');
