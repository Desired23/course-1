import React from 'react'
import { Lock, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { useRouter } from '../Router'

interface SubscriptionLockOverlayProps {
  title?: string
  description?: string
  backgroundImage?: string
}

export function SubscriptionLockOverlay({ 
  title = "Nội dung dành riêng cho Pro Member", 
  description = "Đăng ký gói Pro để truy cập không giới hạn khóa học này và 500+ khóa học khác.",
  backgroundImage
}: SubscriptionLockOverlayProps) {
  const { navigate } = useRouter()

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 overflow-hidden rounded-lg">
      {/* Blurred Background Layer */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-0"
        style={backgroundImage ? { 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Dark overlay on top of image to ensure text readability */}
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 ring-4 ring-blue-600/20">
          <Lock className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {title}
        </h3>
        
        <p className="text-slate-200 mb-8 leading-relaxed">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 px-8 shadow-xl shadow-blue-900/20"
            onClick={() => navigate('/pricing')}
          >
            <Zap className="w-4 h-4 mr-2 fill-current" />
            Đăng ký Pro Member
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto bg-transparent border-slate-600 text-slate-200 hover:bg-white/10 hover:text-white h-12"
            onClick={() => navigate('/pricing')}
          >
            Tìm hiểu thêm
          </Button>
        </div>
        
        <p className="mt-6 text-xs text-slate-400">
          Đã là thành viên? <span className="text-blue-400 hover:underline cursor-pointer" onClick={() => navigate('/login')}>Đăng nhập ngay</span>
        </p>
      </div>
    </div>
  )
}
