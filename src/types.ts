export type SessionType =
  | 'kata'
  | 'kumite'
  | 'kihon'
  | 'class'
  | 'free-training'

export interface Session {
  id: string
  studentId: string
  date: string // ISO date string
  durationMinutes: number
  type: SessionType
  notes: string
  techniques: string[]
}

export type TechniqueCategory = 'kihon' | 'kata' | 'kumite'

export interface Technique {
  id: string
  name: string
  category: TechniqueCategory
  beltLevel: string
  description: string
  videoUrl?: string
}

