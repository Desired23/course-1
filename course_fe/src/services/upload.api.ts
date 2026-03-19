import { API_BASE_URL, getAccessToken, http } from './http'

export interface UploadedFile {
  url: string
  public_id: string
  format: string
  resource_type?: string
  type?: string
}

export async function uploadFiles(
  files: File[],
  options?: {
    folder?: string
    resource_type?: 'image' | 'video' | 'raw' | 'auto'
    delivery_type?: 'upload' | 'authenticated' | 'private'
  }
): Promise<UploadedFile[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.resource_type) formData.append('resource_type', options.resource_type)
  if (options?.delivery_type) formData.append('delivery_type', options.delivery_type)
  return http.upload<UploadedFile[]>('/cloudinary/upload/', formData)
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
