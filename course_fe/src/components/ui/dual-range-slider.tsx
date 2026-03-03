import React, { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from './utils'

interface DualRangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onChange?: (value: [number, number]) => void
  onAfterChange?: (value: [number, number]) => void
  className?: string
}

const DualRangeSlider = React.memo(function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onAfterChange,
  className
}: DualRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value)
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Sync local value with prop value ONLY when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value)
    }
  }, [value, isDragging])

  const getPercent = useCallback(
    (val: number) => ((val - min) / (max - min)) * 100,
    [min, max]
  )

  const getValueFromPercent = useCallback(
    (percent: number) => {
      const rawValue = (percent / 100) * (max - min) + min
      const steppedValue = Math.round(rawValue / step) * step
      return Math.max(min, Math.min(max, steppedValue))
    },
    [min, max, step]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const percent = ((clientX - rect.left) / rect.width) * 100
      const newValue = getValueFromPercent(Math.max(0, Math.min(100, percent)))

      setLocalValue((prev) => {
        let newRange: [number, number]
        if (isDragging === 'min') {
          newRange = [Math.min(newValue, prev[1] - step), prev[1]]
        } else {
          newRange = [prev[0], Math.max(newValue, prev[0] + step)]
        }
        onChange?.(newRange)
        return newRange
      })
    },
    [isDragging, getValueFromPercent, onChange, step]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(null)
      onAfterChange?.(localValue)
    }
  }, [isDragging, localValue, onAfterChange])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleMouseMove)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleMouseMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const minPercent = getPercent(localValue[0])
  const maxPercent = getPercent(localValue[1])

  return (
    <div className={cn('relative w-full py-4', className)}>
      <div
        ref={sliderRef}
        className="relative h-2 w-full cursor-pointer"
        onClick={(e) => {
          if (isDragging) return
          const rect = e.currentTarget.getBoundingClientRect()
          const percent = ((e.clientX - rect.left) / rect.width) * 100
          const newValue = getValueFromPercent(percent)
          
          // Snap to closest thumb
          const distToMin = Math.abs(newValue - localValue[0])
          const distToMax = Math.abs(newValue - localValue[1])
          
          const newRange: [number, number] = distToMin < distToMax
            ? [newValue, localValue[1]]
            : [localValue[0], newValue]
          
          setLocalValue(newRange)
          onChange?.(newRange)
          onAfterChange?.(newRange)
        }}
      >
        {/* Background track */}
        <div className="absolute inset-0 rounded-full bg-muted" />
        
        {/* Active range */}
        <div
          className="absolute h-full rounded-full bg-[#a435f0] transition-all duration-100"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`
          }}
        />

        {/* Min thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-5 h-5 rounded-full bg-white border-2 border-[#a435f0]',
            'shadow-md cursor-grab active:cursor-grabbing',
            'transition-transform hover:scale-110',
            isDragging === 'min' && 'scale-125 shadow-lg',
            'z-10'
          )}
          style={{ left: `${minPercent}%` }}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging('min')
          }}
          onTouchStart={(e) => {
            e.preventDefault()
            setIsDragging('min')
          }}
        >
          {isDragging === 'min' && (
            <div className="absolute inset-0 -m-2 rounded-full bg-[#a435f0] opacity-20 animate-ping" />
          )}
        </div>

        {/* Max thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-5 h-5 rounded-full bg-white border-2 border-[#a435f0]',
            'shadow-md cursor-grab active:cursor-grabbing',
            'transition-transform hover:scale-110',
            isDragging === 'max' && 'scale-125 shadow-lg',
            'z-20'
          )}
          style={{ left: `${maxPercent}%` }}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging('max')
          }}
          onTouchStart={(e) => {
            e.preventDefault()
            setIsDragging('max')
          }}
        >
          {isDragging === 'max' && (
            <div className="absolute inset-0 -m-2 rounded-full bg-[#a435f0] opacity-20 animate-ping" />
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if value, min, max, step, or className changed
  return (
    prevProps.value[0] === nextProps.value[0] &&
    prevProps.value[1] === nextProps.value[1] &&
    prevProps.min === nextProps.min &&
    prevProps.max === nextProps.max &&
    prevProps.step === nextProps.step &&
    prevProps.className === nextProps.className
  )
})

export { DualRangeSlider }
export default DualRangeSlider