import Fuse, { type FuseResult } from 'fuse.js'
import type { ScreenshotItem } from '../types'

// Build a fuzzy index from completed OCR items so unfinished images are not searched.
export function searchItems(
  items: ScreenshotItem[],
  query: string,
): FuseResult<ScreenshotItem>[] {
  const searchableItems = items.filter((item) => item.status === 'done')

  const fuse = new Fuse(searchableItems, {
    keys: ['text', 'name'],
    threshold: 0.4,
    ignoreLocation: true,
    isCaseSensitive: false,
    includeMatches: true,
    includeScore: true,
  })

  return fuse.search(query.trim())
}
