const fs = require('fs');

const filesToUpdate = ['src/pages/Dashboard.jsx', 'src/pages/Literatures.jsx', 'src/pages/Reports.jsx'];

const replacements = [
  // Backgrounds
  ['bg-white', 'bg-white dark:bg-dark-card'],
  ['bg-gray-50 ', 'bg-gray-50 dark:bg-dark-bg '],
  ['bg-gray-50/', 'bg-gray-50/'], // prevent double matching
  ['bg-[#f8f9fc]', 'bg-[#f8f9fc] dark:bg-dark-bg'],
  ['bg-[#f4f5f8]', 'bg-[#f4f5f8] dark:bg-dark-bg'],
  // Borders
  ['border-gray-200', 'border-gray-200 dark:border-dark-border'],
  ['border-gray-100', 'border-gray-100 dark:border-dark-border'],
  ['border-b ', 'border-b '], // Just to be safe, border-gray-* covers it
  // Texts
  ['text-gray-900', 'text-gray-900 dark:text-slate-200'],
  ['text-gray-800', 'text-gray-800 dark:text-slate-300'],
  ['text-gray-500', 'text-gray-500 dark:text-slate-400'],
  ['text-gray-400', 'text-gray-400 dark:text-slate-500'],
  ['text-gray-600', 'text-gray-600 dark:text-slate-300'],
  // Hover states
  ['hover:bg-gray-50', 'hover:bg-gray-50 dark:hover:bg-dark-hover'],
  ['hover:bg-gray-100', 'hover:bg-gray-100 dark:hover:bg-dark-hover'],
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    for (const [search, replace] of replacements) {
      // Use regex to avoid replacing already replaced strings (e.g., if we run script multiple times)
      // Only replace if it doesn't already have dark: right after
      const regex = new RegExp(search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?![\\w\\s]*dark:)', 'g');
      code = code.replace(regex, replace);
    }
    
    fs.writeFileSync(file, code);
    console.log(`Updated ${file}`);
  }
}
