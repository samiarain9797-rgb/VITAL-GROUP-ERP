const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/className="bg-white border border-zinc-200 rounded px-2 py-1\.5 text-\[10px\] text-zinc-900"/g, 'className="w-full bg-white border-2 border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"');

fs.writeFileSync('src/App.jsx', content);
