import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResourceManager from './ResourceManager'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  getErrorMessages: (error) => [error instanceof Error ? error.message : String(error)],
}))

describe('ResourceManager availability management', () => {
  const dummyData = {
    categories: [],
    availability: [],
    goals: [],
    subtasks: [],
    blocks: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('rejects availability when ends_at is earlier than starts_at', async () => {
    const user = userEvent.setup()
    render(
      <ResourceManager
        resource="availability"
        data={dummyData}
        onRefresh={vi.fn()}
        onSchedule={vi.fn()}
        onError={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Nueva franja' }))
    await user.type(screen.getByLabelText('Nombre de la franja'), 'tiempo_libre')

    // Change start to 15:00 and end to 10:00
    const startsAtInput = screen.getByLabelText('Desde')
    const endsAtInput = screen.getByLabelText('Hasta')
    await user.clear(startsAtInput)
    await user.type(startsAtInput, '15:04')
    await user.clear(endsAtInput)
    await user.type(endsAtInput, '10:00')

    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(
      await screen.findByText('La hora de fin (Hasta) debe ser posterior a la de inicio (Desde).')
    ).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('sends pure time strings and specific_date correctly to the API', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockResolvedValue()
    api.create.mockResolvedValue({ id: 1 })

    render(
      <ResourceManager
        resource="availability"
        data={dummyData}
        onRefresh={onRefresh}
        onSchedule={vi.fn()}
        onError={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Nueva franja' }))
    await user.type(screen.getByLabelText('Nombre de la franja'), 'tiempo_libre')

    // Clear weekday and set specific date
    await user.selectOptions(screen.getByLabelText('Día recurrente (elige día o fecha)'), '')
    const dateInput = screen.getByLabelText('Fecha puntual')
    await user.type(dateInput, '2026-11-24')

    // Valid hours: 10:00 to 15:04
    const startsAtInput = screen.getByLabelText('Desde')
    const endsAtInput = screen.getByLabelText('Hasta')
    await user.clear(startsAtInput)
    await user.type(startsAtInput, '10:00')
    await user.clear(endsAtInput)
    await user.type(endsAtInput, '15:04')

    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(api.create).toHaveBeenCalledWith('availability', {
      title: 'tiempo_libre',
      weekday: null,
      specific_date: '2026-11-24',
      starts_at: '10:00',
      ends_at: '15:04',
      is_available: true,
    })
    expect(onRefresh).toHaveBeenCalled()
  })
})
