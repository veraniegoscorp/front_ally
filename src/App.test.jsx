import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import ResourceManager from './components/ResourceManager'
import { api, getErrorMessages, getSession } from './lib/api'
import { activateAudio, playButtonSound, startMelody, stopMelody } from './lib/sound'

vi.mock('./lib/api', () => ({
  api: {
    register: vi.fn(),
    login: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    scheduleGoal: vi.fn(),
  },
  clearSession: vi.fn(),
  getErrorMessages: vi.fn((error) => [error.message]),
  getSession: vi.fn(),
}))

vi.mock('./lib/sound', () => ({
  activateAudio: vi.fn(),
  playButtonSound: vi.fn(),
  preloadAudio: vi.fn(() => Promise.resolve()),
  startMelody: vi.fn(),
  stopMelody: vi.fn(),
}))

const emptyData = {
  categories: [],
  availability: [],
  goals: [],
  subtasks: [],
  blocks: [],
}

let canvasContextSpy

describe('Ally sign-in flow', () => {
  beforeEach(() => {
    window.location.hash = ''
    localStorage.clear()
    canvasContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    getSession.mockReturnValue(null)
    activateAudio.mockReset().mockResolvedValue()
    playButtonSound.mockClear()
    startMelody.mockClear()
    stopMelody.mockClear()
    api.list.mockResolvedValue([])
    api.register.mockReset()
    api.login.mockReset()
  })

  afterEach(() => {
    cleanup()
    canvasContextSpy.mockRestore()
  })

  it('registers a user, signs in, and opens the personal calendar', async () => {
    const user = userEvent.setup()
    api.register.mockResolvedValue({ id: 1 })
    api.login.mockImplementation(async () => {
      getSession.mockReturnValue({ access: 'access', refresh: 'refresh' })
      window.dispatchEvent(new Event('ally:session-change'))
      return { access: 'access', refresh: 'refresh' }
    })

    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Crear mi agenda' })[0])
    await user.type(screen.getByLabelText('Usuario'), 'estudiante')
    await user.type(screen.getByLabelText('Correo electrónico'), 'estudiante@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secure-password')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(api.register).toHaveBeenCalledWith({
      username: 'estudiante',
      email: 'estudiante@example.com',
      password: 'secure-password',
    })
    expect(api.login).toHaveBeenCalledWith({
      username: 'estudiante',
      password: 'secure-password',
    })
    expect(await screen.findByRole('heading', { name: 'Tu calendario' })).toBeInTheDocument()
  })

  it('requires accepting terms and conditions to create an account and lets users read the clauses', async () => {
    const user = userEvent.setup()
    api.register.mockResolvedValue({ id: 1 })
    api.login.mockResolvedValue({ access: 'access', refresh: 'refresh' })

    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Crear mi agenda' })[0])

    // Verify terms block and summary are present
    expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument()
    expect(screen.getByText(/Ally protege la privacidad de tu estudio/)).toBeInTheDocument()

    // Expand clauses
    await user.click(screen.getByRole('button', { name: 'Leer cláusulas' }))
    expect(screen.getByText('1. Propósito y uso del servicio')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ocultar detalles' }))
    expect(screen.queryByText('1. Propósito y uso del servicio')).not.toBeInTheDocument()

    // Fill form fields
    await user.type(screen.getByLabelText('Usuario'), 'nuevo_estudiante')
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secure-pass-123')

    // Uncheck terms
    const termsCheckbox = screen.getByLabelText(/Acepto los Términos y Condiciones/)
    await user.click(termsCheckbox)
    expect(termsCheckbox).not.toBeChecked()

    // Try submitting without accepting terms
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(api.register).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent('Debes aceptar los Términos y Condiciones para crear tu cuenta.')

    // Check terms and submit
    await user.click(termsCheckbox)
    expect(termsCheckbox).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(api.register).toHaveBeenCalledWith({
      username: 'nuevo_estudiante',
      email: 'nuevo@example.com',
      password: 'secure-pass-123',
    })
  })

  it('shows the first-visit tutorial and lets the user reopen it from the help button', async () => {
    const user = userEvent.setup()
    getSession.mockReturnValue({ access: 'access', refresh: 'refresh' })
    window.location.hash = '#calendar'

    render(<App />)

    expect(await screen.findByRole('dialog', { name: 'Cómo empezar con Ally' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('heading', { name: 'Indica cuándo puedes estudiar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText(/La marca de fecha límite no es un bloque de estudio/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terminar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('ally.tutorial-seen')).toBe('true')
    expect(screen.getByRole('status', { name: 'Consejo del tutorial' })).toHaveTextContent('El signo «?»')
    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('status', { name: 'Consejo del tutorial' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Volver a ver el tutorial de Ally' }))
    expect(localStorage.getItem('ally.tutorial-hint-seen')).toBe('true')
    const tutorial = screen.getByRole('dialog', { name: 'Cómo empezar con Ally' })
    expect(tutorial).toBeInTheDocument()
    fireEvent.keyDown(tutorial, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('only activates the music and button sounds after the user opts in', async () => {
    const user = userEvent.setup()
    render(<App />)

    const soundButton = screen.getByRole('button', { name: 'Activar música y sonidos de botones' })
    expect(soundButton).toHaveAttribute('aria-pressed', 'false')
    expect(activateAudio).not.toHaveBeenCalled()

    await user.click(soundButton)
    await waitFor(() => expect(activateAudio).toHaveBeenCalledOnce())
    await waitFor(() => expect(startMelody).toHaveBeenCalled())

    await user.click(screen.getAllByRole('button', { name: 'Crear mi agenda' })[0])
    expect(playButtonSound).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Desactivar música y sonidos de botones' }))
    await waitFor(() => expect(stopMelody).toHaveBeenCalled())
  })

  it('keeps the ambient space music playing across the entire page when navigating', async () => {
    const user = userEvent.setup()
    render(<App />)

    const soundButton = screen.getByRole('button', { name: 'Activar música y sonidos de botones' })
    await user.click(soundButton)
    await waitFor(() => expect(startMelody).toHaveBeenCalled())

    stopMelody.mockClear()

    // Navigate from home to register screen
    await user.click(screen.getAllByRole('button', { name: 'Crear mi agenda' })[0])
    expect(screen.getByRole('heading', { name: 'Empieza por una meta.' })).toBeInTheDocument()

    // Navigating should not have stopped the melody
    expect(stopMelody).not.toHaveBeenCalled()
  })

  it('shows field validation returned by the API in a resource form', async () => {
    const user = userEvent.setup()
    api.create.mockRejectedValue(new Error('name: Ya existe una categoría con este nombre.'))
    getErrorMessages.mockReturnValue(['name: Ya existe una categoría con este nombre.'])

    render(
      <ResourceManager
        resource="categories"
        data={emptyData}
        onRefresh={vi.fn()}
        onSchedule={vi.fn()}
        onError={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await user.type(screen.getByLabelText('Nombre'), 'Historia')
    await user.click(screen.getByRole('button', { name: 'Crear', exact: true }))

    expect(await screen.findByRole('alert')).toHaveTextContent('name: Ya existe una categoría con este nombre.')
  })

  it('requests schedule generation from the goal action', async () => {
    const onSchedule = vi.fn()
    render(
      <ResourceManager
        resource="goals"
        data={{ ...emptyData, goals: [{ id: 5, title: 'Prueba', category: 2, deadline: '2026-12-01T10:00:00Z', status: 'active' }] }}
        onRefresh={vi.fn()}
        onSchedule={onSchedule}
        onError={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generar plan' }))
    await waitFor(() => expect(onSchedule).toHaveBeenCalledWith(expect.objectContaining({ id: 5 })))
  })
})
