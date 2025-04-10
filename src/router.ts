import Navigo from 'navigo'
import van, { State } from 'vanjs-core'
import { Dashboard } from './ui/Dashboard'
import { Features } from './ui/Features'
import { Hero } from './ui/Hero'
import { RoomCreator } from './ui/RoomCreator'

const { div, h1, p } = van.tags

// App state type
export interface AppState {
  roomName: State<string>
  isValid: State<boolean>
  currentView: State<string>
  activeTab: State<string>
}

interface RouteData {
  room?: string
}

// 404 Page component
const NotFoundPage = () =>
  div(
    { class: 'container mx-auto px-4 py-16 text-center' },
    h1(
      { class: 'text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text' },
      '404 - Page Not Found'
    ),
    p({ class: 'text-xl text-gray-300 mb-8' }, 'Oops! The page you are looking for does not exist.'),
    van.tags.a(
      {
        href: '/',
        class: 'btn btn-primary hover:brightness-110 transition-all duration-200',
      },
      'Go Home'
    )
  )

export const initRouter = (appState: AppState, templates: any) => {
  const router = new Navigo('/', {
    strategy: 'ONE',
    linksSelector: '[data-navigo]',
  })

  const renderView = (content: HTMLElement) => {
    const contentContainer = document.getElementById('content')
    if (contentContainer) {
      contentContainer.innerHTML = ''
      contentContainer.appendChild(content)
    }
  }

  // Home/Lander route
  router.on('/', () => {
    appState.currentView.val = 'home'
    appState.roomName.val = ''
    appState.isValid.val = false
    renderView(div(Hero(), RoomCreator({ appState }), Features()))
  })

  // Room dashboard route
  router.on('/:room', ({ data }: { data: RouteData }) => {
    const roomName = data?.room
    if (!roomName || !/^[a-zA-Z0-9-]+$/.test(roomName)) {
      router.navigate('/404')
      return
    }
    appState.roomName.val = roomName
    appState.isValid.val = true
    appState.currentView.val = 'dashboard'
    appState.activeTab.val = 'overview'
    renderView(Dashboard({ appState, templates, router }))
  })

  // RAG route
  router.on('/:room/rag', ({ data }: { data: RouteData }) => {
    const roomName = data?.room
    if (!roomName || !/^[a-zA-Z0-9-]+$/.test(roomName)) {
      router.navigate('/404')
      return
    }
    appState.roomName.val = roomName
    appState.isValid.val = true
    appState.currentView.val = 'dashboard'
    appState.activeTab.val = 'rag'
    renderView(Dashboard({ appState, templates, router }))
  })

  // Debug route
  router.on('/:room/debug', ({ data }: { data: RouteData }) => {
    const roomName = data?.room
    if (!roomName || !/^[a-zA-Z0-9-]+$/.test(roomName)) {
      router.navigate('/404')
      return
    }
    appState.roomName.val = roomName
    appState.isValid.val = true
    appState.currentView.val = 'dashboard'
    appState.activeTab.val = 'debug'
    renderView(Dashboard({ appState, templates, router }))
  })

  // 404 route
  router.notFound(() => {
    renderView(NotFoundPage())
  })

  return router
}
