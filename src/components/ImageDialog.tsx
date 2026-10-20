import { useEffect, useRef, useState } from 'react'
import type { ScreenshotItem } from '../types'

interface ImageDialogProps {
  item: ScreenshotItem
  onClose: () => void
}

export function ImageDialog({ item, onClose }: ImageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()
    return () => dialog.close()
  }, [])

  async function copyText() {
    try {
      await navigator.clipboard.writeText(item.text)
      setCopyMessage('Text copied.')
    } catch {
      setCopyMessage('Could not copy text. Check clipboard permissions.')
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="image-dialog"
      aria-labelledby="image-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <h2 id="image-dialog-title" title={item.name}>
            {item.name}
          </h2>
          <button
            className="icon-button dialog-close"
            type="button"
            aria-label="Close enlarged screenshot"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="dialog-content">
          <div className="dialog-image-wrap">
            <img src={item.previewUrl} alt={`Full-size view of ${item.name}`} />
          </div>
          <section className="dialog-text" aria-label="Extracted text">
            <div className="dialog-text-heading">
              <h3>Extracted text</h3>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void copyText()}
                disabled={!item.text}
              >
                Copy text
              </button>
            </div>
            <p className="copy-message" aria-live="polite">
              {copyMessage}
            </p>
            <pre>
              {item.text || 'No text found in this image.'}
            </pre>
          </section>
        </div>
      </div>
    </dialog>
  )
}
