export function getRandomElement<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot get random element from empty array')
  return arr[Math.floor(Math.random() * arr.length)]
}

export function removeElement<T>(arr: T[], element: T): boolean {
  const idx = arr.indexOf(element)
  if (idx !== -1) {
    arr.splice(idx, 1)
    return true
  }
  return false
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}
