const fs = require('fs');
const path = require('path');

// Files to update based on the Vercel error
const filesToUpdate = [
  'app/dashboard/merchants/compare/page.tsx',
  'components/UploadMerchants.tsx',
  'components/UploadResiduals.tsx',
  'app/api/process-merchant-excel/route.ts',
  'app/api/process-residual-excel/route.ts'
];

// Function to update imports in a file
function updateImports(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;
    
    // Replace imports from @supabase/ssr with our compatibility layer
    if (content.includes('@supabase/ssr')) {
      console.log(`Updating imports in ${filePath}`);
      
      // Replace createBrowserClient import
      const updatedContent = content.replace(
        /import\s*{\s*createBrowserClient\s*}\s*from\s*['"]@supabase\/ssr['"]/g,
        'import { createClientComponentClient } from "@/lib/supabase-compat"'
      );
      
      // Replace usage of createBrowserClient with createClientComponentClient
      const finalContent = updatedContent.replace(
        /createBrowserClient\s*<.*?>\s*\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!\s*\)/g,
        'createClientComponentClient<Database>()'
      );
      
      if (content !== finalContent) {
        fs.writeFileSync(fullPath, finalContent, 'utf8');
        updated = true;
        console.log(`Updated ${filePath}`);
      }
    }
    
    return updated;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Update all files
console.log('Updating imports in specified files...');
let updatedCount = 0;

filesToUpdate.forEach(filePath => {
  if (updateImports(filePath)) {
    updatedCount++;
  }
});

console.log(`Done! Updated ${updatedCount} files.`);
