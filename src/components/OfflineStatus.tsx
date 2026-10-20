import { useEffect, useState } from 'react'

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function updateConnectionStatus() {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateConnectionStatus)
    window.addEventListener('offline', updateConnectionStatus)

    return () => {
      window.removeEventListener('online', updateConnectionStatus)
      window.removeEventListener('offline', updateConnectionStatus)
    }
  }, [])

  return (
    <div className="offline-status" aria-label="Network status">
      <p
        className={`connection-indicator${isOnline ? ' is-online' : ' is-offline'}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-dot" aria-hidden="true" />
        {isOnline ? 'Online' : 'Offline'}
      </p>
    </div>
  )
}
