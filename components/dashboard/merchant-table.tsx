'use client'

import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  BarChart2, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Activity
} from 'lucide-react'

interface Merchant {
  id: string
  merchant_name: string
  merchant_volume: number
  transaction_count: number
  avg_transaction_value: number
  growth_rate: number
  status: 'active' | 'inactive' | 'pending'
}

interface MerchantTableProps {
  merchants: Merchant[]
}

export function MerchantTable({ merchants }: MerchantTableProps) {
  const [sortField, setSortField] = useState<keyof Merchant>('merchant_volume')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const sortedMerchants = [...merchants].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue)
    }
    
    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number) 
      : (bValue as number) - (aValue as number)
  })
  
  const handleSort = (field: keyof Merchant) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('merchant_name')}
            >
              Merchant
              {sortField === 'merchant_name' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('merchant_volume')}
            >
              Volume
              {sortField === 'merchant_volume' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('transaction_count')}
            >
              Transactions
              {sortField === 'transaction_count' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('avg_transaction_value')}
            >
              Avg. Value
              {sortField === 'avg_transaction_value' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('growth_rate')}
            >
              Growth
              {sortField === 'growth_rate' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMerchants.map((merchant) => (
            <TableRow key={merchant.id}>
              <TableCell className="font-medium">{merchant.merchant_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(merchant.merchant_volume)}</TableCell>
              <TableCell className="text-right">{merchant.transaction_count.toLocaleString()}</TableCell>
              <TableCell className="text-right">{formatCurrency(merchant.avg_transaction_value)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end">
                  {merchant.growth_rate > 0 ? (
                    <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                  ) : merchant.growth_rate < 0 ? (
                    <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                  ) : (
                    <Activity className="mr-1 h-4 w-4 text-yellow-500" />
                  )}
                  <span className={merchant.growth_rate > 0 ? 'text-green-500' : merchant.growth_rate < 0 ? 'text-red-500' : 'text-yellow-500'}>
                    {Math.abs(merchant.growth_rate).toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  merchant.status === 'active' ? 'bg-green-500/20 text-green-500' :
                  merchant.status === 'inactive' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}