import { reactive } from 'vanjs-ext'

type CurrentView = 'home' | 'dashboard'

export interface AppState {
  roomName: string
  isValid: boolean
  currentView: CurrentView
  activeTab: string
}

export const appState = reactive<AppState>({
  roomName: '',
  isValid: false,
  currentView: 'home',
  activeTab: 'overview',
})
