import { useState } from 'react'
import { api, getErrorMessages } from '../lib/api'

const weekdays = [
  ['0', 'Lunes'],
  ['1', 'Martes'],
  ['2', 'Miércoles'],
  ['3', 'Jueves'],
  ['4', 'Viernes'],
  ['5', 'Sábado'],
  ['6', 'Domingo'],
]

const statuses = {
  goals: [
    ['active', 'Activa'],
    ['completed', 'Completada'],
    ['cancelled', 'Cancelada'],
  ],
  blocks: [
    ['scheduled', 'Programado'],
    ['completed', 'Completado'],
    ['cancelled', 'Cancelado'],
  ],
}

const resourceMeta = {
  categories: { title: 'Categorías', add: 'Nueva categoría' },
  availability: { title: 'Disponibilidad', add: 'Nueva franja' },
  goals: { title: 'Metas', add: 'Nueva meta' },
  subtasks: { title: 'Subtareas', add: 'Nueva subtarea' },
  blocks: { title: 'Bloques', add: 'Nuevo bloque' },
}

function fieldsFor(resource, data, values) {
  const goalOptions = data.goals.map((goal) => [String(goal.id), goal.title])
  const categoryOptions = data.categories.map((category) => [String(category.id), category.name])
  const subtaskOptions = data.subtasks
    .filter((subtask) => String(subtask.goal) === String(values.goal))
    .map((subtask) => [String(subtask.id), subtask.title])

  if (resource === 'categories') {
    return [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      {
        name: 'technique',
        label: 'Técnica',
        type: 'select',
        required: true,
        options: [
          ['pomodoro', 'Pomodoro'],
          ['continuous', 'Continua'],
          ['milestones', 'Por hitos'],
        ],
      },
      { name: 'session_minutes', label: 'Minutos por sesión', type: 'number', min: 1, required: true },
      { name: 'minimum_session_minutes', label: 'Sesión mínima (min)', type: 'number', min: 1, required: true },
      { name: 'break_minutes', label: 'Descanso (min)', type: 'number', min: 0, required: true },
    ]
  }

  if (resource === 'availability') {
    return [
      { name: 'title', label: 'Nombre de la franja', type: 'text', required: true },
      {
        name: 'weekday',
        label: 'Día recurrente (elige día o fecha)',
        type: 'select',
        nullable: true,
        options: [['', 'Sin día recurrente'], ...weekdays],
      },
      { name: 'specific_date', label: 'Fecha puntual', type: 'date', nullable: true },
      { name: 'starts_at', label: 'Desde', type: 'time', required: true },
      { name: 'ends_at', label: 'Hasta', type: 'time', required: true },
      {
        name: 'is_available',
        label: 'Franja disponible',
        type: 'select',
        required: true,
        options: [['true', 'Disponible'], ['false', 'No disponible']],
      },
    ]
  }

  if (resource === 'goals') {
    return [
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: categoryOptions },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'deadline', label: 'Fecha límite', type: 'datetime-local', required: true },
      { name: 'minimum_study_minutes', label: 'Minutos mínimos de estudio', type: 'number', min: 1, required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: statuses.goals },
    ]
  }

  if (resource === 'subtasks') {
    return [
      { name: 'goal', label: 'Meta', type: 'select', required: true, options: goalOptions },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'position', label: 'Posición', type: 'number', min: 0, required: true },
      { name: 'is_completed', label: 'Completada', type: 'checkbox' },
    ]
  }

  return [
    { name: 'goal', label: 'Meta', type: 'select', required: true, options: goalOptions },
    { name: 'subtask', label: 'Subtarea (opcional)', type: 'select', nullable: true, options: [['', 'Sin subtarea'], ...subtaskOptions] },
    { name: 'starts_at', label: 'Inicio', type: 'datetime-local', required: true },
    { name: 'ends_at', label: 'Fin', type: 'datetime-local', required: true },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: statuses.blocks },
  ]
}

