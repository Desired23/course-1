import { useEffect, useState } from 'react'
import { AlertTriangle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { getInstructorCopyrightCases, type CopyrightCase } from '../../services/report.api'
import { getErrorMessage } from '../../lib/apiError'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '-'
}

export function InstructorReportsPage() {
  const { navigate } = useRouter()
  const [cases, setCases] = useState<CopyrightCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await getInstructorCopyrightCases({ page: 1, page_size: 100 })
        if (!cancelled) setCases(res.results || [])
      } catch (err) {
        toast.error(getErrorMessage(err, 'Không thể tải danh sách tố cáo bản quyền.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tố cáo bản quyền</h1>
        <p className="text-muted-foreground">Các case cần bạn phản hồi hoặc theo dõi.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {cases.length} case
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : cases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có tố cáo bản quyền.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Hạn phản hồi</TableHead>
                  <TableHead>Action tạm thời</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.lesson_title ? `Bài học: ${item.lesson_title}` : item.course_title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'awaiting_instructor_response' ? 'destructive' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{item.severity}</Badge></TableCell>
                    <TableCell>
                      {formatDate(item.instructor_deadline_at)}
                      {item.is_instructor_deadline_overdue && <Badge variant="destructive" className="ml-2">Quá hạn</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{item.content_action}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/instructor/reports/${item.id}`)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
