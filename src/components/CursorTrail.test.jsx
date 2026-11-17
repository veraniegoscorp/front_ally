import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import CursorTrail from './CursorTrail'

let frames
let drawingContext
let mediaQueries

function movePointer(pointerType, x, y) {
  const event = new Event('pointermove')
  Object.defineProperties(event, {
    pointerType: { value: pointerType },
    clientX: { value: x },
    clientY: { value: y },
  })
  window.dispatchEvent(event)
}

function createMediaQuery(matches) {
  const listeners = new Set()
  return {
    matches,
    addEventListener: vi.fn((_, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_, listener) => listeners.delete(listener)),
    dispatchChange() {
      listeners.forEach((listener) => listener({ matches: this.matches }))
    },
  }
}

describe('CursorTrail', () => {
  beforeEach(() => {
    frames = []
    drawingContext = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
    }
    mediaQueries = {
      '(prefers-reduced-motion: reduce)': createMediaQuery(false),
      '(hover: none), (pointer: coarse)': createMediaQuery(false),
    }

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawingContext)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      frames.push(callback)
      return frames.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', vi.fn((query) => mediaQueries[query]))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('leaves sparkles along the mouse path', () => {
    render(<CursorTrail />)
    movePointer('mouse', 20, 30)
    movePointer('mouse', 50, 30)

    frames.shift()(window.performance.now() + 16)

    expect(drawingContext.arc).toHaveBeenCalledTimes(4)
    expect(drawingContext.clearRect).toHaveBeenCalled()
  })

  it('clears the trail when reduced motion is enabled', () => {
    render(<CursorTrail />)
    movePointer('mouse', 20, 30)

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    mediaQueries['(prefers-reduced-motion: reduce)'].matches = true
    mediaQueries['(prefers-reduced-motion: reduce)'].dispatchChange()

    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)
    expect(drawingContext.clearRect).toHaveBeenCalled()
    movePointer('mouse', 50, 30)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('does not draw for touch or reduced-motion users', () => {
    const { unmount } = render(<CursorTrail />)
    movePointer('touch', 20, 30)
    expect(requestAnimationFrame).not.toHaveBeenCalled()

    unmount()
    mediaQueries['(prefers-reduced-motion: reduce)'].matches = true
    render(<CursorTrail />)
    movePointer('mouse', 50, 30)

    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
