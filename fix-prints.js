const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/const handlePrint = \(\) => \{\n\s*const printWindow = window\.open\("", "_blank"\);\n\s*if \(!printWindow\) return;\n\n\s*const content = `/g, 
  'const handlePrint = () => {\n    const content = `');

content = content.replace(/    printWindow\.document\.write\(content\);\n\s*printWindow\.document\.close\(\);\n\s*\};\n\n\s*const handleExportCSV/g, 
`    const blob = new Blob([content], { type: "text/html" });
    const localUrl = URL.createObjectURL(blob);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = \`Logistics_Report_\${new Date().toISOString().split('T')[0]}.html\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleExportCSV`);

// Also fix the main handlePrint that doesn't have handleExportCSV right after it.
content = content.replace(/    printWindow\.document\.write\(content\);\n\s*printWindow\.document\.close\(\);\n\s*\};\n\n\s*const getStatusColor/g, 
`    const blob = new Blob([content], { type: "text/html" });
    const localUrl = URL.createObjectURL(blob);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = \`Logistics_Report_\${new Date().toISOString().split('T')[0]}.html\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getStatusColor`);

fs.writeFileSync('src/App.jsx', content);
