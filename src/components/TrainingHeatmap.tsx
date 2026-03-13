import React, { useMemo, useState } from 'react'

const STORAGE_KEY = 'karate-training-days'

type TrainingState =
  | 'empty'
  | 'training'
  | 'training+cardio'
  | 'training+sparring'
  | 'sparring'
  | 'home'

type TrainingMap = Record<string, TrainingState>

type ViewMode = 'year' | 'month' | 'week'

const STATE_CYCLE: TrainingState[] = [
  'empty',
  'training',
  'training+cardio',
  'training+sparring',
  'sparring',
  'home',
]

const STATE_LABEL: Record<TrainingState, string> = {
  empty: 'No training',
  training: 'Training',
  'training+cardio': 'Training + cardio',
  'training+sparring': 'Training + sparring',
  sparring: 'Sparring only',
  home: 'Home',
}

const STATE_COLOR: Record<TrainingState, string> = {
  empty: 'bg-gray-200',
  training: 'bg-red-500',
  'training+cardio': 'bg-orange-500',
  'training+sparring': 'bg-red-700',
  sparring: 'bg-orange-700',
  home: 'bg-blue-300',
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fromKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

function loadMap(): TrainingMap {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)

    // Legacy array of dates: ['2026-03-01', ...]
    if (Array.isArray(parsed)) {
      return parsed.reduce<TrainingMap>((acc, v) => {
        if (typeof v === 'string') acc[v] = 'training'
        return acc
      }, {})
    }

    // Object map { [date]: boolean | state }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const map: TrainingMap = {}
      Object.keys(obj).forEach(k => {
        const v = obj[k]
        if (typeof v === 'string' && STATE_CYCLE.includes(v as TrainingState)) {
          map[k] = v as TrainingState
        } else if (v) {
          map[k] = 'training'
        }
      })
      return map
    }
    return {}
  } catch {
    return {}
  }
}

function saveMap(map: TrainingMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota errors
  }
}

function isTrainingState(state: TrainingState | undefined): boolean {
  if (!state) return false
  return state !== 'empty' && state !== 'home'
}

interface StreakStats {
  totalThisYear: number
  currentStreak: number
  longestStreak: number
}

function computeStreaks(map: TrainingMap, year: number): StreakStats {
  const entries = Object.entries(map)
    .filter(([, s]) => isTrainingState(s))
    .map(([k]) => k)
    .sort()

  const todayKey = toKey(new Date())
  let currentStreak = 0
  let longestStreak = 0

  if (entries.length > 0) {
    // Longest streak over all time
    let run = 1
    for (let i = 1; i < entries.length; i += 1) {
      const prev = fromKey(entries[i - 1])
      const cur = fromKey(entries[i])
      const diffDays =
        (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays === 1) {
        run += 1
      } else {
        if (run > longestStreak) longestStreak = run
        run = 1
      }
    }
    if (run > longestStreak) longestStreak = run

    // Current streak ending today (if today trained)
    if (entries.includes(todayKey)) {
      currentStreak = 1
      for (let i = entries.length - 2; i >= 0; i -= 1) {
        const nextDay = fromKey(entries[i + 1])
        const prevDay = fromKey(entries[i])
        const diffDays =
          (nextDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays === 1) currentStreak += 1
        else break
      }
    }
  }

  const totalThisYear = Object.entries(map).filter(([k, s]) => {
    if (!isTrainingState(s)) return false
    const d = fromKey(k)
    return d.getFullYear() === year
  }).length

  return { totalThisYear, currentStreak, longestStreak }
}

