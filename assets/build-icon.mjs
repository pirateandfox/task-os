// Run: node assets/build-icon.mjs
// Requires: npm install sharp (already a devDep)
// Input: ui/public/favicon.svg (same icon used in the menu bar tray)
// Output: assets/icon.png + assets/icon.icns + replaces Electron bundle icon

import sharp from 'sharp'
import { execSync } from 'child_process'
import { mkdirSync, copyFileSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '../ui/public/favicon.svg')
const iconPng = path.join(__dirname, 'icon.png')
const iconicns = path.join(__dirname, 'icon.icns')
const iconset = '/tmp/qalatra.iconset'

// Render the SVG at 1024x1024 — same design as the menu bar tray icon
const svgBuffer = readFileSync(src)
await sharp(svgBuffer, { density: Math.round(1024 / 64 * 72) })
  .resize(1024, 1024)
  .png()
  .toFile(iconPng)

console.log('✓ icon.png (rendered from favicon.svg at 1024px)')

// Build .icns
mkdirSync(iconset, { recursive: true })
for (const size of [16, 32, 64, 128, 256, 512]) {
  execSync(`sips -z ${size} ${size} "${iconPng}" --out "${iconset}/icon_${size}x${size}.png" 2>/dev/null`)
}
copyFileSync(`${iconset}/icon_32x32.png`,  `${iconset}/icon_16x16@2x.png`)
copyFileSync(`${iconset}/icon_64x64.png`,  `${iconset}/icon_32x32@2x.png`)
copyFileSync(`${iconset}/icon_256x256.png`, `${iconset}/icon_128x128@2x.png`)
copyFileSync(`${iconset}/icon_512x512.png`, `${iconset}/icon_256x256@2x.png`)
execSync(`iconutil -c icns "${iconset}" -o "${iconicns}"`)
console.log('✓ icon.icns')

// Replace Electron dev bundle icon
const electronIcon = path.join(__dirname, '../node_modules/electron/dist/Electron.app/Contents/Resources/electron.icns')
copyFileSync(iconicns, electronIcon)
console.log('✓ Electron bundle icon replaced')
console.log('\nRestart Electron to see the new icon.')
