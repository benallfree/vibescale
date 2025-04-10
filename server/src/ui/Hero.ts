import van from 'vanjs-core'

const { header, h1, p } = van.tags

export const Hero = () =>
  header(
    { class: 'container mx-auto px-4 py-8 text-center' },
    h1(
      { class: 'text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text' },
      'Vibescale'
    ),
    p({ class: 'text-2xl mb-8 text-gray-300' }, 'Build MMO games without the backend hassle')
  )
