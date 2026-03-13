import { useCallback, useEffect, useState } from 'react'
import type { Session } from '../types'

const STORAGE_KEY = 'karate-sessions'

function safeParse(json: string | null): Session[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is Session =>
        typeof s === 'object' &&
        s !== null &&
        typeof s.id === 'string' &&
        typeof s.studentId === 'string' &&
        typeof s.date === 'string' &&
        typeof s.durationMinutes === 'number' &&
        typeof s.type === 'string' &&
        typeof s.notes === 'string' &&
        Array.isArray(s.techniques),
    )
  } catch {
    return []
  }
}

function loadInitialSessions(): Session[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return safeParse(raw)
}

function persistSessions(sessions: Session[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore quota / access errors for now
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useTrainingSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => loadInitialSessions())

  useEffect(() => {
    persistSessions(sessions)
  }, [sessions])

  const addSession = useCallback((session: Omit<Session, 'id'>): void => {
    setSessions(prev => [...prev, { ...session, id: createId() }])
  }, [])

  const deleteSession = useCallback((id: string): void => {
    setSessions(prev => prev.filter(s => s.id !== id))
  }, [])

  const getSessionsByStudent = useCallback(
    (studentId: string): Session[] => sessions.filter(s => s.studentId === studentId),
    [sessions],
  )

  return { sessions, addSession, deleteSession, getSessionsByStudent }
}

