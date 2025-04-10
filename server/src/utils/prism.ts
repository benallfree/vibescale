import { marked } from 'marked'
import Prism from 'prismjs'

// Configure marked options with proper Prism integration
const renderer = new marked.Renderer()
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && Prism.languages[lang]) {
    const highlighted = Prism.highlight(text, Prism.languages[lang], lang)
    return `<pre><code class="language-${lang}">${highlighted}</code></pre>`
  }
  return `<pre><code>${text}</code></pre>`
}

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
})

export const renderMarkdown = (text: string, lang?: string) => {
  if (lang) {
    return marked('```' + lang + '\n' + text + '\n```', { async: false })
  }
  return marked(text, { async: false })
}
