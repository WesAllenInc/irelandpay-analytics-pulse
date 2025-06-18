import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon, DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react'

interface MetricsCardsProps {
  metrics: {
    totalVolume: number
    volumeChange: number
    totalTransactions: number
    transactionsChange: number
    activeMerchants: number
    avgTransactionValue: number
  }
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
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

  const cards = [
    {
      title: 'Total Volume',
      value: formatCurrency(metrics.totalVolume),
      change: metrics.volumeChange,
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      title: 'Transactions',
      value: formatNumber(metrics.totalTransactions),
      change: metrics.transactionsChange,
      icon: CreditCard,
      color: 'text-green-500',
    },
    {
      title: 'Active Merchants',
      value: formatNumber(metrics.activeMerchants),
      change: 0,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      title: 'Avg Transaction',
      value: formatCurrency(metrics.avgTransactionValue),
      change: 0,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            {card.change !== 0 && (
              <p className="text-xs text-gray-400 flex items-center mt-1">
                {card.change > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={card.change > 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(card.change).toFixed(1)}%
                </span>
                <span className="ml-1">from last month</span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}