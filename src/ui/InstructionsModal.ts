import { marked } from 'marked'
import Prism from 'prismjs'

// Import additional Prism languages
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'

// Configure marked options
const renderer = new marked.Renderer()
renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) => {
  if (lang && Prism.languages[lang]) {
    try {
      return `<pre><code class="language-${lang}">${Prism.highlight(text, Prism.languages[lang], lang)}</code></pre>`
    } catch (err) {
      console.error('Prism highlighting error:', err)
    }
  }
  return `<pre><code>${text}</code></pre>`
}

marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
  renderer: renderer,
})

export class InstructionsModal {
  private modal: HTMLDialogElement
  private roomNameDisplay: HTMLSpanElement
  private ragInstructions: HTMLElement
  private copyButton: HTMLButtonElement
  private copyCodeButton: HTMLButtonElement
  private httpUrl: HTMLElement
  private wsUrl: HTMLElement
  private currentMarkdown: string = ''

  constructor(
    private instructionsTemplate: string,
    private typesTemplate: string,
    private stateChangeDetectorTemplate: string
  ) {
    this.modal = document.getElementById('instructionsModal') as HTMLDialogElement
    this.roomNameDisplay = document.getElementById('roomNameDisplay') as HTMLSpanElement
    this.ragInstructions = document.getElementById('ragInstructions') as HTMLElement
    this.copyButton = document.getElementById('copyButton') as HTMLButtonElement
    this.copyCodeButton = document.getElementById('copyCodeButton') as HTMLButtonElement
    this.httpUrl = document.getElementById('httpUrl') as HTMLElement
    this.wsUrl = document.getElementById('wsUrl') as HTMLElement

    this.setupEventListeners()
  }

  private generateUrls(roomName: string): { http: string; ws: string } {
    return {
      http: `https://vibescale.benallfree.com/${roomName}`,
      ws: `wss://vibescale.benallfree.com/${roomName}`,
    }
  }

  private generateInstructions(roomName: string): string {
    const baseUrl = window.location.origin

    // Replace template variables
    const vars = {
      roomName,
      baseUrl,
      typesTemplate: this.typesTemplate,
      stateChangeDetectorTemplate: this.stateChangeDetectorTemplate,
    }
    return Object.entries(vars).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{{${key}}}`, 'gm'), value)
    }, this.instructionsTemplate)
  }

  private setupEventListeners() {
    // Copy button handler
    this.copyButton.addEventListener('click', () => {
      const urls = this.generateUrls(this.roomNameDisplay.textContent || '')
      const textToCopy = `Room URLs:\n${urls.http}\n${urls.ws}\n\nInstructions:\n${this.currentMarkdown}`
      navigator.clipboard.writeText(textToCopy)
      this.copyButton.textContent = 'Copied!'
      setTimeout(() => {
        this.copyButton.textContent = 'Copy Instructions'
      }, 2000)
    })

    // Copy code button handler
    this.copyCodeButton.addEventListener('click', () => {
      navigator.clipboard.writeText(this.currentMarkdown)

      // Visual feedback
      const originalSvg = this.copyCodeButton.innerHTML
      this.copyCodeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      `
      this.copyCodeButton.classList.remove('text-gray-400')
      this.copyCodeButton.classList.add('text-green-500')

      setTimeout(() => {
        this.copyCodeButton.innerHTML = originalSvg
        this.copyCodeButton.classList.remove('text-green-500')
        this.copyCodeButton.classList.add('text-gray-400')
      }, 2000)
    })
  }

  public async show(roomName: string): Promise<void> {
    const urls = this.generateUrls(roomName)
    this.roomNameDisplay.textContent = roomName
    this.httpUrl.textContent = urls.http
    this.wsUrl.textContent = urls.ws

    // Store original markdown and render HTML version
    this.currentMarkdown = this.generateInstructions(roomName)
    this.ragInstructions.innerHTML = `<div class="prose prose-invert max-w-none">${await marked(this.currentMarkdown)}</div>`

    this.modal.showModal()
  }
}
