export default function SoundToggle({ enabled, loading, error, onPrepare, onToggle }) {
  const label = loading ? 'Preparando sonido…' : enabled ? 'Sonido activo' : 'Activar sonido'

  return (
    <div className="sound-control">
      <button
        className={`sound-toggle ${enabled ? 'is-active' : ''}`}
        type="button"
        aria-label={enabled ? 'Desactivar música y sonidos de botones' : 'Activar música y sonidos de botones'}
        aria-pressed={enabled}
        title={enabled ? 'Desactivar música y sonidos' : 'Activar música espacial y sonidos de botones'}
        disabled={loading}
        onPointerEnter={onPrepare}
        onPointerDown={onPrepare}
        onFocus={onPrepare}
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
          {enabled ? (
            <path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />
          ) : (
            <path d="m16 10 4 4m0-4-4 4" />
          )}
        </svg>
        <span>{label}</span>
      </button>
      {error && <p className="sound-error" role="alert">{error}</p>}
    </div>
  )
}
