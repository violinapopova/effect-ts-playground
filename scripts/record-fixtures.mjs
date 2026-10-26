// Records real Open-Meteo responses for offline mode: node scripts/record-fixtures.mjs
import { writeFileSync } from 'node:fs'

const words = ['berlin', 'bern', 'paris', 'london', 'zurich', 'rome', 'vienna', 'madrid']
const queries = new Set()
for (const w of words) for (let i = 2; i <= w.length; i++) queries.add(w.slice(0, i))

const get = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

const out = { recordedAt: new Date().toISOString(), geocode: {}, forecast: {}, air: {} }
for (const q of queries) {
  const body = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`)
  const hit = body.results?.[0]
  out.geocode[q] = hit
    ? {
        results: [
          {
            name: hit.name,
            country: hit.country,
            admin1: hit.admin1,
            latitude: hit.latitude,
            longitude: hit.longitude,
          },
        ],
      }
    : {}
}
const coords = new Set(
  Object.values(out.geocode).flatMap((g) => (g.results ?? []).map((r) => `${r.latitude},${r.longitude}`)),
)
for (const key of coords) {
  const [lat, lon] = key.split(',')
  const f = await get(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
  )
  out.forecast[key] = { current: { temperature_2m: f.current.temperature_2m, weather_code: f.current.weather_code } }
  const a = await get(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5&timezone=auto`,
  )
  out.air[key] = { current: { european_aqi: a.current.european_aqi, pm2_5: a.current.pm2_5 } }
}
writeFileSync(new URL('../src/api/fixtures.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log(`queries: ${queries.size}, places: ${coords.size}`)
