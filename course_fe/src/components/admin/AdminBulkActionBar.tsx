import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

interface BulkAction {
  key: string
  label: string
  destructive?: boolean
  disabled?: boolean
  onClick: () => void
}

interface AdminBulkActionBarProps {
  count: number
  label?: string
  actions: BulkAction[]
  onClear: () => void
}

export function AdminBulkActionBar({
  count,
  label,
  actions,
  onClear,
}: AdminBulkActionBarProps) {
  const { t } = useTranslation()

  if (count <= 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm font-medium">
        {count} {label || t('admin_bulk_action_bar.items_selected')}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.destructive ? 'destructive' : 'outline'}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onClear}>
          {t('admin_bulk_action_bar.clear')}
        </Button>
      </div>
    </div>
  )
}
