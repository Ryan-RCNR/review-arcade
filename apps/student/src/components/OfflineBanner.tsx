/**
 * Offline Banner Component
 *
 * Displays a banner when the user loses internet connection
 */

import { useState, useEffect } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline(): void {
      setIsOnline(true)
    }
    function handleOffline(): void {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-50"
    >
      <span aria-hidden="true">📡</span> You&apos;re offline. Check your internet connection.
    </div>
  )
}
