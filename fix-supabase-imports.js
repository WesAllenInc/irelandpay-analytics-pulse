/**
 * Script to replace deprecated Supabase auth-helpers-nextjs imports with ssr package
 * This script will fix all imports across the codebase to ensure deployment works
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Finding files with deprecated Supabase auth-helpers imports...');

// Get list of all files that might contain the deprecated imports
let filesWithImports;
try {
  const grepResult = execSync('npx grep-cli -r "@supabase/auth-helpers-nextjs" --include="*.{ts,tsx}" .', { encoding: 'utf8' });
  filesWithImports = grepResult.split('\n')
    .filter(line => line.includes('@supabase/auth-helpers-nextjs'))
    .map(line => {
      const match = line.match(/^([^:]+):/);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .filter((file, index, self) => self.indexOf(file) === index); // Remove duplicates
} catch (error) {
  // If grep-cli fails or isn't available, use a hardcoded list of files from the error message
  console.log('⚠️ Using predefined list of files that need fixing...');
  filesWithImports = [
    './app/dashboard/merchants/compare/page.tsx',
    './components/UploadMerchants.tsx',
    './components/UploadResiduals.tsx',
    './components/dashboard/residual-payouts-summary.tsx',
    './app/api/process-merchant-excel/route.ts',
    './app/api/process-residual-excel/route.ts',
  ];
}

console.log(`🔧 Found ${filesWithImports.length} files to update:`);
filesWithImports.forEach(file => console.log(`   - ${file}`));

// Process each file
filesWithImports.forEach(file => {
  try {
    const filePath = path.resolve(process.cwd(), file);
    console.log(`\n📄 Processing ${file}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let isUpdated = false;

    // Replace imports
    if (content.includes('import { createClientComponentClient } from \'@supabase/auth-helpers-nextjs\'')) {
      content = content.replace(
        'import { createClientComponentClient } from \'@supabase/auth-helpers-nextjs\'',
        'import { createBrowserClient } from \'@supabase/ssr\''
      );
      isUpdated = true;
    }
    
    if (content.includes('import { createRouteHandlerClient } from \'@supabase/auth-helpers-nextjs\'')) {
      content = content.replace(
        'import { createRouteHandlerClient } from \'@supabase/auth-helpers-nextjs\'',
        'import { createClient } from \'@supabase/supabase-js\''
      );
      isUpdated = true;
    }
    
    // Replace client initialization for client components
    if (content.includes('const supabase = createClientComponentClient')) {
      content = content.replace(
        /const\s+(\w+)\s+=\s+createClientComponentClient(?:<([^>]+)>)?\(\)/g,
        (match, varName, generic) => {
          const genericPart = generic ? `<${generic}>` : '';
          return `const ${varName} = createBrowserClient${genericPart}(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  )`;
        }
      );
      isUpdated = true;
    }
    
    // Replace client initialization for API routes
    if (content.includes('const supabase = createRouteHandlerClient')) {
      content = content.replace(
        /const\s+(\w+)\s+=\s+createRouteHandlerClient(?:<([^>]+)>)?\(\{\s*cookies\s*\}\)/g,
        (match, varName, generic) => {
          const genericPart = generic ? `<${generic}>` : '';
          return `const ${varName} = createClient${genericPart}(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  )`;
        }
      );
      isUpdated = true;
    }
    
    if (isUpdated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`⚠️ No updates needed for ${file} or pattern not matched`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n🎉 Finished updating Supabase imports!\n');
console.log('Next steps:');
console.log('1. Commit your changes to GitHub: git add . && git commit -m "Fix: Update Supabase dependencies"');
console.log('2. Push the changes: git push origin main');
console.log('3. Redeploy on Vercel: vercel --prod');
console.log('\nThis should resolve the build errors during deployment.');