function initialValues(resource, data) {
  if (resource === 'categories') {
    return { name: '', technique: 'pomodoro', session_minutes: '50', minimum_session_minutes: '25', break_minutes: '5' }
  }
  if (resource === 'availability') {
    return { title: '', weekday: '0', specific_date: '', starts_at: '09:00', ends_at: '10:00', is_available: 'true' }
  }
  if (resource === 'goals') {
    return { category: data.categories[0] ? String(data.categories[0].id) : '', title: '', description: '', deadline: '', minimum_study_minutes: '60', status: 'active' }
  }
  if (resource === 'subtasks') {
    return { goal: data.goals[0] ? String(data.goals[0].id) : '', title: '', position: '0', is_completed: false }
  }
  return {
    goal: data.goals[0] ? String(data.goals[0].id) : '',
    subtask: '',
    starts_at: '',
    ends_at: '',
    status: 'scheduled',
  }
}

function toInputValues(resource, item) {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => {
    if (key === 'deadline' || key === 'starts_at' || key === 'ends_at') {
      const date = new Date(value)
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      return [key, Number.isNaN(date.getTime()) ? '' : local.toISOString().slice(0, 16)]
    }
    if (['weekday', 'specific_date', 'subtask'].includes(key) && value === null) return [key, '']
    if (['goal', 'category', 'weekday', 'subtask'].includes(key) && value !== null) return [key, String(value)]
    return [key, value]
  }))
}

function buildPayload(resource, values) {
  const payload = { ...values }
  for (const [key, value] of Object.entries(payload)) {
    if (['deadline', 'starts_at', 'ends_at'].includes(key) && value) {
      payload[key] = new Date(value).toISOString()
    } else if (['session_minutes', 'minimum_session_minutes', 'break_minutes', 'minimum_study_minutes', 'position'].includes(key)) {
      payload[key] = Number(value)
    } else if (['category', 'goal', 'subtask', 'weekday'].includes(key)) {
      payload[key] = value === '' ? null : Number(value)
    } else if (key === 'is_available') {
      payload[key] = value === true || value === 'true'
    } else if (['specific_date', 'subtask'].includes(key) && value === '') {
      payload[key] = null
    }
  }
  if (resource === 'availability' && payload.specific_date) {
    payload.weekday = null
  }
  if (resource === 'availability' && payload.weekday !== null) {
    payload.specific_date = null
  }
  return payload
}

function formatTime(value) {
  return value ? value.slice(0, 5) : ''
}

function itemSummary(resource, item, data) {
  if (resource === 'categories') {
    return `${item.technique} · ${item.session_minutes} min por sesión`
  }
  if (resource === 'availability') {
    const day = item.specific_date || weekdays.find(([value]) => Number(value) === item.weekday)?.[1] || 'Sin fecha'
    return `${day} · ${formatTime(item.starts_at)}–${formatTime(item.ends_at)} · ${item.is_available ? 'Disponible' : 'No disponible'}`
  }
  if (resource === 'goals') {
    const category = data.categories.find((entry) => String(entry.id) === String(item.category))
    return `${category?.name || 'Sin categoría'} · ${item.status} · ${new Date(item.deadline).toLocaleDateString('es')}`
  }
  if (resource === 'subtasks') {
    return `${item.is_completed ? 'Completada' : 'Pendiente'} · posición ${item.position}`
  }
  const goal = data.goals.find((entry) => String(entry.id) === String(item.goal))
  return `${goal?.title || 'Meta'} · ${formatTime(item.starts_at?.slice(11))}–${formatTime(item.ends_at?.slice(11))} · ${item.status}`
}

