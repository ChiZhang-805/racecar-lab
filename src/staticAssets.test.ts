import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { coolingFaultCardsFor, coolingReferenceCards } from './coolingInteractions'
import { MUSIC_TRACKS } from './music'
import { partInteractionRegistry } from './partInteractionRegistry'
import type { VehicleId } from './vehicles'

type AudioManifestTrack = {
  filename: string
  sha256: string
  durationSeconds: number
  bitrateKbps: number
  sampleRateHz: number
  channels: number
  binarySuppliedBy: string
  rightsStatus: string
  sourceItemUrl?: string
}

type AudioManifest = {
  schemaVersion: number
  auditedOn: string
  tracks: AudioManifestTrack[]
}

const publicRoot = join(process.cwd(), 'public')
const vehicleIds: VehicleId[] = ['student-ev', 'grand-prix-2026']

const walkFiles = (root: string): string[] => readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const path = join(root, entry.name)
  return entry.isDirectory() ? walkFiles(path) : [path]
})

const readUInt24LE = (buffer: Buffer, offset: number) => buffer[offset]! | (buffer[offset + 1]! << 8) | (buffer[offset + 2]! << 16)

const readWebpDimensions = (buffer: Buffer) => {
  expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF')
  expect(buffer.readUInt32LE(4) + 8).toBe(buffer.length)
  expect(buffer.subarray(8, 12).toString('ascii')).toBe('WEBP')

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii')
    const size = buffer.readUInt32LE(offset + 4)
    const data = offset + 8
    expect(data + size).toBeLessThanOrEqual(buffer.length)

    if (type === 'VP8X') {
      return { width: readUInt24LE(buffer, data + 4) + 1, height: readUInt24LE(buffer, data + 7) + 1 }
    }
    if (type === 'VP8 ') {
      expect(buffer.subarray(data + 3, data + 6)).toEqual(Buffer.from([0x9d, 0x01, 0x2a]))
      return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff }
    }
    if (type === 'VP8L') {
      expect(buffer[data]).toBe(0x2f)
      const packed = buffer.readUInt32LE(data + 1)
      return { width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 }
    }
    offset = data + size + (size % 2)
  }
  throw new Error('WebP image has no decodable VP8/VP8L/VP8X payload')
}

const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const sampleRateTable = [44100, 48000, 32000]

const inspectMpeg1Layer3 = (buffer: Buffer) => {
  let offset = 0
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    const size = (buffer[6]! << 21) | (buffer[7]! << 14) | (buffer[8]! << 7) | buffer[9]!
    offset = 10 + size + ((buffer[5]! & 0x10) === 0x10 ? 10 : 0)
  }

  let frames = 0
  let samples = 0
  let sampleRate = 0
  const bitrates = new Set<number>()
  const channelCounts = new Set<number>()
  while (offset < buffer.length) {
    expect(offset + 4).toBeLessThanOrEqual(buffer.length)
    expect(buffer[offset]).toBe(0xff)
    expect(buffer[offset + 1]! & 0xfe).toBe(0xfa)
    const bitrate = bitrateTable[(buffer[offset + 2]! >>> 4) & 0x0f]!
    const rate = sampleRateTable[(buffer[offset + 2]! >>> 2) & 0x03]!
    expect(bitrate).toBeGreaterThan(0)
    expect(rate).toBeGreaterThan(0)
    const padding = (buffer[offset + 2]! >>> 1) & 1
    const frameLength = Math.floor((144_000 * bitrate) / rate) + padding
    expect(frameLength).toBeGreaterThan(4)
    expect(offset + frameLength).toBeLessThanOrEqual(buffer.length)
    bitrates.add(bitrate)
    channelCounts.add(((buffer[offset + 3]! >>> 6) & 0x03) === 3 ? 1 : 2)
    sampleRate = rate
    samples += 1152
    frames += 1
    offset += frameLength
  }
  expect(offset).toBe(buffer.length)
  return {
    frames,
    durationSeconds: samples / sampleRate,
    bitrateKbps: [...bitrates],
    sampleRateHz: sampleRate,
    channels: [...channelCounts],
  }
}

describe('static asset integrity', () => {
  it('maps every referenced interaction image to one unique, structurally valid WebP file', () => {
    const referenced = new Set<string>()
    for (const pack of Object.values(partInteractionRegistry)) {
      if (!pack) continue
      pack.referenceCards.forEach(card => referenced.add(card.image.replace(/^\//, '')))
      vehicleIds.flatMap(vehicleId => pack.faultCardsFor(vehicleId)).forEach(card => referenced.add(card.image.replace(/^\//, '')))
    }
    coolingReferenceCards.forEach(card => referenced.add(card.image.replace(/^\//, '')))
    vehicleIds.flatMap(coolingFaultCardsFor).forEach(card => referenced.add(card.image.replace(/^\//, '')))

    const imageRoot = join(publicRoot, 'images')
    const files = walkFiles(imageRoot)
      .map(path => relative(publicRoot, path).replaceAll('\\', '/'))
      .filter(path => path.endsWith('.webp'))
      .sort()
    expect(files).toHaveLength(108)
    expect([...referenced].sort()).toEqual(files)

    const hashes = new Set<string>()
    for (const file of files) {
      expect(file.endsWith('.webp')).toBe(true)
      const buffer = readFileSync(join(publicRoot, file))
      expect(buffer.length, file).toBeGreaterThan(50_000)
      const { width, height } = readWebpDimensions(buffer)
      expect(width, file).toBeGreaterThanOrEqual(1280)
      expect(height, file).toBeGreaterThanOrEqual(853)
      hashes.add(createHash('sha256').update(buffer).digest('hex'))
    }
    expect(hashes.size).toBe(files.length)
  })

  it('ships exactly the eight manifested MP3 files with complete valid frame streams', () => {
    const manifestPath = join(publicRoot, 'audio', 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AudioManifest
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.tracks).toHaveLength(8)
    expect(new Set(manifest.tracks.map(track => track.filename)).size).toBe(8)

    const mp3Files = walkFiles(join(publicRoot, 'audio'))
      .filter(path => path.endsWith('.mp3'))
      .map(path => basename(path))
      .sort()
    expect(manifest.tracks.map(track => track.filename).sort()).toEqual(mp3Files)
    expect(MUSIC_TRACKS.map(track => track.sourceFilename).sort()).toEqual(mp3Files)
    expect(MUSIC_TRACKS.map(track => basename(track.file)).sort()).toEqual(mp3Files)

    for (const track of manifest.tracks) {
      const path = join(publicRoot, 'audio', track.filename)
      expect(existsSync(path), track.filename).toBe(true)
      expect(statSync(path).size, track.filename).toBeGreaterThan(2_000_000)
      const buffer = readFileSync(path)
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(track.sha256)
      const technical = inspectMpeg1Layer3(buffer)
      expect(technical.frames, track.filename).toBeGreaterThan(3_000)
      expect(technical.durationSeconds).toBeCloseTo(track.durationSeconds, 2)
      expect(technical.bitrateKbps).toEqual([track.bitrateKbps])
      expect(technical.sampleRateHz).toBe(track.sampleRateHz)
      expect(technical.channels).toEqual([track.channels])
      expect(track.binarySuppliedBy).toBe('repository-owner')
      expect(['source-record-required', 'verified-page-current-license-not-archived']).toContain(track.rightsStatus)
      if (track.sourceItemUrl) expect(track.sourceItemUrl).toMatch(/^https:\/\/pixabay\.com\//)
    }
  })
})
