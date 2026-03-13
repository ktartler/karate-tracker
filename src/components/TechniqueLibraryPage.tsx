import React, { useMemo, useState } from 'react'
import type { Technique } from '../types'
import { useTechniqueLibrary } from '../hooks/useTechniqueLibrary'

const BELT_LEVELS = ['all', 'white', 'yellow', 'orange', 'blue']

export function TechniqueLibraryPage() {
  const { techniques, search, filterByBelt, favourites, toggleFavourite } =
    useTechniqueLibrary()
  const [query, setQuery] = useState<string>('')
  const [beltFilter, setBeltFilter] = useState<string>('all')

  const visible: Technique[] = useMemo(() => {
    let list = beltFilter === 'all' ? techniques : filterByBelt(beltFilter)
    if (query.trim()) {
      list = search(query)
      if (beltFilter !== 'all') {
        list = list.filter(
          t => t.beltLevel.toLowerCase() === beltFilter.toLowerCase(),
        )
      }
    }
    return list
  }, [beltFilter, filterByBelt, query, search, techniques])

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontSize: 20,
          marginBottom: 12,
        }}
      >
        Technique Library
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search by name, description, or belt…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            padding: '8px 10px',
            fontSize: 14,
          }}
        />
        <select
          value={beltFilter}
          onChange={e => setBeltFilter(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 14, maxWidth: 200 }}
        >
          {BELT_LEVELS.map(level => (
            <option key={level} value={level}>
              {level === 'all'
                ? 'All belts'
                : `${level[0].toUpperCase()}${level.slice(1)} belt`}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {visible.map(t => {
          const isFav = favourites.includes(t.id)
          return (
            <article
              key={t.id}
              style={{
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    margin: 0,
                  }}
                >
                  {t.name}
                </h2>
                <button
                  type="button"
                  onClick={() => toggleFavourite(t.id)}
                  aria-pressed={isFav}
                  aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                >
                  {isFav ? '★' : '☆'}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: '#eef2ff',
                  }}
                >
                  {t.category.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: '#e0f2fe',
                  }}
                >
                  {`${t.beltLevel[0].toUpperCase()}${t.beltLevel.slice(1)} belt`}
                </span>
              </div>

              <p
                style={{
                  fontSize: 13,
                  margin: '6px 0 0',
                }}
              >
                {t.description}
              </p>

              {t.videoUrl && (
                <a
                  href={t.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    color: '#2563eb',
                  }}
                >
                  Watch reference video
                </a>
              )}
            </article>
          )
        })}
        {visible.length === 0 && (
          <p style={{ fontSize: 14 }}>No techniques match your filters.</p>
        )}
      </div>
    </div>
  )
}

