import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon, DollarSign, CreditCard, Users, TrendingUp, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
      description: 'Monthly processing volume',
      tooltip: 'Total dollar volume processed this month',
      value: formatCurrency(metrics.totalVolume),
      change: metrics.volumeChange,
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      title: 'Transactions',
      description: 'Total transaction count',
      tooltip: 'Number of transactions processed',
      value: formatNumber(metrics.totalTransactions),
      change: metrics.transactionsChange,
      icon: CreditCard,
      color: 'text-green-500',
    },
    {
      title: 'Active Merchants',
      description: 'Merchants with activity',
      tooltip: 'Number of merchants with transactions',
      value: formatNumber(metrics.activeMerchants),
      change: 0,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      title: 'Avg Transaction',
      description: 'Average ticket size',
      tooltip: 'Average value per transaction',
      value: formatCurrency(metrics.avgTransactionValue),
      change: 0,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border shadow-sm overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <CardDescription className="text-xs hidden sm:block">
                {card.description || 'Monthly aggregate'}
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "p-2 rounded-full",
                    card.color === 'text-blue-500' ? 'bg-blue-100' : '',
                    card.color === 'text-green-500' ? 'bg-green-100' : '',
                    card.color === 'text-purple-500' ? 'bg-purple-100' : '',
                    card.color === 'text-orange-500' ? 'bg-orange-100' : ''
                  )}>
                    <card.icon className={cn("h-4 w-4", card.color)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{card.tooltip || `View ${card.title.toLowerCase()} details`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
          <CardFooter className="pt-0 px-4 pb-4">
            {card.change !== 0 ? (
              <p className="text-xs text-muted-foreground flex items-center">
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
            ) : (
              <p className="text-xs text-muted-foreground flex items-center">
                <span>Updated today</span>
              </p>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}