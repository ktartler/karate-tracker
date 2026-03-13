import { useState } from 'react'
import { Btn, Lbl, FIELD_S } from './ui'
import { T, KIDS_BELTS, ADULT_BELTS } from '../data/constants'
import { today } from '../utils'

// ── PROGRAMS MODAL ─────────────────────────────────────
export function ProgramsModal({ profile, onConfirm, onClose }) {
  const [bbc, setBbc] = useState(profile.bbcStart || '')
  const [ldr, setLdr] = useState(profile.leadershipStart || '')

  return (
    <div>
      <div style={{ fontSize: 16, color: '#c39bd3', marginBottom: 14 }}>✦ Manage Programs</div>
      <Lbl>Black Belt Club Start Date</Lbl>
      <input type="date" value={bbc} onChange={e => setBbc(e.target.value)} style={FIELD_S} />
      <Lbl>Leadership Program Start Date</Lbl>
      <input type="date" value={ldr} onChange={e => setLdr(e.target.value)} style={{ ...FIELD_S, marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn style={{ background: '#8E44AD', color: '#fff', border: 'none', fontWeight: 'bold' }} onClick={() => onConfirm(bbc, ldr)} full>Save Dates</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── PROMOTE MODAL ──────────────────────────────────────
export function PromoteModal({ from, to, nextLabel, onConfirm, onClose, isKids }) {
  const [date, setDate]       = useState(today())
  const [note, setNote]       = useState('')
  const [useDate, setUseDate] = useState(!isKids)

  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>★ Record Belt Promotion</div>
      <div style={{ fontSize: 12, color: T.text, marginBottom: 16 }}>
        Promoting to <strong style={{ color: T.goldLight }}>{nextLabel} Belt</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: useDate ? 12 : 18 }}>
        <input type="checkbox" id="useDate" checked={useDate} onChange={e => setUseDate(e.target.checked)}
          style={{ accentColor: T.gold, width: 15, height: 15 }} />
        <label htmlFor="useDate" style={{ fontSize: 12, color: T.muted, cursor: 'pointer' }}>Add ceremony date</label>
      </div>
      {useDate && (
        <>
          <Lbl>Date</Lbl>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD_S} />
        </>
      )}
      <Lbl>Note (optional)</Lbl>
      <textarea value={note} onChange={e => setNote(e.target.value)}
        placeholder="Who was there? How did it feel?"
        style={{ ...FIELD_S, resize: 'vertical', minHeight: 72, lineHeight: 1.6, marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => onConfirm(from, to, useDate ? date : null, note)} full style={{ fontWeight: 'bold' }}>
          Confirm
        </Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── SPARRING MODAL ─────────────────────────────────────
export function SparringModal({ onConfirm, onClose }) {
  const [date, setDate]   = useState(today())
  const [notes, setNotes] = useState('')
  return (
    <div>
      <div style={{ fontSize: 16, color: '#e08080', marginBottom: 14 }}>⚔ Log Sparring Session</div>
      <Lbl>Date</Lbl>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD_S} />
      <Lbl>Notes (optional)</Lbl>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. worked on jab-cross…" style={FIELD_S} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Btn variant="red" onClick={() => onConfirm(date, notes)} full style={{ fontWeight: 'bold' }}>Log</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── NOTE MODAL ─────────────────────────────────────────
export function NoteModal({ onConfirm, onClose }) {
  const [text, setText] = useState('')
  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>Add Note</div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. great class today…"
        style={{ ...FIELD_S, resize: 'none', height: 90, lineHeight: 1.6, marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => text.trim() && onConfirm(text.trim())} full>Save</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── TRAINING MODAL ─────────────────────────────────────
export function TrainingModal({ onConfirm, onClose }) {
  const [date,     setDate]     = useState(today())
  const [duration, setDuration] = useState('60')
  const [focus,    setFocus]    = useState('')
  const [felt,     setFelt]     = useState(3)
  const [notes,    setNotes]    = useState('')
  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>Log Training Class</div>
      <Lbl>Date</Lbl>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD_S} />
      <Lbl>Focus / Topic</Lbl>
      <input value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g. Kata, sparring, kicks…" style={FIELD_S} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <Lbl>Duration (min)</Lbl>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
            style={{ ...FIELD_S, marginBottom: 0 }} />
        </div>
        <div>
          <Lbl>Felt (1–5)</Lbl>
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} onClick={() => setFelt(num)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: felt >= num ? T.gold : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${felt >= num ? T.gold : 'rgba(255,255,255,0.15)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: felt >= num ? '#0c0a08' : T.muted, fontWeight: 'bold',
                }}>
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Lbl>Notes</Lbl>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you work on?"
        style={{ ...FIELD_S, resize: 'vertical', minHeight: 60, lineHeight: 1.5, marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => onConfirm({ date, duration: parseInt(duration) || 60, focus, felt, notes })}
          full style={{ fontWeight: 'bold' }}>
          Log Class
        </Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── GOAL MODAL ─────────────────────────────────────────
export function GoalModal({ onConfirm, onClose }) {
  const [text,   setText]   = useState('')
  const [beltId, setBeltId] = useState('blue')
  const belts = ADULT_BELTS
  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>✦ Add Goal</div>
      <Lbl>Goal</Lbl>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Master Heian Nidan…" style={FIELD_S} />
      <Lbl>Related Belt</Lbl>
      <select value={beltId} onChange={e => setBeltId(e.target.value)}
        style={{ ...FIELD_S, background: '#1a1810', marginBottom: 18 }}>
        {belts.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => text.trim() && onConfirm(text.trim(), beltId)} full>Add Goal</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── TECHNIQUE MODAL ────────────────────────────────────
export function TechniqueModal({ tech, onConfirm, onClose }) {
  const TECH_CATS = ['Combo', 'Form (Kata)', 'Self-Defence', 'Kick', 'Block', 'Other']
  const [form, setForm] = useState(tech || {
    name: '', category: 'Combo', belt: 'blue', learnedDate: today(), notes: '', mastered: false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>{tech ? 'Edit' : 'Add'} Technique</div>
      <Lbl>Name</Lbl>
      <input value={form.name} onChange={e => set('name', e.target.value)}
        placeholder="e.g. Jab-Cross-Roundhouse" style={FIELD_S} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Lbl>Category</Lbl>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            style={{ ...FIELD_S, background: '#1a1810' }}>
            {TECH_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Lbl>Belt Level</Lbl>
          <select value={form.belt} onChange={e => set('belt', e.target.value)}
            style={{ ...FIELD_S, background: '#1a1810' }}>
            {ADULT_BELTS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
      </div>
      <Lbl>Date Learned</Lbl>
      <input type="date" value={form.learnedDate} onChange={e => set('learnedDate', e.target.value)} style={FIELD_S} />
      <Lbl>Notes</Lbl>
      <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
        placeholder="Tips, variations, things to remember…"
        style={{ ...FIELD_S, resize: 'vertical', minHeight: 72, lineHeight: 1.5, marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <input type="checkbox" id="mastered" checked={!!form.mastered} onChange={e => set('mastered', e.target.checked)}
          style={{ accentColor: T.green, width: 16, height: 16 }} />
        <label htmlFor="mastered" style={{ fontSize: 12, color: T.muted, cursor: 'pointer' }}>Mark as mastered</label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => form.name.trim() && onConfirm(form)} full>Save</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── SCHEDULE MODAL ─────────────────────────────────────
export function ScheduleModal({ onConfirm, onClose, calLoading }) {
  const [date,  setDate]  = useState(today())
  const [start, setStart] = useState('18:00')
  const [end,   setEnd]   = useState('19:00')
  const [title, setTitle] = useState('Karate Class')
  const [desc,  setDesc]  = useState('')
  const [busy,  setBusy]  = useState(false)

  async function submit() {
    setBusy(true)
    const ok = await onConfirm(date, start, end, title, desc)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <div>
      <div style={{ fontSize: 16, color: '#7aadff', marginBottom: 4 }}>📅 Schedule on Google Calendar</div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 16 }}>Creates the event and logs it here automatically.</div>
      <Lbl>Session Title</Lbl>
      <input value={title} onChange={e => setTitle(e.target.value)} style={FIELD_S} />
      <Lbl>Date</Lbl>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD_S} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><Lbl>Start</Lbl><input type="time" value={start} onChange={e => setStart(e.target.value)} style={FIELD_S} /></div>
        <div><Lbl>End</Lbl><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={FIELD_S} /></div>
      </div>
      <Lbl>Notes (optional)</Lbl>
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Sparring class, kata focus…"
        style={{ ...FIELD_S, marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="cal" onClick={submit} full disabled={busy || calLoading} style={{ fontWeight: 'bold' }}>
          {busy ? 'Adding to Calendar…' : 'Add to Google Calendar'}
        </Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── CALENDAR SETUP MODAL ───────────────────────────────
export function CalSetupModal({ calendars, selCalId, onSelect, onPreview, calLoading, calError, onClose }) {
  const [weeks, setWeeks] = useState(16)
  return (
    <div>
      <div style={{ fontSize: 16, color: '#7aadff', marginBottom: 6 }}>📅 Sync Google Calendar</div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 18, lineHeight: 1.6 }}>
        Pick which calendar your karate sessions are in and how far back to look.
      </div>
      {calendars.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Lbl>Which calendar?</Lbl>
          {calendars.map(cal => (
            <div key={cal.id} onClick={() => onSelect(cal.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6,
                border: `1px solid ${selCalId === cal.id ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: selCalId === cal.id ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)',
                marginBottom: 6, cursor: 'pointer',
              }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                border: `2px solid ${selCalId === cal.id ? '#7aadff' : 'rgba(255,255,255,0.2)'}`,
                background: selCalId === cal.id ? '#7aadff' : 'transparent', flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: selCalId === cal.id ? '#7aadff' : T.text }}>{cal.name}</span>
              {cal.primary && <span style={{ fontSize: 9, color: T.muted, marginLeft: 'auto' }}>PRIMARY</span>}
            </div>
          ))}
        </div>
      )}
      <Lbl>How far back?</Lbl>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {[4, 8, 16, 24, 52].map(w => (
          <button key={w} onClick={() => setWeeks(w)}
            style={{
              background: weeks === w ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
              border: weeks === w ? '1px solid rgba(66,133,244,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              color: weeks === w ? '#7aadff' : T.muted, fontFamily: 'Georgia,serif',
            }}>
            {w < 52 ? `${w} weeks` : '1 year'}
          </button>
        ))}
      </div>
      {calError && (
        <div style={{ background: 'rgba(180,50,50,0.1)', border: '1px solid rgba(180,50,50,0.3)', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#e08080', marginBottom: 14 }}>
          ⚠ {calError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="cal" onClick={() => onPreview(selCalId, weeks)} full disabled={calLoading} style={{ fontWeight: 'bold' }}>
          {calLoading ? 'Fetching events…' : 'Find My Sessions →'}
        </Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}

// ── CALENDAR PREVIEW MODAL ─────────────────────────────
export function CalPreviewModal({ preview, onImport, onBack, onClose, keywords }) {
  const [showAll, setShowAll] = useState(false)
  if (!preview) return null
  const { matched, all } = preview
  const unmatched = all.filter(e => !matched.find(m => m.id === e.id))

  return (
    <div>
      <div style={{ fontSize: 16, color: '#7aadff', marginBottom: 6 }}>
        📅 {matched.length} karate session{matched.length !== 1 ? 's' : ''} found
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 14, lineHeight: 1.6 }}>
        Matched keywords:{' '}
        {keywords.map(k => (
          <span key={k} style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.25)', borderRadius: 4, padding: '1px 6px', fontSize: 9, color: '#7aadff', marginLeft: 4 }}>
            {k}
          </span>
        ))}
      </div>
      {matched.length === 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 14, textAlign: 'center' }}>
          No sessions matched. Try going back and adjusting the time range.
          <div style={{ marginTop: 8, fontSize: 10 }}>Found {all.length} total events in this period.</div>
        </div>
      )}
      {matched.length > 0 && (
        <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
          {matched.map((ev, i) => (
            <div key={ev.id || i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 12px', borderBottom: i < matched.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', flexShrink: 0, width: 80 }}>{ev.date}</span>
              <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{ev.title}</span>
              {ev.startTime && <span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{ev.startTime}</span>}
            </div>
          ))}
        </div>
      )}
      {unmatched.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowAll(s => !s)}
            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'Georgia,serif', textDecoration: 'underline' }}>
            {showAll ? 'Hide' : 'Show'} {unmatched.length} other events (not imported)
          </button>
          {showAll && (
            <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, opacity: 0.5 }}>
              {unmatched.map((ev, i) => (
                <div key={ev.id || i} style={{ display: 'flex', gap: 12, padding: '6px 12px', borderBottom: i < unmatched.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontSize: 9, color: T.muted, flexShrink: 0, width: 80 }}>{ev.date}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{ev.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {matched.length > 0 && <Btn variant="cal" onClick={onImport} full style={{ fontWeight: 'bold' }}>Import {matched.length} sessions</Btn>}
        <Btn variant="ghost" onClick={onBack} full>← Back</Btn>
        <Btn variant="ghost" onClick={onClose}>✕</Btn>
      </div>
    </div>
  )
}

// ── THEME MODAL ────────────────────────────────────────
export function ThemeModal({ profile, onConfirm, onClose }) {
  const [appTheme, setAppTheme] = useState(profile.appTheme || 'dark')

  return (
    <div>
      <div style={{ fontSize: 16, color: T.goldLight, marginBottom: 14 }}>🎨 Profile Theme</div>
      
      <Lbl>App Theme (Color Mode)</Lbl>
      <select value={appTheme} onChange={e => setAppTheme(e.target.value)}
        style={{ ...FIELD_S, background: '#1a1810', marginBottom: 24 }}>
        <option value="dark">Dark (Default)</option>
        <option value="light">Light</option>
        <option value="sakura">Sakura (Pink/Red)</option>
        <option value="dojo">Dojo (Wood/Traditional)</option>
        <option value="balanced">Balanced Martial Arts</option>
      </select>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => onConfirm(appTheme)} full style={{ fontWeight: 'bold' }}>Save Theme</Btn>
        <Btn variant="ghost" onClick={onClose} full>Cancel</Btn>
      </div>
    </div>
  )
}
