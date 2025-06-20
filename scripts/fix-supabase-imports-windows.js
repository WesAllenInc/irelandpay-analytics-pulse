const fs = require('fs');
const path = require('path');

// Directories to search
const dirsToSearch = [
  'app',
  'components',
  'lib',
  'utils'
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
let modifiedCount = 0;

allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file imports from @supabase/auth-helpers-nextjs
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      console.log(`Found reference in ${filePath}`);
      
      // Replace the import with our compatibility layer
      const updatedContent = content.replace(
        /import\s*{([^}]*)}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
        'import {$1} from "@/lib/supabase-compat"'
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated ${filePath}`);
        modifiedCount++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log(`Done! Modified ${modifiedCount} files.`);
