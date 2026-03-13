import React, { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'karate-training-days'

type TrainingDaysMap = Record<string, true>

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function loadTrainingDays(): TrainingDaysMap {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.reduce<TrainingDaysMap>((acc, d) => {
        if (typeof d === 'string') acc[d] = true
        return acc
      }, {})
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      return Object.keys(obj).reduce<TrainingDaysMap>((acc, k) => {
        if (obj[k]) acc[k] = true
        return acc
      }, {})
    }
    return {}
  } catch {
    return {}
  }
}

function saveTrainingDays(map: TrainingDaysMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const keys = Object.keys(map).filter(k => map[k])
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // ignore
  }
}

function getMonthMatrix(year: number, monthIndex: number): (Date | null)[] {
  const first = new Date(year, monthIndex, 1)
  const firstDay = first.getDay() // 0 = Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (Date | null)[] = []

  // leading blanks
  for (let i = 0; i < firstDay; i += 1) cells.push(null)

  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, monthIndex, d))
  }

  return cells
}

interface StreakStats {
  totalThisMonth: number
  currentStreak: number
  longestStreak: number
}

function computeStreaks(map: TrainingDaysMap, viewYear: number, viewMonth: number): StreakStats {
  const allDays = Object.keys(map)
    .filter(k => map[k])
    .sort()

  const todayKey = toKey(new Date())
  let currentStreak = 0
  let longestStreak = 0

  if (allDays.length > 0) {
    let streak = 1
    for (let i = allDays.length - 1; i >= 0; i -= 1) {
      const cur = new Date(allDays[i])
      const prevStr = allDays[i - 1]
      if (i === allDays.length - 1) {
        const diffDays = Math.round(
          (new Date(todayKey).getTime() - cur.getTime()) / (1000 * 60 * 60 * 24),
        )
        if (diffDays === 0) {
          currentStreak = 1
        } else if (diffDays === 1) {
          currentStreak = 0
        }
      }
      if (!prevStr) break
      const prev = new Date(prevStr)
      const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        streak += 1
      } else {
        longestStreak = Math.max(longestStreak, streak)
        streak = 1
      }
    }
    longestStreak = Math.max(longestStreak, 1)
  }

  if (currentStreak === 0 && map[todayKey]) {
    currentStreak = 1
  }

  const totalThisMonth = Object.keys(map).filter(key => {
    if (!map[key]) return false
    const d = new Date(key)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  }).length

  return { totalThisMonth, currentStreak, longestStreak }
}

export function TrainingCalendar() {
  const today = new Date()
  const [year, setYear] = useState<number>(today.getFullYear())
  const [month, setMonth] = useState<number>(today.getMonth())
  const [daysMap, setDaysMap] = useState<TrainingDaysMap>(() => loadTrainingDays())

  useEffect(() => {
    saveTrainingDays(daysMap)
  }, [daysMap])

  const cells = useMemo(() => getMonthMatrix(year, month), [year, month])

  const stats = useMemo(() => computeStreaks(daysMap, year, month), [daysMap, month, year])

  const handleToggle = (date: Date | null) => {
    if (!date) return
    const key = toKey(date)
    setDaysMap(prev => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  const changeMonth = (delta: number) => {
    setMonth(prev => {
      const next = prev + delta
      if (next < 0) {
        setYear(y => y - 1)
        return 11
      }
      if (next > 11) {
        setYear(y => y + 1)
        return 0
      }
      return next
    })
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const todayKey = toKey(today)

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100"
        >
          ‹
        </button>
        <div className="text-center font-medium">{monthLabel}</div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-1 text-gray-500">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-sm">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-9" />
          }
          const key = toKey(date)
          const isOn = !!daysMap[key]
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(date)}
              className={`relative flex items-center justify-center h-9 rounded ${
                isToday ? 'border border-blue-300' : ''
              }`}
            >
              <span className="z-10 text-xs">{date.getDate()}</span>
              {isOn && (
                <span className="absolute inset-1 rounded-full bg-green-500 opacity-70" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-gray-700 space-y-1">
        <div>
          <span className="font-semibold">This month:</span> {stats.totalThisMonth} training
          day{stats.totalThisMonth === 1 ? '' : 's'}
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
    </div>
  )
}

