const fs = require('fs');
const path = require('path');

// Files that are causing build errors
const filesToFix = [
  'app/dashboard/merchants/compare/page.tsx',
  'components/UploadMerchants.tsx',
  'components/UploadResiduals.tsx',
  'app/api/process-merchant-excel/route.ts',
  'app/api/process-residual-excel/route.ts'
];

// Function to fix imports in a file
function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Check for auth-helpers-nextjs imports
  if (content.includes('@supabase/auth-helpers-nextjs')) {
    console.log(`Fixing imports in ${filePath}`);
    
    // Replace with our compatibility layer
    content = content.replace(
      /import\s*{\s*createClientComponentClient\s*}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
      "import { createBrowserClient } from '@supabase/ssr'"
    );
    
    content = content.replace(
      /import\s*{\s*createServerComponentClient\s*}\s*from\s*['"]@supabase\/auth-helpers-nextjs['"]/g,
      "import { createServerClient } from '@supabase/ssr'"
    );
    
    // Replace usage in code
    content = content.replace(/createClientComponentClient/g, 'createBrowserClient');
    content = content.replace(/createServerComponentClient/g, 'createServerClient');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Process each file
filesToFix.forEach(file => {
  console.log(`Checking ${file}...`);
  fixFile(file);
});

console.log('Done fixing build issues');
