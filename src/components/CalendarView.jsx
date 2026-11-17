import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import esLocale from '@fullcalendar/core/locales/es'
import { api } from '../lib/api'
import { persistDroppedBlock, toCalendarEvents } from '../lib/calendar'

const techniqueNames = {
  pomodoro: 'Pomodoro',
  continuous: 'Continua',
  milestones: 'Por hitos',
}

const statusNames = {
  scheduled: 'Programado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export default function CalendarView({ data, onRefresh, onError }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const events = useMemo(
    () => toCalendarEvents(data.goals, data.blocks, data.categories, data.subtasks),
    [data.goals, data.blocks, data.categories, data.subtasks],
  )
  const selectedBlock = data.blocks.find((block) => String(block.id) === selectedBlockId)
  const selectedGoal = selectedBlock
    ? data.goals.find((goal) => String(goal.id) === String(selectedBlock.goal))
    : null
  const selectedCategory = selectedGoal
    ? data.categories.find((category) => String(category.id) === String(selectedGoal.category))
    : null
  const selectedSubtask = selectedBlock?.subtask
    ? data.subtasks.find((subtask) => String(subtask.id) === String(selectedBlock.subtask))
    : null

  async function handleDrop(info) {
    await persistDroppedBlock(info, {
      updateBlock: (id, payload) => api.update('blocks', id, payload),
      onError,
      onSaved: onRefresh,
    })
  }

  async function moveSelectedBlock(minutes) {
    if (!selectedBlock || selectedBlock.status !== 'scheduled') return
    const start = new Date(selectedBlock.starts_at)
    const end = new Date(selectedBlock.ends_at)
    const shift = minutes * 60_000
    try {
      await api.update('blocks', selectedBlock.id, {
        starts_at: new Date(start.getTime() + shift).toISOString(),
        ends_at: new Date(end.getTime() + shift).toISOString(),
      })
      await onRefresh()
    } catch (error) {
      onError(error)
    }
  }

  function selectBlock(event) {
    if (event.extendedProps.kind === 'block') setSelectedBlockId(event.id)
  }

  function renderEvent(info) {
    if (info.event.extendedProps.kind === 'goal') {
      return <span className="deadline-event-label">Fecha límite · {info.event.title.replace('Entrega: ', '')}</span>
    }
    const { technique, status, subtaskTitle } = info.event.extendedProps
    return (
      <span className="event-copy">
        <strong>{info.event.title}</strong>
        <span>
          {techniqueNames[technique] || 'Estudio'}
          {subtaskTitle ? ` · ${subtaskTitle}` : ''}
          {status !== 'scheduled' ? ` · ${statusNames[status] || status}` : ''}
        </span>
      </span>
    )
  }

  return (
    <section className="calendar-layout" aria-label="Agenda semanal">
      <div className="calendar-main">
        <div className="calendar-heading">
          <div>
            <h2>Una semana a la vez.</h2>
          </div>
          <p>Selecciona un bloque para ver sus detalles y moverlo sin arrastrar.</p>
        </div>
        <div className="calendar-frame">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={esLocale}
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: 'Hoy', week: 'Semana', day: 'Día' }}
            events={events}
            height="680px"
            allDaySlot
            nowIndicator
            editable
            eventStartEditable
            eventDurationEditable={false}
            snapDuration="00:15:00"
            eventDrop={handleDrop}
            eventClick={(info) => selectBlock(info.event)}
            eventContent={renderEvent}
            eventDidMount={(info) => {
              info.el.setAttribute('aria-label', info.event.title)
              if (info.event.extendedProps.kind !== 'block') return

              info.el.setAttribute('role', 'button')
              info.el.setAttribute('tabindex', '0')
              info.el.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  selectBlock(info.event)
                }
              })
            }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          />
        </div>
        <div className="technique-legend" aria-label="Técnicas de estudio">
          <span><i className="legend-dot legend-dot--pomodoro" />Pomodoro · slime</span>
          <span><i className="legend-dot legend-dot--continuous" />Continua · roca</span>
          <span><i className="legend-dot legend-dot--milestones" />Hitos · cristal</span>
        </div>
      </div>

      <aside className="calendar-aside" aria-label="Detalles de la semana">
        {selectedBlock ? (
          <section className="selected-block">
            <h3>{selectedGoal?.title || 'Bloque de estudio'}</h3>
            {selectedSubtask && <p>{selectedSubtask.title}</p>}
            <dl>
              <div>
                <dt>Técnica</dt>
                <dd>{techniqueNames[selectedCategory?.technique] || 'Estudio'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{statusNames[selectedBlock.status] || selectedBlock.status}</dd>
              </div>
              <div>
                <dt>Horario</dt>
                <dd>
                  {new Date(selectedBlock.starts_at).toLocaleString('es', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(selectedBlock.ends_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </dd>
              </div>
            </dl>
            {selectedBlock.status === 'scheduled' && (
              <div className="move-controls">
                <p>Mover 30 minutos</p>
                <button className="button button-quiet" type="button" onClick={() => moveSelectedBlock(-30)}>
                  Antes
                </button>
                <button className="button button-quiet" type="button" onClick={() => moveSelectedBlock(30)}>
                  Después
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="selected-block selected-block-empty">
            <h3>El plan lo marca tu disponibilidad.</h3>
            <p>Selecciona un bloque del calendario para consultar su horario o moverlo con los controles.</p>
            <span className="current-line" aria-hidden="true" />
          </section>
        )}

        <section className="upcoming-goals">
          <h3 className="section-label">Fechas límite</h3>
          {data.goals.length === 0 ? (
            <p>Añade una meta y aparecerá aquí.</p>
          ) : (
            <ul>
              {data.goals
                .filter((goal) => goal.status === 'active')
                .slice(0, 4)
                .map((goal) => (
                  <li key={goal.id}>
                    <strong>{goal.title}</strong>
                    <span>{new Date(goal.deadline).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <p className="calendar-note">
          Si un horario no está disponible, Ally mostrará la validación del servidor y mantendrá el bloque en su lugar.
        </p>
      </aside>
    </section>
  )
}
