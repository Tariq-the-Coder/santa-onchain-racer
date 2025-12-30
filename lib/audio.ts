// Web Audio API - Procedural sound generation for game effects

export class GameAudio {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private isMuted = false
  private musicOscillators: OscillatorNode[] = []
  private musicInterval: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)

      this.musicGain = this.audioContext.createGain()
      this.musicGain.gain.value = 0.3
      this.musicGain.connect(this.masterGain)
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 1
    }
    return this.isMuted
  }

  // Engine revving sound
  playEngineSound(speed: number) {
    if (!this.audioContext || this.isMuted) return

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = "sawtooth"
    osc.frequency.value = 80 + speed * 2
    gain.gain.value = 0.05

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)
    osc.stop(this.audioContext.currentTime + 0.1)
  }

  // Lane switch whoosh
  playSwipeSound() {
    if (!this.audioContext || this.isMuted) return

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = "sine"
    osc.frequency.value = 400
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15)

    gain.gain.value = 0.3
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.15)
  }

  // Gift collection chime
  playGiftSound() {
    if (!this.audioContext || this.isMuted) return

    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 - happy chord

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()

      osc.type = "sine"
      osc.frequency.value = freq

      gain.gain.value = 0.2
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(this.audioContext!.currentTime + i * 0.05)
      osc.stop(this.audioContext!.currentTime + 0.5 + i * 0.05)
    })
  }

  // Crash explosion
  playCrashSound() {
    if (!this.audioContext || this.isMuted) return

    const noise = this.audioContext.createBufferSource()
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    noise.buffer = buffer

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 500

    const gain = this.audioContext.createGain()
    gain.gain.value = 0.5
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    noise.start()
    noise.stop(this.audioContext.currentTime + 0.5)
  }

  // Nitro boost
  playNitroSound() {
    if (!this.audioContext || this.isMuted) return

    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = "sawtooth"
    osc.frequency.value = 100
    osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.3)

    gain.gain.value = 0.3
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start()
    osc.stop(this.audioContext.currentTime + 0.3)
  }

  // Simple chiptune background music
  startBackgroundMusic() {
    if (!this.audioContext || this.isMuted || this.musicInterval) return

    // Jingle Bells melody (simplified)
    const melody = [
      { note: 329.63, duration: 0.25 }, // E4
      { note: 329.63, duration: 0.25 }, // E4
      { note: 329.63, duration: 0.5 }, // E4
      { note: 329.63, duration: 0.25 }, // E4
      { note: 329.63, duration: 0.25 }, // E4
      { note: 329.63, duration: 0.5 }, // E4
      { note: 329.63, duration: 0.25 }, // E4
      { note: 392.0, duration: 0.25 }, // G4
      { note: 261.63, duration: 0.25 }, // C4
      { note: 293.66, duration: 0.25 }, // D4
      { note: 329.63, duration: 1.0 }, // E4
    ]

    let noteIndex = 0

    const playNote = () => {
      if (!this.audioContext || this.isMuted) return

      const { note, duration } = melody[noteIndex]

      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()

      osc.type = "square"
      osc.frequency.value = note

      gain.gain.value = 0.1
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

      osc.connect(gain)
      gain.connect(this.musicGain!)

      osc.start()
      osc.stop(this.audioContext.currentTime + duration)

      this.musicOscillators.push(osc)

      noteIndex = (noteIndex + 1) % melody.length
    }

    this.musicInterval = setInterval(playNote, 300)
  }

  stopBackgroundMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    this.musicOscillators.forEach((osc) => {
      try {
        osc.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.musicOscillators = []
  }
}

// Singleton instance
let audioInstance: GameAudio | null = null

export function getAudioInstance() {
  if (!audioInstance) {
    audioInstance = new GameAudio()
  }
  return audioInstance
}
