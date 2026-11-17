import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanningAssistant from './PlanningAssistant'
import { api, getErrorMessages } from '../lib/api'
import { interpretGoal, isWebGPUSupported, loadLocalModel } from '../lib/localAssistant'

vi.mock('../lib/api', () => ({
  api: {
    create: vi.fn(),
    scheduleGoal: vi.fn(),
  },
  getErrorMessages: vi.fn((error) => [error.message]),
}))

vi.mock('../lib/localAssistant', () => ({
  interpretGoal: vi.fn(),
  isWebGPUSupported: vi.fn(),
  loadLocalModel: vi.fn(),
  deadlineToISOString: (date, time) => new Date(`${date}T${time}`).toISOString(),
}))

const categories = [{ id: 7, name: 'Estudio', technique: 'pomodoro' }]
const proposal = {
  title: 'Preparar prueba',
  description: 'Examen de historia',
  deadlineDate: '2026-11-24',
  deadlineTime: null,
  studyMinutes: 240,
  clarification: '¿A qué hora es la prueba?',
}

function renderAssistant(overrides = {}) {
  return render(
    <PlanningAssistant
      categories={categories}
      onClose={vi.fn()}
      onRefresh={vi.fn().mockResolvedValue(true)}
      onSuccess={vi.fn()}
      onManageCategories={vi.fn()}
      {...overrides}
    />,
  )
}

async function prepareProposal(user) {
  await user.click(screen.getByRole('button', { name: 'Cargar modelo local' }))
  await screen.findByLabelText('¿Qué quieres planificar?')
  await user.type(
    screen.getByLabelText('¿Qué quieres planificar?'),
    'Tengo una prueba el siguiente martes y necesito cuatro horas.',
  )
  await user.click(screen.getByRole('button', { name: 'Preparar propuesta' }))
  await screen.findByRole('heading', { name: 'Revisa la propuesta' })
}

describe('PlanningAssistant', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    isWebGPUSupported.mockReturnValue(true)
    loadLocalModel.mockResolvedValue({ engine: {}, dispose: vi.fn() })
    interpretGoal.mockResolvedValue(proposal)
  })

  it('requires a reviewed date, time, duration, and category before creating and scheduling a goal', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockResolvedValue(true)
    const onSuccess = vi.fn()
    api.create.mockResolvedValue({ id: 12, title: 'Preparar prueba' })
    api.scheduleGoal.mockResolvedValue([])
    renderAssistant({ onRefresh, onSuccess })

    await prepareProposal(user)
    expect(api.create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Hora del examen/límite')).toHaveValue('')

    await user.type(screen.getByLabelText('Hora del examen/límite'), '10:30')
    await user.click(screen.getByRole('button', { name: 'Crear meta y planificar' }))

    await waitFor(() => expect(api.scheduleGoal).toHaveBeenCalledWith(12))
    expect(api.create).toHaveBeenCalledWith('goals', {
      category: 7,
      title: 'Preparar prueba',
      description: 'Examen de historia',
      deadline: new Date('2026-11-24T10:30').toISOString(),
      minimum_study_minutes: 240,
      status: 'active',
    })
    expect(api.create.mock.invocationCallOrder[0]).toBeLessThan(api.scheduleGoal.mock.invocationCallOrder[0])
    expect(onRefresh).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith('Se creó el plan de “Preparar prueba”.')
  })

  it('retries scheduling a saved goal without creating a duplicate after a backend rejection', async () => {
    const user = userEvent.setup()
    api.create.mockResolvedValue({ id: 12, title: 'Preparar prueba' })
    api.scheduleGoal
      .mockRejectedValueOnce(new Error('No hay disponibilidad suficiente.'))
      .mockResolvedValueOnce([])
    getErrorMessages.mockReturnValue(['No hay disponibilidad suficiente.'])
    renderAssistant()

    await prepareProposal(user)
    await user.type(screen.getByLabelText('Hora del examen/límite'), '10:30')
    await user.click(screen.getByRole('button', { name: 'Crear meta y planificar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay disponibilidad suficiente.')

    await user.click(screen.getByRole('button', { name: 'Reintentar planificación' }))
    await waitFor(() => expect(api.scheduleGoal).toHaveBeenCalledTimes(2))
    expect(api.create).toHaveBeenCalledTimes(1)
  })

  it('displays errors returned as strings by the WebLLM worker', async () => {
    const user = userEvent.setup()
    interpretGoal.mockRejectedValue('Error: WebGPU device lost during generation')
    renderAssistant()

    await user.click(screen.getByRole('button', { name: 'Cargar modelo local' }))
    await screen.findByLabelText('¿Qué quieres planificar?')
    await user.type(screen.getByLabelText('¿Qué quieres planificar?'), 'Una prueba el martes')
    await user.click(screen.getByRole('button', { name: 'Preparar propuesta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('WebGPU device lost during generation')
    expect(screen.queryByText('No se pudo completar la solicitud.')).not.toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('keeps the normal goal form as the fallback when WebGPU is unavailable', () => {
    isWebGPUSupported.mockReturnValue(false)
    renderAssistant()

    expect(screen.getByRole('alert')).toHaveTextContent('no ofrece WebGPU')
    expect(screen.queryByRole('button', { name: 'Cargar modelo local' })).not.toBeInTheDocument()
  })
})
