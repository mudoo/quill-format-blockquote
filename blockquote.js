import Quill from 'quill'

const Block = Quill.import('blots/block')
const Container = Quill.import('blots/container')

// A session prefix prevents newly pasted quotes from merging with restored Delta groups.
const groupPrefix = Date.now().toString(36)
let groupSequence = 0

export function createBlockquoteGroup() {
  return `blockquote-${groupPrefix}-${++groupSequence}`
}

export function getBlockquotePath(value) {
  return typeof value === 'string' ? value.split('/') : ['blockquote']
}

export function matchBlockquote(_node, delta) {
  const Delta = Quill.import('delta')
  const group = createBlockquoteGroup()
  return delta.reduce((result, op) => {
    if (!op.insert) return result.push(op)
    const child = op.attributes?.blockquote
    const blockquote = typeof child === 'string' ? `${group}/${child}` : group
    return result.insert(op.insert, { ...op.attributes, blockquote })
  }, new Delta())
}

export function addBlockquoteMatcher(clipboard) {
  // A host may already configure this matcher before installing the Markdown module.
  if (clipboard.matchers.some(([selector, matcher]) => (
    typeof selector === 'string' && selector.toLowerCase() === 'blockquote' && matcher === matchBlockquote
  ))) return () => {}

  // Use an instance-local wrapper so cleanup only removes the caller's matcher.
  const matcher = (node, delta) => matchBlockquote(node, delta)
  clipboard.addMatcher('blockquote', matcher)
  return () => {
    const index = clipboard.matchers.findIndex((entry) => entry[1] === matcher)
    if (index !== -1) clipboard.matchers.splice(index, 1)
  }
}

function inlineHtml(blot, index, length) {
  const { TextBlot, ParentBlot } = Quill.import('parchment')
  if (typeof blot.html === 'function') return blot.html(index, length)
  if (blot instanceof TextBlot) {
    const span = document.createElement('span')
    span.textContent = blot.value().slice(index, index + length)
    return span.innerHTML
  }
  if (blot instanceof ParentBlot) {
    const clone = blot.domNode.cloneNode(false)
    let content = ''
    blot.children.forEachAt(index, length, (child, offset, childLength) => {
      content += inlineHtml(child, offset, childLength)
    })
    clone.innerHTML = content
    return clone.outerHTML
  }
  return blot.domNode instanceof Element ? blot.domNode.outerHTML : ''
}

class BlockquoteContainer extends Container {
  checkMerge() {
    if (!super.checkMerge()) return false
    const currentPath = getBlockquotePath(this.children.tail?.formats().blockquote)
    const nextPath = getBlockquotePath(this.next?.children.head?.formats().blockquote)
    return currentPath[0] === nextPath[0]
  }

  html(index = 0, length = this.length()) {
    let html = ''
    let previousPath = []

    // Quill also calls this serializer for a copied selection, which may cover part of a line.
    this.children.forEachAt(index, length, (child, offset, childLength) => {
      const path = getBlockquotePath(child.formats().blockquote)
      let commonDepth = 0
      while (commonDepth < previousPath.length && previousPath[commonDepth] === path[commonDepth]) {
        commonDepth++
      }

      html += '</blockquote>'.repeat(previousPath.length - commonDepth)
      html += '<blockquote>'.repeat(path.length - commonDepth)
      let content = ''
      child.children.forEachAt(offset, childLength, (inline, inlineOffset, inlineLength) => {
        content += inlineHtml(inline, inlineOffset, inlineLength)
      })
      html += `<p>${content}</p>`
      previousPath = path
    })

    return html + '</blockquote>'.repeat(previousPath.length)
  }
}

class Blockquote extends Block {
  static register() {
    Quill.register(BlockquoteContainer, true)
  }

  static create(value) {
    const domNode = super.create(value)
    const path = getBlockquotePath(value)
    domNode.dataset.blockquoteGroup = path.join('/')
    domNode.dataset.blockquoteDepth = String(path.length)
    domNode.style.setProperty('--blockquote-depth', String(path.length - 1))
    return domNode
  }

  static formats(domNode) {
    return domNode.dataset.blockquoteGroup || true
  }

  format(name, value) {
    if (name === this.statics.blotName && value) {
      const path = getBlockquotePath(value)
      this.domNode.dataset.blockquoteGroup = path.join('/')
      this.domNode.dataset.blockquoteDepth = String(path.length)
      this.domNode.style.setProperty('--blockquote-depth', String(path.length - 1))
    } else {
      super.format(name, value)
    }
  }
}

Blockquote.blotName = 'blockquote'
Blockquote.className = 'ql-blockquote-line'
Blockquote.tagName = 'P'
Blockquote.requiredContainer = BlockquoteContainer

BlockquoteContainer.blotName = 'blockquote-container'
BlockquoteContainer.tagName = 'BLOCKQUOTE'
BlockquoteContainer.allowedChildren = [Blockquote]

export { BlockquoteContainer, Blockquote, Blockquote as default }
