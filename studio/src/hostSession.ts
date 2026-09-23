export interface HostUser {
  id?: string
  email?: string
  name?: string
  username?: string
}

export interface HostModule {
  auth: {
    signIn: () => Promise<{ user?: HostUser | null }>
    signOut: () => Promise<unknown>
    getUser: () => Promise<HostUser | null>
  }
}

/** Load the RedX account adapter when this page is served from browser-dist. */
export async function loadHostSession(): Promise<HostModule | null> {
  try {
    const url = new URL('api.js', document.baseURI)
    const probe = await fetch(url, { method: 'GET', cache: 'no-store' })
    if (!probe.ok) return null
    const text = await probe.text()
    if (!text.includes('infectednation_session')) return null
    return (await import(/* @vite-ignore */ url.href)) as HostModule
  } catch {
    return null
  }
}
