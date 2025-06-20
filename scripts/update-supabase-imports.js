const fs = require('fs');
const path = require('path');

// Directories to exclude
const excludeDirs = ['node_modules', '.next', 'out', 'dist', '.git'];

// Function to recursively find files
function findFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !excludeDirs.includes(file)) {
      // Recursively search directories
      results = results.concat(findFiles(filePath, extensions));
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check for auth-helpers-nextjs imports
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      console.log(`Fixing imports in ${filePath}`);
      
      // Replace with our compatibility layer
      content = content.replace(
        /import\s*{([^}]*)}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
        'import {$1} from \'@/lib/supabase-compat\''
      );
      
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Main function
function main() {
  const rootDir = path.resolve(__dirname, '..');
  console.log(`Searching for files in ${rootDir}`);
  
  // Find TypeScript and JavaScript files
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const allFiles = findFiles(rootDir, extensions);
  
  console.log(`Found ${allFiles.length} files to check`);
  
  // Process each file
  allFiles.forEach(file => {
    fixImportsInFile(file);
  });
  
  console.log('Done fixing imports');
}

main();
