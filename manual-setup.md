# Manual Setup Instructions for Ireland Pay Analytics

## Required Software Installation

1. **Install Node.js LTS (v20+)**
   - Download from: https://nodejs.org/
   - Select the LTS version
   - Run the installer with default settings
   - Restart your PowerShell after installation

2. **Fix Environment Variables**
   - After installing Node.js, ensure these paths are in your system PATH:
     - `C:\Program Files\nodejs\`
     - `%USERPROFILE%\AppData\Roaming\npm`

3. **Fix Supabase Configuration**
   - Ensure your `.env.local` file has proper formatting:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://ainmbbtycciukbjjdjtl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_correct_anon_key_here
   NEXT_PUBLIC_SUPABASE_PROJECT_ID=ainmbbtycciukbjjdjtl
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Apply Supabase Security Fixes**
   - After installing Node.js, run:
   ```
   supabase link --project-ref ainmbbtycciukbjjdjtl
   ```
   - Then execute the SQL script we created:
   ```
   supabase db execute --file ./supabase/migrations/20250625_fix_security_issues.sql
   ```

5. **Install Project Dependencies**
   - After Node.js is installed:
   ```
   npm install
   ```

6. **Verify Next.js Build**
   ```
   npm run build
   ```
