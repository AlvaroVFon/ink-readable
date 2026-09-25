import { Vim } from '@replit/codemirror-vim'

export type VimLeaderHandlers = {
  toggleSidebar: () => void
  openFinder: () => void
}

let saveHandler: (() => void) | null = null
let leaderHandlers: VimLeaderHandlers = {
  toggleSidebar: () => {},
  openFinder: () => {},
}
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
 * Points the vim leader bindings (`<Space>e`, `<Space><Space>`) at the current
 * sidebar/finder actions. Mutable for the same reason as the save handler.
 */
export function setVimLeaderHandlers(handlers: VimLeaderHandlers): void {
  leaderHandlers = handlers
}

/**
 * Registers the vim ex commands and leader bindings once, regardless of how
 * many editors mount. `<Space>` becomes the leader, so it no longer moves the
 * cursor one character in normal mode (`l` still does).
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

  Vim.defineAction('inkToggleSidebar', () => {
    leaderHandlers.toggleSidebar()
  })
  Vim.defineAction('inkOpenFinder', () => {
    leaderHandlers.openFinder()
  })

  // The built-in `<Space>` maps to `l` as a *full* one-key match, and this vim
  // implementation prefers a full short match over a longer partial one, which
  // would make the `<Space>e` / `<Space><Space>` leader sequences unreachable.
  // Drop that default so `<Space>` stays a pending leader prefix. `Vim.unmap`
  // declares `ctx` as required, but the default mapping is context-less.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- pass undefined to match the context-less default mapping
  Vim.unmap('<Space>', undefined as unknown as string)

  Vim.mapCommand('<Space>e', 'action', 'inkToggleSidebar', {}, { context: 'normal' })
  Vim.mapCommand('<Space><Space>', 'action', 'inkOpenFinder', {}, { context: 'normal' })
}
