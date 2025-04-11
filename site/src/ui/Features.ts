import van from 'vanjs-core'

const { section, div, h1, p } = van.tags

export const Features = () =>
  section(
    { class: 'container mx-auto px-4 py-16' },
    div(
      { class: 'grid md:grid-cols-3 gap-8' },
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'Instant WebSocket Server'),
          p({}, 'Ready-to-use WebSocket server for real-time multiplayer functionality')
        )
      ),
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'AI-Ready Context'),
          p({}, 'LLM-friendly RAG context for seamless AI integration')
        )
      ),
      div(
        { class: 'card bg-base-200' },
        div(
          { class: 'card-body' },
          h1({ class: 'card-title' }, 'Zero Backend Deploy'),
          p({}, 'Focus on your game logic - we handle all the infrastructure')
        )
      )
    )
  )
