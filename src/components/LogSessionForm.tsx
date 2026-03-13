import React, { useState } from 'react'
import type { FormEvent } from 'react'
import { useTrainingSessions } from '../hooks/useTrainingSessions'
import type { SessionType } from '../types'

interface Props {
  defaultStudentId?: string
}

export function LogSessionForm({ defaultStudentId }: Props) {
  const { addSession } = useTrainingSessions()
  const [studentId, setStudentId] = useState<string>(defaultStudentId ?? '')
  const [date, setDate] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<string>('60')
  const [type, setType] = useState<SessionType>('class')
  const [notes, setNotes] = useState<string>('')
  const [techniquesText, setTechniquesText] = useState<string>('')
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const duration = Number(durationMinutes)
    if (!studentId.trim() || !date || Number.isNaN(duration) || duration <= 0) {
      setSuccess(null)
      return
    }
    const techniques = techniquesText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    addSession({
      studentId: studentId.trim(),
      date,
      durationMinutes: duration,
      type,
      notes: notes.trim(),
      techniques,
    })
    setNotes('')
    setTechniquesText('')
    setSuccess('Session saved')
    setTimeout(() => setSuccess(null), 2500)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Student ID</label>
        <input
          value={studentId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentId(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Duration (minutes)</label>
        <input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationMinutes(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Type</label>
        <select
          value={type}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setType(e.target.value as SessionType)
          }
        >
          <option value="kata">Kata</option>
          <option value="kumite">Kumite</option>
          <option value="kihon">Kihon</option>
          <option value="class">Class</option>
          <option value="free-training">Free training</option>
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Techniques (comma‑separated)</label>
        <input
          value={techniquesText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTechniquesText(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Notes</label>
        <textarea
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <button type="submit">Log session</button>
      {success && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'green' }}>
          {success}
        </div>
      )}
    </form>
  )
}

