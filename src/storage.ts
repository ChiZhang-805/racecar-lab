export function readText(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}

export function writeText(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true } catch { return false }
}

export function removeStored(key: string): boolean {
  try { window.localStorage.removeItem(key); return true } catch { return false }
}

export function readJson<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  const raw = readText(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try { return writeText(key, JSON.stringify(value)) } catch { return false }
}
