const fs = require('fs');
let code = fs.readFileSync('c:/LibLog/desktop/src/pages/Reports.jsx', 'utf8');

// Replace excessive bottom margins and padding on metric sections
code = code.replace(/<div className="grid grid-cols-12 gap-6 pb-12">/g, '<div className="grid grid-cols-12 gap-6 mb-2">');
code = code.replace(/<div className="grid grid-cols-2 gap-6 mb-8">/g, '<div className="grid grid-cols-2 gap-6 mb-2">');
code = code.replace(/<div className="grid grid-cols-3 gap-6 mb-8">/g, '<div className="grid grid-cols-3 gap-6 mb-2">');
code = code.replace(/className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col mb-8"/g, 'className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col mb-2"');

// Reduce top margins on section headers
code = code.replace(/<div className="flex items-center gap-4 mt-8 mb-4">/g, '<div className="flex items-center gap-4 mt-2 mb-4">');

fs.writeFileSync('c:/LibLog/desktop/src/pages/Reports.jsx', code);
console.log("Updated Reports.jsx");
