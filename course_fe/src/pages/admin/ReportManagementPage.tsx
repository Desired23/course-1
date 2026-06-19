import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  List,
  Modal,
  Select as AntSelect,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Eye,
  Flag,
  MessageSquare,
  RotateCcw,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import {
  REPORT_REASON_LABELS,
  downloadCopyrightCaseExport,
  downloadReportExport,
  getAdminCopyrightCase,
  getAdminReportItem,
  getAdminReports,
  getReportStatistics,
  markAdminReportProcessed,
  markAdminReportUnprocessed,
  runAdminCopyrightAction,
  type AdminReportListStatus,
  type CopyrightAdminAction,
  type CopyrightCase,
  type CopyrightSeverity,
  type ReportCase,
  type ReportItemDetail,
  type ReportReason,
  type ReportStats,
  type ReportStatsFilters,
  type ReportTargetType,
} from '../../services/report.api'

const { RangePicker } = DatePicker
const { Text, Paragraph, Title } = Typography
const { TextArea, Search } = Input

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  review: 'Đánh giá',
  question: 'Câu hỏi',
  answer: 'Câu trả lời',
  blog_post: 'Bài viết blog',
  blog_comment: 'Bình luận blog',
  lesson_comment: 'Bình luận bài học',
  lesson: 'Bài học',
  course: 'Khóa học',
  message: 'Tin nhắn',
}

const TARGET_TAG_COLORS: Record<ReportTargetType, string> = {
  review: 'purple',
  question: 'blue',
  answer: 'cyan',
  blog_post: 'geekblue',
  blog_comment: 'volcano',
  lesson_comment: 'orange',
  lesson: 'gold',
  course: 'green',
  message: 'magenta',
}

const REPORT_METADATA_LABELS: Record<string, string> = {
  infringing_part: 'Phần bị nghi vi phạm',
  original_work_url: 'Nguồn/tác phẩm gốc',
  ownership_statement: 'Quan hệ với chủ sở hữu',
  evidence_urls: 'Link bằng chứng',
  lesson_id: 'Mã bài học',
  lesson_title: 'Bài học',
  timestamp_seconds: 'Mốc thời gian (giây)',
  good_faith_confirmed: 'Xác nhận thiện chí',
}

const COPYRIGHT_ACTIONS: Array<{ label: string; action: CopyrightAdminAction; destructive?: boolean }> = [
  { label: 'Ngừng bán', action: 'suspend_sale' },
  { label: 'Đóng băng truy cập', action: 'freeze' },
  { label: 'Takedown', action: 'takedown', destructive: true },
  { label: 'Khôi phục', action: 'restore' },
]

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

function dateRangeValue(filters: ReportStatsFilters): [Dayjs, Dayjs] | null {
  if (!filters.date_from || !filters.date_to) return null
  return [dayjs(filters.date_from), dayjs(filters.date_to)]
}

function targetIcon(type: ReportTargetType) {
  if (type === 'message') return <MessageSquare className="h-3 w-3" />
  if (type === 'course') return <BookOpen className="h-3 w-3" />
  return <Flag className="h-3 w-3" />
}

function TargetTypeTag({ type }: { type: ReportTargetType }) {
  return (
    <Tag color={TARGET_TAG_COLORS[type]} icon={targetIcon(type)}>
      {TARGET_TYPE_LABELS[type]}
    </Tag>
  )
}

function reportStatusTag(status: string) {
  if (status === 'resolved' || status === 'dismissed') return <Tag color="success">Đã xử lý</Tag>
  return <Tag color="warning">Chưa xử lý</Tag>
}

