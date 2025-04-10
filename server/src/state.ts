import van, { State } from 'vanjs-core'

export interface AppState {
  roomName: State<string>
  isValid: State<boolean>
  currentView: State<string>
  activeTab: State<string>
}

export const appState: AppState = {
  roomName: van.state(''),
  isValid: van.state(false),
  currentView: van.state('home'),
  activeTab: van.state('overview'),
}
