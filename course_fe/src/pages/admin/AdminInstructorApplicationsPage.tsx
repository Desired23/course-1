import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Textarea } from "../../components/ui/textarea"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Eye,
  Mail,
  Phone,
  Globe,
  Linkedin,
  FileText,
  Download,
  User,
  Calendar,
  Award,
  Target,
  Users,
  GraduationCap,
  Video,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { getAdminApplications, reviewApplication } from '../../services/admin.api'
import type { Application as ApiApplication } from '../../services/admin.api'

interface InstructorApplication {
  id: number
  userId: number
  fullName: string
  email: string
  phone?: string
  profileImage?: string
  headline: string
  bio: string
  linkedIn?: string
  website?: string
  teachingExperience: string
  videoExperience: string
  expertise: string
  teachingGoal: string
  existingAudience: string
  contentReady: string
  idType: string
  idDocument: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}


const experienceLevels = {
  beginner: 'Chưa từng dạy',
  some: 'Có một chút',
  experienced: 'Có kinh nghiệm',
  professional: 'Chuyên nghiệp'
}

const videoExperienceLevels = {
  no: 'Chưa từng',
  basic: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao'
}

const expertiseAreas = {
  development: 'Lập trình',
  design: 'Thiết kế',
  business: 'Kinh doanh',
  marketing: 'Marketing',
  photography: 'Nhiếp ảnh',
  other: 'Khác'
}

const goals = {
  hobby: 'Sở thích bán thời gian',
  'side-business': 'Kinh doanh phụ',
  'full-time': 'Nghề chính',
  brand: 'Xây dựng thương hiệu'
}

const audiences = {
  no: 'Chưa có',
  small: 'Nhỏ (< 1,000)',
  medium: 'Trung bình (1K - 10K)',
  large: 'Lớn (> 10K)'
}

const contentStatus = {
  none: 'Chưa có gì',
  outline: 'Có outline',
  partial: 'Một phần',
  complete: 'Hoàn chỉnh'
}

