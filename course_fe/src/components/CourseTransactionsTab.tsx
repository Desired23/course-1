import { useEffect, useMemo, useState } from 'react'
import { Select as AntSelect, Table as AntTable, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getInstructorEarnings,
  parseEarningAmount,
  type InstructorEarning,
} from '../services/instructor-earnings.api'
import { getErrorMessage } from '../lib/apiError'

const PAGE_SIZE = 10

function formatCurrency(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')} ₫`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function moneyOrDash(value?: string | null) {
  if (value === null || value === undefined) return '-'
  return formatCurrency(parseEarningAmount(value))
}

function finalInstructorAmount(row: InstructorEarning) {
  return row.instructor_net_after_refund ?? row.net_amount
}

const STATUS_TAG_COLOR: Record<string, string> = {
  available: 'green',
  paid: 'blue',
  pending: 'gold',
  cancelled: 'red',
}

export function CourseTransactionsTab({ courseId }: { courseId: number }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<InstructorEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    setPage(1)
  }, [statusFilter, sourceFilter, courseId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await getInstructorEarnings({
          course_id: courseId,
          status: statusFilter,
          source: sourceFilter,
          page,
          page_size: PAGE_SIZE,
        })
        if (cancelled) return
        setRows(res.results)
        setTotal(res.count)
      } catch (err: any) {
        if (!cancelled) toast.error(getErrorMessage(err, t('course_transactions.load_failed')))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, page, statusFilter, sourceFilter, t])

  const columns: TableColumnsType<InstructorEarning> = useMemo(() => [
    {
      title: t('course_transactions.col_date'),
      key: 'date',
      render: (_, row) => formatDate(row.payment_date || row.earning_date),
    },
    {
      title: t('course_transactions.col_student'),
      key: 'student',
      render: (_, row) => row.student_name || row.student_email || '-',
    },
    {
      title: t('course_transactions.col_source'),
      dataIndex: 'earning_source',
      key: 'earning_source',
      render: (value: string) =>
        value === 'subscription'
          ? t('course_transactions.source_subscription')
          : t('course_transactions.source_retail'),
    },
    {
      title: t('course_transactions.col_sale_price'),
      dataIndex: 'sale_price',
      key: 'sale_price',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
    },
    {
      title: t('course_transactions.col_refund'),
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
    },
    {
      title: t('course_transactions.col_instructor_net'),
      key: 'instructor_net',
      align: 'right',
      render: (_, row) => formatCurrency(parseEarningAmount(finalInstructorAmount(row))),
    },
    {
      title: t('course_transactions.col_status'),
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={STATUS_TAG_COLOR[value]}>{t(`course_transactions.status_${value}`)}</Tag>
      ),
    },
    {
      title: t('course_transactions.col_transaction_id'),
      dataIndex: 'payment_transaction_id',
      key: 'payment_transaction_id',
      render: (value: string | null) => value || '-',
    },
  ], [t])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <AntSelect
          allowClear
          placeholder={t('course_transactions.filter_status')}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          style={{ width: 180 }}
          options={[
            { value: 'pending', label: t('course_transactions.status_pending') },
            { value: 'available', label: t('course_transactions.status_available') },
            { value: 'paid', label: t('course_transactions.status_paid') },
            { value: 'cancelled', label: t('course_transactions.status_cancelled') },
          ]}
        />
        <AntSelect
          allowClear
          placeholder={t('course_transactions.filter_source')}
          value={sourceFilter}
          onChange={(value) => setSourceFilter(value)}
          style={{ width: 180 }}
          options={[
            { value: 'retail', label: t('course_transactions.source_retail') },
            { value: 'subscription', label: t('course_transactions.source_subscription') },
          ]}
        />
      </div>

      <AntTable<InstructorEarning>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />
    </div>
  )
}
