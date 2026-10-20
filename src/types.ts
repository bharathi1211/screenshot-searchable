export interface ScreenshotItem {
  id: string
  name: string
  createdAt: number
  blob: Blob
  previewUrl: string
  text: string
  status: 'queued' | 'processing' | 'done' | 'error'
  error?: string
}
