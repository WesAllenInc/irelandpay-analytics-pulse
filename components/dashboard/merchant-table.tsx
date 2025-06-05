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
import { ArrowUpRight, MoreHorizontal, Eye, Edit, BarChart, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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
  
  const getMerchantStatusBadge = (merchant: Merchant) => {
    // Determine merchant status based on metrics
    if (!merchant.profit_margin) return { label: 'New', variant: 'outline' as const };
    if (merchant.profit_margin < 0) return { label: 'Underperforming', variant: 'destructive' as const };
    if (merchant.merchant_volume > 100000) return { label: 'Active', variant: 'default' as const };
    return { label: 'Active', variant: 'secondary' as const };
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl font-semibold">Merchant List</CardTitle>
        <CardDescription>View and manage your merchant accounts</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>MID</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right hidden md:table-cell">Transactions</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Net Profit</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No merchants found
                </TableCell>
              </TableRow>
            ) : merchants.map((merchant) => {
              const status = getMerchantStatusBadge(merchant);
              return (
                <TableRow key={merchant.mid}>
                  <TableCell className="font-medium">
                    {merchant.merchant_dba}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {merchant.mid}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(merchant.merchant_volume)}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                    {formatNumber(merchant.total_txns)}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {merchant.net_profit ? formatCurrency(merchant.net_profit) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/merchants/${merchant.mid}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart className="mr-2 h-4 w-4" />
                          <span>View Metrics</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          <span>Flag Issues</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}