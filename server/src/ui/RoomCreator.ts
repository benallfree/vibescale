import van from 'vanjs-core'
import { appState } from '../state'

const { div, section, h1, p, label, span, input, button } = van.tags

// Validation function
const validateRoomName = (value: string) => {
  const isValid = value.length > 0 && /^[a-zA-Z0-9-]+$/.test(value)
  appState.isValid.val = isValid
  return isValid
}

export const RoomCreator = () => {
  const validationIndicator = () =>
    div(
      {
        id: 'validationIndicator',
        class: () => `absolute right-4 top-1/2 -translate-y-1/2 text-error ${appState.isValid.val ? 'hidden' : ''}`,
      },
      '✕'
    )

  return section(
    { class: 'container mx-auto px-4 py-8' },
    div(
      { class: 'max-w-md mx-auto' },
      div(
        { class: 'card bg-gradient-to-br from-base-300 to-base-200 shadow-2xl border border-base-300' },
        div(
          { class: 'card-body p-8' },
          div(
            { class: 'text-center space-y-3' },
            h1(
              {
                class: 'text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text',
              },
              'Create Your MMO Room'
            ),
            p({ class: 'text-sm text-gray-400' }, 'Generate a unique room for your multiplayer game')
          ),
          div(
            { class: 'form-control mt-8' },
            label(
              { class: 'label pb-3' },
              span({ class: 'label-text font-medium' }, 'Room Name'),
              span({ class: 'label-text-alt text-gray-400' }, 'Alphanumeric characters only')
            ),
            div(
              { class: 'input-group input-group-lg relative' },
              input({
                type: 'text',
                id: 'roomNameInput',
                placeholder: 'my-awesome-game',
                class:
                  'input input-bordered w-full bg-base-100 focus:ring-2 focus:ring-primary transition-all duration-200 px-6 py-4',
                oninput: (e: Event) => {
                  const input = e.target as HTMLInputElement
                  input.value = input.value.replace(/[^a-zA-Z0-9-]/g, '')
                  appState.roomName.val = input.value
                  validateRoomName(input.value)
                },
              }),
              validationIndicator(),
              button(
                {
                  id: 'generateButton',
                  class: () =>
                    `btn btn-primary hover:brightness-110 transition-all duration-200 px-6 mt-4 ${!appState.isValid.val ? 'btn-disabled' : ''}`,
                  onclick: () => {
                    if (!appState.isValid.val) return
                    // Use router navigation
                    window.location.href = `/${appState.roomName.val}`
                  },
                },
                span({ class: 'mr-1' }, '＋'),
                'Create'
              )
            )
          )
        )
      )
    )
  )
}