export default function ResourceManager({ resource, data, onRefresh, onSchedule, onError }) {
  const meta = resourceMeta[resource]
  const items = data[resource] || []
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [values, setValues] = useState(() => initialValues(resource, data))
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  function startCreate() {
    setEditing(null)
    setFormOpen(true)
    setValues(initialValues(resource, data))
    setErrors([])
  }

  function startEdit(item) {
    setEditing(item)
    setFormOpen(true)
    setValues(toInputValues(resource, item))
    setErrors([])
  }

  function changeField(name, value) {
    setValues((current) => {
      const updated = { ...current, [name]: value }
      if (resource === 'availability' && name === 'weekday' && value !== '') {
        updated.specific_date = ''
      }
      if (resource === 'availability' && name === 'specific_date' && value) {
        updated.weekday = ''
      }
      if (resource === 'blocks' && name === 'goal') {
        updated.subtask = ''
      }
      return updated
    })
    setErrors([])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setErrors([])
    try {
      const payload = buildPayload(resource, values)
      if (editing) {
        await api.update(resource, editing.id, payload)
      } else {
        await api.create(resource, payload)
      }
      setEditing(null)
      setFormOpen(false)
      setValues(initialValues(resource, data))
      await onRefresh()
    } catch (error) {
      setErrors(getErrorMessages(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Eliminar “${item.title || item.name}”?`)) return
    try {
      await api.remove(resource, item.id)
      await onRefresh()
    } catch (error) {
      onError(error)
    }
  }

  return (
    <section className="resource-manager" aria-labelledby="resource-title">
      <div className="resource-heading">
        <div>
          <h2 id="resource-title">{meta.title}</h2>
        </div>
        <button className="button button-primary" type="button" onClick={startCreate}>
          {meta.add}
        </button>
      </div>

      {formOpen ? (
        <form className="resource-form" onSubmit={handleSubmit}>
          <div className="resource-form-heading">
            <h3>{editing ? 'Editar elemento' : meta.add}</h3>
            <button type="button" className="button button-quiet" onClick={() => {
              setFormOpen(false)
              setErrors([])
            }}>
              Cancelar
            </button>
          </div>
          <div className="form-grid">
            {fieldsFor(resource, data, values).map((field) => (
              <label
                className={`field ${field.type === 'textarea' ? 'field-wide' : ''} ${field.type === 'checkbox' ? 'field-checkbox' : ''}`}
                htmlFor={`${resource}-${field.name}`}
                key={field.name}
              >
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    id={`${resource}-${field.name}`}
                    value={String(values[field.name] ?? '')}
                    onChange={(event) => changeField(field.name, event.target.value)}
                    required={field.required}
                  >
                    {field.options.length === 0 && <option value="">Crea primero un elemento relacionado</option>}
                    {field.options.map(([value, label]) => <option value={value} key={`${value}-${label}`}>{label}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={`${resource}-${field.name}`}
                    rows="3"
                    value={values[field.name] ?? ''}
                    onChange={(event) => changeField(field.name, event.target.value)}
                  />
                ) : field.type === 'checkbox' ? (
                  <input
                    id={`${resource}-${field.name}`}
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(event) => changeField(field.name, event.target.checked)}
                  />
                ) : (
                  <input
                    id={`${resource}-${field.name}`}
                    type={field.type}
                    min={field.min}
                    required={field.required}
                    value={values[field.name] ?? ''}
                    onChange={(event) => changeField(field.name, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          {errors.length > 0 && (
            <div className="form-errors" role="alert">
              <p>No se pudo guardar. Revisa la respuesta:</p>
              <ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
            </div>
          )}
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear'}
          </button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-orbit" aria-hidden="true" />
          <h3>Aún no hay {meta.title.toLocaleLowerCase('es')}.</h3>
          <p>Cuando añadas uno, aparecerá aquí y podrás seguir organizando tu semana.</p>
        </div>
      ) : (
        <ul className="resource-list">
          {items.map((item) => {
            const title = item.title || item.name
            return (
              <li className="resource-row" key={item.id}>
                <div className="resource-row-copy">
                  <h3>{title}</h3>
                  <p>{itemSummary(resource, item, data)}</p>
                </div>
                <div className="resource-row-actions">
                  {resource === 'goals' && (
                    <button className="button button-quiet" type="button" onClick={() => onSchedule(item)}>
                      {data.blocks.some((block) => String(block.goal) === String(item.id) && block.status === 'scheduled')
                        ? 'Recalcular plan'
                        : 'Generar plan'}
                    </button>
                  )}
                  <button className="button button-quiet" type="button" onClick={() => startEdit(item)}>
                    Editar
                  </button>
                  <button className="button button-danger-quiet" type="button" onClick={() => handleDelete(item)}>
                    Eliminar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
