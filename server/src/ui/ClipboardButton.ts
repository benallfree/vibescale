import van from 'vanjs-core'

const { button } = van.tags

const { svg, path } = van.tags('http://www.w3.org/2000/svg')

interface ClipboardButtonProps {
  text: string
  title?: string
}

export const ClipboardButton = ({ text, title = 'Copy to Clipboard' }: ClipboardButtonProps) => {
  const isChecked = van.state(false)

  const copyIcon = svg(
    {
      class: 'h-4 w-4',
      viewBox: '0 0 20 20',
      fill: 'currentColor',
    },
    path({ d: 'M8 2a1 1 0 000 2h2a1 1 0 100-2H8z' }),
    path({
      d: 'M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5z',
    })
  )

  const checkIcon = svg(
    {
      class: 'h-4 w-4',
      viewBox: '0 0 20 20',
      fill: 'currentColor',
    },
    path({ d: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' }),
    path({
      d: 'M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
      'clip-rule': 'evenodd',
    })
  )

  return button(
    {
      class: 'btn btn-ghost btn-sm btn-square text-base-content',
      title,
      onclick: async (e: Event) => {
        await navigator.clipboard.writeText(text)
        isChecked.val = true
        setTimeout(() => {
          console.log('resetting isChecked', isChecked.val)
          isChecked.val = false
        }, 2000)
      },
    },
    () => (isChecked.val ? checkIcon : copyIcon)
  )
}
