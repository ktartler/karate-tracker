export const T = {
  bg:         'var(--bg)',
  surface:    'var(--surface)',
  card:       'var(--card)',
  cardBorder: 'var(--cardBorder)',
  activeBg:   'var(--activeBg)',
  activeBdr:  'var(--activeBdr)',
  gold:       'var(--gold)',
  goldLight:  'var(--goldLight)',
  muted:      'var(--muted)',
  dim:        'var(--dim)',
  text:       'var(--text)',
  textDim:    'var(--textDim)',
  red:        'var(--red)',
  green:      'var(--green)',
  greenLight: 'var(--greenLight)',
}

// ── BELT COLORS ────────────────────────────────────────
export const BELT_COLORS = {
  white:  { bg: '#e0d8c8', border: '#aaa',    text: '#2a2a2a' },
  yellow: { bg: '#e0b040', border: '#b88010', text: '#1a1000' },
  orange: { bg: '#d06820', border: '#a04800', text: '#fff'    },
  green:  { bg: '#3a7a4c', border: '#226034', text: '#fff'    },
  blue:   { bg: '#2c5f98', border: '#143870', text: '#fff'    },
  purple: { bg: '#6a3898', border: '#4a1870', text: '#fff'    },
  red:    { bg: '#b82820', border: '#881010', text: '#fff'    },
  brown:  { bg: '#6a3818', border: '#401800', text: '#fff'    },
  black:  { bg: '#1c1c1c', border: '#555',    text: '#e8c97a' },
}

// ── ADULT PROGRAM ──────────────────────────────────────
export const ADULT_BELTS = [
  { id: 'white',  label: 'White',  stripes: 3, sparring: false },
  { id: 'yellow', label: 'Yellow', stripes: 3, sparring: false },
  { id: 'orange', label: 'Orange', stripes: 4, sparring: false },
  { id: 'green',  label: 'Green',  stripes: 4, sparring: false },
  { id: 'blue',   label: 'Blue',   stripes: 5, sparring: true  },
  { id: 'purple', label: 'Purple', stripes: 5, sparring: true  },
  { id: 'red',    label: 'Red',    stripes: 6, sparring: true  },
  { id: 'brown',  label: 'Brown',  stripes: 0, sparring: false },
  { id: 'black',  label: 'Black',  stripes: 0, sparring: false },
]
export const ADULT_SPARRING_REQ = { blue: 15, purple: 20, red: 25 }

// ── KIDS PROGRAM ───────────────────────────────────────
export const KIDS_BELTS = [
  { id: 'white',  label: 'White',  stripes: 6, sparring: false },
  { id: 'yellow', label: 'Yellow', stripes: 6, sparring: false },
  { id: 'orange', label: 'Orange', stripes: 6, sparring: false },
  { id: 'green',  label: 'Green',  stripes: 6, sparring: false },
  { id: 'blue',   label: 'Blue',   stripes: 6, sparring: true  },
  { id: 'purple', label: 'Purple', stripes: 6, sparring: true  },
  { id: 'red',    label: 'Red',    stripes: 6, sparring: true  },
  { id: 'brown',  label: 'Brown',  stripes: 0, sparring: false },
  { id: 'black',  label: 'Black',  stripes: 0, sparring: false },
]
export const KIDS_SPARRING_REQ = { blue: 15, purple: 20, red: 25 }

export const getBelts       = (type) => type === 'kids' ? KIDS_BELTS       : ADULT_BELTS
export const getSparringReq = (type) => type === 'kids' ? KIDS_SPARRING_REQ : ADULT_SPARRING_REQ

// ── MISC CONSTANTS ─────────────────────────────────────
export const TECH_CATS = ['Combo', 'Form (Kata)', 'Self-Defence', 'Kick', 'Block', 'Other']

export const KARATE_KEYWORDS = [
  'adults only blue room',
  'adult/teen',
  'a/t',
  'karate',
  'sparring',
  'dojo',
  'kata',
]

export const BLUE_TEST_WEEKS = [
  { stripe: 1, start: '2026-03-23' },
  { stripe: 2, start: '2026-05-11' },
  { stripe: 3, start: '2026-06-22' },
  { stripe: 4, start: '2026-07-27' },
  { stripe: 5, start: '2026-09-07' },
]

export const FIELD_S = {
  width: '100%',
  background: 'var(--card)',
  border: '1px solid var(--cardBorder)',
  borderRadius: 6,
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'Georgia,serif',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: 14,
}
