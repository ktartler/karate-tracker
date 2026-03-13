import { useState } from 'react'
import { T } from '../data/constants'

const STATES = ['empty', 'training', 'training+cardio', 'training+sparring', 'training+leadership', 'training+leadership+sparring', 'sparring', 'workshop', 'home']
const HEATMAP_THEMES = {
  dark: {
    'empty':             'var(--card)',
    'training':          '#3498DB',
    'training+cardio':   '#F39C12',
    'training+sparring': '#E74C3C',
    'training+leadership': '#9B59B6',
    'training+leadership+sparring': '#5B2C6F',
    'sparring':          '#D35400',
    'workshop':          '#2ECC71',
    'home':              '#34495E',
  },
  light: {
    'empty':             'var(--card)',
    'training':          '#AEC6CF',
    'training+cardio':   '#FFB347',
    'training+sparring': '#FF6961',
    'training+leadership': '#CBAACB',
    'training+leadership+sparring': '#966D96',
    'sparring':          '#FF964F',
    'workshop':          '#77DD77',
    'home':              '#B4B4B4',
  },
  sakura: {
    'empty':             'var(--card)',
    'training':          '#ff69b4',
    'training+cardio':   '#ffb6c1',
    'training+sparring': '#db7093',
    'training+leadership': '#c71585',
    'training+leadership+sparring': '#8b0a50',
    'sparring':          '#ff1493',
    'workshop':          '#3cb371',
    'home':              '#dda0dd',
  },
  dojo: {
    'empty':             'var(--card)',
    'training':          '#d2691e',
    'training+cardio':   '#cd853f',
    'training+sparring': '#b22222',
    'training+leadership': '#8b5a2b',
    'training+leadership+sparring': '#5c4033',
    'sparring':          '#8b0000',
    'workshop':          '#556b2f',
    'home':              '#a0522d',
  },
  balanced: {
    'empty':             'var(--card)',
    'training':          '#135295',
    'training+cardio':   '#ffc107',
    'training+sparring': '#b41319',
    'training+leadership': '#4054b2',
    'training+leadership+sparring': '#c60000',
    'sparring':          '#d80000',
    'workshop':          '#1877f2',
    'home':              '#32373c',
  }
}

function getISODate(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export default function TrainingHeatmap({ log, heatmapData = {}, onToggle, isLeadership = false, theme = 'dark' }) {
  const [view, setView]       = useState('week')
  const [offset, setOffset]   = useState(0)

  const availableStates = STATES.filter(s => {
    if (!isLeadership && s.includes('leadership')) return false
    return true
  })

  const toggle = (ds) => {
    const currentState = heatmapData[ds] || 'empty'
    let currentIndex = availableStates.indexOf(currentState)
    if (currentIndex === -1) currentIndex = 0
    const nextState = availableStates[(currentIndex + 1) % availableStates.length]
    if (onToggle) onToggle(ds, nextState)
  }

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const activeColors = HEATMAP_THEMES[theme] || HEATMAP_THEMES.dark

  // ── Build cells depending on view ──────────────────────────
  let cells = []
  let columns = 1
  let label = ''

  if (view === 'week') {
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() === 0 ? 6 : today.getDay() - 1)) + offset * 7)
    for (let d = 0; d < 7; d++) {
      const dt = addDays(monday, d)
      const ds = getISODate(dt)
      cells.push({ ds, isFuture: dt > today, dayName: dt.toLocaleDateString('en', { weekday: 'short' }), dayNum: dt.getDate() })
    }
    columns = 7
    label = monday.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  }

  else if (view === 'month') {
    const ref = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
    const firstDow = ref.getDay() === 0 ? 6 : ref.getDay() - 1
    for (let i = 0; i < firstDow; i++) cells.push(null) // empty padding
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(ref.getFullYear(), ref.getMonth(), d)
      dt.setHours(12, 0, 0, 0)
      const ds = getISODate(dt)
      cells.push({ ds, isFuture: dt > today, dayNum: d })
    }
    columns = 7
    label = ref.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  }

  else if (view === '16weeks') {
    const WEEKS = 16
    const dow = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - ((dow === 0 ? 6 : dow - 1)) - (WEEKS - 1) * 7 + offset * 7)
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = addDays(start, w * 7 + d)
        const ds = getISODate(dt)
        cells.push({ ds, isFuture: dt > today })
      }
    }
    columns = WEEKS
    label = '16 weeks'
  }

  else if (view === 'year') {
    const WEEKS = 52
    const dow = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - ((dow === 0 ? 6 : dow - 1)) - (WEEKS - 1) * 7 + offset * 7)
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = addDays(start, w * 7 + d)
        const ds = getISODate(dt)
        cells.push({ ds, isFuture: dt > today })
      }
    }
    columns = WEEKS
    label = 'Last 52 weeks'
  }

  // ── Cell size based on view ────────────────────────────────
  const cellSize = view === 'week' ? 96 : view === 'month' ? 48 : view === '16weeks' ? 16 : 10

  return (
    <div style={{ marginBottom: 4 }}>

      {/* View switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['week', 'month', '16weeks', 'year'].map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setOffset(0) }}
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: view === v ? '#C0392B' : 'var(--card)',
              color: view === v ? '#fff' : 'var(--textDim)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {v === '16weeks' ? '16 Weeks' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Navigation + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <button onClick={() => setOffset(o => o - 1)} style={navBtn}>←</button>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 120, textAlign: 'center' }}>{label}</span>
        <button onClick={() => setOffset(o => o + 1)} style={navBtn}>→</button>
      </div>

      {/* Day headers for week and month views */}
      {(view === 'week' || view === 'month') && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSize}px)`, gap: 3, marginBottom: 3 }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: view === 'week' || view === 'month'
          ? `repeat(7, ${cellSize}px)`
          : `repeat(${columns}, 1fr)`,
        gap: 3,
      }}>
        {cells.map((c, i) => {
          if (!c) return <div key={i} /> // empty padding for month view
          const state = heatmapData[c.ds] || 'empty'
          return (
            <div
              key={c.ds}
              title={c.ds + ' · ' + state}
              onClick={() => !c.isFuture && toggle(c.ds)}
              style={{
                width: view === 'week' || view === 'month' ? cellSize : '100%',
                height: view === 'week' || view === 'month' ? cellSize : undefined,
                paddingTop: view === 'week' || view === 'month' ? 0 : '100%',
                borderRadius: 3,
                cursor: c.isFuture ? 'default' : 'pointer',
                background: c.isFuture ? 'rgba(255,255,255,0.015)' : activeColors[state],
                border: `1px solid rgba(255,255,255,0.05)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {(view === 'week' || view === 'month') && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
                  {view === 'week' ? <><div style={{fontSize:8}}>{c.dayName}</div>{c.dayNum}</> : c.dayNum}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
        {STATES.filter(s => s !== 'empty').map(s => (
          <div key={s} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: activeColors[s] }} />
            {s}
          </div>
        ))}
      </div>

    </div>
  )
}

const navBtn = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  borderRadius: 4,
  padding: '2px 8px',
  cursor: 'pointer',
  fontSize: 12,
}

export { TrainingHeatmap }