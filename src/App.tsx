import { useEffect, useRef, useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { ScreenshotGrid } from './components/ScreenshotGrid'
import { UploadZone } from './components/UploadZone'
import { screenshotDb, toStoredScreenshot } from './lib/db'
import { recognizeImage, terminate } from './lib/ocr'
import { preprocessImage } from './lib/preprocess'
import { searchItems } from './lib/search'
import type { ScreenshotItem } from './types'

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024

function App() {
  const [items, setItems] = useState<ScreenshotItem[]>([])
  const [query, setQuery] = useState('')
  const [storageError, setStorageError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const itemsRef = useRef<ScreenshotItem[]>([])
  const queue = useRef<ScreenshotItem[]>([])
  const inFlightIds = useRef(new Set<string>())
  const pendingDeleteIds = useRef(new Set<string>())
  const deletedIds = useRef(new Set<string>())
  const processQueueRef = useRef<() => void>(() => undefined)
  const isProcessing = useRef(false)
  const isMounted = useRef(false)
  const previewUrls = useRef(new Set<string>())

  // Keep state and its synchronous queue snapshot in step.
  function updateItems(update: (current: ScreenshotItem[]) => ScreenshotItem[]) {
    const nextItems = update(itemsRef.current)
    itemsRef.current = nextItems
    setItems(nextItems)
  }

  function reportStorageError(action: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`Could not ${action} in browser storage.`, error)
    setStorageError(
      `Could not ${action} in browser storage. Your browser may have blocked local storage. ${detail}`,
    )
  }

  // Persist only the fields that belong in the database.
  async function saveItem(item: ScreenshotItem) {
    try {
      await screenshotDb.screenshots.put(toStoredScreenshot(item))
    } catch (error) {
      reportStorageError('save this screenshot', error)
    }
  }

  function resumeAfterFailedDelete(id: string) {
    const currentItem = itemsRef.current.find((item) => item.id === id)
    if (!currentItem) return

    if (
      currentItem.status === 'queued' ||
      (currentItem.status === 'processing' && !inFlightIds.current.has(id))
    ) {
      const queuedItem = { ...currentItem, status: 'queued' as const }
      updateItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? queuedItem : item)),
      )
      if (!queue.current.some((item) => item.id === id)) {
        queue.current.push(queuedItem)
      }
    } else if (
      currentItem.status === 'done' ||
      currentItem.status === 'error'
    ) {
      void saveItem(currentItem)
    }
    void processQueue()
  }

  // Work through queued images one at a time using the shared OCR worker.
  async function processQueue() {
    if (isProcessing.current) {
      return
    }

    isProcessing.current = true

    try {
      while (queue.current.length > 0 && isMounted.current) {
        const item = queue.current.shift()
        const currentItem = item
          ? itemsRef.current.find((current) => current.id === item.id)
          : undefined

        if (
          !item ||
          !currentItem ||
          currentItem.status !== 'queued' ||
          deletedIds.current.has(item.id) ||
          pendingDeleteIds.current.has(item.id)
        ) {
          continue
        }

        inFlightIds.current.add(item.id)
        updateItems((currentItems) =>
          currentItems.map((current) =>
            current.id === item.id
              ? { ...current, status: 'processing', error: undefined }
              : current,
          ),
        )

        try {
          if (item.blob.size > MAX_IMAGE_SIZE_BYTES) {
            throw new Error(
              'This image is over 15 MB, so it was skipped. Please use a smaller image.',
            )
          }

          // Preprocess only the OCR input; the original image remains saved and displayed.
          const ocrImage = await preprocessImage(item.blob)
          const text = await recognizeImage(ocrImage)

          if (
            !isMounted.current ||
            deletedIds.current.has(item.id) ||
            pendingDeleteIds.current.has(item.id)
          ) {
            continue
          }

          const completedItem = itemsRef.current.find(
            (current) => current.id === item.id,
          )
          if (!completedItem) continue

          const savedItem = {
            ...completedItem,
            text,
            status: 'done' as const,
            error: undefined,
          }
          updateItems((currentItems) =>
            currentItems.map((current) =>
              current.id === item.id ? savedItem : current,
            ),
          )
          await saveItem(savedItem)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error)

          if (
            isMounted.current &&
            !deletedIds.current.has(item.id) &&
            !pendingDeleteIds.current.has(item.id)
          ) {
            const failedItem = itemsRef.current.find(
              (current) => current.id === item.id,
            )
            if (failedItem) {
              const savedItem = {
                ...failedItem,
                status: 'error' as const,
                error: message || 'OCR could not read this image.',
              }
              updateItems((currentItems) =>
                currentItems.map((current) =>
                  current.id === item.id ? savedItem : current,
                ),
              )
              await saveItem(savedItem)
            }
          }
        } finally {
          inFlightIds.current.delete(item.id)
        }
      }
    } finally {
      isProcessing.current = false

      // A new upload may arrive just as the current queue finishes.
      if (isMounted.current && queue.current.length > 0) {
        void processQueue()
      }
    }
  }

  processQueueRef.current = () => {
    void processQueue()
  }

  // Add new screenshots to both the visible list and the sequential queue.
  async function addFiles(files: File[]) {
    if (!isReady || isClearing) return

    const newItems = files.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)

      return {
        id: crypto.randomUUID(),
        name: file.name,
        createdAt: Date.now(),
        blob: file,
        previewUrl,
        text: '',
        status: 'queued' as const,
      }
    })

    updateItems((currentItems) => [...currentItems, ...newItems])
    try {
      await screenshotDb.screenshots.bulkPut(
        newItems.map(toStoredScreenshot),
      )
    } catch (error) {
      reportStorageError('save new screenshots', error)
    }

    queue.current.push(...newItems)
    void processQueue()
  }

  async function retryItem(id: string) {
    const item = itemsRef.current.find((current) => current.id === id)
    if (!item || item.status !== 'error' || isClearing) return

    const queuedItem = {
      ...item,
      status: 'queued' as const,
      error: undefined,
    }
    deletedIds.current.delete(id)
    updateItems((currentItems) =>
      currentItems.map((current) => (current.id === id ? queuedItem : current)),
    )
    await saveItem(queuedItem)
    if (!queue.current.some((current) => current.id === id)) {
      queue.current.push(queuedItem)
    }
    void processQueue()
  }

  // Delete from storage before removing the card, then release its preview URL.
  async function removeItem(id: string) {
    const removedItem = itemsRef.current.find((item) => item.id === id)
    if (!removedItem) return

    pendingDeleteIds.current.add(id)
    queue.current = queue.current.filter((item) => item.id !== id)
    try {
      await screenshotDb.screenshots.delete(id)
      deletedIds.current.add(id)
      updateItems((currentItems) =>
        currentItems.filter((item) => item.id !== id),
      )
      URL.revokeObjectURL(removedItem.previewUrl)
      previewUrls.current.delete(removedItem.previewUrl)
    } catch (error) {
      reportStorageError('delete this screenshot', error)
      pendingDeleteIds.current.delete(id)
      resumeAfterFailedDelete(id)
      return
    } finally {
      pendingDeleteIds.current.delete(id)
    }
  }

  async function clearAll() {
    if (isClearing) return

    if (!window.confirm('Delete all saved screenshots? This cannot be undone.')) {
      return
    }

    const itemsToClear = [...itemsRef.current]
    setIsClearing(true)
    itemsToClear.forEach((item) => pendingDeleteIds.current.add(item.id))
    try {
      await screenshotDb.screenshots.clear()
      itemsToClear.forEach((item) => {
        deletedIds.current.add(item.id)
        URL.revokeObjectURL(item.previewUrl)
        previewUrls.current.delete(item.previewUrl)
      })
      queue.current = queue.current.filter(
        (item) => !deletedIds.current.has(item.id),
      )
      updateItems((currentItems) =>
        currentItems.filter((item) => !deletedIds.current.has(item.id)),
      )
    } catch (error) {
      reportStorageError('clear saved screenshots', error)
      itemsToClear.forEach((item) => {
        pendingDeleteIds.current.delete(item.id)
        resumeAfterFailedDelete(item.id)
      })
    } finally {
      itemsToClear.forEach((item) => pendingDeleteIds.current.delete(item.id))
      setIsClearing(false)
    }
  }

  // Restore saved images and retry work interrupted by a page refresh.
  useEffect(() => {
    isMounted.current = true
    let isActive = true
    const currentPreviewUrls = previewUrls.current
    const restoredItems: ScreenshotItem[] = []

    async function restoreItems() {
      try {
        const savedItems = await screenshotDb.screenshots.toArray()
        if (!isActive) return

        for (const savedItem of savedItems) {
          const previewUrl = URL.createObjectURL(savedItem.blob)
          currentPreviewUrls.add(previewUrl)
          restoredItems.push({
            ...savedItem,
            previewUrl,
            status:
              savedItem.status === 'processing' || savedItem.status === 'queued'
                ? 'queued'
                : savedItem.status,
          })
        }

        const existingIds = new Set(itemsRef.current.map((item) => item.id))
        updateItems((currentItems) => {
          const currentIds = new Set(currentItems.map((item) => item.id))
          return [
            ...restoredItems.filter((item) => !currentIds.has(item.id)),
            ...currentItems,
          ]
        })
        queue.current.push(
          ...restoredItems.filter(
            (item) => item.status === 'queued' && !existingIds.has(item.id),
          ),
        )
        setStorageError(null)
      } catch (error) {
        if (isActive) {
          reportStorageError('load saved screenshots', error)
        }
      } finally {
        if (isActive) {
          setIsReady(true)
          processQueueRef.current()
        } else {
          restoredItems.forEach((item) => {
            URL.revokeObjectURL(item.previewUrl)
            currentPreviewUrls.delete(item.previewUrl)
          })
        }
      }
    }

    void restoreItems()

    return () => {
      isActive = false
      isMounted.current = false
      currentPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
      currentPreviewUrls.clear()
      void terminate().catch((error: unknown) => {
        console.error('Could not terminate the OCR worker.', error)
      })
    }
  }, [])

  // Empty searches show every item; active searches use fuzzy OCR/name results.
  const hasQuery = query.trim().length > 0
  const searchResults = hasQuery ? searchItems(items, query) : []
  const visibleItems = hasQuery
    ? searchResults.map((result) => result.item)
    : items
  const processedCount = items.filter(
    (item) => item.status === 'done' || item.status === 'error',
  ).length
  const textMatchesById = new Map(
    searchResults.map((result) => [
      result.item.id,
      result.matches?.find((match) => match.key === 'text')?.indices ?? [],
    ]),
  )

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">YOUR PERSONAL IMAGE LIBRARY</p>
        <h1>Screenshot Search</h1>
        <p className="intro">
          Bring your screenshots together. Add images below to get started.
        </p>
      </header>

      {storageError && (
        <p className="storage-error" role="alert">
          {storageError}
        </p>
      )}
      <UploadZone onFilesAdded={addFiles} disabled={!isReady || isClearing} />
      <SearchBar query={query} onQueryChange={setQuery} />
      <ScreenshotGrid
        items={visibleItems}
        totalItems={items.length}
        isReady={isReady}
        processedCount={processedCount}
        query={query}
        textMatchesById={textMatchesById}
        onRemove={removeItem}
        onRetry={retryItem}
        onClearAll={clearAll}
        isClearing={isClearing}
      />
    </main>
  )
}

export default App
