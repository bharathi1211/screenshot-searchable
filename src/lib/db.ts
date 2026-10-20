import Dexie, { type Table } from 'dexie'
import type { ScreenshotItem } from '../types'

export type StoredScreenshot = Pick<
  ScreenshotItem,
  'id' | 'name' | 'createdAt' | 'blob' | 'text' | 'status'
>

class ScreenshotDatabase extends Dexie {
  screenshots!: Table<StoredScreenshot, string>

  constructor() {
    super('screenshot-search')
    this.version(1).stores({
      screenshots: 'id, createdAt',
    })
  }
}

export const screenshotDb = new ScreenshotDatabase()

// Keep temporary preview URLs out of IndexedDB; they are recreated on load.
export function toStoredScreenshot(
  item: ScreenshotItem,
): StoredScreenshot {
  return {
    id: item.id,
    name: item.name,
    createdAt: item.createdAt,
    blob: item.blob,
    text: item.text,
    status: item.status,
  }
}
