const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'desktop', 'src');

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

const files = walk(srcDir);
let changedCount = 0;

const searchString = 'http://${window.location.hostname}:5000/api';
const replacement = "${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}";

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(searchString)) {
        content = content.split(searchString).join(replacement);
        fs.writeFileSync(file, content);
        changedCount++;
        console.log('Updated', file);
    }
});

console.log(`Updated ${changedCount} files.`);
