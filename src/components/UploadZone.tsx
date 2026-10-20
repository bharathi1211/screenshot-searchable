import { useRef, useState } from 'react'

interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void
  disabled?: boolean
}

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function UploadZone({ onFilesAdded, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Filter dropped or selected files to the image types supported here.
  function addValidFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) =>
      allowedImageTypes.has(file.type),
    )

    if (images.length > 0) {
      onFilesAdded(images)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    addValidFiles(event.dataTransfer.files)
  }

  return (
    <section className="upload-section" aria-label="Add screenshots">
      <button
        className={`upload-zone${isDragging ? ' is-dragging' : ''}`}
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setIsDragging(false)
          }
        }}
        onDrop={handleDrop}
      >
        <span className="upload-icon" aria-hidden="true">
          +
        </span>
        <span className="upload-title">Drop screenshots here</span>
        <span className="upload-hint">
          or <span className="browse-link">browse files</span>
        </span>
        <span className="file-types">PNG, JPG, or WEBP</span>
      </button>

      {/* Keep the native picker available to mouse, keyboard, and screen readers. */}
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        aria-label="Choose screenshot image files"
        disabled={disabled}
        onChange={(event) => {
          addValidFiles(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
        }}
      />
    </section>
  )
}
