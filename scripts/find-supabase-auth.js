const fs = require('fs');
const path = require('path');

// Directories to search
const dirsToSearch = [
  'app',
  'components',
  'lib',
  'utils'
];

// Patterns to search for
const patterns = [
  'createServerComponentClient',
  'createClientComponentClient',
  'createRouteHandlerClient',
  '@supabase/auth-helpers-nextjs'
];

// Function to recursively search for files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
      findFiles(filePath, fileList);
    } else if (
      stat.isFile() && 
      (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find all TypeScript and JavaScript files in the project
console.log('Finding all TypeScript and JavaScript files...');
let allFiles = [];

dirsToSearch.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    const files = findFiles(dirPath);
    allFiles = allFiles.concat(files);
  }
});

console.log(`Found ${allFiles.length} TypeScript and JavaScript files`);

// Process each file
let matchingFiles = [];

allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains any of the patterns
    const matches = patterns.filter(pattern => content.includes(pattern));
    
    if (matches.length > 0) {
      matchingFiles.push({
        path: filePath,
        patterns: matches
      });
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

// Print results
console.log(`\nFound ${matchingFiles.length} files with Supabase auth patterns:`);
matchingFiles.forEach(file => {
  console.log(`\n${file.path}`);
  console.log(`  Patterns: ${file.patterns.join(', ')}`);
});
