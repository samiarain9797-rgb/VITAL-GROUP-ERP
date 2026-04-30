const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');
code = code.replace(/truncate/g, 'break-all whitespace-normal');
fs.writeFileSync('src/App.jsx', code);
