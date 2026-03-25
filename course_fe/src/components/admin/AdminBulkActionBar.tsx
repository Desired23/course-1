import { Button } from '../ui/button'

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
  label = 'items selected',
  actions,
  onClear,
}: AdminBulkActionBarProps) {
  if (count <= 0) return null

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm font-medium">
        {count} {label}
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
          Clear
        </Button>
      </div>
    </div>
  )
}
