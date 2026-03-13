import { useCallback } from 'react'

export function useStorage() {
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/load')
      if (!res.ok) return null
      const data = await res.json()
      return data
    } catch (e) {
      console.error('Load failed:', e)
      return null
    }
  }, [])

  const save = useCallback(async (data) => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Save failed')
    } catch (e) {
      console.error('Save failed:', e)
      throw e
    }
  }, [])

  return { load, save }
}
