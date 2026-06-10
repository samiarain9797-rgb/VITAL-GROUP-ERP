const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');

function replaceInFile(path, search, replace) {
  let content = readFileSync(path, 'utf-8');
  content = content.replace(search, replace);
  writeFileSync(path, content);
}

replaceInFile('src/App.jsx', /from "\.\/supabase"/g, 'from "./trailbase"');
replaceInFile('src/App.jsx', /import\('\.\/supabase'\)/g, "import('./trailbase')");
replaceInFile('src/App.jsx', /from "\.\/supabase-firestore-shim"/g, 'from "./trailbase-firestore-shim"');
replaceInFile('src/App.jsx', /import \{ trailbaseAuth \}/, 'import { supabase }');
replaceInFile('src/App.jsx', /const \{ trailbaseAuth: supabase \} =/, 'const { supabase } =');
replaceInFile('src/App.jsx', /supabase_schema\.sql/g, 'trailbase_schema.sql');

replaceInFile('src/trailbase-firestore-shim.js', /from '\.\/supabase'/, "from './trailbase'");

const components = execSync('find src/components src/hooks -name "*.jsx" -o -name "*.js"').toString().split('\n').filter(Boolean);
for (const comp of components) {
  try {
    replaceInFile(comp, /from "\.\.\/supabase-firestore-shim"/g, 'from "../trailbase-firestore-shim"');
    replaceInFile(comp, /from '\.\.\/supabase-firestore-shim'/g, "from '../trailbase-firestore-shim'");
  } catch(e) {}
}
console.log('Fixed imports');
