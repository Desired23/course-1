import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

interface AdminConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onOpenChange,
  onConfirm,
}: AdminConfirmDialogProps) {
  const { t } = useTranslation()

  // Khi confirm dialog này nằm chồng lên một modal Radix khác (Dialog/DropdownMenu/Select),
  // lúc đóng Radix có thể để sót `pointer-events: none` trên <body> khiến cả trang bị đơ
  // (không click được nữa). Reset lại sau khi đóng để gỡ kẹt.
  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      document.body.style.pointerEvents = ''
    }, 0)
    return () => window.clearTimeout(id)
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel ?? t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (confirmLabel ?? t('common.confirm'))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
