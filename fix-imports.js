import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/from ['"]firebase\/firestore['"]/g, 'from "../supabase-firestore-shim"');
  content = content.replace(/from ['"]\.\.\/firebase['"]/g, 'from "../supabase-firestore-shim"');
  content = content.replace(/from ['"]firebase\/storage['"]/g, 'from "../supabase-firestore-shim"');
  // Handle duplicate imports from supabase-firestore-shim
  fs.writeFileSync(filePath, content);
}

fs.readdirSync(componentsDir).forEach(file => {
  if (file.endsWith('.jsx')) {
    replaceInFile(path.join(componentsDir, file));
  }
});
console.log('Imports fixed.');
