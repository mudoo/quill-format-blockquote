import assert from 'node:assert/strict'
import { after, afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
const globals = ['window', 'document', 'DOMParser', 'Node', 'NodeFilter', 'Element', 'HTMLElement', 'Text', 'MutationObserver', 'navigator']
const descriptors = new Map(globals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
for (const name of globals) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true })
}

const { default: Quill } = await import('quill')
const originalBlockquote = Quill.import('formats/blockquote')
const { default: Blockquote, BlockquoteContainer, matchBlockquote, addBlockquoteMatcher } = await import('quill-format-blockquote')

afterEach(() => document.body.replaceChildren())
after(() => {
  dom.window.close()
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

function createEditor({ html = '', matchers = [['blockquote', matchBlockquote]], formats } = {}) {
  const element = document.createElement('div')
  element.innerHTML = html
  document.body.append(element)
  return new Quill(element, { formats, modules: { toolbar: false, clipboard: { matchers } } })
}

test('import is passive and registering the format also registers its container', () => {
  assert.equal(Quill.import('formats/blockquote'), originalBlockquote)
  Quill.register(Blockquote, true)
  assert.equal(Quill.import('formats/blockquote-container'), BlockquoteContainer)

  const quill = createEditor({ formats: ['blockquote'] })
  quill.setText('first\nsecond\n')
  quill.formatLine(0, quill.getLength(), 'blockquote', true)
  assert.equal(quill.root.querySelectorAll('blockquote').length, 1)
  assert.equal(quill.getSemanticHTML(), '<blockquote><p>first</p><p>second</p></blockquote>')
  quill.formatLine(0, quill.getLength(), 'blockquote', false)
  assert.equal(quill.root.querySelectorAll('blockquote').length, 0)
})

test('initial HTML preserves paragraphs, sibling roots and three nested levels without Markdown', () => {
  const html = '<blockquote><p>parent</p><p>second</p><blockquote><p>child</p><blockquote><p>deep</p></blockquote></blockquote><p>back</p></blockquote><blockquote><p>separate</p></blockquote>'
  const quill = createEditor({ html })
  assert.equal(quill.root.querySelectorAll(':scope > blockquote').length, 2)
  assert.equal(quill.root.querySelector('[data-blockquote-depth="3"]').textContent, 'deep')
  assert.equal(quill.getSemanticHTML(), html)

  const restored = createEditor()
  restored.setContents(quill.getContents())
  assert.equal(restored.getSemanticHTML(), html)
  restored.setContents(restored.clipboard.convert({ html: quill.getSemanticHTML() }))
  assert.equal(restored.getSemanticHTML(), html)
})

test('partial selection preserves inline formatting and escapes text', () => {
  const quill = createEditor({ html: '<blockquote><p><strong>alpha beta</strong> &amp; &lt;x&gt;</p><p>other</p></blockquote>' })
  assert.equal(quill.getSemanticHTML(6, 4), '<strong>beta</strong>')
  assert.equal(quill.getSemanticHTML(6, 13), '<blockquote><p><strong>beta</strong> &amp; &lt;x&gt;</p><p>ot</p></blockquote>')
  assert.match(quill.getSemanticHTML(), /&amp;.*&lt;x&gt;/)
})

test('updating a quote path changes depth and keeps separate root groups', () => {
  const quill = createEditor({ html: '<blockquote><p>first</p><p>second</p></blockquote>' })
  quill.formatLine(6, 1, 'blockquote', 'separate/child')
  assert.equal(quill.root.querySelector('[data-blockquote-depth="2"]').textContent, 'second')
  assert.equal(quill.getSemanticHTML(), '<blockquote><p>first</p></blockquote><blockquote><blockquote><p>second</p></blockquote></blockquote>')
})

test('matcher cleanup preserves host configuration and other editor instances', () => {
  const html = '<blockquote><blockquote><p>child</p></blockquote></blockquote>'
  const host = createEditor()
  const hostMatcherCount = host.clipboard.matchers.length
  const removeHost = addBlockquoteMatcher(host.clipboard)
  removeHost()
  assert.equal(host.clipboard.matchers.length, hostMatcherCount)
  host.setContents(host.clipboard.convert({ html }))
  assert.equal(host.getSemanticHTML(), html)

  const owned = createEditor({ matchers: [] })
  const originalCount = owned.clipboard.matchers.length
  const removeOwned = addBlockquoteMatcher(owned.clipboard)
  owned.setContents(owned.clipboard.convert({ html }))
  assert.equal(owned.getSemanticHTML(), html)
  removeOwned()
  removeOwned()
  assert.equal(owned.clipboard.matchers.length, originalCount)
  assert.equal(host.clipboard.matchers.length, hostMatcherCount)
})