function ReportExtraDetails({
  metadata,
  attachments,
}: {
  metadata?: Record<string, any>
  attachments?: Array<Record<string, any>>
}) {
  const hiddenKeys = new Set(['report_id', 'lesson_id'])
  const entries = Object.entries(metadata ?? {}).filter(
    ([key, value]) =>
      !hiddenKeys.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0),
  )
  const hasAttachments = (attachments?.length ?? 0) > 0
  if (entries.length === 0 && !hasAttachments) return null

  const renderValue = (value: any) => {
    if (typeof value === 'boolean') return value ? 'Có' : 'Không'
    if (Array.isArray(value)) return value.map(String).join(', ')
    return String(value)
  }

  return (
    <Card size="small" title="Thông tin bổ sung">
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {entries.map(([key, value]) => (
          <Text key={key}>
            <Text strong>{REPORT_METADATA_LABELS[key] ?? key}: </Text>
            {renderValue(value)}
          </Text>
        ))}
        {hasAttachments && (
          <Space wrap>
            <Text strong>Tệp đính kèm:</Text>
            {attachments!.map((file, index) => (
              <Button
                key={`${file.url || file.public_id || index}`}
                type="link"
                size="small"
                href={file.url}
                target="_blank"
                icon={<ExternalLink className="h-3 w-3" />}
              >
                {file.public_id?.split('/').pop() || `Tệp ${index + 1}`}
              </Button>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  )
}

export function ReportManagementPage() {
  const { hasPermission } = useAuth()
  const { currentRoute } = useRouter()
  const [activeTab, setActiveTab] = useState<AdminReportListStatus>('open')
  const [reports, setReports] = useState<ReportCase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [statsFilters, setStatsFilters] = useState<ReportStatsFilters>({ group_by: 'day' })
  const [selectedReport, setSelectedReport] = useState<ReportItemDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedCopyrightCase, setSelectedCopyrightCase] = useState<CopyrightCase | null>(null)
  const [copyrightActionLoading, setCopyrightActionLoading] = useState(false)
  const [copyrightMessage, setCopyrightMessage] = useState('')
  const [copyrightSeverity, setCopyrightSeverity] = useState<CopyrightSeverity>('low')
  const [selectedCopyrightAction, setSelectedCopyrightAction] = useState<CopyrightAdminAction | ''>('')

  const loadReports = async (status: AdminReportListStatus) => {
    setLoading(true)
    try {
      const all: ReportCase[] = []
      let page = 1
      while (true) {
        const response = await getAdminReports({
          status,
          type: statsFilters.type,
          reason: statsFilters.reason,
          date_from: statsFilters.date_from,
          date_to: statsFilters.date_to,
          search: search.trim() || undefined,
          page,
          page_size: 100,
        })
        all.push(...response.results)
        if (!response.next) break
        page += 1
      }
      setReports(all)
    } catch {
      toast.error('Không thể tải danh sách báo cáo.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStats(await getReportStatistics(statsFilters))
    } catch {
      /* Stats are helpful but should not block the page. */
    }
  }

  useEffect(() => {
    void loadReports(activeTab)
  }, [
    activeTab,
    statsFilters.date_from,
    statsFilters.date_to,
    statsFilters.type,
    statsFilters.reason,
    search,
  ])

  useEffect(() => {
    void loadStats()
  }, [
    statsFilters.date_from,
    statsFilters.date_to,
    statsFilters.type,
    statsFilters.reason,
    statsFilters.group_by,
  ])

  useEffect(() => {
    const qs = currentRoute.split('?')[1] || ''
    const sp = new URLSearchParams(qs)
    const caseId = Number(sp.get('case'))
    if (caseId) {
      void openCopyrightDetailById(caseId)
    }
  }, [currentRoute])

  const openReportDetail = async (report: ReportCase) => {
    setDetailLoading(true)
    setSelectedReport(null)
    try {
      setSelectedReport(await getAdminReportItem(report.report_id))
    } catch {
      toast.error('Không thể tải chi tiết báo cáo.')
    } finally {
      setDetailLoading(false)
    }
  }

  const openCopyrightDetailById = async (caseId: number) => {
    setCopyrightActionLoading(false)
    try {
      const detail = await getAdminCopyrightCase(caseId)
      setSelectedCopyrightCase(detail)
      setCopyrightSeverity(detail.severity)
      setCopyrightMessage('')
      setSelectedCopyrightAction('')
    } catch {
      toast.error('Không thể tải case bản quyền.')
    }
  }

  const openModerationTarget = async (report: ReportCase | ReportItemDetail) => {
    if (report.copyright_case_id) {
      await openCopyrightDetailById(report.copyright_case_id)
      return
    }
    if (!report.moderation_url) {
      toast.info('Chưa có trang xử lý riêng cho loại báo cáo này.')
      return
    }
    window.open(report.moderation_url, '_blank', 'noopener,noreferrer')
  }

  const confirmAction = (
    title: string,
    content: string,
    okText: string,
    action: () => Promise<void>,
    danger = false,
  ) => {
    Modal.confirm({
      title,
      content,
      okText,
      cancelText: 'Hủy',
      okButtonProps: { danger },
      onOk: action,
    })
  }

  const handleMarkProcessed = async (report: ReportCase | ReportItemDetail) => {
    try {
      await markAdminReportProcessed(report.report_id)
      toast.success('Đã đánh dấu báo cáo là đã xử lý.')
      setReports(prev => prev.filter(item => item.report_id !== report.report_id))
      setSelectedReport(prev => (prev?.report_id === report.report_id ? null : prev))
      void loadStats()
    } catch {
      toast.error('Không thể đánh dấu báo cáo.')
    }
  }

  const handleMarkUnprocessed = async (report: ReportCase | ReportItemDetail) => {
    try {
      await markAdminReportUnprocessed(report.report_id)
      toast.success('Đã chuyển báo cáo về chưa xử lý.')
      setReports(prev => prev.filter(item => item.report_id !== report.report_id))
      setSelectedReport(prev => (prev?.report_id === report.report_id ? null : prev))
      void loadStats()
    } catch {
      toast.error('Không thể chuyển trạng thái báo cáo.')
    }
  }

  const handleCopyrightAction = async () => {
    if (!selectedCopyrightCase || !selectedCopyrightAction) return
    setCopyrightActionLoading(true)
    try {
      const updated = await runAdminCopyrightAction(selectedCopyrightCase.id, {
        action: selectedCopyrightAction,
        message: copyrightMessage,
        severity: copyrightSeverity,
      })
      setSelectedCopyrightCase(updated)
      setCopyrightMessage('')
      setSelectedCopyrightAction('')
      toast.success('Đã cập nhật case bản quyền.')
      void loadReports(activeTab)
      void loadStats()
    } catch {
      toast.error('Không thể cập nhật case bản quyền.')
    } finally {
      setCopyrightActionLoading(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setSearchDraft('')
    setStatsFilters({ group_by: 'day' })
  }

  const openReportCount = (stats?.by_status.pending ?? 0) + (stats?.by_status.reviewing ?? 0)
  const processedReportCount = (stats?.by_status.resolved ?? 0) + (stats?.by_status.dismissed ?? 0)

  const tableColumns = useMemo<TableColumnsType<ReportCase>>(() => {
    const columns: TableColumnsType<ReportCase> = [
      {
        title: 'Báo cáo',
        dataIndex: 'reporter_name',
        width: 260,
        render: (_, report) => (
          <Space direction="vertical" size={4} style={{ maxWidth: 240 }}>
            <Space size={6}>
              <User className="h-3 w-3" />
              <Text strong ellipsis style={{ maxWidth: 190 }}>
                {report.reporter_name || 'Ẩn danh'}
              </Text>
            </Space>
            <Tag>{report.reason_label}</Tag>
            {report.description && (
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, color: '#64748b' }}>
                {report.description}
              </Paragraph>
            )}
          </Space>
        ),
      },
      {
        title: 'Nội dung bị báo cáo',
        dataIndex: 'title',
        ellipsis: true,
        render: (_, report) => (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Typography.Link strong onClick={() => void openReportDetail(report)}>
              {report.title || `${report.target_type} #${report.target_id}`}
            </Typography.Link>
            {report.snippet && (
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, color: '#64748b' }}>
                {report.snippet}
              </Paragraph>
            )}
          </Space>
        ),
      },
      {
        title: 'Loại',
        dataIndex: 'target_type',
        width: 140,
        render: (type: ReportTargetType) => <TargetTypeTag type={type} />,
      },
      {
        title: 'Người tạo',
        dataIndex: 'owner_name',
        width: 160,
        ellipsis: true,
        render: (value: string | null) => value || '—',
      },
      {
        title: 'Ngày báo cáo',
        dataIndex: 'reported_at',
        width: 170,
        render: (value: string) => formatDateTime(value),
      },
    ]

    if (activeTab === 'processed') {
      columns.push({
        title: 'Ngày xử lý',
        dataIndex: 'processed_at',
        width: 170,
        render: (value: string | null) => formatDateTime(value),
      })
    }

    columns.push({
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: activeTab === 'open' ? 330 : 350,
      render: (_, report) => (
        <Space wrap size={6}>
          <Button size="small" icon={<Eye className="h-4 w-4" />} onClick={() => void openReportDetail(report)}>
            Xem
          </Button>
          <Button
            size="small"
            icon={<ExternalLink className="h-4 w-4" />}
            disabled={!report.moderation_url && !report.copyright_case_id}
            onClick={() => void openModerationTarget(report)}
          >
            Mở nơi xử lý
          </Button>
          {activeTab === 'open' ? (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircle className="h-4 w-4" />}
              onClick={() =>
                confirmAction(
                  'Đánh dấu đã xử lý?',
                  'Báo cáo này sẽ được chuyển sang tab Đã xử lý. Nội dung bị báo cáo không bị thay đổi.',
                  'Đã xử lý',
                  () => handleMarkProcessed(report),
                )
              }
            >
              Đã xử lý
            </Button>
          ) : (
            <Button
              size="small"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() =>
                confirmAction(
                  'Đánh dấu chưa xử lý?',
                  'Báo cáo này sẽ quay lại tab Chưa xử lý.',
                  'Chưa xử lý',
                  () => handleMarkUnprocessed(report),
                )
              }
            >
              Chưa xử lý
            </Button>
          )}
        </Space>
      ),
    })

    return columns
  }, [activeTab])

  const tabItems = [
    { key: 'open', label: `Chưa xử lý (${openReportCount || 0})` },
    { key: 'processed', label: `Đã xử lý (${processedReportCount || 0})` },
  ]

  if (!hasPermission('admin.reports.manage')) {
    return (
      <Card style={{ margin: 24, textAlign: 'center' }}>
        <Title level={3}>Không có quyền truy cập</Title>
        <Text type="secondary">Bạn không có quyền quản lý báo cáo.</Text>
      </Card>
    )
  }

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>Quản lý báo cáo</Title>
            <Text type="secondary">Theo dõi từng báo cáo riêng và chuyển đến đúng nơi xử lý nội dung.</Text>
          </div>
          <Space wrap>
            <Button onClick={() => void downloadReportExport(statsFilters)}>Xuất báo cáo (CSV)</Button>
            <Button onClick={() => void downloadCopyrightCaseExport(statsFilters)}>Xuất case bản quyền (CSV)</Button>
          </Space>
        </Space>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { label: 'Tổng báo cáo', value: stats?.summary.total_reports ?? '—', icon: <Flag className="h-4 w-4" /> },
            { label: 'Chưa xử lý', value: openReportCount || '—', icon: <AlertTriangle className="h-4 w-4" /> },
            { label: 'Đã xử lý', value: processedReportCount || '—', icon: <CheckCircle className="h-4 w-4" /> },
            { label: 'Case nghiêm trọng', value: stats?.summary.critical_cases ?? '—', icon: <AlertTriangle className="h-4 w-4" /> },
          ].map(item => (
            <Card key={item.label} size="small">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary">{item.label}</Text>
                  <Title level={3} style={{ margin: 0 }}>{item.value}</Title>
                </Space>
                {item.icon}
              </Space>
            </Card>
          ))}
        </div>

        <Card size="small">
          <Space wrap size={8}>
            <RangePicker
              value={dateRangeValue(statsFilters)}
              onChange={(dates) => {
                setStatsFilters(prev => ({
                  ...prev,
                  date_from: dates?.[0]?.format('YYYY-MM-DD'),
                  date_to: dates?.[1]?.format('YYYY-MM-DD'),
                }))
              }}
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 260 }}
            />
            <AntSelect
              allowClear
              placeholder="Loại"
              value={statsFilters.type}
              style={{ width: 180 }}
              onChange={(value) => setStatsFilters(prev => ({ ...prev, type: value }))}
              options={(Object.keys(TARGET_TYPE_LABELS) as ReportTargetType[]).map(type => ({
                value: type,
                label: TARGET_TYPE_LABELS[type],
              }))}
            />
            <AntSelect
              allowClear
              placeholder="Lý do"
              value={statsFilters.reason}
              style={{ width: 190 }}
              onChange={(value) => setStatsFilters(prev => ({ ...prev, reason: value }))}
              options={(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map(reason => ({
                value: reason,
                label: REPORT_REASON_LABELS[reason],
              }))}
            />
            <Search
              allowClear
              placeholder="Người báo cáo, nội dung, mô tả..."
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onSearch={(value) => setSearch(value)}
              style={{ width: 320 }}
            />
            <Button onClick={resetFilters}>Xóa lọc</Button>
          </Space>
        </Card>

        <Card
          size="small"
          title={`${reports.length} báo cáo`}
          styles={{ body: { padding: 0 } }}
          extra={
            <Tabs
              size="small"
              activeKey={activeTab}
              items={tabItems}
              onChange={(key) => setActiveTab(key as AdminReportListStatus)}
            />
          }
        >
          <Table
            rowKey="report_id"
            size="middle"
            loading={loading}
            columns={tableColumns}
            dataSource={reports}
            scroll={{ x: 1180 }}
            locale={{ emptyText: <Empty description="Không có báo cáo nào." /> }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total) => `${total} báo cáo`,
            }}
          />
        </Card>
      </Space>

      <Modal
        title="Chi tiết báo cáo"
        open={!!selectedReport || detailLoading}
        onCancel={() => setSelectedReport(null)}
        footer={selectedReport ? (
          <Space>
            <Button
              disabled={!selectedReport.moderation_url && !selectedReport.copyright_case_id}
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => void openModerationTarget(selectedReport)}
            >
              Mở nơi xử lý
            </Button>
            {selectedReport.status === 'resolved' || selectedReport.status === 'dismissed' ? (
              <Button
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() =>
                  confirmAction(
                    'Đánh dấu chưa xử lý?',
                    'Báo cáo này sẽ quay lại tab Chưa xử lý.',
                    'Chưa xử lý',
                    () => handleMarkUnprocessed(selectedReport),
                  )
                }
              >
                Chưa xử lý
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() =>
                  confirmAction(
                    'Đánh dấu đã xử lý?',
                    'Báo cáo này sẽ được chuyển sang tab Đã xử lý. Nội dung bị báo cáo không bị thay đổi.',
                    'Đã xử lý',
                    () => handleMarkProcessed(selectedReport),
                  )
                }
              >
                Đã xử lý
              </Button>
            )}
          </Space>
        ) : null}
        width={760}
      >
        {detailLoading && !selectedReport ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : selectedReport ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <TargetTypeTag type={selectedReport.target_type} />
                  <Tag>{selectedReport.reason_label}</Tag>
                  {reportStatusTag(selectedReport.status)}
                </Space>
                <Title level={4} style={{ margin: 0 }}>
                  {selectedReport.title || `${selectedReport.target_type} #${selectedReport.target_id}`}
                </Title>
                <Text type="secondary">Người tạo nội dung: {selectedReport.owner_name || '—'}</Text>
                {selectedReport.snippet && <Paragraph style={{ marginBottom: 0 }}>{selectedReport.snippet}</Paragraph>}
              </Space>
            </Card>

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Người báo cáo">
                <Space direction="vertical" size={0}>
                  <Text strong>{selectedReport.reporter_name || 'Ẩn danh'}</Text>
                  {selectedReport.reporter_email && <Text type="secondary">{selectedReport.reporter_email}</Text>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày báo cáo">{formatDateTime(selectedReport.reported_at)}</Descriptions.Item>
              <Descriptions.Item label="Ngày xử lý">
                {formatDateTime(selectedReport.processed_at ?? selectedReport.resolved_at)}
              </Descriptions.Item>
              <Descriptions.Item label="Người xử lý">{selectedReport.processed_by_name || '—'}</Descriptions.Item>
            </Descriptions>

            {selectedReport.description && (
              <Card size="small" title="Nội dung báo cáo">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{selectedReport.description}</Paragraph>
              </Card>
            )}
            <ReportExtraDetails metadata={selectedReport.metadata} attachments={selectedReport.attachments} />
          </Space>
        ) : null}
      </Modal>

      <Modal
        title={`Case bản quyền #${selectedCopyrightCase?.id ?? ''}`}
        open={!!selectedCopyrightCase}
        onCancel={() => {
          setSelectedCopyrightCase(null)
          setCopyrightMessage('')
          setSelectedCopyrightAction('')
        }}
        footer={null}
        width={920}
      >
        {selectedCopyrightCase && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Nội dung">{selectedCopyrightCase.title}</Descriptions.Item>
              <Descriptions.Item label="Target">{selectedCopyrightCase.target_type} #{selectedCopyrightCase.target_id}</Descriptions.Item>
              <Descriptions.Item label="Instructor">{selectedCopyrightCase.instructor_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Reporter">{selectedCopyrightCase.reporter_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag>{selectedCopyrightCase.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Severity"><Tag>{selectedCopyrightCase.severity}</Tag></Descriptions.Item>
              <Descriptions.Item label="Content action">{selectedCopyrightCase.content_action}</Descriptions.Item>
              <Descriptions.Item label="Financial action">{selectedCopyrightCase.financial_action}</Descriptions.Item>
              <Descriptions.Item label="Held">
                {Number(selectedCopyrightCase.held_amount || 0).toLocaleString('vi-VN')} VND
              </Descriptions.Item>
              <Descriptions.Item label="Manual follow-up">
                {selectedCopyrightCase.manual_follow_up ? 'Có' : 'Không'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Xử lý case bản quyền">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <AntSelect
                    placeholder="Biện pháp"
                    value={selectedCopyrightAction || undefined}
                    style={{ width: 240 }}
                    onChange={(value) => setSelectedCopyrightAction(value as CopyrightAdminAction)}
                    options={COPYRIGHT_ACTIONS.map(item => ({ value: item.action, label: item.label }))}
                  />
                  <AntSelect
                    value={copyrightSeverity}
                    style={{ width: 180 }}
                    onChange={(value) => setCopyrightSeverity(value as CopyrightSeverity)}
                    options={[
                      { value: 'low', label: 'Thấp' },
                      { value: 'medium', label: 'Trung bình' },
                      { value: 'high', label: 'Cao' },
                      { value: 'confirmed', label: 'Đã xác nhận' },
                      { value: 'legal', label: 'Pháp lý' },
                    ]}
                  />
                </Space>
                <TextArea
                  value={copyrightMessage}
                  onChange={(event) => setCopyrightMessage(event.target.value)}
                  rows={3}
                  placeholder="Ghi chú quyết định..."
                />
                <Button
                  type="primary"
                  danger={COPYRIGHT_ACTIONS.find(item => item.action === selectedCopyrightAction)?.destructive}
                  disabled={!selectedCopyrightAction || copyrightActionLoading}
                  loading={copyrightActionLoading}
                  onClick={() =>
                    confirmAction(
                      'Xử lý case bản quyền?',
                      'Biện pháp này sẽ áp dụng trong workflow bản quyền.',
                      'Xử lý',
                      handleCopyrightAction,
                      COPYRIGHT_ACTIONS.find(item => item.action === selectedCopyrightAction)?.destructive,
                    )
                  }
                >
                  Xử lý
                </Button>
              </Space>
            </Card>

            <Card size="small" title="Timeline">
              <List
                size="small"
                dataSource={selectedCopyrightCase.messages || []}
                locale={{ emptyText: 'Chưa có timeline.' }}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag>{item.actor_role}</Tag>
                        <Text strong>{item.response_type || 'message'}</Text>
                        <Text type="secondary">{formatDateTime(item.created_at)}</Text>
                        <Tag>{item.visibility}</Tag>
                      </Space>
                      {item.message && <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{item.message}</Paragraph>}
                      <ReportExtraDetails metadata={item.metadata} attachments={item.attachments} />
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            <Card size="small" title="Reports gốc">
              <List
                size="small"
                dataSource={selectedCopyrightCase.reports || []}
                locale={{ emptyText: 'Không có report gốc.' }}
                renderItem={(report) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{report.reporter_name || 'Ẩn danh'}</Text>
                        <Text type="secondary">{formatDateTime(report.created_at)}</Text>
                      </Space>
                      {report.description && <Paragraph style={{ marginBottom: 0 }}>{report.description}</Paragraph>}
                      <ReportExtraDetails metadata={report.metadata} attachments={report.attachments} />
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </motion.div>
  )
}
