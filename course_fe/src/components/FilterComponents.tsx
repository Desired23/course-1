import React, { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarIcon, Filter, X, Search, SlidersHorizontal } from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface FilterConfig {
  key: string
  label: string
  type: "select" | "multiselect" | "search" | "date" | "daterange" | "checkbox" | "number"
  options?: FilterOption[]
  placeholder?: string
  min?: number
  max?: number
}

export interface FilterState {
  [key: string]: any
}

interface TableFilterProps {
  title?: string
  configs: FilterConfig[]
  onFilterChange: (filters: FilterState) => void
  onReset?: () => void
  className?: string
  initialFilters?: FilterState
  showCount?: boolean
}

function TableFilterBase({
  title,
  configs,
  onFilterChange,
  onReset,
  className = "",
  initialFilters = {},
  showCount = true,
}: TableFilterProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [isExpanded, setIsExpanded] = useState(false)

  const resolvedTitle = title || t("filter_components.default_title")

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const resetFilters = () => {
    setFilters({})
    onFilterChange({})
    onReset?.()
  }

  const activeFilterCount = Object.values(filters).filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (Array.isArray(value) ? value.length > 0 : true),
  ).length

  const renderFilterInput = (config: FilterConfig) => {
    const value = filters[config.key]

    switch (config.type) {
      case "search":
        return (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                config.placeholder ||
                t("filter_components.search_placeholder", {
                  label: config.label.toLowerCase(),
                })
              }
              value={value || ""}
              onChange={(e) => updateFilter(config.key, e.target.value)}
              className="pl-8"
            />
          </div>
        )

      case "select":
        return (
          <Select value={value || "all"} onValueChange={(val) => updateFilter(config.key, val === "all" ? "" : val)}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  config.placeholder ||
                  t("filter_components.select_placeholder", {
                    label: config.label.toLowerCase(),
                  })
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_components.all")}</SelectItem>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {showCount && option.count !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multiselect":
        return (
          <div className="space-y-2">
            {config.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${config.key}-${option.value}`}
                  checked={value?.includes(option.value) || false}
                  onCheckedChange={(checked) => {
                    const currentValues = value || []
                    const newValues = checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value)
                    updateFilter(config.key, newValues)
                  }}
                />
                <Label htmlFor={`${config.key}-${option.value}`} className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {showCount && option.count !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        )

      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "dd/MM/yyyy") : config.placeholder || t("filter_components.pick_date")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => updateFilter(config.key, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case "daterange":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.from ? format(new Date(value.from), "dd/MM") : t("filter_components.from_date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value?.from ? new Date(value.from) : undefined}
                  onSelect={(date) => updateFilter(config.key, { ...value, from: date?.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.to ? format(new Date(value.to), "dd/MM") : t("filter_components.to_date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value?.to ? new Date(value.to) : undefined}
                  onSelect={(date) => updateFilter(config.key, { ...value, to: date?.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      case "number":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t("filter_components.number_min", { value: config.min || 0 })}
              value={value?.min || ""}
              onChange={(e) => updateFilter(config.key, { ...value, min: e.target.value })}
              min={config.min}
              max={config.max}
            />
            <Input
              type="number"
              placeholder={t("filter_components.number_max", {
                value: config.max ?? t("filter_components.infinity"),
              })}
              value={value?.max || ""}
              onChange={(e) => updateFilter(config.key, { ...value, max: e.target.value })}
              min={config.min}
              max={config.max}
            />
          </div>
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={config.key}
              checked={value || false}
              onCheckedChange={(checked) => updateFilter(config.key, checked)}
            />
            <Label htmlFor={config.key}>{config.placeholder || config.label}</Label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {resolvedTitle}
            {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                {t("filter_components.clear_filters")}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isExpanded || activeFilterCount > 0) && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <div key={config.key} className="space-y-2">
                <Label className="text-sm font-medium">{config.label}</Label>
                {renderFilterInput(config)}
              </div>
            ))}
          </div>

          {activeFilterCount > 0 && (
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">{t("filter_components.active_filters")}</span>
                {Object.entries(filters).map(([key, value]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null

                  const config = configs.find((item) => item.key === key)
                  if (!config) return null

                  let displayValue = value
                  if (Array.isArray(value)) {
                    displayValue = value
                      .map((item) => config.options?.find((option) => option.value === item)?.label || item)
                      .join(", ")
                  } else if (config.type === "select") {
                    displayValue = config.options?.find((option) => option.value === value)?.label || value
                  } else if (config.type === "date" && value) {
                    displayValue = format(new Date(value), "dd/MM/yyyy")
                  } else if (config.type === "daterange" && value) {
                    const parts = []
                    if (value.from) {
                      parts.push(t("filter_components.range_from", { value: format(new Date(value.from), "dd/MM") }))
                    }
                    if (value.to) {
                      parts.push(t("filter_components.range_to", { value: format(new Date(value.to), "dd/MM") }))
                    }
                    displayValue = parts.join(" ")
                  } else if (config.type === "number" && value) {
                    const parts = []
                    if (value.min) parts.push(`>=${value.min}`)
                    if (value.max) parts.push(`<=${value.max}`)
                    displayValue = parts.join(" ")
                  }

                  return (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {config.label}: {displayValue}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => updateFilter(key, config.type === "multiselect" ? [] : "")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export const TableFilter = React.memo(TableFilterBase)
TableFilter.displayName = "TableFilter"

export function QuickSearch({
  placeholder,
  onSearch,
  className = "",
}: {
  placeholder?: string
  onSearch: (query: string) => void
  className?: string
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")

  const handleSearch = (value: string) => {
    setQuery(value)
    onSearch(value)
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder || t("filter_components.quick_search_placeholder")}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-8"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-6 w-6 p-0"
          onClick={() => handleSearch("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

interface SimpleSelectProps {
  label?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}

function SimpleSelect({ label, value, options, onChange, className = "" }: SimpleSelectProps) {
  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export const FilterComponents = {
  TableFilter,
  QuickSearch,
  Select: SimpleSelect,
}
