const fs = require('fs');
const path = require('path');

const replacements = [
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-[10px] focus:outline-none focus:border-orange-500"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-lg px-3 py-2 text-[10px] font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(249,115,22)]"'
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
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-purple-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(168,85,247)]"'
  },
  {
    regex: /className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(59,130,246)]"'
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
    regex: /className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-\[10px\] text-zinc-900"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="bg-white border border-zinc-200 rounded px-2 py-1 text-\[10px\] text-zinc-900 focus:border-orange-500 outline-none"/g,
    replacement: 'className="bg-white border-2 border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_3px_0_rgb(228,228,231)] focus:-translate-y-[1px] focus:shadow-[0_4px_0_rgb(249,115,22)]"'
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
  },
  {
    regex: /className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  },
  {
    regex: /className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2"/g,
    replacement: 'className="w-full bg-white border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 transition-all shadow-[0_4px_0_rgb(228,228,231)] focus:-translate-y-[2px] focus:shadow-[0_6px_0_rgb(249,115,22)]"'
  }
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changedCount = 0;
            for (const r of replacements) {
                const matches = content.match(r.regex);
                if (matches) {
                    changedCount += matches.length;
                    content = content.replace(r.regex, r.replacement);
                }
            }
            if (changedCount > 0) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${changedCount} items in ${fullPath}`);
            }
        }
    }
}

processDir('src/components');
processDir('src');

