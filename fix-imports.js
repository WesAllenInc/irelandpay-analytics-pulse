import fs from 'fs';
import path from 'path';

// Files that need to be updated with their correct relative paths
const filesToUpdate = [
  { file: 'app/admin/agent-payouts/page.tsx', path: '../../../lib/supabase/client' },
  { file: 'app/admin/dashboard/page.tsx', path: '../../../lib/supabase/client' },
  { file: 'app/admin/user-management/page.tsx', path: '../../../lib/supabase/client' },
  { file: 'app/auth/callback/page.tsx', path: '../../../lib/supabase/client' },
  { file: 'app/auth/login/page.tsx', path: '../../../lib/supabase/client' },
  { file: 'app/auth/page.tsx', path: '../../lib/supabase/client' },
  { file: 'app/page.tsx', path: '../lib/supabase/client' },
  { file: 'components/Auth/AuthCard.tsx', path: '../../lib/supabase/client' },
  { file: 'components/Auth/OAuthButton.tsx', path: '../../lib/supabase/client' },
  { file: 'components/Auth/SimplifiedAuthCard.tsx', path: '../../lib/supabase/client' },
  { file: 'components/admin/AdminAgentTable.tsx', path: '../../lib/supabase/client' },
  { file: 'components/admin/AgentDetailView.tsx', path: '../../lib/supabase/client' },
  { file: 'components/admin/BatchPayoutApproval.tsx', path: '../../lib/supabase/client' },
  { file: 'components/admin/BulkPayoutExport.tsx', path: '../../lib/supabase/client' },
  { file: 'components/dashboard/merchant-summary.tsx', path: '../../lib/supabase/client' },
  { file: 'components/sync/SyncAnalytics.tsx', path: '../../lib/supabase/client' },
  { file: 'components/sync/SyncHistory.tsx', path: '../../lib/supabase/client' },
  { file: 'components/sync/SyncProgressBar.tsx', path: '../../lib/supabase/client' },
  { file: 'components/sync/SyncProgressDisplay.tsx', path: '../../lib/supabase/client' },
  { file: 'hooks/use-realtime-data.ts', path: '../lib/supabase/client' },
  { file: 'hooks/useAgentDashboard.ts', path: '../lib/supabase/client' },
  { file: 'hooks/use-merchant-data.ts', path: '../lib/supabase/client' },
  { file: 'hooks/useAuth.tsx', path: '../lib/supabase/client' },
  { file: 'hooks/useAuth.ts.new', path: '../lib/supabase/client' },
  { file: 'lib/auth/admin-service-client.ts', path: '../supabase/client' },
  { file: 'lib/archive/archive-manager.ts', path: '../supabase/client' },
  { file: 'utils/supabaseClient.ts', path: '../lib/supabase/client' }
];

// Update each file
filesToUpdate.forEach(({ file: filePath, path: importPath }) => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace all the problematic imports with the correct relative path
      content = content.replace(
        /from ['"]@\/lib\/supabase\/client['"]/g,
        `from '${importPath}'`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/lib\/supabase\/client['"]/g,
        `from '${importPath}'`
      );
      content = content.replace(
        /from ['"]@\/lib\/supabase['"]/g,
        `from '${importPath}'`
      );
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated ${filePath} with ${importPath}`);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Import fixes completed!');
