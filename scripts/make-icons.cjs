// Builds the app icon set (public/) from one SVG design: a glowing amber meter dial with a needle
// and a digit counter on the dark meter-display background. Usage: npm i --no-save sharp && node scripts/make-icons.cjs public
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const out = process.argv[2]

// A 270 degree dial like the app's gauge: amber arc filled to about two thirds, with a needle.
const CX = 256
const CY = 262
const R = 150
const polar = (deg, r) => [CX + Math.cos((deg * Math.PI) / 180) * r, CY + Math.sin((deg * Math.PI) / 180) * r]
function arc(fromDeg, toDeg, r) {
  const [x1, y1] = polar(fromDeg, r)
  const [x2, y2] = polar(toDeg, r)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function svg({ rounded }) {
  const bg = rounded ? '<rect width="512" height="512" rx="114" fill="url(#bg)"/>' : '<rect width="512" height="512" fill="url(#bg)"/>'
  const clip = rounded ? 'clip-path="url(#round)"' : ''
  const needleAngle = 135 + 270 * 0.68
  const [nx, ny] = polar(needleAngle, R - 34)
  const lines = []
  for (let y = 0; y < 512; y += 8) lines.push(`<rect x="0" y="${y}" width="512" height="1" fill="#ffffff" fill-opacity="0.035"/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e2a40"/>
      <stop offset="1" stop-color="#060a11"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.48" r="0.55">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="amber" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#fde68a"/>
    </linearGradient>
    <filter id="neon" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="round"><rect width="512" height="512" rx="114"/></clipPath>
  </defs>
  ${bg}
  <g ${clip}>
    ${lines.join('')}
    <rect width="512" height="512" fill="url(#glow)"/>
  </g>

  <path d="${arc(135, 405, R)}" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="30" stroke-linecap="round"/>
  <path d="${arc(135, needleAngle, R)}" fill="none" stroke="url(#amber)" stroke-width="30" stroke-linecap="round" filter="url(#neon)"/>

  <g filter="url(#neon)">
    <line x1="${CX}" y1="${CY}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#fde68a" stroke-width="14" stroke-linecap="round"/>
  </g>
  <circle cx="${CX}" cy="${CY}" r="26" fill="#0b1220" stroke="#fde68a" stroke-width="8"/>

  <rect x="176" y="356" width="160" height="56" rx="14" fill="#060a11" stroke="#ffffff" stroke-opacity="0.12" stroke-width="3"/>
  <text x="256" y="397" fill="#fcd34d" font-family="Consolas, 'Courier New', monospace" font-weight="700" font-size="38" letter-spacing="6" text-anchor="middle">0136</text>
</svg>`
}

async function png(svgText, size, file, flatten) {
  let img = sharp(Buffer.from(svgText), { density: Math.max(72, (72 * size) / 512 * 2) }).resize(size, size)
  if (flatten) img = img.flatten({ background: '#0b1220' })
  await img.png({ compressionLevel: 9 }).toFile(path.join(out, file))
}

;(async () => {
  const rounded = svg({ rounded: true })
  const full = svg({ rounded: false })
  fs.writeFileSync(path.join(out, 'favicon.svg'), rounded)
  await png(rounded, 192, 'pwa-192x192.png')
  await png(rounded, 512, 'pwa-512x512.png')
  await png(full, 512, 'maskable-icon-512x512.png', true) // Android crops it to its own shape
  await png(full, 180, 'apple-touch-icon.png', true) // iOS rounds the corners itself; no transparency
  console.log('ok')
})()
