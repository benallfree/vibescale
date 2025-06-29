import van from 'vanjs-core'
import packageJson from '../../package.json'

const { div, nav, button, span, a } = van.tags

interface NavItem {
  text: string
  href: string
  isActive?: boolean
}

const navItems: NavItem[] = [
  // Intentionally empty
]

export const Navbar = () => {
  const isMenuOpen = van.state(false)

  const toggleMenu = () => {
    isMenuOpen.val = !isMenuOpen.val
    const mobileMenu = document.getElementById('mobile-menu')
    if (mobileMenu) {
      mobileMenu.classList.toggle('hidden')
    }
  }

  const renderNavItem = ({ text, href, isActive = false }: NavItem) => {
    return a(
      {
        href,
        'data-navigo': true,
        class: () =>
          `block px-4 py-2 text-sm md:text-base ${
            isActive ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'
          }`,
      },
      text
    )
  }

  return nav(
    {
      class: 'shadow-md w-full top-0 left-0 z-50 border-b border-gray-200',
    },
    [
      div(
        {
          class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        },
        [
          div(
            {
              class: 'flex justify-between items-center h-16',
            },
            [
              // Logo section
              div({ class: 'flex-shrink-0 flex items-center' }, [
                a(
                  {
                    href: '/',
                    'data-navigo': true,
                    class: 'text-xl font-bold text-primary',
                  },
                  `Vibescale`,
                  ' ',
                  span({ class: 'text-xs text-gray-500' }, `v${packageJson.version}`)
                ),
              ]),
              // Desktop navigation
              div(
                {
                  class: 'hidden md:flex md:items-center md:space-x-4',
                },
                navItems.map(renderNavItem)
              ),
              // Mobile menu button
              div({ class: 'md:hidden flex items-center' }, [
                button(
                  {
                    type: 'button',
                    class:
                      'inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary hover:bg-gray-100',
                    onclick: toggleMenu,
                    'aria-expanded': () => isMenuOpen.val,
                  },
                  [
                    span({ class: 'sr-only' }, 'Open main menu'),
                    // Hamburger icon
                    div({ class: 'block h-6 w-6' }, [
                      span({
                        class: 'block w-6 h-0.5 bg-current transform transition duration-500 ease-in-out',
                        style: 'margin-bottom: 0.5rem;',
                      }),
                      span({
                        class: 'block w-6 h-0.5 bg-current transform transition duration-500 ease-in-out',
                        style: 'margin-bottom: 0.5rem;',
                      }),
                      span({
                        class: 'block w-6 h-0.5 bg-current transform transition duration-500 ease-in-out',
                      }),
                    ]),
                  ]
                ),
              ]),
            ]
          ),
          // Mobile menu
          div(
            {
              id: 'mobile-menu',
              class: () => `${isMenuOpen.val ? '' : 'hidden'} md:hidden`,
            },
            [
              div(
                {
                  class: 'px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200',
                },
                navItems.map(renderNavItem)
              ),
            ]
          ),
        ]
      ),
    ]
  )
}
