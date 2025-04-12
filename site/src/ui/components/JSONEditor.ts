import van, { type PropValueOrDerived } from 'vanjs-core'
import { reactive } from 'vanjs-ext'

const { div, textarea, button } = van.tags

interface JSONEditorProps {
  value: string | (() => string)
  onUpdate: (value: any) => void
  placeholder?: string
  label: string
  readonly?: boolean | (() => boolean)
  containerClass?: string
}

interface JSONEditorState {
  text: string
  isValid: boolean
}

// Validation function
const validateJson = (json: string): boolean => {
  try {
    JSON.parse(json)
    return true
  } catch {
    return false
  }
}

export const JSONEditor = ({
  value,
  onUpdate,
  placeholder,
  label,
  readonly = false,
  containerClass = '',
}: JSONEditorProps) => {
  const state = reactive<JSONEditorState>({
    text: typeof value === 'function' ? value() : value,
    isValid: true,
  })

  // Update state.text when value changes
  if (typeof value === 'function') {
    van.derive(() => {
      state.text = value()
      state.isValid = validateJson(value())
    })
  }

  // Get current readonly state
  const isReadonly = () => (typeof readonly === 'function' ? readonly() : readonly)

  return div(
    { class: `space-y-2 ${containerClass}` },
    div({ class: 'font-semibold text-lg' }, label),
    div(
      { class: 'bg-base-300 p-4 rounded-lg space-y-2 flex-1 flex flex-col' },
      div(
        { class: 'relative flex-1 flex flex-col' },
        textarea({
          value: () => state.text,
          oninput: (e) => {
            if (isReadonly()) return
            const value = (e.target as HTMLTextAreaElement).value
            state.text = value
            state.isValid = validateJson(value)
          },
          class: () => `w-full flex-1 font-mono text-sm p-2 rounded ${!state.isValid ? 'border-2 border-error' : ''}`,
          placeholder,
          disabled: isReadonly(),
        } as Record<string, PropValueOrDerived>),
        () => (state.isValid ? null : div({ class: 'absolute right-2 top-2 text-error text-sm' }, 'Invalid JSON'))
      ),
      !isReadonly() &&
        button(
          {
            onclick: () => {
              try {
                const parsed = JSON.parse(state.text)
                onUpdate(parsed)
              } catch (e) {
                console.error('Failed to update:', e)
              }
            },
            class: () => `btn btn-primary btn-sm w-full ${!state.isValid ? 'btn-disabled' : ''}`,
            disabled: () => !state.isValid,
          },
          `Update ${label}`
        )
    )
  )
}
