import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CalendarView from './CalendarView'

vi.mock('../lib/api', () => ({ api: { update: vi.fn() } }))
vi.mock('@fullcalendar/react', () => ({
  default: ({ events, eventDidMount }) => {
    const block = events.find((event) => event.extendedProps.kind === 'block')
    let onKeyDown
    eventDidMount({
      event: block,
      el: {
        setAttribute: vi.fn(),
        addEventListener: (_name, listener) => {
          onKeyDown = listener
        },
      },
    })

    return (
      <button type="button" aria-label={block.title} onKeyDown={(event) => onKeyDown(event)}>
        {block.title}
      </button>
    )
  },
}))

describe('weekly calendar accessibility', () => {
  it('lets keyboard users select a study block before moving it', async () => {
    const user = userEvent.setup()
    const start = new Date()
    start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 50 * 60_000)
    const data = {
      categories: [{ id: 2, name: 'Ciencias', technique: 'pomodoro' }],
      goals: [{ id: 3, title: 'Examen de ciencias', category: 2, deadline: end.toISOString(), status: 'active' }],
      subtasks: [],
      blocks: [{ id: 4, goal: 3, subtask: null, starts_at: start.toISOString(), ends_at: end.toISOString(), status: 'scheduled' }],
    }

    render(<CalendarView data={data} onRefresh={vi.fn()} onError={vi.fn()} />)
    await user.keyboard('{Tab}')
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'Examen de ciencias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Antes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Después' })).toBeInTheDocument()
  })
})
