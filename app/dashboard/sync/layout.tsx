import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ireland Pay CRM Sync | IrelandPay Analytics Pulse',
  description: 'Synchronize merchant and residual data from Ireland Pay CRM',
}

export default function SyncLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
