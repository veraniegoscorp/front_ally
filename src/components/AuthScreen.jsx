import { useState } from 'react'
import { api, getErrorMessages } from '../lib/api'
import LoadingScreen from './LoadingScreen'

export default function AuthScreen({ mode, onNavigate, onAuthenticated }) {
  const isRegister = mode === 'register'
  const [values, setValues] = useState({ username: '', email: '', password: '' })
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [showTermsDetails, setShowTermsDetails] = useState(false)
  const [errors, setErrors] = useState([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setNotice('')

    if (isRegister && !acceptTerms) {
      setErrors(['Debes aceptar los Términos y Condiciones para crear tu cuenta.'])
      return
    }

    setBusy(true)

    if (isRegister) {
      try {
        await api.register(values)
      } catch (error) {
        setErrors(getErrorMessages(error))
        setBusy(false)
        return
      }
    }

    try {
      await api.login({ username: values.username, password: values.password })
      onAuthenticated()
    } catch (error) {
      if (isRegister) {
        setNotice('Si la cuenta se creó, inicia sesión con tus datos para continuar.')
      }
      setErrors(getErrorMessages(error))
    } finally {
      setBusy(false)
    }
  }

  function updateValue(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
    setErrors([])
    setNotice('')
  }

  return (
    <main className="auth-page" id="main">
      <a className="auth-home" href="#home" onClick={(event) => {
        event.preventDefault()
        onNavigate('home')
      }}>
        <BrandMark />
        <span>ally</span>
      </a>
      <div className="auth-art" aria-hidden="true" />
      <section className="auth-content" aria-labelledby="auth-title">
        <h1 id="auth-title">{isRegister ? 'Empieza por una meta.' : 'Qué bueno verte.'}</h1>
        <p className="auth-intro">
          {isRegister
            ? 'Crea tu cuenta para convertir una fecha de entrega en tiempo de estudio.'
            : 'Entra para revisar tus metas y tu semana de estudio.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-username">Usuario</label>
          <input
            id="auth-username"
            autoComplete="username"
            name="username"
            value={values.username}
            onChange={updateValue}
            required
          />

          {isRegister && (
            <>
              <label htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                autoComplete="email"
                name="email"
                type="email"
                value={values.email}
                onChange={updateValue}
                required
              />
            </>
          )}

          <label htmlFor="auth-password">Contraseña</label>
          <input
            id="auth-password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            name="password"
            type="password"
            value={values.password}
            onChange={updateValue}
            required
          />

          {isRegister && (
            <div className="terms-block">
              <div className="terms-header">
                <div className="terms-title-group">
                  <svg className="terms-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Términos y Condiciones</span>
                </div>
                <button
                  type="button"
                  className="terms-expand-btn"
                  onClick={() => setShowTermsDetails((prev) => !prev)}
                >
                  {showTermsDetails ? 'Ocultar detalles' : 'Leer cláusulas'}
                </button>
              </div>

              <div className="terms-content-box">
                <p className="terms-summary">
                  Ally protege la privacidad de tu estudio y no comparte tu agenda con terceros. Al registrarte te comprometes a un uso personal, legítimo y ético de la plataforma.
                </p>
                {showTermsDetails && (
                  <div className="terms-clauses" tabIndex={0} aria-label="Cláusulas de términos y condiciones">
                    <h4>1. Propósito y uso del servicio</h4>
                    <p>Ally es una herramienta de organización académica personal para transformar entregas en semanas de estudio ordenadas.</p>
                    <h4>2. Privacidad de tus datos de estudio</h4>
                    <p>Tus metas, horarios de disponibilidad y notas son estrictamente personales. Ally no comercializa tu información académica.</p>
                    <h4>3. Asistencia inteligente y técnicas</h4>
                    <p>Las recomendaciones de bloques (Pomodoro, estudio continuo e hitos) son de apoyo; el cumplimiento de evaluaciones corresponde al estudiante.</p>
                    <h4>4. Seguridad de la cuenta</h4>
                    <p>Eres responsable de resguardar tu contraseña y del uso correcto de tu cuenta.</p>
                    <h4>5. Compromiso ético</h4>
                    <p>Fomentamos el estudio enfocado y la honestidad académica en todo momento.</p>
                  </div>
                )}
              </div>

              <label className="terms-checkbox-label" htmlFor="auth-terms">
                <input
                  id="auth-terms"
                  type="checkbox"
                  name="acceptTerms"
                  checked={acceptTerms}
                  onChange={(event) => {
                    setAcceptTerms(event.target.checked)
                    setErrors([])
                  }}
                />
                <span className="terms-checkbox-text">
                  Acepto los Términos y Condiciones y la Política de Privacidad de Ally.
                </span>
              </label>
            </div>
          )}

          {notice && <p className="form-notice" role="status">{notice}</p>}
          {errors.length > 0 && (
            <div className="form-errors" role="alert">
              <p>Revisa estos datos:</p>
              <ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
            </div>
          )}

          <button className="button button-primary auth-submit" type="submit" disabled={busy}>
            {busy ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Primera vez en Ally?'}
          <button type="button" onClick={() => onNavigate(isRegister ? 'login' : 'register')}>
            {isRegister ? ' Inicia sesión' : ' Crear cuenta'}
          </button>
        </p>
      </section>
      {busy && (
        <LoadingScreen
          fullScreen
          message={isRegister ? 'Creando tu cuenta de estudio…' : 'Iniciando sesión…'}
          submessage="Sincronizando con tu espacio personal"
        />
      )}
    </main>
  )
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M5 26.5c5.4 0 5.4-11 10.8-11s5.4 11 10.8 11 5.4-11 10.8-11" />
      <path d="M5 34c5.4 0 5.4-11 10.8-11s5.4 11 10.8 11 5.4-11 10.8-11" />
      <circle cx="21" cy="7" r="2.2" />
    </svg>
  )
}
