import type { ScreenshotItem } from '../types'
import type { RangeTuple } from 'fuse.js'
import { useState } from 'react'
import { ImageDialog } from './ImageDialog'
import { TextSnippet } from './TextSnippet'

interface ScreenshotGridProps {
  items: ScreenshotItem[]
  totalItems: number
  isReady: boolean
  processedCount: number
  query: string
  textMatchesById: ReadonlyMap<string, ReadonlyArray<RangeTuple>>
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onClearAll: () => void
  isClearing: boolean
}

export function ScreenshotGrid({
  items,
  totalItems,
  isReady,
  processedCount,
  query,
  textMatchesById,
  onRemove,
  onRetry,
  onClearAll,
  isClearing,
}: ScreenshotGridProps) {
  const hasQuery = query.trim().length > 0
  const [selectedItem, setSelectedItem] = useState<ScreenshotItem | null>(null)

  if (totalItems === 0) {
    if (!isReady) {
      return (
        <p className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading your screenshot library…
        </p>
      )
    }

    return (
      <section className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          ◇
        </span>
        <h2>Your screenshot library is ready</h2>
        <p>Add your first screenshot to make its contents searchable.</p>
      </section>
    )
  }

  // Each card shows a local preview and gives the user a way to remove it.
  return (
    <section className="library-section" aria-label="Added screenshots">
      <div className="library-heading">
        <div className="library-title">
          <h2>{hasQuery ? 'Search results' : 'Your screenshots'}</h2>
          {hasQuery ? (
            <span className="image-count">
              {items.length} {items.length === 1 ? 'result' : 'results'}
            </span>
          ) : (
            <span className="image-count">
              {totalItems} {totalItems === 1 ? 'image' : 'images'}
            </span>
          )}
        </div>
        <button
          className="clear-all-button"
          type="button"
          disabled={isClearing}
          onClick={onClearAll}
        >
          {isClearing ? 'Clearing…' : 'Clear all'}
        </button>
      </div>
      <p className="progress-line" aria-live="polite">
        {processedCount} of {totalItems} processed
      </p>
      {items.length === 0 ? (
        <p className="empty-state">
          No screenshots match “{query.trim()}”. Try another word or clear your
          search.
        </p>
      ) : (
        <div className="screenshot-grid">
          {items.map((item) => {
            const textRanges = textMatchesById.get(item.id) ?? []

            return (
              <article className="screenshot-card" key={item.id}>
                <div className="thumbnail">
                  <button
                    className="preview-button"
                    type="button"
                    aria-label={`Enlarge ${item.name} and view its extracted text`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <img src={item.previewUrl} alt="" />
                    <span className="preview-hint" aria-hidden="true">
                      View image
                    </span>
                  </button>
                  <button
                    className="remove-button"
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => onRemove(item.id)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <p className="file-name" title={item.name}>
                  {item.name}
                </p>
                <span className={`status-badge status-${item.status}`}>
                  {item.status === 'processing'
                    ? 'Processing OCR'
                    : item.status === 'queued'
                      ? 'Waiting for OCR'
                      : item.status}
                </span>
                {item.status === 'processing' && (
                  <p className="processing-message" role="status">
                    Reading text from this image…
                  </p>
                )}
                {item.status === 'queued' && (
                  <p className="queued-message" role="status">
                    Queued for text recognition.
                  </p>
                )}
                {item.status === 'error' && item.error && (
                  <div className="image-error" role="alert">
                    <p>{item.error}</p>
                    <button
                      className="retry-button"
                      type="button"
                      aria-label={`Retry OCR for ${item.name}`}
                      onClick={() => onRetry(item.id)}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {item.status === 'done' && (
                  <>
                    {hasQuery && (
                      <p className="search-snippet">
                        <TextSnippet
                          text={item.text}
                          ranges={textRanges}
                          snippet
                        />
                      </p>
                    )}
                    <details className="recognized-text">
                      <summary>Extracted text</summary>
                      <p>
                        {hasQuery ? (
                          <TextSnippet text={item.text} ranges={textRanges} />
                        ) : (
                          item.text || 'No text found in this image.'
                        )}
                      </p>
                    </details>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
      {selectedItem && (
        <ImageDialog
          item={
            items.find((item) => item.id === selectedItem.id) ?? selectedItem
          }
          onClose={() => setSelectedItem(null)}
        />
      )}
    </section>
  )
}
