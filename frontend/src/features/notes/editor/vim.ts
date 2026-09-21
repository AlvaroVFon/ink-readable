import { Vim } from '@replit/codemirror-vim'

let saveHandler: (() => void) | null = null
let commandsRegistered = false

/**
 * Points the vim `:w` / `:wq` commands at the current document's save action.
 *
 * The handler is mutable because the editor is remounted per document while
 * the vim command registry is a process-wide singleton.
 */
export function setVimSaveHandler(handler: () => void): void {
  saveHandler = handler
}

/**
 * Registers the vim ex commands once, regardless of how many editors mount.
 */
export function registerVimCommands(): void {
  if (commandsRegistered) {
    return
  }
  commandsRegistered = true

  const save = () => {
    saveHandler?.()
  }

  Vim.defineEx('write', 'w', save)
  Vim.defineEx('wq', 'wq', save)
}
