import { describe, expect, it, vi } from 'vitest'
import {
  deadlineToISOString,
  interpretGoal,
  parseGoalProposal,
  resolveRelativeWeekday,
} from './localAssistant'

describe('local planning assistant', () => {
  it('parses a structured goal proposal without inventing a deadline time', () => {
    expect(parseGoalProposal(JSON.stringify({
      title: 'Preparar prueba',
      description: '',
      deadline_date: '2026-11-24',
      deadline_time: '',
      study_minutes: 240,
      clarification: '¿A qué hora es la prueba?',
    }))).toEqual({
      title: 'Preparar prueba',
      description: '',
      deadlineDate: '2026-11-24',
      deadlineTime: null,
      studyMinutes: 240,
      clarification: '¿A qué hora es la prueba?',
    })
  })

  it('rejects invalid dates, times, and durations from the model', () => {
    expect(() => parseGoalProposal('not json')).toThrow('JSON válido')
    expect(() => parseGoalProposal(JSON.stringify({
      deadline_date: '2026-02-30',
    }))).toThrow('fecha inexistente')
    expect(() => parseGoalProposal(JSON.stringify({
      deadline_time: '25:30',
    }))).toThrow('hora con formato inválido')
    expect(() => parseGoalProposal(JSON.stringify({
      study_minutes: -10,
    }))).toThrow('duración propuesta no es válida')
    expect(parseGoalProposal(JSON.stringify({ study_minutes: 0 })).studyMinutes).toBeNull()
  })

  it('converts an explicitly reviewed local date and time to an ISO deadline', () => {
    expect(deadlineToISOString('2026-11-24', '10:30'))
      .toBe(new Date(2026, 10, 24, 10, 30).toISOString())
    expect(() => deadlineToISOString('2026-11-24', '')).toThrow('fecha y la hora límite')
  })

  it('resolves a relative weekday locally, including the next-week year boundary', () => {
    expect(resolveRelativeWeekday('el siguiente martes', new Date(2026, 10, 17)))
      .toBe('2026-11-24')
    expect(resolveRelativeWeekday('el siguiente martes', new Date(2026, 11, 29)))
      .toBe('2027-01-05')
    expect(resolveRelativeWeekday('martes o miércoles', new Date(2026, 10, 17)))
      .toBeNull()
  })

  it('provides local date context and a schema for constrained JSON output', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: '{"title":"Prueba","description":"","deadline_date":"2026-11-18","deadline_time":"","study_minutes":240,"clarification":""}',
        },
      }],
    })
    const engine = { chat: { completions: { create } } }
    const now = new Date(2026, 10, 17, 12, 0)

    const proposal = await interpretGoal(engine, 'Prueba el siguiente martes, cuatro horas', now)

    const request = create.mock.calls[0][0]
    expect(proposal.deadlineDate).toBe('2026-11-24')
    expect(request.response_format.type).toBe('json_object')
    expect(typeof request.response_format.schema).toBe('string')
    expect(JSON.parse(request.response_format.schema).required).toContain('deadline_time')
    expect(JSON.parse(request.messages[1].content)).toMatchObject({
      request: 'Prueba el siguiente martes, cuatro horas',
      local_date: '2026-11-17',
    })
    expect(request.messages[0].content).toContain('No propongas horarios')
  })
})
