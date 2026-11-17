import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Tone from 'tone'
import { activateAudio, playButtonSound, startMelody, stopMelody } from './sound'

const { createdSynths, transport } = vi.hoisted(() => ({
  createdSynths: [],
  transport: {
    bpm: { value: 120 },
    position: 0,
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
    scheduleRepeat: vi.fn(() => 7),
  },
}))

vi.mock('tone', () => ({
  start: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 1),
  getContext: vi.fn(() => ({ state: 'running' })),
  getTransport: vi.fn(() => transport),
  Synth: vi.fn(function createSynth() {
    const synth = {
      toDestination: vi.fn(),
      connect: vi.fn(),
      triggerAttackRelease: vi.fn(),
      triggerRelease: vi.fn(),
    }
    synth.toDestination.mockReturnValue(synth)
    synth.connect.mockReturnValue(synth)
    createdSynths.push(synth)
    return synth
  }),
  Reverb: vi.fn(function createReverb() {
    const reverb = {
      ready: Promise.resolve(),
      toDestination: vi.fn(),
      connect: vi.fn(),
    }
    reverb.connect.mockReturnValue(reverb)
    reverb.toDestination.mockReturnValue(reverb)
    return reverb
  }),
  FeedbackDelay: vi.fn(function createFeedbackDelay() {
    const delay = {
      connect: vi.fn(),
      toDestination: vi.fn(),
    }
    delay.connect.mockReturnValue(delay)
    return delay
  }),
  Filter: vi.fn(function createFilter() {
    const filter = {
      connect: vi.fn(),
      toDestination: vi.fn(),
    }
    filter.connect.mockReturnValue(filter)
    filter.toDestination.mockReturnValue(filter)
    return filter
  }),
}))

describe('local sound effects', () => {
  beforeEach(() => {
    createdSynths.length = 0
    transport.bpm.value = 120
    transport.position = 0
    transport.start.mockClear()
    transport.stop.mockClear()
    transport.clear.mockClear()
    transport.scheduleRepeat.mockClear()
  })

  it('starts a gentle loop and stops scheduling it when disabled', async () => {
    await activateAudio()
    startMelody()

    expect(Tone.start).toHaveBeenCalledOnce()
    expect(transport.bpm.value).toBe(48)
    expect(transport.scheduleRepeat).toHaveBeenCalledOnce()

    const [playNote] = transport.scheduleRepeat.mock.calls[0]
    playNote(2)
    expect(createdSynths[1].triggerAttackRelease).toHaveBeenCalledWith('D4', '4n', 2, 0.15)
    expect(createdSynths[2].triggerAttackRelease).toHaveBeenCalledWith('D2', '1m', 2, 0.12)

    playButtonSound()
    expect(createdSynths[0].triggerAttackRelease).toHaveBeenCalledWith('A5', '32n', 1, 0.12)

    stopMelody()
    expect(transport.stop).toHaveBeenCalledOnce()
    expect(transport.clear).toHaveBeenCalledWith(7)
  })
})
