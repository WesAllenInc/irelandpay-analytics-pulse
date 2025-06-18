'use client'

import React from 'react'
import Link from 'next/link'
import { FeyTable, Column } from '@/components/ui/FeyTable'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface Merchant {
  mid: string
  merchant_dba: string
  merchant_volume: number
  total_txns: number
  net_profit: number | null
  profit_margin: number | null
}

interface MerchantTableProps {
  merchants: Merchant[]
}

export function MerchantTable({ merchants }: MerchantTableProps) {
  const columns: Column<Merchant>[] = [
    {
      key: 'merchant_dba',
      label: 'Merchant',
      render: (row) => (
        <Link
          href={`/dashboard/merchants/${row.mid}`}
          className="hover:underline hover:text-primary"
        >
          {row.merchant_dba}
        </Link>
      ),
    },
    {
      key: 'mid',
      label: 'MID',
      render: (row) => (
        <span className="font-mono text-xs text-foreground-subtle">
          {row.mid}
        </span>
      ),
    },
    {
      key: 'merchant_volume',
      label: 'Volume',
      render: (row) => formatCurrency(row.merchant_volume),
    },
    {
      key: 'total_txns',
      label: 'Transactions',
      render: (row) => formatNumber(row.total_txns),
    },
    {
      key: 'net_profit',
      label: 'Net Profit',
      render: (row) => (row.net_profit !== null ? formatCurrency(row.net_profit) : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        let variant: string
        let label: string
        if (row.profit_margin == null) {
          variant = 'outline'
          label = 'New'
        } else if (row.profit_margin < 0) {
          variant = 'destructive'
          label = 'Underperforming'
        } else if (row.merchant_volume > 100000) {
          variant = 'default'
          label = 'Active'
        } else {
          variant = 'secondary'
          label = 'Active'
        }
        return <Badge variant={variant}>{label}</Badge>
      },
    },
  ]

  return (
    <FeyTable
      title="Merchant List"
      columns={columns}
      data={merchants}
    />
  )
}