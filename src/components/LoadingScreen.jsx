import { BrandMark } from './AuthScreen'

export default function LoadingScreen({
  message = 'Siguiendo la corriente de tu semana…',
  submessage = 'Preparando tu espacio de estudio',
  fullScreen = false,
}) {
  return (
    <div
      className={`loading-screen ${fullScreen ? 'is-fullscreen' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-screen-portal">
        <div className="loading-orbital-ring" aria-hidden="true" />
        <div className="loading-brand-wrapper">
          <BrandMark />
        </div>
      </div>
      <p className="loading-state">{message}</p>
      {submessage && <p className="loading-submessage">{submessage}</p>}
      <div className="loading-progress-bar" aria-hidden="true">
        <div className="loading-progress-indicator" />
      </div>
    </div>
  )
}
