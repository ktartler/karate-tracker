import { T, BELT_COLORS, FIELD_S } from '../data/constants'

export const Btn = ({ children, onClick, variant = 'gold', small, full, disabled, style = {} }) => {
  const vs = {
    gold:  { background: 'rgba(201,168,76,0.15)',  border: '1px solid rgba(201,168,76,0.4)',  color: T.goldLight  },
    red:   { background: 'rgba(208,96,96,0.12)',   border: '1px solid rgba(208,96,96,0.35)',  color: '#e08080'    },
    ghost: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: T.muted      },
    green: { background: 'rgba(74,140,92,0.15)',   border: '1px solid rgba(74,140,92,0.4)',   color: T.greenLight },
    cal:   { background: 'rgba(66,133,244,0.12)',  border: '1px solid rgba(66,133,244,0.35)', color: '#7aadff'    },
  }[variant] || {}
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...vs,
        borderRadius: 6,
        padding: small ? '5px 12px' : '9px 18px',
        fontSize: small ? 11 : 13,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'Georgia,serif',
        letterSpacing: '0.03em',
        width: full ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export const Lbl = ({ children }) => (
  <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Georgia,serif' }}>
    {children}
  </div>
)

export const Card = ({ children, active, style = {} }) => (
  <div style={{
    background: active ? T.activeBg : T.card,
    border: `1px solid ${active ? T.activeBdr : T.cardBorder}`,
    borderRadius: 10,
    padding: '18px 20px',
    ...style,
  }}>
    {children}
  </div>
)

export const BeltPill = ({ beltId, size = 'md' }) => {
  const col = BELT_COLORS[beltId] || BELT_COLORS.white
  return (
    <div style={{
      width: size === 'sm' ? 22 : 36,
      height: size === 'sm' ? 6 : 10,
      borderRadius: 3,
      background: col.bg,
      border: beltId === 'white' ? '1px solid #999' : 'none',
      flexShrink: 0,
    }} />
  )
}

export const ProgressBar = ({ value, max, color = T.red, height = 6, style = {} }) => (
  <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: height / 2, overflow: 'hidden', ...style }}>
    <div style={{
      height: '100%',
      width: `${Math.min(100, (value / max) * 100)}%`,
      background: color,
      borderRadius: height / 2,
      transition: 'width 0.4s ease',
    }} />
  </div>
)

export const StripeDots = ({ total, done, sparring, sparringDone, size = 12, onSparringToggle }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: i < done ? T.gold : 'rgba(255,255,255,0.06)',
          border: `1px solid ${i < done ? T.gold : 'rgba(255,255,255,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.55, color: i < done ? '#0c0a08' : 'rgba(255,255,255,0.2)',
          fontWeight: 'bold',
        }}
      >
        {size > 10 ? i + 1 : ''}
      </div>
    ))}
    {sparring && (
      <div
        onClick={onSparringToggle}
        title={sparringDone ? 'Sparring stripe — click to remove' : 'Click to earn sparring stripe'}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: sparringDone ? T.red : 'transparent',
          border: `2px dashed ${sparringDone ? T.red : 'rgba(255,255,255,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.6, cursor: onSparringToggle ? 'pointer' : 'default',
          transition: 'all 0.2s',
        }}
      >
        ⚔
      </div>
    )}
  </div>
)

export { FIELD_S }
