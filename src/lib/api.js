const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '')
const SESSION_KEY = 'ally.session'
let refreshRequest

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    if (typeof session.access === 'string' && typeof session.refresh === 'string') {
      return session
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }

  sessionStorage.removeItem(SESSION_KEY)
  return null
}

function notifySessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ally:session-change'))
  }
}

export function setSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  notifySessionChange()
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  notifySessionChange()
}

function expireSession() {
  clearSession()
  if (typeof window !== 'undefined' && window.location.hash !== '#login') {
    window.location.hash = '#login'
  }
}

async function readResponse(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function getErrorMessages(error) {
  const flatten = (value, field) => {
    if (Array.isArray(value)) return value.flatMap((item) => flatten(item, field))
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, item]) =>
        flatten(item, key === 'detail' || key === 'non_field_errors' ? field : key),
      )
    }
    if (typeof value !== 'string' && typeof value !== 'number') return []
    const message = String(value)
    return [field ? `${field.replaceAll('_', ' ')}: ${message}` : message]
  }

  if (error instanceof ApiError) {
    return flatten(error.data ?? error.message)
  }
  return [error instanceof Error ? error.message : 'Ocurrió un error inesperado.']
}

async function renewAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const current = getSession()
      if (!current?.refresh) {
        throw new ApiError('La sesión venció. Inicia sesión de nuevo.', 401, null)
      }

      const response = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: current.refresh }),
      })
      const data = await readResponse(response)
      if (!response.ok || typeof data?.access !== 'string') {
        throw new ApiError('No se pudo renovar la sesión.', response.status, data)
      }

      setSession({
        access: data.access,
        refresh: typeof data.refresh === 'string' ? data.refresh : current.refresh,
      })
      return data.access
    })().finally(() => {
      refreshRequest = null
    })
  }
  return refreshRequest
}

async function send(path, options, accessToken) {
  const headers = new Headers(options.headers)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body:
        options.body !== undefined && !isFormData
          ? JSON.stringify(options.body)
          : options.body,
    })
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    const origin = typeof window !== 'undefined' ? window.location.origin : 'el frontend'
    throw new ApiError(
      `No se pudo conectar con la API (${API_URL}). Comprueba que Django esté activo y que CORS permita el origen ${origin}.`,
      0,
      null,
    )
  }
}

export async function request(path, options = {}) {
  const { auth = true, ...fetchOptions } = options
  const method = fetchOptions.method || 'GET'
  const session = auth ? getSession() : null
  let response = await send(path, fetchOptions, session?.access)

  if (response.status === 401 && auth) {
    let access
    try {
      access = await renewAccessToken()
    } catch (error) {
      expireSession()
      throw error
    }

    response = await send(path, fetchOptions, access)
    if (response.status === 401) {
      expireSession()
    }
  }

  const data = await readResponse(response)
  if (!response.ok) {
    throw new ApiError(
      typeof data === 'string' ? data : `La solicitud ${method} no se pudo completar.`,
      response.status,
      data,
    )
  }
  return data
}

export const api = {
  register: (payload) =>
    request('/auth/register/', { method: 'POST', body: payload, auth: false }),
  login: async (payload) => {
    const session = await request('/auth/login/', {
      method: 'POST',
      body: payload,
      auth: false,
    })
    setSession(session)
    return session
  },
  list: (resource) => request(`/${resource}/`),
  create: (resource, payload) =>
    request(`/${resource}/`, { method: 'POST', body: payload }),
  update: (resource, id, payload) =>
    request(`/${resource}/${id}/`, { method: 'PATCH', body: payload }),
  remove: (resource, id) =>
    request(`/${resource}/${id}/`, { method: 'DELETE' }),
  scheduleGoal: (id) =>
    request(`/goals/${id}/schedule/`, { method: 'POST' }),
}
