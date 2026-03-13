import { useCallback, useEffect, useState } from 'react'
import type { Technique } from '../types'
import { TECHNIQUES } from '../data/techniques'

const FAV_STORAGE_KEY = 'karate-technique-favourites'

function loadFavourites(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(FAV_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

function saveFavourites(ids: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota / access errors
  }
}

export function useTechniqueLibrary() {
  const [favourites, setFavourites] = useState<string[]>(() => loadFavourites())

  useEffect(() => {
    saveFavourites(favourites)
  }, [favourites])

  const techniques: Technique[] = TECHNIQUES

  const search = useCallback((query: string): Technique[] => {
    const q = query.trim().toLowerCase()
    if (!q) return techniques
    return techniques.filter(t => {
      const haystack = `${t.name} ${t.description} ${t.beltLevel}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [])

  const filterByBelt = useCallback(
    (belt: string): Technique[] => {
      if (!belt) return techniques
      return techniques.filter(t => t.beltLevel.toLowerCase() === belt.toLowerCase())
    },
    [],
  )

  const toggleFavourite = useCallback((id: string): void => {
    setFavourites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }, [])

  return {
    techniques,
    search,
    filterByBelt,
    toggleFavourite,
    favourites,
  }
}

