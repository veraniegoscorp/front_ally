export function toDeadlineDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const start = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const end = [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-')
  return { start, end }
}

export function toCalendarEvents(goals, blocks, categories, subtasks = []) {
  const categoryById = new Map(categories.map((category) => [String(category.id), category]))
  const goalById = new Map(goals.map((goal) => [String(goal.id), goal]))
  const subtaskById = new Map(subtasks.map((subtask) => [String(subtask.id), subtask]))

  const deadlineEvents = goals.flatMap((goal) => {
    const date = toDeadlineDate(goal.deadline)
    if (!date) return []
    return [{
      id: `goal-${goal.id}`,
      title: `Entrega: ${goal.title}`,
      start: date.start,
      end: date.end,
      allDay: true,
      editable: false,
      classNames: ['goal-deadline'],
      extendedProps: { kind: 'goal', goalId: goal.id, status: goal.status },
    }]
  })

  const blockEvents = blocks.map((block) => {
    const goal = goalById.get(String(block.goal))
    const category = goal && categoryById.get(String(goal.category))
    const subtask = block.subtask && subtaskById.get(String(block.subtask))
    return {
      id: String(block.id),
      title: goal?.title || 'Bloque de estudio',
      start: block.starts_at,
      end: block.ends_at,
      editable: block.status === 'scheduled',
      startEditable: block.status === 'scheduled',
      durationEditable: false,
      classNames: [
        'study-block',
        `study-block--${category?.technique || 'continuous'}`,
        `study-block--${block.status}`,
      ],
      extendedProps: {
        kind: 'block',
        goalId: block.goal,
        subtaskId: block.subtask,
        subtaskTitle: subtask?.title || '',
        technique: category?.technique || 'continuous',
        status: block.status,
      },
    }
  })

  return [...deadlineEvents, ...blockEvents]
}

export async function persistDroppedBlock(info, { updateBlock, onError, onSaved }) {
  const { event } = info
  if (event.extendedProps.kind !== 'block' || !event.start || !event.end) {
    info.revert()
    return
  }

  try {
    await updateBlock(event.id, {
      starts_at: event.start.toISOString(),
      ends_at: event.end.toISOString(),
    })
  } catch (error) {
    info.revert()
    onError(error)
    return
  }

  onSaved()
}
