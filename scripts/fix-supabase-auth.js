const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript and JavaScript files in the project
console.log('Finding all TypeScript and JavaScript files...');
const findCommand = 'npx find-in-files --find "@supabase/auth-helpers-nextjs" --target "**/*.{ts,tsx,js,jsx}" --exclude "node_modules/**"';

try {
  const findOutput = execSync(findCommand, { cwd: process.cwd(), encoding: 'utf8' });
  console.log('Search results:', findOutput);
  
  // Extract file paths from the output
  const filePaths = findOutput
    .split('\n')
    .filter(line => line.includes(':'))
    .map(line => line.split(':')[0]);
  
  // Remove duplicates
  const uniqueFilePaths = [...new Set(filePaths)];
  
  console.log(`Found ${uniqueFilePaths.length} files with references to @supabase/auth-helpers-nextjs`);
  
  // Process each file
  uniqueFilePaths.forEach(filePath => {
    if (!filePath || !fs.existsSync(filePath)) return;
    
    console.log(`Processing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if the file imports directly from auth-helpers-nextjs
    if (content.includes('@supabase/auth-helpers-nextjs')) {
      console.log(`  - Found direct import in ${filePath}`);
      
      // Replace direct imports with imports from our compatibility layer
      content = content.replace(
        /import\s*{([^}]*)}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
        'import {$1} from "@/lib/supabase-compat"'
      );
      
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  - Updated ${filePath}`);
    } else {
      console.log(`  - No changes needed for ${filePath}`);
    }
  });
  
  console.log('Done fixing Supabase auth imports');
} catch (error) {
  console.error('Error:', error.message);
  
  // Alternative approach: use grep to find files
  console.log('Trying alternative approach with grep...');
  
  try {
    // Find files containing the string
    const grepCommand = 'grep -r "@supabase/auth-helpers-nextjs" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . --exclude-dir=node_modules';
    const grepOutput = execSync(grepCommand, { cwd: process.cwd(), encoding: 'utf8' });
    
    // Extract file paths from grep output
    const filePaths = grepOutput
      .split('\n')
      .filter(line => line.includes(':'))
      .map(line => line.split(':')[0]);
    
    // Remove duplicates
    const uniqueFilePaths = [...new Set(filePaths)];
    
    console.log(`Found ${uniqueFilePaths.length} files with references to @supabase/auth-helpers-nextjs`);
    
    // Process each file
    uniqueFilePaths.forEach(filePath => {
      if (!filePath || !fs.existsSync(filePath)) return;
      
      console.log(`Processing ${filePath}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Check if the file imports directly from auth-helpers-nextjs
      if (content.includes('@supabase/auth-helpers-nextjs')) {
        console.log(`  - Found direct import in ${filePath}`);
        
        // Replace direct imports with imports from our compatibility layer
        content = content.replace(
          /import\s*{([^}]*)}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
          'import {$1} from "@/lib/supabase-compat"'
        );
        
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  - Updated ${filePath}`);
      } else {
        console.log(`  - No changes needed for ${filePath}`);
      }
    });
    
    console.log('Done fixing Supabase auth imports');
  } catch (error) {
    console.error('Error with grep approach:', error.message);
  }
}
