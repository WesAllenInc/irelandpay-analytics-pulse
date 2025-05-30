'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-gray-800 hover:bg-gray-900/50">
          <TableHead className="text-gray-400">Merchant</TableHead>
          <TableHead className="text-gray-400">MID</TableHead>
          <TableHead className="text-gray-400 text-right">Volume</TableHead>
          <TableHead className="text-gray-400 text-right">Transactions</TableHead>
          <TableHead className="text-gray-400 text-right">Net Profit</TableHead>
          <TableHead className="text-gray-400 text-right">Margin</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {merchants.map((merchant) => (
          <TableRow key={merchant.mid} className="border-gray-800 hover:bg-gray-900/50">
            <TableCell className="font-medium text-white">
              {merchant.merchant_dba}
            </TableCell>
            <TableCell className="text-gray-400 font-mono text-sm">
              {merchant.mid}
            </TableCell>
            <TableCell className="text-right text-white">
              {formatCurrency(merchant.merchant_volume)}
            </TableCell>
            <TableCell className="text-right text-gray-400">
              {formatNumber(merchant.total_txns)}
            </TableCell>
            <TableCell className="text-right text-white">
              {merchant.net_profit ? formatCurrency(merchant.net_profit) : '-'}
            </TableCell>
            <TableCell className="text-right">
              {merchant.profit_margin ? (
                <Badge 
                  variant={merchant.profit_margin > 0 ? 'default' : 'destructive'}
                  className={merchant.profit_margin > 0 ? 'bg-green-900 text-green-300' : ''}
                >
                  {merchant.profit_margin.toFixed(2)}%
                </Badge>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              <Link 
                href={`/dashboard/merchants/${merchant.mid}`}
                className="text-blue-500 hover:text-blue-400 inline-flex items-center"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}