import { API_BASE_URL, getAccessToken, http } from './http'

export interface UploadedFile {
  url: string
  public_id: string
  format: string
  resource_type?: string
  type?: string
}

interface UploadOptions {
  folder?: string
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  delivery_type?: 'upload' | 'authenticated' | 'private'
}

export interface UploadTask {
  promise: Promise<UploadedFile>
  abort: () => void
}

export async function uploadFiles(
  files: File[],
  options?: UploadOptions
): Promise<UploadedFile[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.resource_type) formData.append('resource_type', options.resource_type)
  if (options?.delivery_type) formData.append('delivery_type', options.delivery_type)
  return http.upload<UploadedFile[]>('/cloudinary/upload/', formData)
}

export async function uploadFileWithProgress(
  file: File,
  options?: UploadOptions,
  onProgress?: (percent: number) => void,
): Promise<UploadedFile> {
  return createUploadTask(file, options, onProgress).promise
}

export function createUploadTask(
  file: File,
  options?: UploadOptions,
  onProgress?: (percent: number) => void,
): UploadTask {
  const formData = new FormData()
  formData.append('files', file)
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.resource_type) formData.append('resource_type', options.resource_type)
  if (options?.delivery_type) formData.append('delivery_type', options.delivery_type)

  const token = getAccessToken()
  const xhr = new XMLHttpRequest()

  const promise = new Promise<UploadedFile>((resolve, reject) => {
    xhr.open('POST', `${API_BASE_URL}/cloudinary/upload/`)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || '[]')
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(payload?.detail || payload?.message || 'Upload failed'))
          return
        }
        resolve(payload[0] as UploadedFile)
      } catch {
        reject(new Error('Upload failed'))
      }
    }
    xhr.send(formData)
  })

  return {
    promise,
    abort: () => xhr.abort(),
  }
}

export async function deleteUploadedFiles(publicIds: string[]): Promise<Array<{ public_id: string; deleted: boolean; error?: string }>> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/cloudinary/delete/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ public_ids: publicIds }),
  })
  if (!response.ok) {
    throw new Error('Không thể xóa file đã upload')
  }
  return response.json()
}
