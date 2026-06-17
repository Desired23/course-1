import React, { useState } from "react"
import { Badge as AntBadge, Button as AntButton, Checkbox as AntCheckbox, DatePicker, Input as AntInput, InputNumber, Select as AntSelect, Tag } from "antd"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Filter, X, Search, SlidersHorizontal } from "lucide-react"
import { format } from "date-fns"
import dayjs, { type Dayjs } from "dayjs"
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

const { RangePicker } = DatePicker

function toDayjs(value: unknown): Dayjs | null {
  return typeof value === "string" && value ? dayjs(value) : null
}

function toRangeValue(value: any): [Dayjs | null, Dayjs | null] | null {
  if (!value?.from && !value?.to) return null
  return [toDayjs(value.from), toDayjs(value.to)]
}

function hasFilterValue(value: any): boolean {
  if (value === null || value === undefined || value === "" || value === false) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.values(value).some(hasFilterValue)
  return true
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

  const activeFilterCount = Object.values(filters).filter(hasFilterValue).length

  const renderFilterInput = (config: FilterConfig) => {
    const value = filters[config.key]

    switch (config.type) {
      case "search":
        return (
          <AntInput
            allowClear
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
            placeholder={
              config.placeholder ||
              t("filter_components.search_placeholder", {
                label: config.label.toLowerCase(),
              })
            }
            value={value || ""}
            onChange={(e) => updateFilter(config.key, e.target.value)}
          />
        )

      case "select":
        return (
          <AntSelect
            value={value || "all"}
            onChange={(val) => updateFilter(config.key, val === "all" ? "" : val)}
            placeholder={
              config.placeholder ||
              t("filter_components.select_placeholder", {
                label: config.label.toLowerCase(),
              })
            }
            options={[
              { label: t("filter_components.all"), value: "all" },
              ...(config.options || []).map((option) => ({
                value: option.value,
                label: (
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{option.label}</span>
                    {showCount && option.count !== undefined && <Tag className="m-0">{option.count}</Tag>}
                  </span>
                ),
              })),
            ]}
            style={{ width: "100%" }}
          />
        )

      case "multiselect":
        return (
          <AntSelect
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={value || []}
            onChange={(nextValue) => updateFilter(config.key, nextValue)}
            placeholder={config.placeholder || t("filter_components.select_placeholder", { label: config.label.toLowerCase() })}
            options={(config.options || []).map((option) => ({
              value: option.value,
              label: showCount && option.count !== undefined ? `${option.label} (${option.count})` : option.label,
            }))}
            style={{ width: "100%" }}
          />
        )

      case "date":
        return (
          <DatePicker
            allowClear
            format="DD/MM/YYYY"
            placeholder={config.placeholder || t("filter_components.pick_date")}
            value={toDayjs(value)}
            onChange={(date) => updateFilter(config.key, date ? date.toISOString() : "")}
            style={{ width: "100%" }}
          />
        )

      case "daterange":
        return (
          <RangePicker
            allowClear
            format="DD/MM/YYYY"
            placeholder={[t("filter_components.from_date"), t("filter_components.to_date")]}
            value={toRangeValue(value) as any}
            onChange={(dates) =>
              updateFilter(config.key, {
                from: dates?.[0] ? dates[0].toISOString() : "",
                to: dates?.[1] ? dates[1].toISOString() : "",
              })
            }
            style={{ width: "100%" }}
          />
        )

      case "number":
        return (
          <div className="grid grid-cols-2 gap-2">
            <InputNumber
              placeholder={t("filter_components.number_min", { value: config.min || 0 })}
              value={value?.min ?? null}
              onChange={(nextValue) => updateFilter(config.key, { ...value, min: nextValue ?? "" })}
              min={config.min}
              max={config.max}
              style={{ width: "100%" }}
            />
            <InputNumber
              placeholder={t("filter_components.number_max", {
                value: config.max ?? t("filter_components.infinity"),
              })}
              value={value?.max ?? null}
              onChange={(nextValue) => updateFilter(config.key, { ...value, max: nextValue ?? "" })}
              min={config.min}
              max={config.max}
              style={{ width: "100%" }}
            />
          </div>
        )

      case "checkbox":
        return (
          <AntCheckbox checked={Boolean(value)} onChange={(event) => updateFilter(config.key, event.target.checked)}>
            {config.placeholder || config.label}
          </AntCheckbox>
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
            {activeFilterCount > 0 && <AntBadge count={activeFilterCount} size="small" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <AntButton type="text" size="small" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                {t("filter_components.clear_filters")}
              </AntButton>
            )}
            <AntButton type="text" size="small" onClick={() => setIsExpanded(!isExpanded)}>
              <SlidersHorizontal className="h-4 w-4" />
            </AntButton>
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
                  if (!hasFilterValue(value)) return null

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
                    <Tag
                      key={key}
                      closable
                      onClose={(event) => {
                        event.preventDefault()
                        updateFilter(key, config.type === "multiselect" ? [] : "")
                      }}
                    >
                      {config.label}: {displayValue}
                    </Tag>
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
    <div className={className}>
      <AntInput
        allowClear
        prefix={<Search className="h-4 w-4 text-muted-foreground" />}
        placeholder={placeholder || t("filter_components.quick_search_placeholder")}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onClear={() => handleSearch("")}
      />
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
      <AntSelect value={value} onChange={onChange} options={options} style={{ width: "100%" }} />
    </div>
  )
}

export const FilterComponents = {
  TableFilter,
  QuickSearch,
  Select: SimpleSelect,
}
