import { redirect } from 'next/navigation'
import { isFirstRun } from '@/lib/auth/admin-check'
import { SetupWizard } from '@/components/setup-wizard/SetupWizard'

// Force dynamic rendering to prevent cookie issues during static generation
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  // Check if this is actually a first run
  const firstRun = await isFirstRun()
  
  if (!firstRun) {
    // If not first run, redirect to dashboard
    redirect('/dashboard')
  }

  return <SetupWizard />
} 