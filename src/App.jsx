import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import AuthScreen, { BrandMark } from './components/AuthScreen'
import CursorTrail from './components/CursorTrail'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import PlanningAssistant from './components/PlanningAssistant'
import QuickTutorial from './components/QuickTutorial'
import ResourceManager from './components/ResourceManager'
import SoundToggle from './components/SoundToggle'
import { api, clearSession, getErrorMessages, getSession } from './lib/api'
import { activateAudio, playButtonSound, preloadAudio, startMelody, stopMelody } from './lib/sound'
import './App.css'

const CalendarView = lazy(() => import('./components/CalendarView'))
const TUTORIAL_SEEN_KEY = 'ally.tutorial-seen'
const TUTORIAL_HINT_SEEN_KEY = 'ally.tutorial-hint-seen'

const emptyData = {
  categories: [],
  availability: [],
  goals: [],
  subtasks: [],
  blocks: [],
}

const resourceRoutes = {
  categories: 'categories',
  availability: 'availability',
  goals: 'goals',
  subtasks: 'subtasks',
  blocks: 'blocks',
}

const routeTitles = {
  calendar: 'Tu calendario',
  categories: 'Categorías',
  availability: 'Disponibilidad',
  goals: 'Metas',
  subtasks: 'Subtareas',
  blocks: 'Bloques',
}

const dashboardRoutes = ['calendar', ...Object.keys(resourceRoutes)]

function AppEffects({ soundEnabled, soundLoading, soundError, onPrepareAudio, onToggleSound }) {
  return (
    <>
      <CursorTrail />
      <div className="sound-control-anchor">
        <SoundToggle
          enabled={soundEnabled}
          loading={soundLoading}
          error={soundError}
          onPrepare={onPrepareAudio}
          onToggle={onToggleSound}
        />
      </div>
    </>
  )
}

