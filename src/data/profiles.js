export const BELT_IDS = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'red', 'brown', 'black']

export function blankBelt() {
  return {
    earned: null,
    promoted: null,
    ceremonyNote: '',
    stripesDone: 0,
    sparringDone: false,
    sparringCount: 0,
  }
}

export function blankBelts() {
  return Object.fromEntries(BELT_IDS.map(id => [id, blankBelt()]))
}

export function makeProfile(id, name, type, currentBelt, beltsOverride, programName) {
  return {
    id,
    name,
    type,           // 'adult' | 'kids'
    programName: programName || (type === 'adult' ? 'Adults' : 'Kids'),
    currentBelt: currentBelt || 'white',
    belts: beltsOverride || blankBelts(),
    sparringLog: [],
    notes: [],
    trainingLog: [],
    goals: [],
    heatmap: {},
    leadershipStart: null,
    bbcStart: null,
  }
}

export const INITIAL_STATE = {
  activeProfile: 'kathrin',
  profiles: {
    kathrin: makeProfile('kathrin', 'Kathrin', 'adult', 'white', null, 'Adults'),
    emily:   makeProfile('emily',   'Emily',   'kids',  'white', null, 'Kids'),
    isabel:  makeProfile('isabel',  'Isabel',  'kids',  'white', null, 'Kids — Future Black Belt'),
  },
  techniques: [],  // shared across all profiles
}

// ── Storage migration ──────────────────────────────────
export function migrateData(raw) {
  const d = typeof raw === 'string' ? JSON.parse(raw) : raw

  if (!d.activeProfile) d.activeProfile = 'kathrin'

  // Migrate from old single-profile format
  if (!d.profiles) {
    d.profiles = {
      kathrin: makeProfile('kathrin', 'Kathrin', 'adult', d.currentBelt || 'white', d.belts || null, 'Adults'),
      emily:   makeProfile('emily', 'Emily', 'kids', 'white', null, 'Kids'),
      isabel:  makeProfile('isabel', 'Isabel', 'kids', 'white', null, 'Kids — Future Black Belt'),
    }
    if (d.sparringLog) d.profiles.kathrin.sparringLog = d.sparringLog
    if (d.notes)       d.profiles.kathrin.notes       = d.notes
    if (d.trainingLog) d.profiles.kathrin.trainingLog = d.trainingLog
    if (d.goals)       d.profiles.kathrin.goals       = d.goals
  }

  if (!d.techniques) d.techniques = []

  // Ensure all profile sub-fields exist
  Object.values(d.profiles).forEach(p => {
    if (!p.sparringLog) p.sparringLog = []
    if (!p.notes)       p.notes       = []
    if (!p.trainingLog) p.trainingLog = []
    if (!p.goals)       p.goals       = []
    if (!p.heatmap)     p.heatmap     = {}
    if (p.leadershipStart === undefined) p.leadershipStart = null
    if (p.bbcStart === undefined)        p.bbcStart        = null
    if (!p.programName) p.programName = p.type === 'adult' ? 'Adults' : (p.id === 'isabel' ? 'Kids — Future Black Belt' : 'Kids')
    BELT_IDS.forEach(k => {
      if (!p.belts[k]) p.belts[k] = blankBelt()
      if (p.belts[k].ceremonyNote === undefined) p.belts[k].ceremonyNote = ''
    })
  })

  return d
}
