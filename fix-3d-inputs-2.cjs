const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"/g;
const replacement = 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"';

content = content.replace(regex, replacement);

fs.writeFileSync('src/App.jsx', content);
