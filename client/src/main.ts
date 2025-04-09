console.log('Hello, world!')

import { marked } from 'marked'
import instructionsTemplate from './templates/instructions.md?raw'

// Configure marked options
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
})

interface Elements {
  roomNameInput: HTMLInputElement
  generateButton: HTMLButtonElement
  instructionsModal: HTMLDialogElement
  roomNameDisplay: HTMLSpanElement
  ragInstructions: HTMLElement
  copyButton: HTMLButtonElement
  copyCodeButton: HTMLButtonElement
  httpUrl: HTMLElement
  wsUrl: HTMLElement
}

const elements: Elements = {
  roomNameInput: document.getElementById('roomNameInput') as HTMLInputElement,
  generateButton: document.getElementById('generateButton') as HTMLButtonElement,
  instructionsModal: document.getElementById('instructionsModal') as HTMLDialogElement,
  roomNameDisplay: document.getElementById('roomNameDisplay') as HTMLSpanElement,
  ragInstructions: document.getElementById('ragInstructions') as HTMLElement,
  copyButton: document.getElementById('copyButton') as HTMLButtonElement,
  copyCodeButton: document.getElementById('copyCodeButton') as HTMLButtonElement,
  httpUrl: document.getElementById('httpUrl') as HTMLElement,
  wsUrl: document.getElementById('wsUrl') as HTMLElement,
}

// Store the original markdown for copying
let currentMarkdown = ''

function generateUrls(roomName: string): { http: string; ws: string } {
  return {
    http: `https://vibescale.benallfree.com/${roomName}`,
    ws: `wss://vibescale.benallfree.com/${roomName}`,
  }
}

function generateInstructions(roomName: string): string {
  const baseUrl = window.location.origin

  // Replace template variables
  return instructionsTemplate.replace(/{{roomName}}/g, roomName).replace(/{{baseUrl}}/g, baseUrl)
}

function setupEventListeners() {
  // Input validation
  elements.roomNameInput.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement
    const validationIndicator = document.getElementById('validationIndicator')

    // Remove invalid characters
    input.value = input.value.replace(/[^a-zA-Z0-9-]/g, '')

    // Check if input is valid (not empty and matches pattern)
    const isValid = input.value.length > 0 && /^[a-zA-Z0-9-]+$/.test(input.value)

    // Update validation indicator
    if (validationIndicator) {
      validationIndicator.classList.toggle('hidden', isValid)
    }

    // Update button state
    elements.generateButton.disabled = !isValid
  })

  // Generate button click handler
  elements.generateButton.addEventListener('click', async () => {
    const roomName = elements.roomNameInput.value.trim()
    if (!roomName) return

    const urls = generateUrls(roomName)
    elements.roomNameDisplay.textContent = roomName
    elements.httpUrl.textContent = urls.http
    elements.wsUrl.textContent = urls.ws

    // Store original markdown and render HTML version
    currentMarkdown = generateInstructions(roomName)
    elements.ragInstructions.innerHTML = `<div class="prose prose-invert max-w-none">${await marked(currentMarkdown)}</div>`

    elements.instructionsModal.showModal()
  })

  // Copy button handler
  elements.copyButton.addEventListener('click', () => {
    const urls = generateUrls(elements.roomNameDisplay.textContent || '')
    const textToCopy = `Room URLs:\n${urls.http}\n${urls.ws}\n\nInstructions:\n${currentMarkdown}`
    navigator.clipboard.writeText(textToCopy)
    elements.copyButton.textContent = 'Copied!'
    setTimeout(() => {
      elements.copyButton.textContent = 'Copy Instructions'
    }, 2000)
  })

  // Copy code button handler
  elements.copyCodeButton.addEventListener('click', () => {
    navigator.clipboard.writeText(currentMarkdown)

    // Visual feedback
    const originalSvg = elements.copyCodeButton.innerHTML
    elements.copyCodeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    `
    elements.copyCodeButton.classList.remove('text-gray-400')
    elements.copyCodeButton.classList.add('text-green-500')

    setTimeout(() => {
      elements.copyCodeButton.innerHTML = originalSvg
      elements.copyCodeButton.classList.remove('text-green-500')
      elements.copyCodeButton.classList.add('text-gray-400')
    }, 2000)
  })

  // Enter key handler for input
  elements.roomNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.generateButton.click()
    }
  })
}

// Initialize the app
setupEventListeners()

// Check for room parameter in URL and show instructions if present
const urlParams = new URLSearchParams(window.location.search)
const roomFromUrl = urlParams.get('room')
if (roomFromUrl) {
  // Set the input value
  elements.roomNameInput.value = roomFromUrl

  // Trigger input validation
  elements.roomNameInput.dispatchEvent(new Event('input'))

  // If valid, show the modal
  if (!elements.generateButton.disabled) {
    ;(async () => {
      const urls = generateUrls(roomFromUrl)
      elements.roomNameDisplay.textContent = roomFromUrl
      elements.httpUrl.textContent = urls.http
      elements.wsUrl.textContent = urls.ws

      // Store original markdown and render HTML version
      currentMarkdown = generateInstructions(roomFromUrl)
      elements.ragInstructions.innerHTML = `<div class="prose prose-invert max-w-none">${await marked(currentMarkdown)}</div>`

      elements.instructionsModal.showModal()
    })()
  }
}
