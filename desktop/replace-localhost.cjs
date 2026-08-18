const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('c:\\LibLog\\desktop\\src');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace single quoted string URLs with template literals
  let updated = content.replace(/'http:\/\/localhost:5000([^']+)'/g, '`http://${window.location.hostname}:5000$1`');
  
  // Replace double quoted string URLs with template literals (just in case)
  updated = updated.replace(/"http:\/\/localhost:5000([^"]+)"/g, '`http://${window.location.hostname}:5000$1`');

  // Replace inside existing template literals
  updated = updated.replace(/`http:\/\/localhost:5000([^`]+)`/g, '`http://${window.location.hostname}:5000$1`');
  
  if (content !== updated) {
    fs.writeFileSync(file, updated, 'utf8');
    count++;
    console.log('Updated ' + file);
  }
});
console.log(`Replaced localhost with window.location.hostname in ${count} files.`);
