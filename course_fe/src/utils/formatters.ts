// Date & Time Formatters
export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'vừa xong'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} năm trước`
}

// Duration Formatters
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${minutes} phút`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, '0')}` : `${hours} giờ`
}

export function formatDurationLong(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} phút`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} giờ`
  }

  return `${hours} giờ ${remainingMinutes} phút`
}

// Currency Formatters
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  if (currency === 'VND') {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPrice(price: number, discountPrice?: number | null): { 
  displayPrice: string
  originalPrice?: string
  discountAmount?: string
  discountPercent?: number
} {
  if (discountPrice && discountPrice > 0) {
    const original = price + discountPrice
    const discountPercent = Math.round((discountPrice / original) * 100)
    
    return {
      displayPrice: formatCurrency(price),
      originalPrice: formatCurrency(original),
      discountAmount: formatCurrency(discountPrice),
      discountPercent
    }
  }

  return {
    displayPrice: formatCurrency(price)
  }
}

// Number Formatters
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatCompactNumber(num: number): string {
  return num.toLocaleString('vi-VN')
}

// Rating Formatter
export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

// Progress Formatter
export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`
}

// Status Formatters
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Đang hoạt động',
    'inactive': 'Không hoạt động',
    'suspended': 'Tạm khóa',
    'published': 'Đã xuất bản',
    'draft': 'Bản nháp',
    'pending': 'Chờ xử lý',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối',
    'completed': 'Hoàn thành',
    'processing': 'Đang xử lý',
    'failed': 'Thất bại',
    'paid': 'Đã thanh toán',
    'unpaid': 'Chưa thanh toán'
  }
  return statusMap[status.toLowerCase()] || status
}

// File Size Formatter
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
