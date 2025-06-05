"use client"

import * as React from "react"
import { X, Filter, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"

interface FilterOption {
  id: string
  label: string
  type: "select" | "checkbox" | "input" | "date" | "dateRange"
  options?: { value: string; label: string }[]
  placeholder?: string
  value?: any
}

interface FilterDrawerProps {
  title?: string
  description?: string
  filters: FilterOption[]
  onApplyFilters: (filters: Record<string, any>) => void
  className?: string
  triggerClassName?: string
  defaultOpen?: boolean
}

export function FilterDrawer({
  title = "Filter",
  description = "Filter your data by specific criteria",
  filters,
  onApplyFilters,
  className,
  triggerClassName,
  defaultOpen = false,
}: FilterDrawerProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [filterValues, setFilterValues] = React.useState<Record<string, any>>({})

  // Initialize filter values
  React.useEffect(() => {
    const initialValues: Record<string, any> = {}
    filters.forEach((filter) => {
      initialValues[filter.id] = filter.value || null
    })
    setFilterValues(initialValues)
  }, [filters])

  const handleFilterChange = (id: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleApply = () => {
    onApplyFilters(filterValues)
    setOpen(false)
  }

  const handleReset = () => {
    const resetValues: Record<string, any> = {}
    filters.forEach((filter) => {
      resetValues[filter.id] = null
    })
    setFilterValues(resetValues)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("flex items-center gap-1", triggerClassName)}
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={cn("sm:max-w-md", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          {filters.map((filter) => (
            <div key={filter.id} className="space-y-2">
              <Label htmlFor={filter.id}>{filter.label}</Label>
              
              {filter.type === "select" && filter.options && (
                <Select
                  value={filterValues[filter.id] || ""}
                  onValueChange={(value) => handleFilterChange(filter.id, value)}
                >
                  <SelectTrigger id={filter.id}>
                    <SelectValue placeholder={filter.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">All</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              
              {filter.type === "input" && (
                <Input
                  id={filter.id}
                  placeholder={filter.placeholder || ""}
                  value={filterValues[filter.id] || ""}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                />
              )}
              
              {filter.type === "checkbox" && filter.options && (
                <div className="space-y-2">
                  {filter.options.map((option) => {
                    const isChecked = Array.isArray(filterValues[filter.id])
                      ? filterValues[filter.id]?.includes(option.value)
                      : false
                      
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${filter.id}-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const currentValues = Array.isArray(filterValues[filter.id])
                              ? [...filterValues[filter.id]]
                              : []
                              
                            if (checked) {
                              handleFilterChange(filter.id, [...currentValues, option.value])
                            } else {
                              handleFilterChange(
                                filter.id,
                                currentValues.filter((v) => v !== option.value)
                              )
                            }
                          }}
                        />
                        <label
                          htmlFor={`${filter.id}-${option.value}`}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {filter.type === "date" && (
                <DatePicker
                  date={filterValues[filter.id]}
                  setDate={(date) => handleFilterChange(filter.id, date)}
                  placeholder={filter.placeholder || "Select date..."}
                />
              )}
              
              {filter.type === "dateRange" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${filter.id}-from`} className="text-xs">From</Label>
                    <DatePicker
                      date={filterValues[filter.id]?.from}
                      setDate={(date) => 
                        handleFilterChange(filter.id, {
                          ...filterValues[filter.id],
                          from: date
                        })
                      }
                      placeholder="Start date"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${filter.id}-to`} className="text-xs">To</Label>
                    <DatePicker
                      date={filterValues[filter.id]?.to}
                      setDate={(date) => 
                        handleFilterChange(filter.id, {
                          ...filterValues[filter.id],
                          to: date
                        })
                      }
                      placeholder="End date"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <SheetFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
            Reset
          </Button>
          <Button onClick={handleApply} className="w-full sm:w-auto">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