export function TrainingHeatmap() {
  const [view, setView] = useState<ViewMode>('year')
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [map, setMap] = useState<TrainingMap>(() => loadMap())

  const anchorYear = anchorDate.getFullYear()
  const anchorMonth = anchorDate.getMonth()

  const stats = useMemo(
    () => computeStreaks(map, anchorYear),
    [map, anchorYear],
  )

  const setStateForDate = (date: Date) => {
    const key = toKey(date)
    setMap(prev => {
      const current = prev[key] ?? 'empty'
      const idx = STATE_CYCLE.indexOf(current)
      const next = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length]
      const updated: TrainingMap = { ...prev }
      if (next === 'empty') {
        delete updated[key]
      } else {
        updated[key] = next
      }
      saveMap(updated)
      return updated
    })
  }

  const handleNavigate = (delta: number) => {
    setAnchorDate(prev => {
      const d = new Date(prev)
      if (view === 'year') {
        d.setFullYear(d.getFullYear() + delta)
      } else if (view === 'month') {
        d.setMonth(d.getMonth() + delta)
      } else {
        d.setDate(d.getDate() + delta * 7)
      }
      return d
    })
  }

  const renderCell = (date: Date | null, sizeClass: string) => {
    if (!date) return <div className={sizeClass} />
    const key = toKey(date)
    const state = map[key] ?? 'empty'
    const colorClass = STATE_COLOR[state]
    const todayKey = toKey(new Date())
    const isToday = key === todayKey
    const label = `${date.toLocaleDateString()} — ${STATE_LABEL[state]}`

    return (
      <button
        key={key}
        type="button"
        title={label}
        onClick={() => setStateForDate(date)}
        className={`relative rounded-sm ${sizeClass} ${
          isToday ? 'ring-1 ring-blue-300' : ''
        }`}
      >
        <div
          className={`absolute inset-0 rounded-sm ${colorClass} ${
            state === 'empty' ? '' : 'shadow-sm'
          }`}
        />
      </button>
    )
  }

  const renderYearView = () => {
    const year = anchorYear
    const firstOfYear = new Date(year, 0, 1)
    const firstSunday = addDays(firstOfYear, -firstOfYear.getDay())
    const weeks = 53
    const days = 7

    const monthLabels: (string | null)[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w += 1) {
      const colDate = addDays(firstSunday, w * 7)
      const m = colDate.getMonth()
      const label =
        colDate.getFullYear() === year && m !== lastMonth && colDate.getDate() <= 7
          ? colDate.toLocaleDateString('en-US', { month: 'short' })
          : ''
      monthLabels.push(label || null)
      if (label) lastMonth = m
    }

    return (
      <>
        <div className="grid grid-cols-53 gap-[2px] mb-1 text-[10px] text-gray-500">
          {monthLabels.map((ml, idx) => (
            <div key={idx} className="text-center">
              {ml}
            </div>
          ))}
        </div>
        <div className="flex gap-[2px]">
          <div className="flex flex-col justify-between mr-1 text-[10px] text-gray-500">
            {['Sun', 'Tue', 'Thu'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-53 grid-rows-7 gap-[2px]">
            {Array.from({ length: weeks * days }).map((_, idx) => {
              const w = Math.floor(idx / days)
              const d = idx % days
              const date = addDays(firstSunday, w * 7 + d)
              if (date.getFullYear() !== year) {
                return <div key={`empty-${idx}`} className="w-3 h-3 md:w-4 md:h-4" />
              }
              return renderCell(date, 'w-3 h-3 md:w-4 md:h-4')
            })}
          </div>
        </div>
      </>
    )
  }

  const renderMonthView = () => {
    const year = anchorYear
    const month = anchorMonth
    const first = new Date(year, month, 1)
    const firstWeekday = (first.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(year, month, d))
    }

    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-gray-500 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, idx) =>
            date ? (
              <div key={toKey(date)} className="flex flex-col items-center">
                {renderCell(date, 'w-7 h-7 md:w-8 md:h-8')}
                <span className="mt-1 text-[10px] text-gray-600">{date.getDate()}</span>
              </div>
            ) : (
              <div key={`m-empty-${idx}`} className="w-7 h-7 md:w-8 md:h-8" />
            ),
          )}
        </div>
      </>
    )
  }

  const renderWeekView = () => {
    const day = anchorDate.getDay()
    const monday = addDays(anchorDate, -((day + 6) % 7))
    const days = Array.from({ length: 7 }).map((_, i) => addDays(monday, i))

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(date => {
          const key = toKey(date)
          const state = map[key] ?? 'empty'
          const colorClass = STATE_COLOR[state]
          const isToday = key === toKey(new Date())
          const label = `${date.toLocaleDateString()} — ${STATE_LABEL[state]}`
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => setStateForDate(date)}
              className={`flex flex-col items-center justify-center h-16 rounded-md text-xs ${
                isToday ? 'ring-1 ring-blue-300' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-md ${colorClass} ${
                  state === 'empty' ? '' : 'shadow'
                }`}
              />
              <span className="mt-1 text-[11px] text-gray-700">
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const headingLabel =
    view === 'year'
      ? anchorYear.toString()
      : view === 'month'
        ? anchorDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : `Week of ${anchorDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNavigate(-1)}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
          >
            ←
          </button>
          <div className="text-sm font-medium">{headingLabel}</div>
          <button
            type="button"
            onClick={() => handleNavigate(1)}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
          >
            →
          </button>
        </div>

        <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
          {(['year', 'month', 'week'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-3 py-1 rounded-full ${
                view === mode ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'year' && renderYearView()}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        <div>
          <span className="font-semibold">Training days this year:</span>{' '}
          {stats.totalThisYear}
        </div>
        <div>
          <span className="font-semibold">Current streak:</span> {stats.currentStreak} day
          {stats.currentStreak === 1 ? '' : 's'}
        </div>
        <div>
          <span className="font-semibold">Longest streak:</span> {stats.longestStreak} day
          {stats.longestStreak === 1 ? '' : 's'}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-700">
        <span className="font-semibold mr-1">Legend:</span>
        {STATE_CYCLE.map(state => (
          <div key={state} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-sm ${STATE_COLOR[state]}`} />
            <span>{STATE_LABEL[state]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

