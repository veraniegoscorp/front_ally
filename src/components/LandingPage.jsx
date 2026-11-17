import { BrandMark } from './AuthScreen'
import currentArt from '../assets/bioluminescent-current.svg'

const demoDays = [
  { day: 'Lun', date: '12' },
  { day: 'Mar', date: '13', block: 'Repasar tema 1', kind: 'pomodoro' },
  { day: 'Mié', date: '14', block: 'Ejercicios', kind: 'milestones' },
  { day: 'Jue', date: '15', block: 'Lectura', kind: 'continuous' },
  { day: 'Vie', date: '16' },
  { day: 'Sáb', date: '17', block: 'Repaso', kind: 'pomodoro' },
  { day: 'Dom', date: '18' },
]

export default function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page" id="main">
      <header className="landing-nav">
        <a className="brand" href="#home" aria-label="Ally, inicio">
          <BrandMark />
          <span>ally</span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#tecnicas">Técnicas</a>
        </nav>
        <div className="nav-actions">
          <button className="button button-quiet" type="button" onClick={() => onNavigate('login')}>
            Iniciar sesión
          </button>
          <button className="button button-primary" type="button" onClick={() => onNavigate('register')}>
            Crear mi agenda
          </button>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <img className="current-art" src={currentArt} alt="" aria-hidden="true" />
        <div className="hero-copy">
          <h1 id="landing-title">Que cada fecha tenga su camino.</h1>
          <p className="hero-description">
            Organiza tus metas alrededor de tus entregas. Ally convierte tu disponibilidad en una semana de estudio que puedes ver y ajustar.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" type="button" onClick={() => onNavigate('register')}>
              Crear mi agenda
              <ArrowMark />
            </button>
            <a className="text-link" href="#como-funciona">Descubre cómo funciona</a>
          </div>
          <p className="hero-note">Una agenda personal para estudiantes y docentes.</p>
        </div>

        <div className="demo-orbit" role="region" aria-label="Ejemplo visual de una semana de estudio" tabIndex="0">
          <div className="demo-orbit-heading">
            <span>Ejemplo de semana</span>
            <span className="demo-status"><i aria-hidden="true" /> Meta · Examen de historia</span>
          </div>
          <div className="demo-week">
            {demoDays.map(({ day, date, block, kind }) => (
              <div className="demo-day" key={day}>
                <span className="demo-day-name">{day}</span>
                <span className="demo-day-date">{date}</span>
                {block && (
                  <div className={`demo-block demo-block--${kind}`}>
                    <span>{block}</span>
                    <small>{kind === 'pomodoro' ? 'Pomodoro' : kind === 'milestones' ? 'Por hitos' : 'Continua'}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="demo-caption">Una vista ilustrativa: la planificación real se genera con tus metas y disponibilidad.</p>
        </div>
        <a className="scroll-cue" href="#como-funciona">
          <span aria-hidden="true" />
          <span>Explora Ally</span>
        </a>
      </section>

      <section className="story-section" id="como-funciona" aria-labelledby="story-title">
        <div className="story-intro">
          <h2 id="story-title">No tienes que adivinar por dónde empezar.</h2>
          <p>Cuéntale a Ally qué tienes que preparar y cuándo vence. El planificador usa tus franjas disponibles para proponer bloques de estudio.</p>
        </div>
        <div className="story-route" aria-label="Pasos para organizar una meta">
          <article className="story-step">
            <span className="step-marker">A</span>
            <h3>Define tu meta</h3>
            <p>Una prueba, una entrega o trabajos por revisar: ponle fecha y el tiempo mínimo que necesitas.</p>
          </article>
          <article className="story-step story-step--active">
            <span className="step-marker">B</span>
            <h3>Marca tus horas</h3>
            <p>Indica tus espacios semanales o una fecha puntual. Tú conoces tu rutina.</p>
          </article>
          <article className="story-step">
            <span className="step-marker">C</span>
            <h3>Revisa tu semana</h3>
            <p>La API calcula los bloques. Luego puedes moverlos y Ally comprueba el horario contigo.</p>
          </article>
          <span className="story-current" aria-hidden="true" />
        </div>
      </section>

      <section className="technique-section" id="tecnicas" aria-labelledby="technique-title">
        <div className="technique-heading">
          <h2 id="technique-title">Tres maneras de entrar en materia.</h2>
          <p>Elige una técnica para cada categoría. Su forma ayuda a reconocerla en tu calendario.</p>
        </div>
        <div className="technique-samples">
          <article className="technique-sample">
            <div className="material-sample material-sample--pomodoro" aria-hidden="true"><span /></div>
            <div>
              <h3>Pomodoro</h3>
              <p>Sesiones con descansos entre ellas.</p>
            </div>
          </article>
          <article className="technique-sample">
            <div className="material-sample material-sample--continuous" aria-hidden="true"><span /></div>
            <div>
              <h3>Continua</h3>
              <p>Un bloque sostenido para profundizar.</p>
            </div>
          </article>
          <article className="technique-sample">
            <div className="material-sample material-sample--milestones" aria-hidden="true"><span /></div>
            <div>
              <h3>Por hitos</h3>
              <p>Avanza por etapas hacia la entrega.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="closing-section" aria-labelledby="closing-title">
        <span className="closing-current" aria-hidden="true" />
        <div>
          <h2 id="closing-title">Pon tu próxima fecha en el mapa.</h2>
        </div>
        <button className="button button-primary button-large" type="button" onClick={() => onNavigate('register')}>
          Crear mi agenda <ArrowMark />
        </button>
      </section>

      <footer className="landing-footer">
        <a className="brand" href="#home">
          <BrandMark />
          <span>ally</span>
        </a>
        <p>Tu calendario. Tu ritmo. Tu próximo paso.</p>
      </footer>
    </main>
  )
}

function ArrowMark() {
  return (
    <svg className="arrow-mark" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 16 16 4M6 4h10v10" />
    </svg>
  )
}
