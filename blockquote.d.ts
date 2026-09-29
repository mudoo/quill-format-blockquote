import type { Delta } from 'quill'
import Block from 'quill/blots/block.js'
import Container from 'quill/blots/container.js'
import type Clipboard from 'quill/modules/clipboard.js'

export declare function createBlockquoteGroup(): string
export declare function getBlockquotePath(value: unknown): string[]
export declare function matchBlockquote(node: Node, delta: Delta): Delta
export declare function addBlockquoteMatcher(clipboard: Clipboard): () => void

export declare class BlockquoteContainer extends Container {
  checkMerge(): boolean
  html(index?: number, length?: number): string
}

declare class Blockquote extends Block {
  static register(): void
  static create(value: unknown): HTMLElement
  static formats(domNode: HTMLElement): string | true
  format(name: string, value: unknown): void
}

export { Blockquote, Blockquote as default }
