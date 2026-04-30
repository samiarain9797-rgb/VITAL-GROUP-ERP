const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// We want to replace standard input/textarea/select classes with 3D ones.
// Standard ones involve: "w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
// or similar.

// Let's use regex to find className attributes inside <input, <select, <textarea.
// This is a bit tricky, so we'll just replace the specific class strings that are commonly used for inputs.

const replacements = [
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)] font-mono"'
  },
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)] resize-none"'
  },
  {
    regex: /className="w-full bg-white border border-zinc-200 rounded px-2 py-1\.5 text-xs text-zinc-900"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="bg-white border border-zinc-200 rounded px-2 py-1\.5 text-\[10px\] text-zinc-900"/g,
    replacement: 'className="bg-white border-2 border-zinc-200 rounded-xl px-2 py-1.5 text-[10px] font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="w-full bg-white border border-red-200 rounded px-2 py-1\.5 text-xs"/g,
    replacement: 'className="w-full bg-white border-2 border-red-200 rounded-xl px-2 py-1.5 text-xs font-medium text-red-900 outline-none focus:border-red-500 transition-all shadow-[0_3px_0_rgb(254,202,202)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(220,38,38)]"'
  },
  {
    regex: /className="w-full bg-white border border-blue-200 rounded px-2 py-1\.5 text-xs"/g,
    replacement: 'className="w-full bg-white border-2 border-blue-200 rounded-xl px-2 py-1.5 text-xs font-medium text-blue-900 outline-none focus:border-blue-500 transition-all shadow-[0_3px_0_rgb(191,219,254)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(37,99,235)]"'
  },
  {
    regex: /className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"/g,
    replacement: 'className="bg-white border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="w-full bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"/g,
    replacement: 'className="bg-white border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="bg-white border border-zinc-200 rounded px-3 py-1\.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  }
];

let changedCount = 0;
for (const r of replacements) {
    const matches = content.match(r.regex);
    if (matches) {
        changedCount += matches.length;
        content = content.replace(r.regex, r.replacement);
    }
}

console.log('Replaced', changedCount, 'inputs');
fs.writeFileSync('src/App.jsx', content);
