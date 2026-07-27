import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook for optimized data fetching with cleanup
 * Prevents memory leaks and handles component unmounting
 */
export function useOptimizedFetch(url, options = {}) {
  const [data, setData] = window.React.useState(null)
  const [loading, setLoading] = window.React.useState(true)
  const [error, setError] = window.React.useState(null)
  const activeRef = useRef(true)
  const controllerRef = useRef(new AbortController())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      controllerRef.current = new AbortController()
      const response = await fetch(url, {
        ...options,
        signal: controllerRef.current.signal
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = await response.json()

      if (activeRef.current) {
        setData(result)
      }
    } catch (err) {
      if (err.name !== 'AbortError' && activeRef.current) {
        setError(err.message)
      }
    } finally {
      if (activeRef.current) {
        setLoading(false)
      }
    }
  }, [url, options])

  useEffect(() => {
    activeRef.current = true
    fetchData()

    return () => {
      activeRef.current = false
      controllerRef.current.abort()
    }
  }, [fetchData])

  return { data, loading, error }
}
