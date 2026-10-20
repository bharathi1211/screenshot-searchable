import { useEffect, useId, useRef, useState } from 'react'

interface RenameControlProps {
  name: string
  onRename: (name: string) => Promise<boolean>
}

function getFileExtension(name: string) {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(dotIndex) : ''
}

function keepFileExtension(name: string, originalName: string) {
  const originalExtension = getFileExtension(originalName)
  const dotIndex = name.lastIndexOf('.')
  const hasExplicitExtension = dotIndex > 0 && dotIndex < name.length - 1

  // Add the original suffix only when the edited name does not supply one.
  return originalExtension && !hasExplicitExtension
    ? `${name}${originalExtension}`
    : name
}

export function RenameControl({ name, onRename }: RenameControlProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const messageId = useId()

  // Focus the editor as it appears so renaming can be completed from the keyboard.
  useEffect(() => {
    if (!isEditing) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [isEditing])

  function finishEditing() {
    setIsEditing(false)
    setMessage('')
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  function cancelEditing() {
    setDraft(name)
    finishEditing()
  }

  async function saveName() {
    const trimmedName = draft.trim()
    // Validate the trimmed and extension-adjusted value before saving it.
    if (!trimmedName) {
      setMessage('Name cannot be empty.')
      return
    }

    const nextName = keepFileExtension(trimmedName, name)
    if (nextName.length > 100) {
      setMessage('Name must be 100 characters or fewer.')
      return
    }

    setIsSaving(true)
    setMessage('')
    try {
      if (await onRename(nextName)) {
        setDraft(nextName)
        finishEditing()
      } else {
        setMessage('Could not save the new name. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="rename-control">
        <button
          ref={buttonRef}
          className="rename-button"
          type="button"
          aria-label={`Rename ${name}`}
          onClick={() => {
            setDraft(name)
            setMessage('')
            setIsEditing(true)
          }}
        >
          <span aria-hidden="true">✎</span>
          Rename
        </button>
      </div>
    )
  }

  return (
    <div className="rename-control is-editing">
      <div className="rename-editor">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={100}
          aria-label={`New name for ${name}`}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void saveName()
            } else if (event.key === 'Escape' && !isSaving) {
              cancelEditing()
            }
          }}
          disabled={isSaving}
        />
        <button
          className="secondary-button"
          type="button"
          disabled={isSaving}
          onClick={() => void saveName()}
        >
          Save
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={isSaving}
          onClick={cancelEditing}
        >
          Cancel
        </button>
      </div>
      {message && (
        <p className="rename-message" id={messageId} role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
