let tonePromise
let tone
let clickSynth
let melodySynth
let droneSynth
let spaceReverb
let spaceDelay
let spaceFilter
let melodyEventId = null
let noteIndex = 0
let droneIndex = 0
let stepCount = 0

// Atmospheric celestial notes (D Dorian / cosmic pentatonic floating intervals)
const melodyNotes = [
  'D4', 'A4', 'F4', 'C5',
  'E4', 'G4', 'D5', 'A4',
  'F4', 'C5', 'A4', 'E4',
  'G4', 'D4', 'F5', 'C5',
]

// Deep space drone pedal notes (warm resonant cosmic foundation)
const droneNotes = [
  'D2', 'A2', 'F2', 'C2',
  'G2', 'D2', 'Bb1', 'A1',
]

export function preloadAudio() {
  if (!tonePromise) {
    tonePromise = import('tone')
      .then((loadedTone) => {
        tone = loadedTone
        return loadedTone
      })
      .catch((error) => {
        tonePromise = undefined
        throw error
      })
  }
  return tonePromise
}

export async function activateAudio() {
  const loadedTone = await preloadAudio()
  await loadedTone.start()

  if (!clickSynth) {
    clickSynth = new loadedTone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.06, sustain: 0, release: 0.04 },
      volume: -20,
    }).toDestination()
  }

  if (!melodySynth) {
    // Ethereal stardust / cosmic chime synthesizer
    melodySynth = new loadedTone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.1, decay: 0.8, sustain: 0.2, release: 2.5 },
      volume: -20,
    })

    // Deep space foundation drone
    droneSynth = new loadedTone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 1.5, decay: 2.0, sustain: 0.7, release: 3.0 },
      volume: -24,
    })

    // Cosmic spatial processing: long space reverb, dotted delay & warm filter
    spaceReverb = new loadedTone.Reverb({ decay: 6.5, preDelay: 0.15, wet: 0.45 })
    spaceDelay = new loadedTone.FeedbackDelay({ delayTime: '8n.', feedback: 0.35, wet: 0.25 })
    spaceFilter = new loadedTone.Filter({ frequency: 2600, type: 'lowpass', rolloff: -12 })

    melodySynth.connect(spaceDelay)
    spaceDelay.connect(spaceReverb)
    spaceReverb.connect(spaceFilter)
    spaceFilter.toDestination()

    droneSynth.connect(spaceReverb)

    await spaceReverb.ready
  }
}

export function playButtonSound() {
  if (!tone || !clickSynth || tone.getContext().state !== 'running') return
  clickSynth.triggerAttackRelease('A5', '32n', tone.now(), 0.12)
}

export function startMelody() {
  if (!tone || !melodySynth || tone.getContext().state !== 'running') return

  const transport = tone.getTransport()
  transport.bpm.value = 48
  if (melodyEventId === null) {
    melodyEventId = transport.scheduleRepeat((time) => {
      // Celestial twinkling melody note
      const note = melodyNotes[noteIndex]
      noteIndex = (noteIndex + 1) % melodyNotes.length
      melodySynth.triggerAttackRelease(note, '4n', time, 0.15)

      // Slow cosmic drone foundation every 2 steps
      if (droneSynth && stepCount % 2 === 0) {
        const droneNote = droneNotes[droneIndex]
        droneIndex = (droneIndex + 1) % droneNotes.length
        droneSynth.triggerAttackRelease(droneNote, '1m', time, 0.12)
      }
      stepCount++
    }, '2n')
  }
  transport.position = 0
  transport.start()
}

export function stopMelody() {
  if (!tone) return

  const transport = tone.getTransport()
  transport.stop()
  if (melodyEventId !== null) {
    transport.clear(melodyEventId)
    melodyEventId = null
  }
  transport.position = 0
  melodySynth?.triggerRelease(tone.now())
  droneSynth?.triggerRelease(tone.now())
  noteIndex = 0
  droneIndex = 0
  stepCount = 0
}
