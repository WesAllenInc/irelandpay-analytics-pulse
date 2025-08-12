import fs from 'fs';
import path from 'path';

// Files that need to be updated with absolute paths from root
const filesToUpdate = [
  'app/admin/agent-payouts/page.tsx',
  'app/admin/dashboard/page.tsx',
  'app/admin/user-management/page.tsx',
  'app/auth/callback/page.tsx',
  'app/auth/login/page.tsx',
  'app/auth/page.tsx',
  'app/page.tsx',
  'components/Auth/AuthCard.tsx',
  'components/Auth/OAuthButton.tsx',
  'components/Auth/SimplifiedAuthCard.tsx',
  'components/admin/AdminAgentTable.tsx',
  'components/admin/AgentDetailView.tsx',
  'components/admin/BatchPayoutApproval.tsx',
  'components/admin/BulkPayoutExport.tsx',
  'components/dashboard/merchant-summary.tsx',
  'components/sync/SyncAnalytics.tsx',
  'components/sync/SyncHistory.tsx',
  'components/sync/SyncProgressBar.tsx',
  'components/sync/SyncProgressDisplay.tsx',
  'hooks/use-realtime-data.ts',
  'hooks/useAgentDashboard.ts',
  'hooks/use-merchant-data.ts',
  'hooks/useAuth.tsx',
  'hooks/useAuth.ts.new',
  'lib/auth/admin-service-client.ts',
  'lib/archive/archive-manager.ts',
  'utils/supabaseClient.ts'
];

// Update each file
filesToUpdate.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace all the problematic imports with absolute path from root
      content = content.replace(
        /from ['"]@\/lib\/supabase\/client['"]/g,
        "from 'lib/supabase/client'"
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/lib\/supabase\/client['"]/g,
        "from 'lib/supabase/client'"
      );
      content = content.replace(
        /from ['"]@\/lib\/supabase['"]/g,
        "from 'lib/supabase/client'"
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/lib\/supabase\/client['"]/g,
        "from 'lib/supabase/client'"
      );
      content = content.replace(
        /from ['"]\.\.\/lib\/supabase\/client['"]/g,
        "from 'lib/supabase/client'"
      );
      content = content.replace(
        /from ['"]\.\.\/supabase\/client['"]/g,
        "from 'lib/supabase/client'"
      );
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated ${filePath} with absolute path`);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Import fixes completed!');
