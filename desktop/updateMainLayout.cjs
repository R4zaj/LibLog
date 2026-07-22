const fs = require('fs');

let layoutCode = fs.readFileSync('src/MainLayout.jsx', 'utf8');

const replacements = [
  ['className="flex h-screen bg-gray-50 font-sans text-gray-900"', 'className="flex h-screen bg-gray-50 dark:bg-dark-bg font-sans text-gray-900 dark:text-slate-200"'],
  ['className="w-64 bg-sidebar-bg border-r border-gray-200 flex flex-col shadow-sm z-10 shrink-0"', 'className="w-64 bg-sidebar-bg dark:bg-dark-sidebar border-r border-gray-200 dark:border-dark-border flex flex-col shadow-sm z-10 shrink-0"'],
  ['className="h-16 flex items-center px-6 border-b border-gray-200 gap-3"', 'className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-dark-border gap-3"'],
  ['className="font-bold text-lg text-primary-900 leading-tight"', 'className="font-bold text-lg text-primary-900 dark:text-primary-300 leading-tight"'],
  ['className="p-4 border-t border-gray-200 bg-sidebar-bg flex flex-col gap-4"', 'className="p-4 border-t border-gray-200 dark:border-dark-border bg-sidebar-bg dark:bg-dark-sidebar flex flex-col gap-4"'],
  ['className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2"', 'className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-dark-border mt-2"'],
  ['<span className="text-xs font-bold text-gray-800">Admin Librarian</span>', '<span className="text-xs font-bold text-gray-800 dark:text-slate-200">Admin Librarian</span>'],
  ['<main className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">', '<main className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-dark-bg">'],
  ['bg-primary-50 text-primary-800 font-semibold', 'bg-primary-50 dark:bg-dark-hover text-primary-800 dark:text-primary-300 font-semibold'],
  ["text-gray-600 hover:bg-gray-100 hover:text-gray-900", "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-white"],
  ['border-l-2 border-gray-200 pl-3', 'border-l-2 border-gray-200 dark:border-dark-border pl-3'],
  ["isSubActive ? 'text-primary-700 font-bold bg-primary-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'", "isSubActive ? 'text-primary-700 dark:text-primary-300 font-bold bg-primary-50/50 dark:bg-dark-hover' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-dark-hover/50'"]
];

for (const [search, replace] of replacements) {
  layoutCode = layoutCode.replace(search, replace);
}

fs.writeFileSync('src/MainLayout.jsx', layoutCode);
console.log("MainLayout.jsx updated.");
