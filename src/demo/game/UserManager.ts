import { EventEmitter } from '../utils/EventEmitter'

export class UserManager extends EventEmitter {
  private username: string | undefined
  private static readonly USERNAME_KEY = 'craz_username'

  constructor() {
    super()
    this.loadUsername()
  }

  private loadUsername(): void {
    // Check URL params first, then localStorage
    const urlUsername = new URLSearchParams(window.location.search).get('username')
    if (urlUsername) {
      this.setUsername(urlUsername)
    } else {
      this.username = localStorage.getItem(UserManager.USERNAME_KEY) || undefined
    }
  }

  public getUsername(): string | undefined {
    return this.username
  }

  public setUsername(username: string | undefined): void {
    this.username = username

    if (username) {
      localStorage.setItem(UserManager.USERNAME_KEY, username)
      const url = new URL(window.location.href)
      url.searchParams.set('username', username)
      window.history.replaceState({}, '', url.toString())
    } else {
      localStorage.removeItem(UserManager.USERNAME_KEY)
      const url = new URL(window.location.href)
      url.searchParams.delete('username')
      window.history.replaceState({}, '', url.toString())
    }

    this.emit('usernameChanged', username)
  }
}
