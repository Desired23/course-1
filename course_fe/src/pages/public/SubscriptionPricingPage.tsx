import React, { useState, useEffect } from 'react'
import { Check, X, HelpCircle, Star, Zap, Crown, Shield, ArrowRight, User, Minus } from 'lucide-react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Switch } from "../../components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { getSubscriptionPlans, type SubscriptionPlanListItem } from "../../services/subscription.api"

export function SubscriptionPricingPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [isAnnual, setIsAnnual] = useState(true)
  const [apiPlans, setApiPlans] = useState<SubscriptionPlanListItem[]>([])

  useEffect(() => {
    getSubscriptionPlans().then(setApiPlans).catch(() => {})
  }, [])

  // Icon map for plan icons from BE
  const iconMap: Record<string, React.ComponentType<any>> = { Zap, Crown, Shield }

  // Map API plans to display format; fall back to hardcoded if API returns empty
  const plans = apiPlans.length > 0 ? apiPlans.map((p, idx) => {
    const price = Number(p.price)
    const discountPrice = p.discount_price ? Number(p.discount_price) : null
    const isFree = price === 0 && !discountPrice
    const monthlyPrice = price
    const annualPerMonth = discountPrice ?? price
    const displayPrice = isFree ? 0 : (isAnnual ? annualPerMonth : monthlyPrice)
    const hasDiscount = discountPrice !== null && discountPrice < price
    return {
      id: String(p.id),
      name: p.name,
      description: p.description || '',
      price: displayPrice,
      period: isFree ? 'forever' : '/ tháng',
      billingText: isFree ? undefined : (isAnnual && hasDiscount
        ? `Thanh toán ${new Intl.NumberFormat('vi-VN').format(annualPerMonth * 12)}₫ mỗi năm`
        : 'Thanh toán hàng tháng'),
      features: p.features || [],
      notIncluded: p.not_included || [],
      buttonText: isFree ? (user ? 'Gói hiện tại' : 'Đăng ký miễn phí') : (p.badge_text || `Nâng cấp ${p.name}`),
      buttonVariant: (p.is_featured ? 'default' : 'outline') as 'default' | 'outline',
      popular: p.is_featured,
      disabled: isFree && !!user,
      saveText: isAnnual && hasDiscount ? `Tiết kiệm ${Math.round((1 - annualPerMonth / monthlyPrice) * 100)}%` : null,
      highlightColor: p.highlight_color || undefined,
      icon: p.icon || undefined,
    }
  }) : [
    {
      id: "basic",
      name: "Basic",
      description: "Khởi đầu hành trình học tập",
      price: 0,
      period: "forever",
      features: [
        "Truy cập khóa học miễn phí",
        "Video chất lượng HD 720p",
        "Thảo luận cộng đồng",
        "Tài liệu cơ bản"
      ],
      notIncluded: [
        "Chứng chỉ hoàn thành",
        "Tải xuống video offline",
        "Hỗ trợ từ giảng viên",
        "Dự án thực hành",
        "Mentor 1-1",
        "AI Coding Assistant"
      ],
      buttonText: user ? "Gói hiện tại" : "Đăng ký miễn phí",
      buttonVariant: "outline" as const,
      popular: false,
      disabled: !!user
    },
    {
      id: "pro",
      name: "Pro Member",
      description: "Học tập không giới hạn & Chứng chỉ",
      price: isAnnual ? 199000 : 249000,
      period: isAnnual ? "/ tháng" : "/ tháng",
      billingText: isAnnual ? "Thanh toán 2,388,000₫ mỗi năm" : "Thanh toán hàng tháng",
      features: [
        "Truy cập TOÀN BỘ khóa học",
        "Video Full HD 1080p",
        "Chứng chỉ hoàn thành",
        "Tải xuống tài nguyên & Code",
        "AI Assistant hỗ trợ code",
        "Cập nhật khóa học mới"
      ],
      notIncluded: [
        "Mentor 1-1 hàng tháng",
        "Review CV & Mock Interview"
      ],
      buttonText: "Nâng cấp Pro",
      buttonVariant: "default" as const,
      popular: true,
      saveText: isAnnual ? "Tiết kiệm 20%" : null,
      highlightColor: "blue"
    },
    {
      id: "premium",
      name: "Premium",
      description: "Tăng tốc sự nghiệp với Mentor",
      price: isAnnual ? 499000 : 599000,
      period: isAnnual ? "/ tháng" : "/ tháng",
      billingText: isAnnual ? "Thanh toán 5,988,000₫ mỗi năm" : "Thanh toán hàng tháng",
      features: [
        "Mọi quyền lợi của gói Pro",
        "Mentor 1-1 (30 phút/tháng)",
        "Review Code dự án cá nhân",
        "Tư vấn lộ trình nghề nghiệp",
        "Hỗ trợ ưu tiên 24/7",
        "Truy cập khóa học Doanh nghiệp"
      ],
      notIncluded: [],
      buttonText: "Trở thành Premium",
      buttonVariant: "outline" as const,
      popular: false,
      highlightColor: "yellow"
    }
  ]

  // Comparison Data Table
  const comparisonData = [
    {
      category: "Nội dung học tập",
      rows: [
        { name: "Truy cập khóa học", basic: "Một số (Free)", pro: "Toàn bộ (500+)", premium: "Toàn bộ + Doanh nghiệp" },
        { name: "Chất lượng video", basic: "HD (720p)", pro: "Full HD (1080p)", premium: "4K UHD / 1080p" },
        { name: "Tải tài nguyên (Source code)", basic: false, pro: true, premium: true },
        { name: "Xem Offline (Mobile App)", basic: false, pro: true, premium: true },
        { name: "Bài tập & Quiz", basic: "Cơ bản", pro: "Đầy đủ", premium: "Nâng cao" },
      ]
    },
    {
      category: "Tính năng & Công cụ",
      rows: [
        { name: "Chứng chỉ hoàn thành", basic: false, pro: true, premium: true },
        { name: "AI Coding Assistant", basic: false, pro: true, premium: true },
        { name: "Ghi chú & Bookmark", basic: true, pro: true, premium: true },
        { name: "Không quảng cáo", basic: false, pro: true, premium: true },
      ]
    },
    {
      category: "Hỗ trợ & Sự nghiệp",
      rows: [
        { name: "Hỗ trợ Q&A", basic: "Cộng đồng", pro: "Giảng viên hỗ trợ", premium: "Ưu tiên 1-1" },
        { name: "Mentor hướng dẫn riêng", basic: false, pro: false, premium: "30 phút / tháng" },
        { name: "Review CV & Portfolio", basic: false, pro: false, premium: true },
        { name: "Cam kết việc làm", basic: false, pro: false, premium: "Hỗ trợ kết nối" },
      ]
    }
  ]

  const handleSubscribe = (planId: string) => {
    // Free plan: just redirect to signup/login
    const plan = plans.find(p => p.id === planId)
    if (plan && plan.price === 0) {
      if (!user) navigate('/signup')
      return
    }
    
    if (!user) {
      navigate('/login')
      return
    }

    const interval = isAnnual ? 'year' : 'month'
    navigate(`/checkout/subscription?plan=${planId}&interval=${interval}`)
  }

  const renderCheck = (value: boolean | string) => {
    if (typeof value === 'string') return <span className="text-sm font-medium">{value}</span>
    if (value === true) return <Check className="w-5 h-5 text-green-500 mx-auto" />
    return <Minus className="w-5 h-5 text-slate-300 mx-auto" />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-950 text-white pb-56 pt-16 lg:pt-24">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-3xl mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative container mx-auto px-4 text-center z-10">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium bg-blue-500/10 text-blue-200 border-blue-500/30 hover:bg-blue-500/20 transition-all backdrop-blur-sm">
             <Star className="w-3.5 h-3.5 mr-2 fill-yellow-400 text-yellow-400" />
             Đầu tư cho sự nghiệp IT của bạn
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            Học lập trình không giới hạn.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Mở khóa tiềm nng của bạn.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Truy cập hơn 500+ khóa học chất lượng cao, thực hành dự án thực tế và nhận sự hỗ trợ từ AI Assistant.
            Chỉ với chi phí bằng một ly cà phê mỗi ngày.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center justify-center p-1.5 bg-slate-800/50 backdrop-blur-md rounded-full border border-slate-700/50 shadow-xl">
            <button 
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Thanh toán tháng
            </button>
            <button 
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Thanh toán năm
                <Badge variant="secondary" className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-4 border-none shadow-none">
                    -20%
                </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 -mt-32 relative z-20 pb-24 mb-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`flex flex-col h-full relative transition-all duration-300 ${
                plan.popular 
                  ? 'border-blue-500 shadow-2xl shadow-blue-500/10 scale-105 z-10 bg-white dark:bg-slate-900 ring-4 ring-blue-500/10 -mt-8' 
                  : 'hover:-translate-y-2 hover:shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                  <Crown className="w-3.5 h-3.5 fill-current" /> Đề xuất cho bạn
                </div>
              )}

              <CardHeader className={`pb-4 ${plan.popular ? 'pt-8' : ''}`}>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                      plan.highlightColor === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      plan.highlightColor === 'yellow' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {(() => {
                      const IconComp = plan.icon ? iconMap[plan.icon] : null
                      if (IconComp) return <IconComp className="w-6 h-6" />
                      // Fallback for hardcoded plans
                      if (plan.id === 'basic') return <Shield className="w-6 h-6" />
                      if (plan.id === 'pro') return <Zap className="w-6 h-6" />
                      if (plan.id === 'premium') return <Crown className="w-6 h-6" />
                      return <Shield className="w-6 h-6" />
                    })()}
                  </div>
                  {plan.name}
                </CardTitle>
                <CardDescription className="min-h-[40px] text-base pt-2">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 pb-4 flex flex-col">
                <div className="mb-6 pb-6 border-b border-dashed">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold tracking-tight">
                        {plan.price === 0 ? 'Miễn phí' : new Intl.NumberFormat('vi-VN').format(plan.price)}
                    </span>
                    <span className="text-xl font-bold ml-1 text-muted-foreground">{plan.price !== 0 && '₫'}</span>
                    <span className="text-muted-foreground ml-2 text-sm font-medium">
                        {plan.period}
                    </span>
                  </div>
                  
                  {plan.billingText && (
                      <p className="text-sm text-muted-foreground mt-2">
                          {plan.billingText}
                      </p>
                  )}
                  
                  {plan.saveText && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-md text-sm font-medium">
                        <Zap className="w-3 h-3 fill-current" />
                        {plan.saveText}
                    </div>
                  )}
                </div>

                <div className="space-y-4 flex-1 min-h-[280px]">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {plan.price === 0 ? 'Tính năng cơ bản:' : plan.highlightColor === 'yellow' ? 'Tất cả của Pro cộng thêm:' : 'Bao gồm:'}
                  </p>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-1 flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}
                  
                  {plan.notIncluded.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-muted-foreground/60">
                      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-1 flex-shrink-0 mt-0.5">
                        <X className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-6 px-6 mt-auto">
                <Button 
                  className={`w-full h-12 text-base font-bold rounded-xl shadow-md transition-all duration-300 active:scale-95 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 border-0' 
                        : plan.highlightColor === 'yellow' 
                            ? 'bg-slate-900 !text-white hover:bg-slate-800 dark:bg-slate-50 dark:!text-slate-900 dark:hover:bg-slate-200 hover:-translate-y-1 border-0' 
                            : 'bg-transparent border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                  variant={plan.highlightColor === 'yellow' ? 'default' : plan.buttonVariant}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.disabled}
                >
                  {plan.buttonText}
                  {!plan.disabled && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="container mx-auto px-4 pb-24 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">So sánh chi tiết quyền lợi</h2>
          <p className="text-muted-foreground">Chọn gói phù hợp nhất với nhu cầu học tập của bạn</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 md:p-6 w-1/3 font-semibold text-lg">Tính năng</th>
                <th className="p-4 md:p-6 text-center font-semibold text-slate-600 dark:text-slate-400">Basic</th>
                <th className="p-4 md:p-6 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">Pro Member</th>
                <th className="p-4 md:p-6 text-center font-bold text-yellow-600 dark:text-yellow-400">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparisonData.flatMap((section, idx) => [
                <tr key={`cat-${idx}`} className="bg-slate-50/50 dark:bg-slate-900/50">
                  <td colSpan={4} className="p-3 md:px-6 font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {section.category}
                  </td>
                </tr>,
                ...section.rows.map((row, rIdx) => (
                  <tr key={`row-${idx}-${rIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 md:px-6 font-medium text-slate-700 dark:text-slate-300 border-r border-dashed border-slate-100 dark:border-slate-800">{row.name}</td>
                    <td className="p-4 text-center text-slate-500 border-r border-dashed border-slate-100 dark:border-slate-800">
                      {renderCheck(row.basic)}
                    </td>
                    <td className="p-4 text-center font-medium bg-blue-50/10 dark:bg-blue-900/5 border-r border-dashed border-blue-100 dark:border-blue-900/30">
                      {renderCheck(row.pro)}
                    </td>
                    <td className="p-4 text-center font-medium">
                      {renderCheck(row.premium)}
                    </td>
                  </tr>
                ))
              ])}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-slate-50 dark:bg-slate-900/50 py-20 border-y dark:border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-10">
            Được tin dùng bởi các team công nghệ tại
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
             {/* Text-based Logos for simplicity */}
            <h3 className="text-2xl font-black font-serif tracking-tighter text-slate-800 dark:text-slate-200">ACME<span className="text-blue-600">.corp</span></h3>
            <h3 className="text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-300 flex items-center gap-1"><div className="w-6 h-6 bg-slate-700 dark:bg-slate-300 rounded-md"></div>StarkInd</h3>
            <h3 className="text-2xl font-light italic text-slate-800 dark:text-slate-200">Wayne<span className="font-bold not-italic">Tech</span></h3>
            <h3 className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 tracking-tighter">Cyber<span className="text-green-500">Dyne</span></h3>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Câu hỏi thường gặp</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Mọi thứ bạn cần biết về gói thành viên và thanh toán
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {[
            {
              q: "Tôi có thể hủy gói đăng ký bất cứ lúc nào không?",
              a: "Hoàn toàn được. Bạn có thể hủy gia hạn bất cứ lúc nào trong trang Cài đặt tài khoản. Quyền lợi Pro sẽ được duy trì cho đến hết chu kỳ thanh toán hiện tại mà không mất phí."
            },
            {
              q: "Gói Pro khác gì so với mua lẻ từng khóa học?",
              a: "Mua lẻ giúp bạn sở hữu vĩnh viễn 1 khóa học cụ thể. Gói Pro cho phép bạn truy cập KHÔNG GIỚI HẠN vào thư viện hơn 500+ khóa học hiện có và các khóa học mới trong tương lai. Đây là giải pháp tiết kiệm nhất nếu bạn muốn học nhiều kỹ năng."
            },
            {
              q: "Chính sách hoàn tiền như thế nào?",
              a: "Chúng tôi cam kết hoàn tiền 100% trong vòng 7 ngày đầu tiên nếu bạn không hài lòng với dịch vụ, bất kể lý do là gì. Chỉ cần gửi email cho support."
            },
            {
              q: "Tôi có được cấp chứng chỉ khi hoàn thành khóa học không?",
              a: "Có. Tất cả các thành viên Pro và Premium đều nhận được chứng chỉ xác thực (có thể thêm vào LinkedIn) sau khi hoàn thành 100% nội dung khóa học và bài tập."
            }
          ].map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-left font-medium hover:text-blue-600 transition-colors py-4">
                  {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16 text-center">
            <div className="inline-flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm">
                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-md mb-4">
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Vẫn còn thắc mắc?</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    Chat trực tiếp với đội ngũ hỗ trợ của chúng tôi hoặc gửi email để được giải đáp chi tiết.
                </p>
                <div className="flex gap-4">
                    <Button variant="outline" className="bg-white dark:bg-slate-800">Gửi Email</Button>
                    <Button>Chat ngay</Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}