function routeFromHash() {
  const hash = window.location.hash.slice(1)
  const route = hash === 'app'
    ? 'calendar'
    : ['home', 'login', 'register', ...dashboardRoutes].includes(hash)
      ? hash
      : getSession() ? 'calendar' : 'home'

  return !getSession() && dashboardRoutes.includes(route) ? 'login' : route
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [authenticated, setAuthenticated] = useState(() => Boolean(getSession()))
  const [todayLabel] = useState(() =>
    new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
  )
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(() => Boolean(getSession()))
  const [loadError, setLoadError] = useState(null)
  const [notice, setNotice] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(() =>
    Boolean(getSession()) && localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true',
  )
  const [tutorialHintDismissed, setTutorialHintDismissed] = useState(() =>
    localStorage.getItem(TUTORIAL_HINT_SEEN_KEY) === 'true',
  )
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundLoading, setSoundLoading] = useState(false)
  const [soundError, setSoundError] = useState('')
  const tutorialHelpRef = useRef(null)

  const navigate = useCallback((nextRoute) => {
    window.location.hash = nextRoute
    setRoute(nextRoute)
  }, [])

  const loadData = useCallback(async () => {
    const [categories, availability, goals, subtasks, blocks] = await Promise.all([
      api.list('categories'),
      api.list('availability'),
      api.list('goals'),
      api.list('subtasks'),
      api.list('blocks'),
    ])
    return { categories, availability, goals, subtasks, blocks }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setData(await loadData())
      return true
    } catch (error) {
      setLoadError(error)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadData])

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash())
    const syncSession = () => {
      const hasSession = Boolean(getSession())
      setAuthenticated(hasSession)
      if (hasSession && localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true') {
        setTutorialOpen(true)
      } else if (!hasSession) {
        setTutorialOpen(false)
        setData(emptyData)
        setLoadError(null)
      }
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('ally:session-change', syncSession)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('ally:session-change', syncSession)
    }
  }, [])

  useEffect(() => {
    if (!authenticated) return undefined

    let active = true
    loadData()
      .then((nextData) => {
        if (active) {
          setData(nextData)
          setLoadError(null)
        }
      })
      .catch((error) => {
        if (active) setLoadError(error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authenticated, loadData])

  useEffect(() => {
    if (!soundEnabled) {
      stopMelody()
      return undefined
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMelody()
      } else {
        startMelody()
      }
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopMelody()
    }
  }, [soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return undefined

    const handleButtonClick = (event) => {
      if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) {
        playButtonSound()
      }
    }

    document.addEventListener('click', handleButtonClick, true)
    return () => document.removeEventListener('click', handleButtonClick, true)
  }, [soundEnabled])

  async function handleSchedule(goal) {
    setNotice('')
    try {
      await api.scheduleGoal(goal.id)
      const refreshed = await refreshData()
      if (refreshed) setNotice(`Se actualizó el plan de “${goal.title}”.`)
    } catch (error) {
      setNotice(getErrorMessages(error).join(' '))
    }
  }

  function showError(error) {
    setNotice(getErrorMessages(error).join(' '))
  }

  function handleLogout() {
    setAssistantOpen(false)
    setTutorialOpen(false)
    clearSession()
    setAuthenticated(false)
    setNotice('')
    navigate('home')
  }

  function closeTutorial() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
    setTutorialOpen(false)
  }

  function dismissTutorialHint() {
    localStorage.setItem(TUTORIAL_HINT_SEEN_KEY, 'true')
    setTutorialHintDismissed(true)
  }

  function replayTutorial() {
    dismissTutorialHint()
    setTutorialOpen(true)
  }

  function soundFailureMessage(error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    return `No se pudo activar el sonido.${detail}`
  }

  function prepareAudio() {
    void preloadAudio().catch((error) => setSoundError(soundFailureMessage(error)))
  }

  async function toggleSound() {
    setSoundError('')
    if (soundEnabled) {
      setSoundEnabled(false)
      return
    }

    setSoundLoading(true)
    try {
      await activateAudio()
      setSoundEnabled(true)
      playButtonSound()
    } catch (error) {
      setSoundError(soundFailureMessage(error))
    } finally {
      setSoundLoading(false)
    }
  }

  const showTutorialHint = authenticated && !tutorialOpen &&
    localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true' && !tutorialHintDismissed
  const appEffects = (
    <AppEffects
      soundEnabled={soundEnabled}
      soundLoading={soundLoading}
      soundError={soundError}
      onPrepareAudio={prepareAudio}
      onToggleSound={toggleSound}
    />
  )

  if (route === 'home') {
    return (
      <>
        <a className="skip-link" href="#main">Saltar al contenido</a>
        <LandingPage onNavigate={navigate} />
        {appEffects}
      </>
    )
  }

  if (route === 'login' || route === 'register') {
    return (
      <>
        <a className="skip-link" href="#main">Saltar al contenido</a>
        <AuthScreen
          mode={route}
          onNavigate={navigate}
          onAuthenticated={() => {
            setAuthenticated(true)
            setTutorialOpen(localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true')
            setLoading(true)
            navigate('calendar')
          }}
        />
        {appEffects}
      </>
    )
  }

  const resource = resourceRoutes[route]

  return (
    <>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <div className="dashboard-shell">
        <aside className="sidebar">
          <a className="brand" href="#calendar" aria-label="Ally, calendario">
            <BrandMark />
            <span>ally</span>
          </a>
          <p className="sidebar-label">Tu espacio</p>
          <nav className="side-nav" aria-label="Menú de tu agenda">
            {dashboardRoutes.map((item) => (
              <button
                type="button"
                key={item}
                className={`side-nav-link ${route === item ? 'is-active' : ''}`}
                aria-current={route === item ? 'page' : undefined}
                onClick={() => {
                  setNotice('')
                  navigate(item)
                }}
              >
                <span className="nav-indicator" aria-hidden="true" />
                {routeTitles[item]}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="session-caption">Agenda personal</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-date">{todayLabel}</p>
              <h1>{routeTitles[route] || 'Tu calendario'}</h1>
            </div>
            <div className="dashboard-header-actions">
              {route === 'calendar' && (
                <button className="button button-primary" type="button" onClick={() => setAssistantOpen(true)}>
                  Planear con Ally
                </button>
              )}
              <button className="button button-outline" type="button" onClick={() => navigate('goals')}>
                Añadir meta
              </button>
            </div>
          </header>

          <main className="dashboard-main" id="main">
            {notice && (
              <div className="notice-banner" role="status">
                <p>{notice}</p>
                <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>Cerrar</button>
              </div>
            )}
            {loadError && (
              <div className="form-errors load-error" role="alert">
                <p>No se pudo cargar tu agenda.</p>
                <ul>{getErrorMessages(loadError).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
                <button className="button button-quiet" type="button" onClick={() => void refreshData()}>
                  Intentar de nuevo
                </button>
              </div>
            )}
            {loading && (
              <LoadingScreen
                message="Siguiendo la corriente de tu semana…"
                submessage="Sincronizando tus materias y metas de estudio"
              />
            )}
            {!loading && !loadError && route === 'calendar' && (
              <Suspense
                fallback={
                  <LoadingScreen
                    message="Abriendo tu calendario…"
                    submessage="Preparando la vista semanal"
                  />
                }
              >
                <CalendarView data={data} onRefresh={refreshData} onError={showError} />
              </Suspense>
            )}
            {!loading && !loadError && resource && (
              <ResourceManager
                resource={resource}
                data={data}
                onRefresh={refreshData}
                onSchedule={handleSchedule}
                onError={showError}
              />
            )}
          </main>
          {assistantOpen && route === 'calendar' && (
            <PlanningAssistant
              categories={data.categories}
              onClose={() => setAssistantOpen(false)}
              onRefresh={refreshData}
              onSuccess={setNotice}
              onManageCategories={() => {
                setAssistantOpen(false)
                navigate('categories')
              }}
            />
          )}
        </div>
      </div>
      <button
        type="button"
        className="tutorial-help"
        ref={tutorialHelpRef}
        aria-label="Volver a ver el tutorial de Ally"
        title="Tutorial de Ally"
        onClick={replayTutorial}
      >
        ?
      </button>
      {tutorialOpen && (
        <QuickTutorial onClose={closeTutorial} onNavigate={navigate} returnFocusRef={tutorialHelpRef} />
      )}
      {showTutorialHint && (
        <aside className="tutorial-help-popover" role="status" aria-label="Consejo del tutorial">
          <p>El signo «?» te permite volver a abrir este tutorial cuando quieras.</p>
          <button type="button" onClick={dismissTutorialHint}>Entendido</button>
        </aside>
      )}
      {appEffects}
    </>
  )
}
