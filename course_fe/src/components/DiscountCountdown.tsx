import { Clock, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCountdown } from '../hooks/useCountdown'

interface DiscountCountdownProps {
  endDate: string | null | undefined
  onExpire?: () => void
  variant?: 'badge' | 'banner' | 'mini'
  discountPercent?: number
  className?: string
}

export function DiscountCountdown({
  endDate,
  onExpire,
  variant = 'badge',
  discountPercent,
  className = '',
}: DiscountCountdownProps) {
  const { t } = useTranslation()
  const { days, hours, minutes, seconds, isExpired } = useCountdown(endDate, onExpire)

  if (!endDate || isExpired) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const totalHours = days * 24 + hours

  if (variant === 'banner') {
    return (
      <div className={`rounded-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-orange-500 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-white font-extrabold text-sm tracking-wide uppercase">
              {t('discount_countdown.flash_sale')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-medium">{t('discount_countdown.ends_in')}</span>
            <div className="flex items-center gap-0.5 font-mono text-sm font-bold">
              <span className="bg-white/20 backdrop-blur-sm text-white rounded px-1.5 py-0.5 min-w-[28px] text-center">
                {pad(totalHours)}
              </span>
              <span className="text-white font-bold">:</span>
              <span className="bg-white/20 backdrop-blur-sm text-white rounded px-1.5 py-0.5 min-w-[28px] text-center">
                {pad(minutes)}
              </span>
              <span className="text-white font-bold">:</span>
              <span className="bg-white/20 backdrop-blur-sm text-white rounded px-1.5 py-0.5 min-w-[28px] text-center">
                {pad(seconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
          <Zap className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />
          {t('discount_countdown.sale')}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
          <Clock className="w-3 h-3" />
          {totalHours > 0 ? `${pad(totalHours)}:` : ''}{pad(minutes)}:{pad(seconds)}
        </span>
        {discountPercent !== undefined && discountPercent > 0 && (
          <span className="text-xs font-bold text-red-600 dark:text-red-400">
            -{Math.round(discountPercent)}%
          </span>
        )}
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 ${className}`}>
      <Clock className="w-2.5 h-2.5" />
      {totalHours > 0 ? `${pad(totalHours)}:` : ''}{pad(minutes)}:{pad(seconds)}
    </span>
  )
}
