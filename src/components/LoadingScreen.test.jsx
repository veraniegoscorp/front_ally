import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

describe('LoadingScreen', () => {
  it('renders status message and submessage with accessible role', () => {
    render(
      <LoadingScreen
        message="Preparando tus semanas de estudio…"
        submessage="Conectando con tu agenda"
        fullScreen
      />,
    )

    const statusRegion = screen.getByRole('status')
    expect(statusRegion).toBeInTheDocument()
    expect(screen.getByText('Preparando tus semanas de estudio…')).toBeInTheDocument()
    expect(screen.getByText('Conectando con tu agenda')).toBeInTheDocument()
    expect(statusRegion).toHaveClass('is-fullscreen')
  })
})
