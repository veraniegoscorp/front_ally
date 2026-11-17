import { useEffect, useRef, useState } from 'react'

const steps = [
  {
    title: 'Prepara tus categorías',
    description: 'Elige una técnica de estudio —Pomodoro, continua o por hitos— y define cuánto dura cada sesión.',
    action: 'Ir a Categorías',
    route: 'categories',
  },
  {
    title: 'Indica cuándo puedes estudiar',
    description: 'Añade tus franjas disponibles por día o fecha. La planificación solo puede usar tiempo libre antes de la fecha límite.',
    action: 'Configurar disponibilidad',
    route: 'availability',
  },
  {
    title: 'Crea una meta clara',
    description: 'Añade el tema, la categoría, los minutos que necesitas (4 horas = 240 minutos) y la fecha y hora reales del examen. También puedes pedirle a Ally que prepare una propuesta y revisarla antes de confirmarla.',
    action: 'Ver mis metas',
    route: 'goals',
  },
  {
    title: 'Planifica y revisa tu semana',
    description: 'Al generar el plan, la API crea los bloques según tu disponibilidad. Si no hay franjas suficientes, añade disponibilidad y vuelve a generar el plan desde Metas. La marca de fecha límite no es un bloque de estudio; puedes arrastrar los bloques para moverlos.',
  },
]

export default function QuickTutorial({ onClose, onNavigate, returnFocusRef }) {
  const [stepIndex, setStepIndex] = useState(0)
  const panelRef = useRef(null)
  const step = steps[stepIndex]

  useEffect(() => {
    const previousFocus = document.activeElement
    const fallbackFocus = returnFocusRef?.current
    panelRef.current?.focus()
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body && document.contains(previousFocus)) {
        previousFocus.focus()
      } else if (fallbackFocus?.isConnected) {
        fallbackFocus.focus()
      }
    }
  }, [returnFocusRef])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return
    const focusable = panelRef.current?.querySelectorAll('button:not(:disabled)')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
      event.preventDefault()
      first.focus()
    }
  }

  function navigateToStepRoute() {
    onNavigate(step.route)
    onClose()
  }

  return (
    <div className="tutorial-overlay">
      <section
        className="tutorial-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        tabIndex="-1"
        ref={panelRef}
        onKeyDown={handleKeyDown}
      >
        <header className="tutorial-header">
          <div>
            <p className="tutorial-eyebrow">Guía rápida · Paso {stepIndex + 1} de {steps.length}</p>
            <h2 id="tutorial-title">Cómo empezar con Ally</h2>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose} aria-label="Cerrar tutorial">
            Cerrar
          </button>
        </header>

        <div className="tutorial-progress" aria-hidden="true">
          {steps.map((item, index) => (
            <span key={item.title} className={index <= stepIndex ? 'is-complete' : ''} />
          ))}
        </div>

        <div className="tutorial-step" aria-live="polite">
          <h3>{step.title}</h3>
          <p id="tutorial-description">{step.description}</p>
          {step.action && (
            <button type="button" className="button button-outline tutorial-action" onClick={navigateToStepRoute}>
              {step.action}
            </button>
          )}
        </div>

        <footer className="tutorial-footer">
          <button
            type="button"
            className="button button-quiet"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => current - 1)}
          >
            Anterior
          </button>
          <button type="button" className="tutorial-skip" onClick={onClose}>
            Saltar tutorial
          </button>
          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setStepIndex((current) => current + 1)}
            >
              Siguiente
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={onClose}>
              Terminar
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
