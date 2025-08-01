import { redirect } from 'next/navigation'
import { isFirstRun } from '@/lib/auth/admin-check'
import { SetupWizard } from '@/components/setup-wizard/SetupWizard'

export default async function SetupPage() {
  // Check if this is actually a first run
  const firstRun = await isFirstRun()
  
  if (!firstRun) {
    // If not first run, redirect to dashboard
    redirect('/dashboard')
  }

  return <SetupWizard />
} 