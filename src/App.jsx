import { useState, useEffect, useCallback } from 'react'
import { T, BELT_COLORS, ADULT_BELTS, KIDS_BELTS, ADULT_SPARRING_REQ, getBelts, getSparringReq, TECH_CATS, KARATE_KEYWORDS, BLUE_TEST_WEEKS, FIELD_S } from './data/constants'
import { INITIAL_STATE, blankBelts, makeProfile, migrateData } from './data/profiles'
import { fmt, fmtShort, today, uid, monthsBetween, daysUntil, weekStreak } from './utils'
import { gcalListCalendars, gcalFetchAllEvents, gcalCreateEvent, isKarateEvent } from './utils/calendar'
import { useStorage } from './hooks/useStorage'
import { Btn, Lbl, Card, BeltPill, ProgressBar, StripeDots } from './components/ui'
import TrainingHeatmap from './components/TrainingHeatmap.jsx'
import { TrainingHeatmap as TrainingProgressHeatmap } from './components/TrainingHeatmap'
import {
  ProgramsModal, PromoteModal, SparringModal, NoteModal, TrainingModal,
  GoalModal, TechniqueModal, ScheduleModal, CalSetupModal, CalPreviewModal, ThemeModal
} from './components/modals'

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const { load, save } = useStorage()

  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [view,       setView]       = useState('household')
  const [selBelt,    setSelBelt]    = useState('blue')
  const [modal,      setModal]      = useState(null)
  const [toast,      setToast]      = useState(null)
  const [techFilter, setTechFilter] = useState('All')
  const [techSearch, setTechSearch] = useState('')
  const [isMobile,   setIsMobile]   = useState(false)

  // Calendar state
  const [calLoading,    setCalLoading]    = useState(false)
  const [calSynced,     setCalSynced]     = useState(false)
  const [calError,      setCalError]      = useState(null)
  const [upcoming,      setUpcoming]      = useState([])
  const [calendars,     setCalendars]     = useState([])
  const [selCalId,      setSelCalId]      = useState(null)
  const [previewEvents, setPreviewEvents] = useState(null)

  // ── INIT ────────────────────────────────────────────────
  useEffect(() => {
    const ch = () => setIsMobile(window.innerWidth < 700)
    ch()
    window.addEventListener('resize', ch)
    return () => window.removeEventListener('resize', ch)
  }, [])

  useEffect(() => {
    if (data && data.profiles[data.activeProfile || 'kathrin']) {
      const t = data.profiles[data.activeProfile || 'kathrin'].appTheme || 'dark'
      document.body.className = `theme-${t}`
    } else {
      document.body.className = 'theme-dark'
    }
  }, [data])

  useEffect(() => {
    load().then(raw => {
      if (!raw) {
        setLoading(false)
        setToast({ msg: '⚠ Could not connect to server. Retrying...', err: true })
        // DO NOT overwrite with INITIAL_STATE if server is down
        setTimeout(() => window.location.reload(), 3000)
        return
      }

      let d = migrateData(raw)
      let needsSave = false

      // One-time check: Copy Emily's belt dates to Isabel if Isabel's are empty
      try {
        if (d.profiles['emily'] && d.profiles['isabel']) {
          const emilyWhite = d.profiles['emily'].belts['white']
          const isabelWhite = d.profiles['isabel'].belts['white']
          // If Emily has dates but Isabel does not, copy them over
          if (emilyWhite && emilyWhite.promoted && !isabelWhite.promoted) {
            Object.keys(d.profiles['emily'].belts).forEach(bId => {
              if (d.profiles['isabel'].belts[bId]) {
                d.profiles['isabel'].belts[bId].earned = d.profiles['emily'].belts[bId].earned
                d.profiles['isabel'].belts[bId].promoted = d.profiles['emily'].belts[bId].promoted
              }
            })
            // Match current belt
            d.profiles['isabel'].currentBelt = d.profiles['emily'].currentBelt
            needsSave = true
          }
        }
      } catch (e) {
        console.error('Belt copy failed', e)
      }
      
      // One-time localStorage migration to Kathrin's heatmap
      try {
        const legacyHeatmap = localStorage.getItem('karate-training-days')
        if (legacyHeatmap) {
          const parsed = JSON.parse(legacyHeatmap)
          if (Object.keys(parsed).length > 0) {
            d.profiles['kathrin'].heatmap = { ...parsed, ...(d.profiles['kathrin'].heatmap || {}) }
            needsSave = true
          }
          localStorage.removeItem('karate-training-days')
        }
      } catch (e) {
        console.error('Heatmap migration failed', e)
      }
      
      if (needsSave) save(d).catch(() => {})
      
      setData(d)
      setLoading(false)
    })
  }, [load, save])

  const persist = useCallback(async d => {
    setSaving(true)
    try { await save(d) }
    catch { showToast('⚠ Save failed', true) }
    setSaving(false)
  }, [save])

  function showToast(msg, err = false) {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3200)
  }

  function update(fn) {
    setData(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)))
      persist(next)
      return next
    })
  }

  // ── CALENDAR ────────────────────────────────────────────
  async function openSyncModal() {
    setCalLoading(true); setCalError(null)
    try {
      const res = await gcalListCalendars()
      setCalendars(res.calendars || [])
      const primary = (res.calendars || []).find(c => c.primary)
      if (primary && !selCalId) setSelCalId(primary.id)
    } catch (e) {
      setCalError(e.message)
      showToast('⚠ Could not load calendars: ' + e.message, true)
    }
    setCalLoading(false)
    setModal({ type: 'calSetup' })
  }

  async function previewSync(calId, weeksBack) {
    setCalLoading(true); setCalError(null)
    try {
      const start = new Date(); start.setDate(start.getDate() - weeksBack * 7)
      const res = await gcalFetchAllEvents(start.toISOString().split('T')[0], today(), calId)
      const allEvents = res.events || []
      const matched = allEvents.filter(isKarateEvent)
      setPreviewEvents({ all: allEvents, matched, calId, weeksBack })
      setModal({ type: 'calPreview' })
    } catch (e) {
      setCalError(e.message)
      showToast('⚠ Fetch failed: ' + e.message, true)
    }
    setCalLoading(false)
  }

  function importPreview() {
    if (!previewEvents) return
    const events = previewEvents.matched
    update(d => {
      const p = d.profiles[d.activeProfile]
      const existing = new Set((p.trainingLog || []).map(t => t.date))
      const fresh = events
        .filter(e => !existing.has(e.date))
        .map(e => ({ id: 'gcal-' + e.id, date: e.date, duration: e.duration || 60, focus: e.title, felt: 3, notes: e.description || '', fromCalendar: true }))
      if (fresh.length > 0)
        p.trainingLog = [...(p.trainingLog || []), ...fresh].sort((a, b) => b.date.localeCompare(a.date))
      return d
    })
    const calId = previewEvents.calId
    const end = new Date(); end.setDate(end.getDate() + 6 * 7)
    gcalFetchAllEvents(today(), end.toISOString().split('T')[0], calId)
      .then(res => { const up = (res.events || []).filter(isKarateEvent); setUpcoming(up) })
      .catch(() => {})
    setCalSynced(true)
    setPreviewEvents(null)
    setModal(null)
    showToast(`📅 Imported ${events.length} session${events.length !== 1 ? 's' : ''} from Google Calendar!`)
  }

  async function scheduleSession(date, startTime, endTime, title, description) {
    setCalLoading(true)
    try {
      const res = await gcalCreateEvent(date, startTime, endTime, title, description, selCalId)
      if (!res.success) throw new Error('Calendar returned failure')
      const dur = (() => {
        try {
          const [sh, sm] = startTime.split(':').map(Number)
          const [eh, em] = endTime.split(':').map(Number)
          return (eh * 60 + em) - (sh * 60 + sm)
        } catch { return 60 }
      })()
      update(d => {
        const p = d.profiles[d.activeProfile]
        p.trainingLog = p.trainingLog || []
        p.trainingLog.unshift({ id: 'gcal-' + uid(), date, duration: dur, focus: title, felt: 3, notes: description, fromCalendar: true })
        return d
      })
      showToast('📅 Added to Google Calendar!')
      return true
    } catch (e) {
      showToast('⚠ Could not create event: ' + e.message, true)
      return false
    } finally { setCalLoading(false) }
  }

  // ── PROFILE HELPERS ─────────────────────────────────────
  function updateProfile(fn) {
    update(d => {
      d.profiles[d.activeProfile] = fn(JSON.parse(JSON.stringify(d.profiles[d.activeProfile])))
      return d
    })
  }

  const toggleHeatmap = (ds, nextState) => {
    updateProfile(p => {
      if (!p.heatmap) p.heatmap = {}
      p.heatmap[ds] = nextState
      return p
    })
  }

  const savePrograms = (bbc, ldr) => {
    updateProfile(p => {
      p.bbcStart = bbc || null
      p.leadershipStart = ldr || null
      // Optional logging when saving programs
      p.notes = p.notes || []
      const msg = [
        bbc && 'Black Belt Club',
        ldr && 'Leadership Program'
      ].filter(Boolean).join(' and ')
      if (msg && (!p.bbcStart && !p.leadershipStart)) {
         p.notes.unshift({ id: uid(), date: today(), text: `🎉 Joined the ${msg}!` })
      }
      return p
    })
    setModal(null)
    showToast('✦ Programs updated!')
  }

  function switchProfile(id) {
    if (activeId !== id) {
      update(d => { d.activeProfile = id; return d })
      setSelBelt(data.profiles[id]?.currentBelt || 'white')
      showToast(`Switched to ${data.profiles[id]?.name}`)
    }
    setView('overview')
  }

  // ── BELT ACTIONS ────────────────────────────────────────
  const addStripe = bId => updateProfile(p => {
    const b = p.belts[bId], belt = BELTS_M.find(x => x.id === bId)
    if (b.stripesDone < belt.stripes) {
      b.stripesDone++
      p.notes = p.notes || []
      p.notes.unshift({ id: uid(), date: today(), text: `${belt.label} Belt: stripe ${b.stripesDone} earned 🥋` })
      showToast(`🥋 Stripe ${b.stripesDone} added!`)
    }
    return p
  })

  const removeStripe = bId => updateProfile(p => {
    if (p.belts[bId].stripesDone > 0) p.belts[bId].stripesDone--
    return p
  })

  const toggleSparring = bId => updateProfile(p => {
    const was = p.belts[bId].sparringDone
    p.belts[bId].sparringDone = !was
    showToast(was ? 'Sparring stripe removed' : '⚔ Sparring stripe earned!')
    return p
  })

  const adjSparring = (bId, delta) => updateProfile(p => {
    p.belts[bId].sparringCount = Math.max(0, (p.belts[bId].sparringCount || 0) + delta)
    return p
  })

  const promoteBelt = (from, to, date, note) => {
    updateProfile(p => {
      p.belts[from].promoted = date
      p.belts[from].ceremonyNote = note
      p.belts[to].earned = date
      p.currentBelt = to
      const b = BELTS_M.find(x => x.id === to)
      p.notes = p.notes || []
      p.notes.unshift({ id: uid(), date: date || today(), text: `🎉 Promoted to ${b.label} Belt!${note ? ' — ' + note : ''}` })
      showToast(`★ ${b.label} Belt!`)
      return p
    })
    setModal(null)
    setSelBelt(to)
  }

  const saveCeremonyNote = (bId, note) => updateProfile(p => { p.belts[bId].ceremonyNote = note; return p })

  const logSparring = (date, notes) => {
    updateProfile(p => {
      const bId = p.currentBelt
      p.sparringLog = p.sparringLog || []
      p.sparringLog.unshift({ id: uid(), date, notes, belt: bId })
      p.belts[bId].sparringCount = (p.belts[bId].sparringCount || 0) + 1
      const req = SPARRING_M[bId], count = p.belts[bId].sparringCount
      showToast(`⚔ Logged! (${count}${req ? '/' + req : ''})`)
      return p
    })
    setModal(null)
  }

  const removeSparring = id => updateProfile(p => {
    const i = (p.sparringLog || []).findIndex(s => s.id === id)
    if (i >= 0) {
      const s = p.sparringLog.splice(i, 1)[0]
      p.belts[s.belt].sparringCount = Math.max(0, (p.belts[s.belt].sparringCount || 1) - 1)
    }
    return p
  })

  const logTraining = entry => {
    updateProfile(p => { p.trainingLog = p.trainingLog || []; p.trainingLog.unshift({ ...entry, id: uid() }); return p })
    setModal(null)
    showToast('✓ Training logged!')
  }

  const removeTraining = id => updateProfile(p => { p.trainingLog = (p.trainingLog || []).filter(t => t.id !== id); return p })
  const addNote = text => { updateProfile(p => { p.notes = p.notes || []; p.notes.unshift({ id: uid(), date: today(), text }); return p }); setModal(null) }
  const removeNote = id => updateProfile(p => { p.notes = (p.notes || []).filter(n => n.id !== id); return p })

  // Techniques are shared across all profiles
  const saveTech = tech => {
    update(d => {
      if (tech.id) { const i = d.techniques.findIndex(t => t.id === tech.id); if (i >= 0) d.techniques[i] = tech }
      else d.techniques.unshift({ ...tech, id: uid() })
      return d
    })
    setModal(null)
    showToast('✓ Saved')
  }
  const deleteTech = id => update(d => { d.techniques = d.techniques.filter(t => t.id !== id); return d })
  const toggleMastered = id => update(d => { const t = d.techniques.find(x => x.id === id); if (t) t.mastered = !t.mastered; return d })

  const saveGoal = (text, beltId) => { updateProfile(p => { p.goals = p.goals || []; p.goals.unshift({ id: uid(), text, beltId, done: false, createdDate: today() }); return p }); setModal(null); showToast('✓ Goal added') }
  const toggleGoal = id => updateProfile(p => { const g = (p.goals || []).find(x => x.id === id); if (g) { g.done = !g.done; if (g.done) g.doneDate = today() } return p })
  const deleteGoal = id => updateProfile(p => { p.goals = (p.goals || []).filter(g => g.id !== id); return p })

  // ── LOADING ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: T.gold, fontFamily: 'Georgia,serif', fontSize: 14, letterSpacing: '0.3em' }}>LOADING…</div>
    </div>
  )

  // ── DERIVED VALUES ──────────────────────────────────────
  const activeId   = data.activeProfile || 'kathrin'
  const profile    = data.profiles[activeId]
  const isKids     = profile.type === 'kids'
  const BELTS_M    = getBelts(profile.type)
  const SPARRING_M = getSparringReq(profile.type)

  const curBelt    = BELTS_M.find(b => b.id === profile.currentBelt) || BELTS_M[0]
  const curColor   = BELT_COLORS[profile.currentBelt] || BELT_COLORS.white
  const curBeltIdx = BELTS_M.findIndex(b => b.id === profile.currentBelt)
  const streak     = weekStreak(profile.trainingLog || [])

  const filteredTech = (data.techniques || []).filter(t => {
    const catMatch = techFilter === 'All' || t.category === techFilter
    const q = techSearch.toLowerCase()
    const textMatch = !q || t.name.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)
    return catMatch && textMatch
  })

  const nextTestWeek = (() => {
    if (profile.currentBelt !== 'blue' || isKids) return null
    const tw = BLUE_TEST_WEEKS.find(w => w.stripe === profile.belts.blue.stripesDone + 1)
    return tw ? { ...tw, days: daysUntil(tw.start) } : null
  })()

  const VIEWS = [
    { id: 'overview',   icon: '◎', label: 'Overview'   },
    { id: 'belt',       icon: '🥋', label: 'My Belt'    },
    { id: 'sparring',   icon: '⚔',  label: 'Sparring'   },
    { id: 'techniques', icon: '📖', label: 'Techniques' },
    { id: 'training',   icon: '📅', label: 'Training'   },
    { id: 'goals',      icon: '✦',  label: 'Goals'      },
    { id: 'log',        icon: '✎',  label: 'Log'        },
  ]

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: 'Georgia,serif', color: T.text, display: 'flex', flexDirection: 'column' }}>

      {/* Grain overlay */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`, pointerEvents: 'none', zIndex: 9999, opacity: 0.4, filter: `invert(var(--invertImg))` }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: toast.err ? '#3a1010' : '#1a1810', border: `1px solid ${toast.err ? '#c03030' : T.gold}`, borderRadius: 6, padding: '11px 20px', color: toast.err ? '#e08080' : T.goldLight, fontSize: 13, zIndex: 10000, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', fontFamily: 'Georgia,serif', maxWidth: 340 }}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ borderBottom: `1px solid rgba(201,168,76,0.12)`, padding: isMobile ? '12px 16px' : '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 'bold', letterSpacing: '0.15em', color: T.goldLight, textTransform: 'uppercase' }}>The Path</span>
          {!isMobile && <span style={{ fontSize: 10, color: T.muted, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Karate Tracker</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving    && <span style={{ fontSize: 9, color: T.muted }}>SAVING…</span>}
          {calLoading && <span style={{ fontSize: 9, color: '#7aadff' }}>⟳ CALENDAR…</span>}
          {streak > 1 && <div style={{ background: 'var(--activeBg)', border: '1px solid var(--activeBdr)', borderRadius: 16, padding: '3px 10px', fontSize: 11, color: T.gold }}>🔥 {streak}w</div>}
          
          {/* Theme toggle */}
          <button onClick={() => setModal({ type: 'theme' })}
            title="Edit Profile Theme"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.8, filter: 'saturate(0)' }}>
            🎨
          </button>
          
          {/* Profile switcher pill */}
          <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--cardBorder)', borderRadius: 20, padding: 2, gap: 2 }}>
            <button onClick={() => setView('household')}
              style={{ background: view === 'household' ? 'var(--activeBg)' : 'transparent', border: view === 'household' ? '1px solid var(--activeBdr)' : '1px solid transparent', borderRadius: 16, padding: '3px 11px', fontSize: 10, cursor: 'pointer', color: view === 'household' ? T.goldLight : T.muted, fontFamily: 'Georgia,serif', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
              Household
            </button>
            {Object.values(data.profiles).map(p => (
              <button key={p.id} onClick={() => switchProfile(p.id)}
                style={{ background: activeId === p.id && view !== 'household' ? 'var(--activeBg)' : 'transparent', border: activeId === p.id && view !== 'household' ? '1px solid var(--activeBdr)' : '1px solid transparent', borderRadius: 16, padding: '3px 11px', fontSize: 10, cursor: 'pointer', color: activeId === p.id && view !== 'household' ? T.goldLight : T.muted, fontFamily: 'Georgia,serif', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
                {p.name}
              </button>
            ))}
          </div>
          {view !== 'household' && (
            <div style={{ background: curColor.bg, border: `1px solid ${curColor.border}`, borderRadius: 20, padding: isMobile ? '3px 10px' : '4px 14px', fontSize: isMobile ? 10 : 11, color: curColor.text, fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {isMobile ? curBelt.label : `${curBelt.label} Belt`}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        {!isMobile && (
          <div style={{ width: 224, borderRight: `1px solid rgba(201,168,76,0.1)`, padding: '24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Household Level View */}
            <button onClick={() => setView('household')}
              style={{ background: view === 'household' ? 'rgba(201,168,76,0.1)' : 'none', border: 'none', borderLeft: view === 'household' ? `2px solid ${T.gold}` : '2px solid transparent', color: view === 'household' ? T.goldLight : T.dim, fontSize: 13, padding: '11px 24px', cursor: 'pointer', fontFamily: 'Georgia,serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '0.04em', marginBottom: 12 }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⌂</span>Household
            </button>

            {/* Profile Level Views */}
            {view !== 'household' && (
              <div style={{ marginBottom: 12, padding: '0 24px' }}>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{profile.name}'s Profile</div>
              </div>
            )}
            {view !== 'household' && VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                style={{ background: view === v.id ? 'rgba(201,168,76,0.1)' : 'none', border: 'none', borderLeft: view === v.id ? `2px solid ${T.gold}` : '2px solid transparent', color: view === v.id ? T.goldLight : T.muted, fontSize: 13, padding: '11px 24px', cursor: 'pointer', fontFamily: 'Georgia,serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '0.04em' }}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{v.icon}</span>{v.label}
              </button>
            ))}

            {/* Sidebar bottom */}
            <div style={{ marginTop: 'auto', padding: '18px 16px 0', borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Profile panel */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Profile</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.values(data.profiles).map(p => {
                    const pColor = BELT_COLORS[p.currentBelt]
                    return (
                      <button key={p.id} onClick={() => switchProfile(p.id)}
                        style={{ background: activeId === p.id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)', border: activeId === p.id ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                        <div style={{ width: 18, height: 6, borderRadius: 2, background: pColor.bg, border: p.currentBelt === 'white' ? '1px solid #999' : 'none', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: activeId === p.id ? T.goldLight : T.text, fontWeight: activeId === p.id ? 'bold' : 'normal' }}>{p.name}</div>
                          <div style={{ fontSize: 9, color: T.muted, textTransform: 'capitalize' }}>{p.type} · {p.currentBelt}</div>
                        </div>
                        {activeId === p.id && view !== 'household' && <span style={{ fontSize: 9, color: T.gold }}>●</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Calendar sync */}
              <button onClick={openSyncModal} disabled={calLoading}
                style={{ background: calSynced ? 'rgba(74,140,92,0.1)' : 'rgba(66,133,244,0.1)', border: `1px solid ${calSynced ? 'rgba(74,140,92,0.3)' : 'rgba(66,133,244,0.3)'}`, borderRadius: 6, padding: '9px 12px', color: calSynced ? T.greenLight : '#7aadff', fontSize: 11, cursor: calLoading ? 'default' : 'pointer', fontFamily: 'Georgia,serif', display: 'flex', alignItems: 'center', gap: 6, opacity: calLoading ? 0.6 : 1, width: '100%' }}>
                <span>{calLoading ? '⟳' : calSynced ? '✓' : '📅'}</span>
                <span>{calLoading ? 'Syncing…' : calSynced ? 'Calendar synced' : 'Sync Google Calendar'}</span>
              </button>

              {/* Next test week */}
              {nextTestWeek && nextTestWeek.days != null && (
                <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Next Test Week</div>
                  <div style={{ fontSize: 13, color: T.goldLight, fontWeight: 'bold' }}>Stripe {nextTestWeek.stripe}</div>
                  <div style={{ fontSize: 11, color: T.gold }}>{fmtShort(nextTestWeek.start)}</div>
                  <div style={{ fontSize: 10, color: nextTestWeek.days <= 14 ? '#e08080' : T.muted, marginTop: 2 }}>
                    {nextTestWeek.days <= 0 ? 'This week! 🎯' : `${nextTestWeek.days} days`}
                  </div>
                </div>
              )}

              {/* Upcoming sessions */}
              {upcoming.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Upcoming Sessions</div>
                  {upcoming.slice(0, 3).map((ev, i) => (
                    <div key={i} style={{ padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ fontSize: 12, color: T.text }}>{ev.title}</div>
                      <div style={{ fontSize: 9, color: T.muted, fontStyle: 'italic', marginTop: 1 }}>{fmtShort(ev.date)}{ev.startTime ? ` · ${ev.startTime}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {view !== 'household' && (
                <div style={{ fontSize: 10, color: T.dim }}>{profile.name} · {profile.programName}</div>
              )}
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '28px 36px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>

            {/* ══ HOUSEHOLD DASHBOARD ══ */}
            {view === 'household' && (() => {
              const allProfiles = Object.values(data.profiles)
              const totalSessions = allProfiles.reduce((sum, p) => sum + (p.trainingLog || []).length, 0)
              const totalStripes = allProfiles.reduce((sum, p) => sum + Object.values(p.belts).reduce((s, b) => s + b.stripesDone, 0), 0)
              const totalBelts = allProfiles.reduce((sum, p) => {
                const beltsForType = getBelts(p.type)
                const cIdx = beltsForType.findIndex(b => b.id === p.currentBelt)
                return sum + (cIdx >= 0 ? cIdx + 1 : 0) // count current and all previous belts
              }, 0)

              // Aggregate all training logs for timeline
              const recentActivity = allProfiles.flatMap(p => 
                (p.trainingLog || []).map(t => ({ ...t, profileName: p.name, beltColor: BELT_COLORS[p.currentBelt] }))
              ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)

              return (
                <div>
                  <div style={{ fontSize: isMobile ? 18 : 24, color: T.goldLight, marginBottom: 20, letterSpacing: '0.06em' }}>Household Overview</div>

                  {/* Aggregate Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
                    {[
                      ['Total Sessions', totalSessions],
                      ['Belts Earned',   totalBelts],
                      ['Stripes Tied', totalStripes],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, color: T.goldLight, fontWeight: 'bold', lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Family Roster */}
                  <div style={{ fontSize: 13, color: T.goldLight, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Family Roster</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 16, marginBottom: 32 }}>
                    {allProfiles.map(p => {
                      const pBelts = getBelts(p.type)
                      const cIdx = pBelts.findIndex(b => b.id === p.currentBelt)
                      const color = BELT_COLORS[p.currentBelt] || BELT_COLORS.white
                      const streak = weekStreak(p.trainingLog || [])
                      return (
                        <Card key={p.id} active={false} style={{ padding: '16px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => switchProfile(p.id)}>
                          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: color.bg }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 18, color: T.text, fontWeight: 'bold' }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{p.programName}</div>
                            </div>
                            <BeltPill beltId={p.currentBelt} size="md" />
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.muted, marginBottom: 4, letterSpacing: '0.05em' }}>
                              <span>Belt Progress</span>
                              {streak > 1 && <span style={{ color: T.gold }}>🔥 {streak}W Streak!</span>}
                            </div>
                            <div style={{ height: 6, background: 'var(--cardBorder)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                              {pBelts.map((b, i) => {
                                const isPast = i < cIdx, isCur = i === cIdx
                                return <div key={b.id} style={{ flex: 1, height: '100%', background: (isPast || isCur) ? BELT_COLORS[b.id].bg : 'transparent', opacity: isCur ? 0.9 : isPast ? 1 : 0.08, borderRight: '1px solid var(--card)' }} />
                              })}
                            </div>
                          </div>
                          {(p.bbcStart || p.leadershipStart) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                              {p.bbcStart && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 12, padding: '3px 8px' }}>
                                  <span style={{ fontSize: 10, color: '#f5b041' }}>✦</span>
                                  <span style={{ fontSize: 9, color: '#f5b041', fontWeight: 'bold' }}>BBC</span>
                                </div>
                              )}
                              {p.leadershipStart && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(142,68,173,0.1)', border: '1px solid rgba(142,68,173,0.3)', borderRadius: 12, padding: '3px 8px' }}>
                                  <span style={{ fontSize: 10, color: '#d2b4de' }}>✦</span>
                                  <span style={{ fontSize: 9, color: '#d2b4de', fontWeight: 'bold' }}>Leadership</span>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>

                  {/* Aggregate Recent Activity */}
                  {recentActivity.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, color: T.goldLight, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Recent Household Activity</div>
                      {recentActivity.map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid var(--cardBorder)` }}>
                          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 46 }}>
                            <div style={{ fontSize: 14, color: T.goldLight, fontWeight: 'bold' }}>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' })}</div>
                            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                          </div>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.beltColor.bg, marginTop: 4, border: t.beltColor.id === 'white' ? '1px solid #777' : 'none' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: T.text }}>
                              <span style={{ fontWeight: 'bold', marginRight: 6 }}>{t.profileName}:</span>
                              {t.focus || 'Class'}
                            </div>
                            {t.notes && <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', marginTop: 4 }}>{t.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══ OVERVIEW ══ */}
            {view === 'overview' && (
              <div>
                <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, marginBottom: 16, letterSpacing: '0.06em' }}>Your Progress</div>

                {/* Mobile calendar sync */}
                {isMobile && (
                  <button onClick={openSyncModal} disabled={calLoading}
                    style={{ width: '100%', background: calSynced ? 'rgba(74,140,92,0.08)' : 'rgba(66,133,244,0.08)', border: `1px solid ${calSynced ? 'rgba(74,140,92,0.25)' : 'rgba(66,133,244,0.25)'}`, borderRadius: 8, padding: '10px 14px', color: calSynced ? T.greenLight : '#7aadff', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, opacity: calLoading ? 0.6 : 1 }}>
                    <span>{calLoading ? '⟳' : calSynced ? '✓' : '📅'}</span>
                    <span>{calLoading ? 'Syncing…' : calSynced ? `Synced · ${(profile.trainingLog || []).filter(t => t.fromCalendar).length} from Calendar` : 'Sync Google Calendar'}</span>
                  </button>
                )}

                {/* Profile banner */}
                <div style={{ background: isKids ? 'rgba(100,80,200,0.07)' : 'rgba(201,168,76,0.05)', border: `1px solid ${isKids ? 'rgba(100,80,200,0.2)' : 'rgba(201,168,76,0.15)'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 10, borderRadius: 3, background: curColor.bg, border: profile.currentBelt === 'white' ? '1px solid #999' : 'none', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: isKids ? '#b0a0f0' : T.goldLight, fontWeight: 'bold' }}>{profile.name}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                      {profile.programName} 
                      {(() => {
                        const w = profile.belts['white']
                        const startObj = w?.earned || w?.promoted
                        if (!startObj) return ''
                        const d = new Date(startObj)
                        const isFB = profile.programName.includes('Future Black Belt')
                        if (isKids && isFB) return ` (started ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
                        if (isKids) return ` (started ${d.getFullYear()})`
                        return ''
                      })()}
                      {' '}· {isKids ? '6 stripes per belt' : `${curBelt?.label || ''} Belt`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Object.values(data.profiles).filter(p => p.id !== activeId).map(p => (
                      <button key={p.id} onClick={() => switchProfile(p.id)}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '3px 9px', fontSize: 9, color: T.muted, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: '0.04em' }}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leadership Program Card */}
                {isKids && (!profile.leadershipStart && !profile.bbcStart) && (
                  <div style={{ background: 'rgba(142,68,173,0.06)', border: `1px solid rgba(142,68,173,0.2)`, borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 24 }}>✦</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#c39bd3', fontWeight: 'bold' }}>Black Belt Club / Leadership</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>Take your training to the next level with advanced classes and leadership skills.</div>
                    </div>
                    <Btn style={{ background: '#8E44AD', color: '#fff', border: 'none', fontWeight: 'bold' }} onClick={() => setModal({ type: 'programs' })}>
                      Join Program
                    </Btn>
                  </div>
                )}
                {isKids && (profile.leadershipStart || profile.bbcStart) && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    {profile.bbcStart && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 20, padding: '4px 10px' }}>
                        <span style={{ fontSize: 12, color: '#f5b041' }}>✦</span>
                        <span style={{ fontSize: 10, color: '#f5b041', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Black Belt Club</span>
                        <span style={{ fontSize: 9, color: T.muted, marginLeft: 2 }}>since {fmtShort(profile.bbcStart)}</span>
                      </div>
                    )}
                    {profile.leadershipStart && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(142,68,173,0.1)', border: '1px solid rgba(142,68,173,0.3)', borderRadius: 20, padding: '4px 10px' }}>
                        <span style={{ fontSize: 12, color: '#d2b4de' }}>✦</span>
                        <span style={{ fontSize: 10, color: '#d2b4de', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Leadership Student</span>
                        <span style={{ fontSize: 9, color: T.muted, marginLeft: 2 }}>since {fmtShort(profile.leadershipStart)}</span>
                      </div>
                    )}
                    <button onClick={() => setModal({ type: 'programs' })} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: T.muted, fontSize: 10, padding: '4px 12px', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>✎ Edit</button>
                  </div>
                )}

                {/* Test week banner */}
                {nextTestWeek && nextTestWeek.days != null && nextTestWeek.days <= 21 && (
                  <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.28)`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🎯</span>
                    <div>
                      <div style={{ fontSize: 13, color: T.goldLight, fontWeight: 'bold' }}>Test Week coming up!</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Stripe {nextTestWeek.stripe} — {fmt(nextTestWeek.start)} {nextTestWeek.days <= 0 ? '(this week!)' : `(${nextTestWeek.days} days)`}</div>
                    </div>
                  </div>
                )}

                {/* Belt progress bar */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                    <span>White</span><span>Black</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--card)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                    {BELTS_M.map((b, i) => {
                      const bd = profile.belts[b.id], isCur = b.id === profile.currentBelt, isPast = bd.promoted != null
                      return <div key={b.id} style={{ width: `${[8, 8, 9, 9, 18, 14, 12, 10, 12][i]}%`, height: '100%', background: (isPast || isCur) ? BELT_COLORS[b.id].bg : 'transparent', opacity: isCur ? 0.85 : isPast ? 1 : 0.08 }} />
                    })}
                  </div>
                </div>

                {/* Belt grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {BELTS_M.map(belt => {
                    const bd = profile.belts[belt.id], bIdx = BELTS_M.findIndex(b => b.id === belt.id)
                    const isCur = belt.id === profile.currentBelt, isPast = bIdx < curBeltIdx, isFut = bIdx > curBeltIdx
                    const req = SPARRING_M[belt.id]
                    return (
                      <div key={belt.id} onClick={() => { setSelBelt(belt.id); setView('belt') }}
                        style={{ background: isCur ? T.activeBg : isFut ? 'rgba(255,255,255,0.01)' : T.card, border: `1px solid ${isCur ? T.activeBdr : T.cardBorder}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', opacity: isFut ? 0.38 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <BeltPill beltId={belt.id} size="sm" />
                          <span style={{ fontSize: 12, fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', color: isCur ? T.goldLight : T.text }}>{belt.label}</span>
                          {isCur  && <span style={{ fontSize: 8, color: T.gold,  marginLeft: 'auto' }}>ACTIVE</span>}
                          {isPast && <span style={{ fontSize: 11, color: T.green, marginLeft: 'auto' }}>✓</span>}
                        </div>
                        {belt.stripes > 0 && <StripeDots total={belt.stripes} done={bd.stripesDone} sparring={belt.sparring} sparringDone={bd.sparringDone} size={9} />}
                        {req && (isCur || isPast) && (
                          <div style={{ marginTop: 6, fontSize: 9, color: T.muted }}>
                            ⚔ {bd.sparringCount || 0}/{req}
                            <ProgressBar value={bd.sparringCount || 0} max={req} height={2} style={{ marginTop: 3 }} />
                          </div>
                        )}
                        {bd.earned && <div style={{ fontSize: 9, color: T.muted, marginTop: 6, fontStyle: 'italic' }}>
                          {belt.id === 'white' ? 'Started ' : ''}{fmtShort(bd.earned)}{bd.promoted ? ` → ${belt.id === 'white' ? 'Promoted ' : ''}${fmtShort(bd.promoted)}` : ''}
                        </div>}
                        {!bd.earned && bd.promoted && <div style={{ fontSize: 9, color: T.muted, marginTop: 6, fontStyle: 'italic' }}>
                          {belt.id === 'white' ? 'Promoted ' : ''}{fmtShort(bd.promoted)}
                        </div>}
                      </div>
                    )
                  })}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
                  {[
                    ['Belts',   BELTS_M.filter((_, i) => i <= curBeltIdx).length],
                    ['Stripes', Object.values(profile.belts).reduce((s, b) => s + b.stripesDone, 0)],
                    ['Months',  monthsBetween(Object.values(profile.belts).map(b => b.earned).filter(Boolean).sort()[0] || today())],
                    ['Sessions',(profile.trainingLog || []).length],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, color: T.goldLight, fontWeight: 'bold', lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5 }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                
                {/* Multi-state training heatmap */}
                <div style={{ marginTop: 28 }}>
                  <TrainingProgressHeatmap heatmapData={profile.heatmap || {}} onToggle={toggleHeatmap} isLeadership={!!profile.leadershipStart} theme={profile.appTheme || 'dark'} />
                </div>
              </div>
            )}

            {/* ══ BELT ══ */}
            {view === 'belt' && (() => {
              const belt = BELTS_M.find(b => b.id === selBelt)
              const bd = profile.belts[selBelt]
              const bIdx = BELTS_M.findIndex(b => b.id === selBelt)
              const isCur = selBelt === profile.currentBelt
              const isPast = bIdx < curBeltIdx
              const req = SPARRING_M[selBelt]
              const nextBelt = BELTS_M[bIdx + 1]
              const allStripes = belt.stripes === 0 || bd.stripesDone >= belt.stripes
              const canPromote = isCur && allStripes && (!belt.sparring || bd.sparringDone) && !bd.promoted && nextBelt
              return (
                <div>
                  <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, marginBottom: 16, letterSpacing: '0.06em' }}>My Belt</div>
                  {/* Belt tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {BELTS_M.map(b => {
                      const col = BELT_COLORS[b.id]
                      return (
                        <button key={b.id} onClick={() => setSelBelt(b.id)}
                          style={{ background: selBelt === b.id ? col.bg : 'rgba(255,255,255,0.04)', border: selBelt === b.id ? `1px solid ${col.border}` : '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', color: selBelt === b.id ? col.text : T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia,serif', whiteSpace: 'nowrap' }}>
                          {b.label}
                        </button>
                      )
                    })}
                  </div>
                  <Card active={isCur}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                      <BeltPill beltId={selBelt} size="lg" />
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase', color: isCur ? T.goldLight : T.text }}>{belt.label} Belt</div>
                        {bd.earned && <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', marginTop: 3 }}>
                          {belt.id === 'white' ? 'Started classes ' : 'Earned '}{fmt(bd.earned)}{bd.promoted ? ` · Promoted ${fmt(bd.promoted)} · ${monthsBetween(bd.earned, bd.promoted)} months` : ` · ${monthsBetween(bd.earned)} months so far`}
                        </div>}
                        {!bd.earned && bd.promoted && <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', marginTop: 3 }}>
                          Promoted {fmt(bd.promoted)}
                        </div>}
                      </div>
                      {isCur && <div style={{ marginLeft: 'auto', fontSize: 9, color: T.gold, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '3px 10px', letterSpacing: '0.15em', flexShrink: 0 }}>CURRENT</div>}
                    </div>

                    {belt.stripes > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <Lbl>Stripes — {bd.stripesDone}/{belt.stripes}{belt.sparring ? ' + sparring' : ''}</Lbl>
                        <StripeDots total={belt.stripes} done={bd.stripesDone} sparring={belt.sparring} sparringDone={bd.sparringDone} size={28} onSparringToggle={(isCur || isPast) ? () => toggleSparring(selBelt) : undefined} />
                        {belt.sparring && <div style={{ fontSize: 10, color: T.muted, marginTop: 8, fontStyle: 'italic' }}>⚔ = sparring stripe — click to toggle</div>}
                      </div>
                    )}

                    {req && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Lbl>Sparring Attendance</Lbl>
                          <span style={{ fontSize: 12, color: (bd.sparringCount || 0) >= req ? T.green : T.muted }}>{bd.sparringCount || 0}/{req}</span>
                        </div>
                        <ProgressBar value={bd.sparringCount || 0} max={req} height={8} style={{ marginBottom: 10 }} />
                        {(isCur || isPast) && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Btn small variant="ghost" onClick={() => adjSparring(selBelt, -1)}>−</Btn>
                            <span style={{ fontSize: 13, color: T.text, minWidth: 32, textAlign: 'center', fontWeight: 'bold' }}>{bd.sparringCount || 0}</span>
                            <Btn small variant="ghost" onClick={() => adjSparring(selBelt, 1)}>+</Btn>
                            <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>adjust</span>
                          </div>
                        )}
                      </div>
                    )}

                    {bd.earned && (
                      <div style={{ marginBottom: 20 }}>
                        <Lbl>Ceremony Note</Lbl>
                        <textarea key={selBelt} defaultValue={bd.ceremonyNote || ''} onBlur={e => saveCeremonyNote(selBelt, e.target.value)}
                          placeholder="Who was there? How did it feel?"
                          style={{ ...FIELD_S, resize: 'vertical', minHeight: 80, lineHeight: 1.6, marginBottom: 0 }} />
                      </div>
                    )}

                    {isCur && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        {belt.stripes > 0 && bd.stripesDone < belt.stripes && (
                          <Btn onClick={() => addStripe(selBelt)} style={{ fontWeight: 'bold' }}>+ Stripe {bd.stripesDone + 1}</Btn>
                        )}
                        {belt.stripes > 0 && bd.stripesDone > 0 && (
                          <Btn variant="ghost" onClick={() => removeStripe(selBelt)}>− Remove</Btn>
                        )}
                        {canPromote && (
                          <Btn style={{ fontWeight: 'bold' }} onClick={() => setModal({ type: 'promote', payload: { from: selBelt, to: nextBelt.id, nextLabel: nextBelt.label } })}>
                            ★ Belt Promotion
                          </Btn>
                        )}
                      </div>
                    )}
                    {!bd.earned && !isCur && <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>Not yet earned</div>}
                  </Card>
                </div>
              )
            })()}

            {/* ══ SPARRING ══ */}
            {view === 'sparring' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, letterSpacing: '0.06em' }}>Sparring</div>
                  <Btn variant="red" onClick={() => setModal({ type: 'sparring' })}>+ Log Session</Btn>
                </div>
                {['blue', 'purple', 'red'].map(bId => {
                  const bd = profile.belts[bId], req = SPARRING_M[bId], count = bd.sparringCount || 0
                  return (
                    <Card key={bId} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <BeltPill beltId={bId} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{bId[0].toUpperCase() + bId.slice(1)} Belt</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: count >= req ? T.green : T.muted, fontWeight: 'bold' }}>{count}/{req}</span>
                      </div>
                      <ProgressBar value={count} max={req} height={7} color={count >= req ? T.green : T.red} style={{ marginBottom: 6 }} />
                      {bd.sparringDone && <div style={{ fontSize: 10, color: T.green, letterSpacing: '0.1em' }}>✓ SPARRING STRIPE EARNED</div>}
                    </Card>
                  )
                })}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Sessions ({(profile.sparringLog || []).length})</div>
                  {(profile.sparringLog || []).length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontStyle: 'italic' }}>No sessions logged yet</div>}
                  {(profile.sparringLog || []).map((s, i) => (
                    <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', width: isMobile ? 80 : 96, flexShrink: 0 }}>{fmt(s.date)}</span>
                      <BeltPill beltId={s.belt} size="sm" />
                      <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{s.notes || 'Sparring session'}</span>
                      <button onClick={() => removeSparring(s.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ TECHNIQUES ══ */}
            {view === 'techniques' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, letterSpacing: '0.06em' }}>
                    Techniques <span style={{ fontSize: 13, color: T.muted }}>({(data.techniques || []).length})</span>
                  </div>
                  <Btn onClick={() => setModal({ type: 'technique', payload: null })}>+ Add</Btn>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {['All', ...TECH_CATS].map(c => (
                    <button key={c} onClick={() => setTechFilter(c)}
                      style={{ background: techFilter === c ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: techFilter === c ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '4px 12px', fontSize: 10, cursor: 'pointer', color: techFilter === c ? T.goldLight : T.muted, fontFamily: 'Georgia,serif' }}>
                      {c}
                    </button>
                  ))}
                </div>
                <input value={techSearch} onChange={e => setTechSearch(e.target.value)} placeholder="Search…" style={{ ...FIELD_S, marginBottom: 16 }} />
                {filteredTech.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontStyle: 'italic' }}>
                    {(data.techniques || []).length === 0 ? 'Add your first combo, kata, or self-defence move' : 'No results'}
                  </div>
                )}
                {TECH_CATS.filter(cat => filteredTech.some(t => t.category === cat)).map(cat => (
                  <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid rgba(255,255,255,0.06)` }}>{cat}</div>
                    {filteredTech.filter(t => t.category === cat).map(tech => (
                      <div key={tech.id} style={{ background: tech.mastered ? 'rgba(74,140,92,0.06)' : T.card, border: tech.mastered ? '1px solid rgba(74,140,92,0.18)' : T.cardBorder, borderRadius: 8, padding: '12px 14px', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div onClick={() => toggleMastered(tech.id)} style={{ width: 16, height: 16, borderRadius: '50%', background: tech.mastered ? T.green : 'transparent', border: `1.5px solid ${tech.mastered ? T.green : 'rgba(255,255,255,0.2)'}`, flexShrink: 0, cursor: 'pointer', marginTop: 3, transition: 'all 0.2s' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: tech.notes ? 4 : 0 }}>
                            <span style={{ fontSize: 13, color: tech.mastered ? T.greenLight : T.text, fontWeight: 'bold' }}>{tech.name}</span>
                            {tech.belt && <BeltPill beltId={tech.belt} size="sm" />}
                            {tech.learnedDate && <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>{fmt(tech.learnedDate)}</span>}
                            {tech.mastered && <span style={{ fontSize: 8, color: T.green, letterSpacing: '0.1em' }}>MASTERED</span>}
                          </div>
                          {tech.notes && <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' }}>{tech.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setModal({ type: 'technique', payload: tech })} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13 }}>✎</button>
                          <button onClick={() => deleteTech(tech.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ══ TRAINING ══ */}
            {view === 'training' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, letterSpacing: '0.06em' }}>Training Log</div>
                    {streak > 0 && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>🔥 {streak} week{streak !== 1 ? 's' : ''} streak</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Btn small variant="cal" onClick={openSyncModal} disabled={calLoading}>{calLoading ? '⟳ Syncing…' : '📅 Sync Calendar'}</Btn>
                    <Btn small variant="cal" onClick={() => setModal({ type: 'schedule' })}>+ Schedule Session</Btn>
                    <Btn small onClick={() => setModal({ type: 'training' })}>+ Log Manually</Btn>
                  </div>
                </div>

                {calError && <div style={{ background: 'rgba(180,50,50,0.1)', border: '1px solid rgba(180,50,50,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#e08080', margin: '12px 0' }}>⚠ {calError}</div>}

                {calSynced && (
                  <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', margin: '10px 0' }}>
                    📅 {(profile.trainingLog || []).filter(t => t.fromCalendar).length} sessions from Google Calendar
                    <span style={{ color: T.gold, cursor: 'pointer', marginLeft: 8 }} onClick={openSyncModal}>↻ Refresh</span>
                  </div>
                )}

                <TrainingHeatmap log={profile.trainingLog || []} heatmapData={profile.heatmap || {}} onToggle={toggleHeatmap} isLeadership={!!profile.leadershipStart} theme={profile.appTheme || 'dark'} />

                <div style={{ marginTop: 20, fontSize: 11, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
                  All sessions ({(profile.trainingLog || []).length})
                </div>
                {(profile.trainingLog || []).length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontStyle: 'italic' }}>No sessions yet — sync your calendar or log manually</div>}
                {(profile.trainingLog || []).map((t, i) => (
                  <div key={t.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 46 }}>
                      <div style={{ fontSize: 14, color: T.goldLight, fontWeight: 'bold' }}>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' })}</div>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: T.text, fontWeight: 'bold' }}>{t.focus || 'Class'}</span>
                        {t.fromCalendar && <span style={{ fontSize: 9, color: '#7aadff', border: '1px solid rgba(66,133,244,0.3)', borderRadius: 8, padding: '1px 7px' }}>📅 GCal</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                        {t.duration && <span style={{ fontSize: 10, color: T.muted }}>⏱ {t.duration}min</span>}
                        {t.felt && <span style={{ fontSize: 10, color: t.felt >= 4 ? T.green : t.felt >= 3 ? T.gold : T.red }}>{'●'.repeat(t.felt)}{'○'.repeat(5 - t.felt)}</span>}
                      </div>
                      {t.notes && <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                    </div>
                    <button onClick={() => removeTraining(t.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* ══ GOALS ══ */}
            {view === 'goals' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, letterSpacing: '0.06em' }}>Goals</div>
                  <Btn onClick={() => setModal({ type: 'goal' })}>+ Add Goal</Btn>
                </div>
                {(profile.goals || []).filter(g => !g.done).length === 0 && (profile.goals || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontStyle: 'italic' }}>Set goals — techniques to master, sparring milestones, belt targets…</div>
                )}
                {(profile.goals || []).filter(g => !g.done).map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <div onClick={() => toggleGoal(g.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid rgba(201,168,76,0.4)`, flexShrink: 0, cursor: 'pointer', marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: T.text }}>{g.text}</div>
                      {g.beltId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <BeltPill beltId={g.beltId} size="sm" />
                          <span style={{ fontSize: 10, color: T.muted }}>{ADULT_BELTS.find(b => b.id === g.beltId)?.label} belt</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>×</button>
                  </div>
                ))}
                {(profile.goals || []).filter(g => g.done).length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Completed</div>
                    {(profile.goals || []).filter(g => g.done).map(g => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid var(--cardBorder)`, opacity: 0.5 }}>
                        <div onClick={() => toggleGoal(g.id)} style={{ width: 20, height: 20, borderRadius: 4, background: T.green, border: `1.5px solid ${T.green}`, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✓</div>
                        <span style={{ fontSize: 12, color: T.muted, textDecoration: 'line-through', flex: 1 }}>{g.text}</span>
                        <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>{fmt(g.doneDate)}</span>
                        <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ LOG ══ */}
            {view === 'log' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, color: T.goldLight, letterSpacing: '0.06em' }}>Activity Log</div>
                  <Btn onClick={() => setModal({ type: 'note' })}>+ Add Note</Btn>
                </div>
                {(profile.notes || []).length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontStyle: 'italic' }}>No entries yet</div>}
                {(profile.notes || []).map((n, i) => (
                  <div key={n.id || i} style={{ display: 'flex', gap: 14, padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic', width: isMobile ? 70 : 96, flexShrink: 0, marginTop: 2 }}>{fmt(n.date)}</span>
                    <span style={{ fontSize: 12, color: T.text, lineHeight: 1.6, flex: 1 }}>{n.text}</span>
                    <button onClick={() => removeNote(n.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, opacity: 0.4, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(12,10,8,0.97)', borderTop: `1px solid rgba(201,168,76,0.12)`, display: 'flex', zIndex: 200, backdropFilter: 'blur(10px)' }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              style={{ flex: 1, background: 'none', border: 'none', borderTop: view === v.id ? `2px solid ${T.gold}` : '2px solid transparent', color: view === v.id ? T.goldLight : T.dim, fontSize: 16, padding: '10px 0 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span>{v.icon}</span>
              <span style={{ fontSize: 7, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia,serif', color: view === v.id ? T.gold : T.dim }}>{v.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}
      {isMobile && <div style={{ height: 70 }} />}

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : 20 }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#141210', border: '1px solid rgba(201,168,76,0.22)', borderRadius: isMobile ? '12px 12px 0 0' : 10, padding: '24px 24px', width: '100%', maxWidth: isMobile ? '100%' : 460, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {modal.type === 'programs'   && <ProgramsModal   profile={profile}           onConfirm={savePrograms}    onClose={() => setModal(null)} />}
            {modal.type === 'promote'    && <PromoteModal    {...modal.payload} isKids={isKids} onConfirm={promoteBelt}     onClose={() => setModal(null)} />}
            {modal.type === 'sparring'   && <SparringModal   onConfirm={logSparring}     onClose={() => setModal(null)} />}
            {modal.type === 'note'       && <NoteModal       onConfirm={addNote}         onClose={() => setModal(null)} />}
            {modal.type === 'technique'  && <TechniqueModal  tech={modal.payload}        onConfirm={saveTech}        onClose={() => setModal(null)} />}
            {modal.type === 'training'   && <TrainingModal   onConfirm={logTraining}     onClose={() => setModal(null)} />}
            {modal.type === 'goal'       && <GoalModal       onConfirm={saveGoal}        onClose={() => setModal(null)} />}
            {modal.type === 'schedule'   && <ScheduleModal   onConfirm={scheduleSession} onClose={() => setModal(null)} calLoading={calLoading} />}
            {modal.type === 'calSetup'   && <CalSetupModal   calendars={calendars} selCalId={selCalId} onSelect={setSelCalId} onPreview={previewSync} calLoading={calLoading} calError={calError} onClose={() => setModal(null)} />}
            {modal.type === 'calPreview' && <CalPreviewModal preview={previewEvents} onImport={importPreview} onBack={() => setModal({ type: 'calSetup' })} onClose={() => setModal(null)} keywords={KARATE_KEYWORDS} />}
            {modal.type === 'theme'      && <ThemeModal      profile={profile} onConfirm={(a) => { updateProfile(p => { p.appTheme = a; return p }); setModal(null); showToast('🎨 Theme updated!') }} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}
    </div>
  )
}