export function AdminInstructorApplicationsPage() {
  const [applications, setApplications] = useState<InstructorApplication[]>([])

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const data = await getAdminApplications()
        setApplications(data.map((a: ApiApplication) => {
          const responses = a.responses || []
          const getResponse = (qId: number) => responses.find(r => r.question === qId)?.value || ''
          return {
            id: a.id,
            userId: a.user,
            fullName: a.user_name || '',
            email: a.user_email || '',
            headline: getResponse(1),
            bio: getResponse(2),
            teachingExperience: getResponse(3) || 'beginner',
            videoExperience: getResponse(4) || 'basic',
            expertise: getResponse(5) || 'other',
            teachingGoal: getResponse(6) || 'hobby',
            existingAudience: getResponse(7) || 'no',
            contentReady: getResponse(8) || 'none',
            idType: 'cccd',
            idDocument: '',
            status: a.status === 'changes_requested' ? 'pending' as const : a.status,
            submittedAt: a.created_at,
            reviewedAt: a.updated_at !== a.created_at ? a.updated_at : undefined,
            reviewNotes: a.admin_notes || undefined
          }
        }))
      } catch {
        toast.error('Không thể tải danh sách đơn đăng ký')
      }
    }
    fetchApplications()
  }, [])
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<InstructorApplication | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewNotes, setReviewNotes] = useState('')

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = selectedTab === 'all' || app.status === selectedTab
    return matchesSearch && matchesTab
  })

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  }

  const handleViewDetails = (application: InstructorApplication) => {
    setSelectedApplication(application)
    setShowDetailDialog(true)
  }

  const handleReview = (application: InstructorApplication, action: 'approve' | 'reject') => {
    setSelectedApplication(application)
    setReviewAction(action)
    setReviewNotes('')
    setShowReviewDialog(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedApplication) return
    try {
      await reviewApplication(selectedApplication.id, {
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        admin_notes: reviewNotes
      })
      const updatedApplications = applications.map(app => {
        if (app.id === selectedApplication.id) {
          return {
            ...app,
            status: reviewAction === 'approve' ? 'approved' as const : 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Current Admin',
            reviewNotes
          }
        }
        return app
      })
      setApplications(updatedApplications)
      if (reviewAction === 'approve') {
        toast.success(`Đã phê duyệt đơn đăng ký của ${selectedApplication.fullName}`)
      } else {
        toast.success(`Đã từ chối đơn đăng ký của ${selectedApplication.fullName}`)
      }
      setShowReviewDialog(false)
      setShowDetailDialog(false)
    } catch { toast.error('Thao tác thất bại') }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> Chờ duyệt</Badge>
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã duyệt</Badge>
      case 'rejected':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Từ chối</Badge>
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">Quản lý đăng ký giảng viên</h1>
        <p className="text-muted-foreground">Xem xét và phê duyệt các đơn đăng ký giảng viên</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tổng đơn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl">{stats.total}</div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chờ duyệt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl">{stats.pending}</div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Đã duyệt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl">{stats.approved}</div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Từ chối</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl">{stats.rejected}</div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Chờ duyệt ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Đã duyệt ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Từ chối ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Không tìm thấy đơn đăng ký nào</p>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={application.profileImage} />
                          <AvatarFallback>{application.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{application.fullName}</h3>
                              <p className="text-sm text-muted-foreground">{application.headline}</p>
                            </div>
                            {getStatusBadge(application.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              <span>{application.email}</span>
                            </div>
                            {application.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                <span>{application.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <GraduationCap className="w-4 h-4" />
                              <span>{expertiseAreas[application.expertise as keyof typeof expertiseAreas]}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(application.submittedAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(application)}
                          className="flex-1 md:flex-none"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Chi tiết
                        </Button>
                        
                        {application.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                              onClick={() => handleReview(application, 'approve')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 md:flex-none"
                              onClick={() => handleReview(application, 'reject')}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn đăng ký</DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về đơn đăng ký giảng viên
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div>
                <h4 className="font-semibold mb-4">Thông tin cá nhân</h4>
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={selectedApplication.profileImage} />
                    <AvatarFallback>{selectedApplication.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedApplication.fullName}</h3>
                    <p className="text-muted-foreground mb-2">{selectedApplication.headline}</p>
                    {getStatusBadge(selectedApplication.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedApplication.email}</span>
                  </div>
                  {selectedApplication.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedApplication.phone}</span>
                    </div>
                  )}
                  {selectedApplication.linkedIn && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <a href={selectedApplication.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {selectedApplication.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a href={selectedApplication.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Label>Tiểu sử</Label>
                  <p className="text-sm mt-2 p-4 bg-muted rounded-lg">{selectedApplication.bio}</p>
                </div>
              </div>

              <Separator />

              {/* Experience Section */}
              <div>
                <h4 className="font-semibold mb-4">Kinh nghiệm & Chuyên môn</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <GraduationCap className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Kinh nghiệm giảng dạy</Label>
                      <p className="text-sm mt-1">{experienceLevels[selectedApplication.teachingExperience as keyof typeof experienceLevels]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Video className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Kinh nghiệm làm video</Label>
                      <p className="text-sm mt-1">{videoExperienceLevels[selectedApplication.videoExperience as keyof typeof videoExperienceLevels]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Award className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Lĩnh vực chuyên môn</Label>
                      <p className="text-sm mt-1">{expertiseAreas[selectedApplication.expertise as keyof typeof expertiseAreas]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Target className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Mục đích giảng dạy</Label>
                      <p className="text-sm mt-1">{goals[selectedApplication.teachingGoal as keyof typeof goals]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Cộng đồng hiện tại</Label>
                      <p className="text-sm mt-1">{audiences[selectedApplication.existingAudience as keyof typeof audiences]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Tình trạng nội dung</Label>
                      <p className="text-sm mt-1">{contentStatus[selectedApplication.contentReady as keyof typeof contentStatus]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Verification Section */}
              <div>
                <h4 className="font-semibold mb-4">Xác minh danh tính</h4>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1">
                    <Label>Loại giấy tờ</Label>
                    <p className="text-sm mt-1">{selectedApplication.idType.toUpperCase()}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Tải về
                  </Button>
                </div>
              </div>

              {selectedApplication.reviewedAt && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-4">Thông tin đánh giá</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Người đánh giá:</span>
                        <span>{selectedApplication.reviewedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Thời gian:</span>
                        <span>{new Date(selectedApplication.reviewedAt).toLocaleString('vi-VN')}</span>
                      </div>
                      {selectedApplication.reviewNotes && (
                        <div>
                          <Label>Ghi chú:</Label>
                          <p className="mt-2 p-3 bg-muted rounded-lg">{selectedApplication.reviewNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Đóng
            </Button>
            {selectedApplication?.status === 'pending' && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowDetailDialog(false)
                    handleReview(selectedApplication, 'approve')
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Phê duyệt
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailDialog(false)
                    handleReview(selectedApplication, 'reject')
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Từ chối
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Phê duyệt' : 'Từ chối'} đơn đăng ký
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewNotes">Ghi chú (tùy chọn)</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === 'approve' 
                    ? 'Lý do phê duyệt, gợi ý cải thiện...'
                    : 'Lý do từ chối, hướng dẫn cải thiện...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Hủy
            </Button>
            <Button
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              onClick={handleSubmitReview}
            >
              {reviewAction === 'approve' ? 'Xác nhận phê duyệt' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
