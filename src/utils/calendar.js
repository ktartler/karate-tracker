import { KARATE_KEYWORDS } from '../data/constants'
import { today } from '../utils'

// ── CONFIG ─────────────────────────────────────────────
// Set your Anthropic API key in .env.local:
//   VITE_ANTHROPIC_API_KEY=sk-ant-...
const GCAL_MCP = 'https://gcal.mcp.claude.com/mcp'
const API_KEY  = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const SYSTEM   = 'You are a Google Calendar assistant. Always respond with ONLY valid JSON, no markdown fences, no explanation. Never wrap in ```json blocks.'

async function callWithCalendar(userPrompt) {
  if (!API_KEY) throw new Error('No VITE_ANTHROPIC_API_KEY in .env.local')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      mcp_servers: [{ type: 'url', url: GCAL_MCP, name: 'google-calendar' }],
    }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')

  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON in response. Got: ' + text.slice(0, 200))
  let raw = jsonMatch[0]
  try { return JSON.parse(raw) }
  catch {
    let fixed = raw
    const opens    = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length
    const arrOpens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length
    fixed = fixed.replace(/,\s*$/, '').replace(/,\s*"[^"]*$/, '')
    for (let i = 0; i < arrOpens; i++) fixed += ']'
    for (let i = 0; i < opens; i++)    fixed += '}'
    try { return JSON.parse(fixed) }
    catch { throw new Error('Parse error. Got: ' + text.slice(0, 300)) }
  }
}

export async function gcalListCalendars() {
  return callWithCalendar(
    `List all my Google Calendars. Return ONLY JSON:\n{"calendars":[{"id":"string","name":"string","primary":true}]}`
  )
}

export async function gcalFetchAllEvents(startStr, endStr, calendarId) {
  const calNote = calendarId ? `from the calendar with id "${calendarId}"` : 'from all calendars'
  const chunks = []
  let cur = new Date(startStr + 'T12:00:00')
  const end = new Date(endStr + 'T12:00:00')
  while (cur <= end) {
    const chunkEnd = new Date(cur)
    chunkEnd.setMonth(chunkEnd.getMonth() + 1)
    if (chunkEnd > end) chunkEnd.setTime(end.getTime())
    chunks.push([cur.toISOString().split('T')[0], chunkEnd.toISOString().split('T')[0]])
    cur.setMonth(cur.getMonth() + 1)
  }
  const allEvents = []
  const seen = new Set()
  for (const [s, e] of chunks) {
    try {
      const res = await callWithCalendar(
        `List ALL calendar events ${calNote} from ${s} to ${e}. Include every event, no filtering. Return ONLY JSON:\n{"events":[{"id":"string","title":"string","date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM","duration":60,"description":"string","calendarName":"string"}]}`
      )
      for (const ev of (res.events || [])) {
        if (!seen.has(ev.id)) { seen.add(ev.id); allEvents.push(ev) }
      }
    } catch (err) {
      console.warn('Chunk fetch failed:', s, err)
    }
  }
  return { events: allEvents }
}

export async function gcalCreateEvent(date, startTime, endTime, title, description, calendarId) {
  const calNote = calendarId ? `in the calendar with id "${calendarId}"` : 'in my primary calendar'
  return callWithCalendar(
    `Create a Google Calendar event ${calNote}:\nTitle: "${title}"\nDate: ${date}\nStart: ${startTime}\nEnd: ${endTime}\nDescription: "${description || ''}"\nReturn ONLY JSON: {"success":true,"eventId":"string","title":"string","date":"YYYY-MM-DD"}`
  )
}

export function isKarateEvent(ev) {
  const haystack = ((ev.title || '') + ' ' + (ev.description || '')).toLowerCase()
  return KARATE_KEYWORDS.some(kw => haystack.includes(kw.toLowerCase()))
}
