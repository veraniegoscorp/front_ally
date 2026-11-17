import { describe, expect, it, vi } from 'vitest'
import { persistDroppedBlock, toCalendarEvents, toDeadlineDate } from './calendar'

describe('calendar API mapping', () => {
  it('maps API goals and blocks to FullCalendar dates and technique classes', () => {
    const deadline = new Date(2026, 4, 17, 12).toISOString()
    const events = toCalendarEvents(
      [{ id: 5, title: 'Prueba', category: 2, deadline, status: 'active' }],
      [{
        id: 8,
        goal: 5,
        subtask: 9,
        starts_at: '2026-05-12T10:00:00Z',
        ends_at: '2026-05-12T10:50:00Z',
        status: 'scheduled',
      }],
      [{ id: 2, technique: 'pomodoro' }],
      [{ id: 9, title: 'Tema 1', goal: 5 }],
    )

    expect(events[0]).toMatchObject({
      id: 'goal-5',
      title: 'Entrega: Prueba',
      allDay: true,
      editable: false,
    })
    expect(events[1]).toMatchObject({
      id: '8',
      title: 'Prueba',
      start: '2026-05-12T10:00:00Z',
      classNames: ['study-block', 'study-block--pomodoro', 'study-block--scheduled'],
      extendedProps: { kind: 'block', subtaskTitle: 'Tema 1' },
    })
  })

  it('uses the viewer local date for an ISO deadline marker', () => {
    const deadline = new Date(2026, 0, 5, 23, 30).toISOString()
    const localDate = new Date(deadline)
    const start = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`

    expect(toDeadlineDate(deadline).start).toBe(start)
  })
})

describe('drag-and-drop block updates', () => {
  function makeInfo() {
    return {
      event: {
        id: '14',
        start: new Date('2026-05-12T10:00:00Z'),
        end: new Date('2026-05-12T10:50:00Z'),
        extendedProps: { kind: 'block' },
      },
      revert: vi.fn(),
    }
  }

  it('reverts the calendar event and reports a rejected server time', async () => {
    const info = makeInfo()
    const onError = vi.fn()
    const onSaved = vi.fn()
    const updateBlock = vi.fn().mockRejectedValue({ status: 400, message: 'Horario no disponible' })

    await persistDroppedBlock(info, { updateBlock, onError, onSaved })

    expect(updateBlock).toHaveBeenCalledWith('14', {
      starts_at: '2026-05-12T10:00:00.000Z',
      ends_at: '2026-05-12T10:50:00.000Z',
    })
    expect(info.revert).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('keeps a successful move and refreshes the API-backed calendar', async () => {
    const info = makeInfo()
    const onSaved = vi.fn()

    await persistDroppedBlock(info, {
      updateBlock: vi.fn().mockResolvedValue({ id: 14 }),
      onError: vi.fn(),
      onSaved,
    })

    expect(info.revert).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledOnce()
  })
})
