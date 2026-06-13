import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from '../../components/ui/skeleton'
import { Award, Download, Ban } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from "../../contexts/AuthContext"
import { useTranslation } from "react-i18next"
import { getMyCertificates, downloadMyCertificate, type MyCertificate } from '../../services/certificate.api'
import { UserPagination } from '../../components/UserPagination'
import { toast } from "sonner"

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

export function MyCertificatesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [items, setItems] = useState<MyCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 9

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getMyCertificates({ page: currentPage, page_size: pageSize })
      .then((res) => {
        if (cancelled) return
        setItems(res.results)
        setTotalPages(res.total_pages || 1)
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          setTotalPages(1)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, currentPage])

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return value
    }
  }

  return (
    <motion.div className="p-4 sm:p-6 lg:p-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-6" variants={fadeInUp}>
        <h1 className="mb-2 flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          {t('my_certificates.title', 'Chứng chỉ của tôi')}
        </h1>
        <p className="text-muted-foreground">
          {t('my_certificates.subtitle', 'Xem và tải các chứng chỉ bạn đã đạt được.')}
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div className="flex flex-col items-center justify-center py-24 text-center" variants={fadeInUp}>
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t('my_certificates.empty', 'Bạn chưa có chứng chỉ nào. Hoàn thành 100% một khóa học có chứng chỉ để nhận.')}
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={sectionStagger}>
            {items.map((cert) => (
              <motion.div key={cert.id} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2">{cert.course_title}</CardTitle>
                      {cert.revoked ? (
                        <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap">
                          <Ban className="h-3 w-3" />
                          {t('my_certificates.revoked', 'Đã thu hồi')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {t('my_certificates.valid', 'Hợp lệ')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('my_certificates.issued_on', 'Cấp ngày')}: {formatDate(cert.issued_at)}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {t('my_certificates.code', 'Mã')}: {cert.verification_code}
                    </p>
                    {!cert.revoked ? (
                      <Button
                        className="w-full gap-2"
                        onClick={async () => {
                          try {
                            await downloadMyCertificate(cert.id, `${cert.course_title || 'certificate'}.pdf`)
                          } catch {
                            toast.error(t('my_certificates.download_failed', 'Không thể tải chứng chỉ.'))
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        {t('my_certificates.download', 'Tải PDF')}
                      </Button>
                    ) : (
                      <Button disabled className="w-full gap-2">
                        <Ban className="h-4 w-4" />
                        {t('my_certificates.unavailable', 'Không khả dụng')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="mt-6 flex items-center justify-end" variants={fadeInUp}>
            <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
