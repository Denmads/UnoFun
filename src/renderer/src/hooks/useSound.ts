import { useCallback, useRef, useEffect } from 'react'

// Simple sound effect system using the Web Audio API
// We generate procedural sounds rather than loading files for portability

type SoundType = 'cardPlay' | 'cardDraw' | 'unoCall' | 'skip' | 'reverse' | 'win' | 'error' | 'tick' | 'buzz'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): void {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

function playNoise(duration: number, volume = 0.1): void {
  try {
    const ctx = getAudioContext()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  } catch {
    // Audio not available
  }
}

const soundEffects: Record<SoundType, () => void> = {
  cardPlay: () => {
    playNoise(0.08, 0.15)
    playTone(800, 0.1, 'sine', 0.15)
  },
  cardDraw: () => {
    playNoise(0.06, 0.1)
    playTone(500, 0.08, 'sine', 0.1)
  },
  unoCall: () => {
    playTone(523, 0.15, 'square', 0.2)
    setTimeout(() => playTone(659, 0.15, 'square', 0.2), 100)
    setTimeout(() => playTone(784, 0.2, 'square', 0.25), 200)
  },
  skip: () => {
    playTone(400, 0.1, 'sawtooth', 0.15)
    setTimeout(() => playTone(300, 0.15, 'sawtooth', 0.1), 80)
  },
  reverse: () => {
    playTone(600, 0.1, 'triangle', 0.15)
    setTimeout(() => playTone(400, 0.1, 'triangle', 0.15), 80)
    setTimeout(() => playTone(600, 0.15, 'triangle', 0.15), 160)
  },
  win: () => {
    const notes = [523, 587, 659, 784, 880, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 100)
    })
  },
  error: () => {
    playTone(200, 0.15, 'sawtooth', 0.2)
    setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.15), 100)
  },
  tick: () => {
    playTone(1000, 0.05, 'sine', 0.1)
  },
  buzz: () => {
    playTone(100, 0.3, 'sawtooth', 0.15)
  },
}

export function useSound() {
  const play = useCallback((sound: SoundType) => {
    soundEffects[sound]?.()
  }, [])

  return { play }
}
