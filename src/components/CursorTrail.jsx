import { useEffect, useRef } from 'react'

const SPARKLE_SPACING = 10
const MAX_SPARKLES = 36
const MAX_SPARKLES_PER_EVENT = 12

export default function CursorTrail() {
  const trailRef = useRef(null)

  useEffect(() => {
    const canvas = trailRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)')

    let frame = 0
    let width = 0
    let height = 0
    let lastPoint = null
    let distanceSinceSparkle = 0
    const sparkles = []

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const addSparkle = (x, y) => {
      sparkles.push({
        x,
        y,
        createdAt: window.performance.now(),
        lifetime: 360 + Math.random() * 180,
        size: 1.2 + Math.random() * 1.8,
        color: Math.random() > 0.82 ? '#f3a2c9' : '#76f0df',
        rays: Math.random() > 0.55,
      })

      if (sparkles.length > MAX_SPARKLES) {
        sparkles.splice(0, sparkles.length - MAX_SPARKLES)
      }
    }

    const animate = (now) => {
      frame = 0
      context.clearRect(0, 0, width, height)

      for (let index = sparkles.length - 1; index >= 0; index -= 1) {
        const sparkle = sparkles[index]
        const progress = (now - sparkle.createdAt) / sparkle.lifetime
        if (progress >= 1) {
          sparkles.splice(index, 1)
          continue
        }

        const fade = 1 - Math.max(0, progress)
        const pulse = 0.65 + Math.sin(Math.max(0, progress) * Math.PI) * 0.35
        const size = sparkle.size * (0.55 + fade * 0.45)

        context.globalAlpha = fade * pulse
        context.fillStyle = sparkle.color
        context.shadowColor = sparkle.color
        context.shadowBlur = size * 2.5
        context.beginPath()
        context.arc(sparkle.x, sparkle.y, size * 0.55, 0, Math.PI * 2)
        context.fill()

        if (sparkle.rays) {
          context.globalAlpha = fade * pulse * 0.65
          context.strokeStyle = '#e9fffb'
          context.lineWidth = 0.6
          context.beginPath()
          context.moveTo(sparkle.x - size * 1.8, sparkle.y)
          context.lineTo(sparkle.x + size * 1.8, sparkle.y)
          context.moveTo(sparkle.x, sparkle.y - size * 1.8)
          context.lineTo(sparkle.x, sparkle.y + size * 1.8)
          context.stroke()
        }
      }

      context.globalAlpha = 1
      context.shadowBlur = 0
      if (sparkles.length) frame = window.requestAnimationFrame(animate)
    }

    const requestFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(animate)
    }

    const resetPath = () => {
      lastPoint = null
      distanceSinceSparkle = 0
    }

    const motionAllowed = () => !prefersReducedMotion.matches && !coarsePointer.matches
    const stopTrail = () => {
      sparkles.length = 0
      resetPath()
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
      context.clearRect(0, 0, width, height)
      context.globalAlpha = 1
      context.shadowBlur = 0
    }

    const handleMotionPreferenceChange = () => {
      if (!motionAllowed()) stopTrail()
    }

    const handlePointerMove = (event) => {
      if (!motionAllowed() || event.pointerType === 'touch') {
        resetPath()
        return
      }

      const point = { x: event.clientX, y: event.clientY }
      if (!lastPoint) {
        lastPoint = point
        addSparkle(point.x, point.y)
        requestFrame()
        return
      }

      const deltaX = point.x - lastPoint.x
      const deltaY = point.y - lastPoint.y
      const distance = Math.hypot(deltaX, deltaY)
      const totalDistance = distanceSinceSparkle + distance
      const steps = Math.floor(totalDistance / SPARKLE_SPACING)
      const count = Math.min(steps, MAX_SPARKLES_PER_EVENT)
      const firstStep = SPARKLE_SPACING - distanceSinceSparkle
        + Math.max(0, steps - count) * SPARKLE_SPACING

      for (let index = 0; index < count; index += 1) {
        const distanceAlong = firstStep + index * SPARKLE_SPACING
        const progress = distance ? distanceAlong / distance : 0
        addSparkle(
          lastPoint.x + deltaX * progress,
          lastPoint.y + deltaY * progress,
        )
      }

      distanceSinceSparkle = totalDistance % SPARKLE_SPACING
      lastPoint = point
      if (count) requestFrame()
    }

    resizeCanvas()
    prefersReducedMotion.addEventListener('change', handleMotionPreferenceChange)
    coarsePointer.addEventListener('change', handleMotionPreferenceChange)
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', resetPath)

    return () => {
      prefersReducedMotion.removeEventListener('change', handleMotionPreferenceChange)
      coarsePointer.removeEventListener('change', handleMotionPreferenceChange)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', resetPath)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return <canvas className="cursor-trail" aria-hidden="true" ref={trailRef} />
}
