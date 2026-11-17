import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, clearSession, getSession, request, setSession } from './api'

function response(status, data) {
  return new Response(data === null ? '' : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('API session client', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.location.hash = ''
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('renews an expired access token and retries the protected request once', async () => {
    setSession({ access: 'old-access', refresh: 'refresh-token' })
    fetch
      .mockResolvedValueOnce(response(401, { detail: 'Token expired' }))
      .mockResolvedValueOnce(response(200, { access: 'new-access' }))
      .mockResolvedValueOnce(response(200, [{ id: 1 }]))

    await expect(request('/categories/')).resolves.toEqual([{ id: 1 }])

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer old-access')
    expect(fetch.mock.calls[1][0]).toContain('/auth/refresh/')
    expect(fetch.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer new-access')
    expect(getSession()).toEqual({ access: 'new-access', refresh: 'refresh-token' })
  })

  it('clears the session and redirects to login when refresh fails', async () => {
    setSession({ access: 'expired', refresh: 'invalid-refresh' })
    fetch
      .mockResolvedValueOnce(response(401, { detail: 'Expired' }))
      .mockResolvedValueOnce(response(401, { detail: 'Invalid refresh' }))

    await expect(request('/blocks/')).rejects.toThrow('No se pudo renovar la sesión.')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(getSession()).toBeNull()
    expect(window.location.hash).toBe('#login')
  })

  it('does not retry indefinitely when the refreshed token is also rejected', async () => {
    setSession({ access: 'old', refresh: 'refresh' })
    fetch
      .mockResolvedValueOnce(response(401, { detail: 'Expired' }))
      .mockResolvedValueOnce(response(200, { access: 'new' }))
      .mockResolvedValueOnce(response(401, { detail: 'Still unauthorized' }))

    await expect(request('/goals/')).rejects.toMatchObject({ status: 401 })

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(getSession()).toBeNull()
    expect(window.location.hash).toBe('#login')
  })

  it('posts explicitly to the goal schedule endpoint', async () => {
    setSession({ access: 'valid', refresh: 'refresh' })
    fetch.mockResolvedValueOnce(response(201, [{ id: 8 }]))

    await expect(api.scheduleGoal(12)).resolves.toEqual([{ id: 8 }])

    expect(fetch.mock.calls[0][0]).toMatch(/\/goals\/12\/schedule\/$/)
    expect(fetch.mock.calls[0][1].method).toBe('POST')
  })

  it('explains network and CORS failures instead of exposing the browser error', async () => {
    fetch.mockRejectedValueOnce(new TypeError('NetworkError when attempting to fetch resource.'))

    await expect(api.register({ username: 'test', email: 'test@example.com', password: 'pass' }))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 0,
        message: expect.stringContaining('Comprueba que Django esté activo y que CORS permita'),
      })
  })

  it('clears the session on logout', () => {
    setSession({ access: 'valid', refresh: 'refresh' })
    clearSession()
    expect(getSession()).toBeNull()
  })
})
