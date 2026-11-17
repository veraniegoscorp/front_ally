import { useEffect, useRef, useState } from 'react'
import { api, getErrorMessages } from '../lib/api'
import { interpretGoal, isWebGPUSupported, loadLocalModel, deadlineToISOString } from '../lib/localAssistant'

function errorText(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message
  }
  return 'No se pudo completar la solicitud.'
}

export default function PlanningAssistant({ categories, onClose, onRefresh, onSuccess, onManageCategories }) {
  const panelRef = useRef(null)
  const promptRef = useRef(null)
  const modelHandleRef = useRef(null)
  const mountedRef = useRef(false)
  const [webGpuAvailable] = useState(isWebGPUSupported)
  const [modelState, setModelState] = useState('idle')
  const [modelProgress, setModelProgress] = useState(0)
  const [progressText, setProgressText] = useState('Preparando el modelo local…')
  const [modelError, setModelError] = useState('')
  const [engine, setEngine] = useState(null)
  const [requestText, setRequestText] = useState('')
  const [draft, setDraft] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [interpretError, setInterpretError] = useState('')
  const [apiErrors, setApiErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [createdGoal, setCreatedGoal] = useState(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    mountedRef.current = true
    panelRef.current?.focus()

    return () => {
      mountedRef.current = false
      modelHandleRef.current?.dispose()
      previousFocus?.focus?.()
    }
  }, [])

  async function handleLoadModel() {
    setModelState('loading')
    setModelError('')
    try {
      const handle = await loadLocalModel((report) => {
        if (!mountedRef.current) return
        if (typeof report?.progress === 'number' && Number.isFinite(report.progress)) {
          setModelProgress(Math.max(0, Math.min(1, report.progress)))
        }
        if (typeof report?.text === 'string') setProgressText(report.text)
      })
      if (!mountedRef.current) {
        handle.dispose()
        return
      }
      modelHandleRef.current = handle
      setEngine(handle.engine)
      setModelState('ready')
    } catch (error) {
      if (!mountedRef.current) return
      setModelError(errorText(error))
      setModelState('idle')
    }
  }

  async function handleInterpret(event) {
    event.preventDefault()
    if (!engine || !requestText.trim()) return
    setBusy(true)
    setInterpretError('')
    setApiErrors([])
    setDraft(null)
    try {
      const result = await interpretGoal(engine, requestText.trim())
      setDraft(result)
      setCategoryId(categories.length === 1 ? String(categories[0].id) : '')
    } catch (error) {
      setInterpretError(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setApiErrors([])
  }

  async function handleCreateOrSchedule(event) {
    event.preventDefault()
    if (!draft || busy) return
    setBusy(true)
    setApiErrors([])

    let goal = createdGoal
    if (!goal) {
      try {
        goal = await api.create('goals', {
          category: Number(categoryId),
          title: draft.title.trim(),
          description: draft.description,
          deadline: deadlineToISOString(draft.deadlineDate, draft.deadlineTime),
          minimum_study_minutes: Number(draft.studyMinutes),
          status: 'active',
        })
        setCreatedGoal(goal)
      } catch (error) {
        setApiErrors(getErrorMessages(error))
        setBusy(false)
        return
      }
    }

    try {
      await api.scheduleGoal(goal.id)
    } catch (error) {
      setApiErrors(getErrorMessages(error))
      await onRefresh()
      setBusy(false)
      return
    }

    await onRefresh()
    onSuccess(`Se creó el plan de “${goal.title}”.`)
    onClose()
  }

  function handlePanelKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = panelRef.current?.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href]',
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const hasCategories = categories.length > 0
  const canCreate = Boolean(
    draft?.title?.trim() &&
    draft.deadlineDate &&
    draft.deadlineTime &&
    Number.isSafeInteger(Number(draft.studyMinutes)) &&
    Number(draft.studyMinutes) > 0 &&
    categoryId,
  )

  return (
    <div className="assistant-overlay">
      <section
        className="assistant-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        aria-describedby="assistant-description"
        tabIndex="-1"
        ref={panelRef}
        onKeyDown={handlePanelKeyDown}
      >
        <header className="assistant-header">
          <div>
            <p className="assistant-eyebrow">Planificación local</p>
            <h2 id="assistant-title">Pregúntale a Ally</h2>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose} aria-label="Cerrar asistente">
            Cerrar
          </button>
        </header>
        <p id="assistant-description" className="assistant-description">
          Cuéntame qué tienes que preparar y revisarás la meta antes de añadirla a tu calendario.
        </p>

        {!webGpuAvailable ? (
          <div className="assistant-message assistant-message--error" role="alert">
            Este navegador no ofrece WebGPU para ejecutar el modelo local. Puedes seguir creando metas con el formulario habitual.
          </div>
        ) : modelState !== 'ready' ? (
          <section className="assistant-model" aria-label="Modelo local">
            <h3>Qwen 2.5 · 1.5B</h3>
            <p>
              La inferencia se ejecuta en este dispositivo. La primera carga descarga el modelo y lo guarda en caché;
              requiere WebGPU y memoria gráfica suficiente (estimación: 1,6 GB).
            </p>
            {modelError && <p className="assistant-message assistant-message--error" role="alert">{modelError}</p>}
            {modelState === 'loading' ? (
              <div className="assistant-progress">
                <progress value={modelProgress} max="1" aria-label="Progreso de carga del modelo" />
                <p role="status">{progressText} {Math.round(modelProgress * 100)}%</p>
              </div>
            ) : (
              <button className="button button-primary" type="button" onClick={handleLoadModel}>
                Cargar modelo local
              </button>
            )}
          </section>
        ) : (
          <>
            <p className="assistant-privacy">
              Tu texto se procesa localmente; no compartimos con el modelo tu agenda, disponibilidad ni credenciales.
            </p>
            <form className="assistant-form" onSubmit={handleInterpret}>
              <label className="field assistant-field" htmlFor="assistant-request">
                <span>¿Qué quieres planificar?</span>
                <textarea
                  id="assistant-request"
                  ref={promptRef}
                  rows="4"
                  maxLength="2000"
                  value={requestText}
                  onChange={(event) => setRequestText(event.target.value)}
                  placeholder="Tengo una prueba el siguiente martes; necesito 4 horas de estudio."
                  required
                />
              </label>
              <button className="button button-primary" type="submit" disabled={busy || !requestText.trim()}>
                {busy && !draft ? 'Interpretando…' : 'Preparar propuesta'}
              </button>
            </form>
          </>
        )}

        {interpretError && <p className="assistant-message assistant-message--error" role="alert">{interpretError}</p>}

        {draft && (
          <form className="assistant-draft" onSubmit={handleCreateOrSchedule}>
            <div className="assistant-draft-heading">
              <h3>{createdGoal ? 'Meta guardada' : 'Revisa la propuesta'}</h3>
              <p>La IA no crea bloques: el backend comprobará dónde caben.</p>
            </div>
            {draft.clarification && <p className="assistant-message">{draft.clarification}</p>}
            {createdGoal && (
              <p className="assistant-message assistant-message--error" role="status">
                La meta ya está guardada. Puedes reintentar la planificación sin crear otra meta.
              </p>
            )}
            <label className="field assistant-field" htmlFor="assistant-goal-title">
              <span>Título</span>
              <input
                id="assistant-goal-title"
                type="text"
                maxLength="200"
                required
                disabled={Boolean(createdGoal)}
                value={draft.title || ''}
                onChange={(event) => updateDraft('title', event.target.value)}
              />
            </label>
            <label className="field assistant-field" htmlFor="assistant-goal-description">
              <span>Descripción</span>
              <textarea
                id="assistant-goal-description"
                rows="2"
                maxLength="2000"
                disabled={Boolean(createdGoal)}
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
              />
            </label>
            <div className="assistant-field-row">
              <label className="field assistant-field" htmlFor="assistant-deadline-date">
                <span>Fecha límite</span>
                <input
                  id="assistant-deadline-date"
                  type="date"
                  required
                  disabled={Boolean(createdGoal)}
                  value={draft.deadlineDate || ''}
                  onChange={(event) => updateDraft('deadlineDate', event.target.value)}
                />
              </label>
              <label className="field assistant-field" htmlFor="assistant-deadline-time">
                <span>Hora del examen/límite</span>
                <input
                  id="assistant-deadline-time"
                  type="time"
                  required
                  disabled={Boolean(createdGoal)}
                  value={draft.deadlineTime || ''}
                  onChange={(event) => updateDraft('deadlineTime', event.target.value)}
                />
              </label>
            </div>
            <div className="assistant-field-row">
              <label className="field assistant-field" htmlFor="assistant-study-minutes">
                <span>Minutos de estudio</span>
                <input
                  id="assistant-study-minutes"
                  type="number"
                  min="1"
                  step="1"
                  required
                  disabled={Boolean(createdGoal)}
                  value={draft.studyMinutes ?? ''}
                  onChange={(event) => updateDraft('studyMinutes', event.target.value)}
                />
              </label>
              <label className="field assistant-field" htmlFor="assistant-category">
                <span>Categoría</span>
                <select
                  id="assistant-category"
                  required
                  disabled={Boolean(createdGoal) || !hasCategories}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Elige una categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>{category.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {!hasCategories && (
              <p className="assistant-message assistant-message--error">
                Necesitas crear una categoría antes de guardar esta meta.
                <button className="button button-quiet" type="button" onClick={onManageCategories}>
                  Ir a categorías
                </button>
              </p>
            )}
            {apiErrors.length > 0 && (
              <div className="form-errors" role="alert">
                <p>{createdGoal ? 'No se pudo generar el plan:' : 'No se pudo guardar la meta:'}</p>
                <ul>{apiErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
              </div>
            )}
            <button className="button button-primary" type="submit" disabled={busy || !createdGoal && !canCreate}>
              {busy ? 'Guardando…' : createdGoal ? 'Reintentar planificación' : 'Crear meta y planificar'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
