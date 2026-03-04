import { useCountdown } from '../hooks/useCountdown'
import { Clock, Zap } from 'lucide-react'

interface DiscountCountdownProps {
  /** ISO date string of when the discount ends */
  endDate: string | null | undefined
  /** Called when countdown reaches zero */
  onExpire?: () => void
  /** 'badge' = compact inline, 'banner' = Flash Sale bar, 'mini' = tiny inline */
  variant?: 'badge' | 'banner' | 'mini'
  /** Discount percentage, e.g. 21 for -21% */
  discountPercent?: number
  className?: string
}

/**
 * Shows a countdown timer for an active discount.
 * Hides itself when there's no endDate or when expired.
 */
export function DiscountCountdown({
  endDate,
  onExpire,
  variant = 'badge',
  discountPercent,
  className = '',
}: DiscountCountdownProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(endDate, onExpire)

  if (!endDate || isExpired) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  // Total hours including days
  const totalHours = days * 24 + hours

  if (variant === 'banner') {
    return (
      <div className={`rounded-lg overflow-hidden ${className}`}>
        {/* Flash Sale header bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-orange-500 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-white font-extrabold text-sm tracking-wide uppercase">
              Flash Sale
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-medium">Kết thúc trong</span>
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

  // badge variant — compact with flash sale label
  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
          <Zap className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />
          Sale
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

  // mini variant — just the timer
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 ${className}`}>
      <Clock className="w-2.5 h-2.5" />
      {totalHours > 0 ? `${pad(totalHours)}:` : ''}{pad(minutes)}:{pad(seconds)}
    </span>
  )
}
