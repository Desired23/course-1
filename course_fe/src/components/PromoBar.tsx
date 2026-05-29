import { useEffect, useState } from 'react'
import { Tag, X, Copy, Check } from 'lucide-react'
import { getHomepagePromotions, type HomepagePromotion, formatDiscountValue } from '../services/promotions.api'

export function PromoBar() {
  const [promos, setPromos] = useState<HomepagePromotion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getHomepagePromotions().then(setPromos).catch(() => {})
  }, [])

  useEffect(() => {
    if (promos.length <= 1) return
    const id = setInterval(() => setCurrentIndex((i) => (i + 1) % promos.length), 4000)
    return () => clearInterval(id)
  }, [promos.length])

  if (dismissed || promos.length === 0) return null

  const promo = promos[currentIndex]

  const handleCopy = () => {
    navigator.clipboard.writeText(promo.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const discountLabel = formatDiscountValue(promo.discount_type, promo.discount_value)
  const label = promo.description || `Giảm ${discountLabel} cho đơn hàng của bạn`

  return (
    <div className="relative flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
      <Tag className="h-4 w-4 shrink-0" />
      <span className="text-center">
        {label} — dùng mã{' '}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded bg-primary-foreground/20 px-2 py-0.5 font-mono font-semibold hover:bg-primary-foreground/30 transition-colors"
        >
          {promo.code}
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </span>
      {promos.length > 1 && (
        <span className="text-xs opacity-70">
          {currentIndex + 1}/{promos.length}
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-foreground/20 transition-colors"
        aria-label="Đóng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
