import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { 
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  FileText,
  Settings,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  ShoppingCart,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getActivityLogs as getActivityLogsApi } from '../../services/admin.api'
import type { ActivityLog as ApiActivityLog } from '../../services/admin.api'

interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_avatar?: string
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'download' | 'upload' | 'purchase' | 'payment' | 'review' | 'comment' | 'settings'
  action: string
  description: string
  resource_type?: 'user' | 'course' | 'blog' | 'forum' | 'payment' | 'review' | 'comment' | 'settings'
  resource_id?: string
  ip_address: string
  user_agent: string
  status: 'success' | 'warning' | 'error'
  created_at: Date
  metadata?: Record<string, any>
}


export function ActivityLogPage() {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getActivityLogsApi()
        const mapped: ActivityLog[] = data.map((l: ApiActivityLog) => {
          const actionLower = (l.action || '').toLowerCase()
          let actionType: ActivityLog['action_type'] = 'view'
          if (actionLower.includes('login')) actionType = 'login'
          else if (actionLower.includes('logout')) actionType = 'logout'
          else if (actionLower.includes('create') || actionLower.includes('tạo')) actionType = 'create'
          else if (actionLower.includes('update') || actionLower.includes('cập nhật')) actionType = 'update'
          else if (actionLower.includes('delete') || actionLower.includes('xóa')) actionType = 'delete'
          else if (actionLower.includes('purchase') || actionLower.includes('mua')) actionType = 'purchase'
          else if (actionLower.includes('payment')) actionType = 'payment'
          else if (actionLower.includes('review')) actionType = 'review'
          return {
            id: String(l.id),
            user_id: String(l.user || ''),
            user_name: l.user_name || 'Unknown',
            user_email: '',
            action_type: actionType,
            action: l.action,
            description: l.description,
            ip_address: l.ip_address || '',
            user_agent: l.user_agent || '',
            status: 'success' as const,
            created_at: new Date(l.created_at)
          }
        })
        setLogs(mapped)
        setFilteredLogs(mapped)
      } catch {
        toast.error('Không thể tải nhật ký hoạt động')
      }
    }
    fetchLogs()
  }, [])

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'search',
      placeholder: 'Tìm theo tên, email, hành động...'
    },
    {
      key: 'action_type',
      label: 'Loại hành động',
      type: 'select',
      options: [
        { label: 'Đăng nhập/Đăng xuất', value: 'login,logout', count: logs.filter(l => ['login', 'logout'].includes(l.action_type)).length },
        { label: 'Tạo mới', value: 'create', count: logs.filter(l => l.action_type === 'create').length },
        { label: 'Cập nhật', value: 'update', count: logs.filter(l => l.action_type === 'update').length },
        { label: 'Xóa', value: 'delete', count: logs.filter(l => l.action_type === 'delete').length },
        { label: 'Mua hàng', value: 'purchase', count: logs.filter(l => l.action_type === 'purchase').length },
        { label: 'Thanh toán', value: 'payment', count: logs.filter(l => l.action_type === 'payment').length },
        { label: 'Đánh giá', value: 'review', count: logs.filter(l => l.action_type === 'review').length }
      ]
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Thành công', value: 'success', count: logs.filter(l => l.status === 'success').length },
        { label: 'Cảnh báo', value: 'warning', count: logs.filter(l => l.status === 'warning').length },
        { label: 'Lỗi', value: 'error', count: logs.filter(l => l.status === 'error').length }
      ]
    },
    {
      key: 'resource_type',
      label: 'Loại tài nguyên',
      type: 'select',
      options: [
        { label: 'Người dùng', value: 'user', count: logs.filter(l => l.resource_type === 'user').length },
        { label: 'Khóa học', value: 'course', count: logs.filter(l => l.resource_type === 'course').length },
        { label: 'Thanh toán', value: 'payment', count: logs.filter(l => l.resource_type === 'payment').length },
        { label: 'Đánh giá', value: 'review', count: logs.filter(l => l.resource_type === 'review').length },
        { label: 'Cài đặt', value: 'settings', count: logs.filter(l => l.resource_type === 'settings').length }
      ]
    },
    {
      key: 'date',
      label: 'Thời gian',
      type: 'daterange'
    }
  ]

  const handleFilter = (filters: any) => {
    let filtered = logs

    if (filters.search) {
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.user_email.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.action_type) {
      const types = filters.action_type.split(',')
      filtered = filtered.filter(log => types.includes(log.action_type))
    }

    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status)
    }

    if (filters.resource_type) {
      filtered = filtered.filter(log => log.resource_type === filters.resource_type)
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter(log => {
        const date = log.created_at
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (actionType: string) => {
    const icons = {
      login: LogIn,
      logout: LogOut,
      create: UserPlus,
      update: Edit,
      delete: Trash2,
      view: Eye,
      download: Download,
      upload: Upload,
      purchase: ShoppingCart,
      payment: CreditCard,
      review: Star,
      comment: MessageSquare,
      settings: Settings
    }
    const Icon = icons[actionType as keyof typeof icons] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: { variant: 'default' as const, label: 'Thành công', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      warning: { variant: 'outline' as const, label: 'Cảnh báo', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      error: { variant: 'destructive' as const, label: 'Lỗi', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' }
    }
    const config = variants[status as keyof typeof variants] || variants.success
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const exportLogs = () => {
    const csv = [
      ['ID', 'User', 'Action', 'Description', 'Status', 'IP Address', 'Time'].join(','),
      ...filteredLogs.map(log => [
        log.id,
        log.user_name,
        log.action,
        log.description,
        log.status,
        log.ip_address,
        log.created_at.toLocaleString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!hasPermission('admin.logs.view')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Bạn không có quyền xem nhật ký hoạt động.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Nhật ký hoạt động</h1>
          <p className="text-muted-foreground">Theo dõi tất cả hoạt động trên hệ thống</p>
        </div>
        <Button onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Xuất CSV
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng hoạt động</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              Tất cả nhật ký
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thành công</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.filter(l => l.status === 'success').length}</div>
            <p className="text-xs text-muted-foreground">
              {((logs.filter(l => l.status === 'success').length / logs.length) * 100).toFixed(0)}% tổng số
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cảnh báo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.filter(l => l.status === 'warning').length}</div>
            <p className="text-xs text-muted-foreground">
              Cần theo dõi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.filter(l => l.status === 'error').length}</div>
            <p className="text-xs text-muted-foreground">
              Cần xử lý
            </p>
          </CardContent>
        </Card>
      </div>

      <TableFilter
        title="Bộ lọc nhật ký"
        configs={filterConfigs}
        onFilterChange={handleFilter}
      />

      <Card>
        <CardHeader>
          <CardTitle>Nhật ký hoạt động ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.user_avatar} />
                        <AvatarFallback>{log.user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{log.user_name}</p>
                        <p className="text-xs text-muted-foreground">{log.user_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action_type)}
                      <span className="text-sm">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm line-clamp-2">{log.description}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {log.created_at.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
