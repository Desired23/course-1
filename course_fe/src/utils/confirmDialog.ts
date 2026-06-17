import type { ReactNode } from 'react'
import { Modal } from 'antd'
import i18n from './i18n'

interface ConfirmDialogOptions {
  title?: ReactNode
  content?: ReactNode
  okText?: ReactNode
  cancelText?: ReactNode
  okType?: 'primary' | 'danger'
}

export function confirmDialog(message: ReactNode, options: ConfirmDialogOptions = {}) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    Modal.confirm({
      title: options.title ?? message,
      content: options.title ? options.content ?? message : options.content,
      okText: options.okText ?? i18n.t('common.confirm'),
      cancelText: options.cancelText ?? i18n.t('common.cancel'),
      okType: options.okType,
      centered: true,
      onOk: () => settle(true),
      onCancel: () => settle(false),
      afterClose: () => settle(false),
    })
  })
}
