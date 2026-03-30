import { useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Label } from './ui/label'

export interface FilterState {
  category?: number | string | null
  subcategories?: number[]
  levels?: string[]
  ratings?: number[]
  durations?: string[]
  languages?: string[]
  features?: string[]
  priceRange: [number, number]
}

export interface CategoryOption {
  id: number | string
  name: string
  subcategories?: Array<{
    id: number | string
    name: string
  }>
}

function FilterAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-left font-medium hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-4 space-y-2">{children}</div>}
    </div>
  )
}

interface CourseFilterSidebarProps {
  filters: FilterState
  onFilterChange: (filterType: string, value: any) => void
  onClearFilters: () => void
  mode?: 'single' | 'multiple'
  categories?: CategoryOption[]
  durations?: string[]
  levels?: string[]
  languages?: string[]
  features?: string[]
  currency?: 'USD' | 'VND'
  priceConfig?: {
    min: number
    max: number
    placeholder: {
      min: string
      max: string
    }
  }
  showCategories?: boolean
  showRatings?: boolean
  showDurations?: boolean
  showLevels?: boolean
  showLanguages?: boolean
  showPrice?: boolean
  showFeatures?: boolean
  className?: string
  showFilters?: boolean
}

export function CourseFilterSidebar({
  filters,
  onFilterChange,
  onClearFilters,
  mode = 'multiple',
  categories = [],
  durations,
  levels,
  languages,
  features,
  currency = 'VND',
  priceConfig = {
    min: 0,
    max: 5000000,
    placeholder: { min: '0', max: '5000000' },
  },
  showCategories = false,
  showRatings = true,
  showDurations = true,
  showLevels = true,
  showLanguages = true,
  showPrice = true,
  showFeatures = true,
  className = '',
  showFilters = true,
}: CourseFilterSidebarProps) {
  const { t } = useTranslation()

  const durationOptions = durations ?? [
    t('course_filter_sidebar.options.duration.0_2'),
    t('course_filter_sidebar.options.duration.2_6'),
    t('course_filter_sidebar.options.duration.6_plus'),
  ]

  const levelOptions = levels ?? [
    t('course_filter_sidebar.options.level.all'),
    t('course_filter_sidebar.options.level.beginner'),
    t('course_filter_sidebar.options.level.intermediate'),
    t('course_filter_sidebar.options.level.advanced'),
  ]

  const languageOptions = languages ?? [
    t('course_filter_sidebar.options.language.vi'),
    t('course_filter_sidebar.options.language.en'),
    t('course_filter_sidebar.options.language.es'),
    t('course_filter_sidebar.options.language.fr'),
    t('course_filter_sidebar.options.language.de'),
  ]

  const featureOptions = features ?? [
    t('course_filter_sidebar.options.feature.certificate'),
    t('course_filter_sidebar.options.feature.subtitles'),
    t('course_filter_sidebar.options.feature.quizzes'),
    t('course_filter_sidebar.options.feature.coding_exercises'),
    t('course_filter_sidebar.options.feature.practice_tests'),
    t('course_filter_sidebar.options.feature.downloadable_resources'),
  ]

  const formatPrice = (price: number) => {
    if (currency === 'VND') {
      return `VND ${price.toLocaleString('vi-VN')}`
    }
    return `$${price}`
  }

  const currencySymbol = currency === 'VND' ? 'VND' : '$'

  if (!showFilters) return null

  return (
    <div className={`w-80 ${className}`}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">{t('course_filter_sidebar.filters')}</h3>
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              {t('course_filter_sidebar.clear_all')}
            </Button>
          </div>

          <div className="space-y-0">
            {showCategories && categories.length > 0 && (
              <FilterAccordion title={t('course_filter_sidebar.category')} defaultOpen>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.category === category.id}
                          onCheckedChange={(checked) => {
                            onFilterChange('category', checked ? category.id : null)
                            if (!checked) {
                              onFilterChange('subcategories', [])
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>

                      {filters.category === category.id && category.subcategories && category.subcategories.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {category.subcategories.map((sub) => (
                            <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={filters.subcategories?.includes(sub.id as number) || false}
                                onCheckedChange={(checked) => {
                                  const currentSubs = filters.subcategories || []
                                  const newSubs = checked
                                    ? [...currentSubs, sub.id as number]
                                    : currentSubs.filter((id) => id !== sub.id)
                                  onFilterChange('subcategories', newSubs)
                                }}
                              />
                              <span className="text-sm">{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </FilterAccordion>
            )}

            {showPrice && (
              <FilterAccordion title={t('course_filter_sidebar.price')} defaultOpen>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="min-price" className="text-xs text-muted-foreground">
                        {t('course_filter_sidebar.min_label', { currency: currencySymbol })}
                      </Label>
                      <Input
                        id="min-price"
                        type="number"
                        placeholder={priceConfig.placeholder.min}
                        value={filters.priceRange[0]}
                        onChange={(e) => {
                          const minValue = Number(e.target.value) || priceConfig.min
                          onFilterChange('priceRange', [minValue, filters.priceRange[1]])
                        }}
                        min={priceConfig.min}
                        max={filters.priceRange[1]}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-price" className="text-xs text-muted-foreground">
                        {t('course_filter_sidebar.max_label', { currency: currencySymbol })}
                      </Label>
                      <Input
                        id="max-price"
                        type="number"
                        placeholder={priceConfig.placeholder.max}
                        value={filters.priceRange[1]}
                        onChange={(e) => {
                          const maxValue = Number(e.target.value) || priceConfig.max
                          onFilterChange('priceRange', [filters.priceRange[0], maxValue])
                        }}
                        min={filters.priceRange[0]}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('course_filter_sidebar.from_price', { price: formatPrice(filters.priceRange[0]) })}</span>
                    <span>{t('course_filter_sidebar.to_price', { price: formatPrice(filters.priceRange[1]) })}</span>
                  </div>
                </div>
              </FilterAccordion>
            )}

            {showRatings && (
              <FilterAccordion title={t('course_filter_sidebar.rating')} defaultOpen>
                <div className="space-y-2">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.ratings?.includes(rating) || false}
                        onCheckedChange={(checked) => {
                          const currentRatings = filters.ratings || []
                          const newRatings = checked
                            ? [...currentRatings, rating]
                            : currentRatings.filter((r) => r !== rating)
                          onFilterChange('ratings', newRatings)
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{t('course_filter_sidebar.rating_and_up', { rating })}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </FilterAccordion>
            )}

            {showLevels && (
              <FilterAccordion title={t('course_filter_sidebar.level')} defaultOpen>
                <div className="space-y-2">
                  {levelOptions.map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.levels?.includes(level) || false}
                        onCheckedChange={(checked) => {
                          const currentLevels = filters.levels || []
                          const newLevels = checked
                            ? [...currentLevels, level]
                            : currentLevels.filter((l) => l !== level)
                          onFilterChange('levels', newLevels)
                        }}
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </FilterAccordion>
            )}

            {showDurations && (
              <FilterAccordion title={t('course_filter_sidebar.duration')} defaultOpen={false}>
                <div className="space-y-2">
                  {durationOptions.map((duration) => (
                    <label key={duration} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.durations?.includes(duration) || false}
                        onCheckedChange={(checked) => {
                          const currentDurations = filters.durations || []
                          const newDurations = checked
                            ? [...currentDurations, duration]
                            : currentDurations.filter((d) => d !== duration)
                          onFilterChange('durations', newDurations)
                        }}
                      />
                      <span className="text-sm">{duration}</span>
                    </label>
                  ))}
                </div>
              </FilterAccordion>
            )}

            {showLanguages && (
              <FilterAccordion title={t('course_filter_sidebar.language')} defaultOpen={false}>
                <div className="space-y-2">
                  {languageOptions.map((language) => (
                    <label key={language} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.languages?.includes(language) || false}
                        onCheckedChange={(checked) => {
                          const currentLanguages = filters.languages || []
                          const newLanguages = checked
                            ? [...currentLanguages, language]
                            : currentLanguages.filter((l) => l !== language)
                          onFilterChange('languages', newLanguages)
                        }}
                      />
                      <span className="text-sm">{language}</span>
                    </label>
                  ))}
                </div>
              </FilterAccordion>
            )}

            {showFeatures && featureOptions.length > 0 && (
              <FilterAccordion title={t('course_filter_sidebar.features')} defaultOpen={false}>
                <div className="space-y-2">
                  {featureOptions.map((feature) => (
                    <label key={feature} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.features?.includes(feature) || false}
                        onCheckedChange={(checked) => {
                          const currentFeatures = filters.features || []
                          const newFeatures = checked
                            ? [...currentFeatures, feature]
                            : currentFeatures.filter((f) => f !== feature)
                          onFilterChange('features', newFeatures)
                        }}
                      />
                      <span className="text-sm">{feature}</span>
                    </label>
                  ))}
                </div>
              </FilterAccordion>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
