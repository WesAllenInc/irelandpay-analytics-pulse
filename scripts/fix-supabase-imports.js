const fs = require('fs');
const path = require('path');

// Directories to exclude
const excludeDirs = ['node_modules', '.next', 'out', 'dist', '.git'];

// Function to recursively find files
function findFiles(dir, extension) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !excludeDirs.includes(file)) {
      // Recursively search directories
      results = results.concat(findFiles(filePath, extension));
    } else if (stat.isFile() && file.endsWith(extension)) {
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
    
    // Replace auth-helpers-nextjs imports with ssr
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      console.log(`Fixing imports in ${filePath}`);
      
      // Replace createBrowserClient with createBrowserClient
      content = content.replace(
        /import\s*{\s*createBrowserClient\s*}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
        `import { createBrowserClient } from '@supabase/ssr'`
      );
      
      // Replace createServerClient with createServerClient
      content = content.replace(
        /import\s*{\s*createServerClient\s*}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
        `import { createServerClient } from '@supabase/ssr'`
      );
      
      // Replace usage in code
      content = content.replace(/createBrowserClient/g, 'createBrowserClient');
      content = content.replace(/createServerClient/g, 'createServerClient');
      
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
  const tsFiles = findFiles(rootDir, '.ts');
  const tsxFiles = findFiles(rootDir, '.tsx');
  const jsFiles = findFiles(rootDir, '.js');
  const jsxFiles = findFiles(rootDir, '.jsx');
  
  const allFiles = [...tsFiles, ...tsxFiles, ...jsFiles, ...jsxFiles];
  console.log(`Found ${allFiles.length} files to check`);
  
  // Process each file
  allFiles.forEach(file => {
    fixImportsInFile(file);
  });
  
  console.log('Done fixing imports');
}

main();
