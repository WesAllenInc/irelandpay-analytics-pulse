"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, Store, CreditCard, BarChart2, FileSpreadsheet } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import { cn } from "@/lib/utils"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  url: string
  category: string
  badge?: string
}

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = React.useState<SearchResult[]>([])

  // Open dialog with keyboard shortcut
  useHotkeys("ctrl+k, cmd+k", (event) => {
    event.preventDefault()
    setOpen(true)
  })

  // Load recent searches from localStorage on mount
  React.useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches")
    if (savedSearches) {
      try {
        const parsed = JSON.parse(savedSearches)
        setRecentSearches(parsed.slice(0, 5)) // Only show 5 most recent
      } catch (error) {
        console.error("Failed to parse recent searches:", error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = (result: SearchResult) => {
    const updatedSearches = [
      result,
      ...recentSearches.filter((item) => item.id !== result.id),
    ].slice(0, 5)
    
    setRecentSearches(updatedSearches)
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches))
  }

  // Mock search function - in a real app, this would call an API
  const performSearch = React.useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mock results - in a real app, these would come from an API
      const mockResults: SearchResult[] = [
        {
          id: "merchant-1",
          title: "ABC Merchant",
          description: "Merchant ID: 12345",
          icon: <Store className="h-4 w-4" />,
          url: "/dashboard/merchants/12345",
          category: "Merchants",
          badge: "Active",
        },
        {
          id: "merchant-2",
          title: "XYZ Store",
          description: "Merchant ID: 67890",
          icon: <Store className="h-4 w-4" />,
          url: "/dashboard/merchants/67890",
          category: "Merchants",
          badge: "New",
        },
        {
          id: "transaction-1",
          title: "Transaction #98765",
          description: "$1,234.56 on 2023-05-15",
          icon: <CreditCard className="h-4 w-4" />,
          url: "/dashboard/transactions/98765",
          category: "Transactions",
        },
        {
          id: "report-1",
          title: "Monthly Summary Report",
          description: "May 2023",
          icon: <BarChart2 className="h-4 w-4" />,
          url: "/dashboard/reports/monthly-summary",
          category: "Reports",
        },
        {
          id: "upload-1",
          title: "Upload Excel Data",
          description: "Import merchant or transaction data",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          url: "/dashboard/upload",
          category: "Actions",
        },
      ]

      // Filter results based on search query
      const filtered = mockResults.filter(
        (result) =>
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (result.description &&
            result.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      setResults(filtered)
      setIsLoading(false)
    },
    []
  )

  // Debounce search to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query, performSearch])

  // Handle selecting a result
  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result)
    router.push(result.url)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start rounded-md text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Search anything...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search merchants, transactions, reports..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          {!isLoading && query === "" && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center"
                >
                  {result.icon || <Search className="mr-2 h-4 w-4" />}
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">
                        {result.description}
                      </span>
                    )}
                  </div>
                  {result.badge && (
                    <Badge variant="outline" className="ml-auto">
                      {result.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
              <CommandItem
                onSelect={() => setRecentSearches([])}
                className="justify-center text-sm text-muted-foreground"
              >
                Clear recent searches
              </CommandItem>
            </CommandGroup>
          )}
          
          {!isLoading && query === "" && (
            <CommandGroup heading="Quick Links">
              <CommandItem onSelect={() => router.push("/dashboard")}>
                <BarChart2 className="mr-2 h-4 w-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => router.push("/dashboard/merchants")}>
                <Store className="mr-2 h-4 w-4" />
                Merchants
              </CommandItem>
              <CommandItem onSelect={() => router.push("/dashboard/upload")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Upload Data
              </CommandItem>
            </CommandGroup>
          )}
          
          {!isLoading && query !== "" && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          
          {!isLoading && results.length > 0 && (
            <>
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center"
                  >
                    {result.icon || <Search className="mr-2 h-4 w-4" />}
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.description && (
                        <span className="text-xs text-muted-foreground">
                          {result.description}
                        </span>
                      )}
                    </div>
                    {result.badge && (
                      <Badge variant="outline" className="ml-auto">
                        {result.badge}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              
              <CommandSeparator />
              
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`)
                    setOpen(false)
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search for "{query}"
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
