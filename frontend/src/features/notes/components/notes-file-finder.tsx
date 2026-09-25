import { Search } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useNavigate } from 'react-router'

import { Dialog, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { fuzzyRank } from '../lib/fuzzy-match'
import { useNotesVimContext } from '../notes-vim-context'
import { useNotesWorkspaceContext } from '../notes-workspace-context'

type FinderItem = {
  id: string
  name: string
  path: string
}

const MAX_RESULTS = 50

/**
 * Editor-level fuzzy file finder (accepts `space space` or `Ctrl/Cmd+P`).
 *
 * Searches every document across all vaults by name and path. `j`/`k` (or the
 * arrows) move the selection, `Enter` opens the document and returns focus to
 * the editor.
 */
export function NotesFileFinder() {
  const { documentsById } = useNotesWorkspaceContext()
  const { finderOpen, closeFinder, toggleFinder, editorFocusRef } = useNotesVimContext()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const wasOpen = useRef(false)

  const items = useMemo<FinderItem[]>(
    () =>
      Array.from(documentsById.values())
        .map((document) => ({ id: document.id, name: document.name, path: document.path }))
        .toSorted((a, b) => a.path.localeCompare(b.path)),
    [documentsById],
  )

  const results = useMemo(
    () => fuzzyRank(items, query, (item) => `${item.name} ${item.path}`).slice(0, MAX_RESULTS),
    [items, query],
  )

  const selectedIndex = results.length === 0 ? -1 : Math.min(activeIndex, results.length - 1)

  // Return focus to the editor once the dialog has actually closed.
  useEffect(() => {
    if (wasOpen.current && !finderOpen) {
      editorFocusRef.current?.()
    }
    wasOpen.current = finderOpen
  }, [finderOpen, editorFocusRef])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        toggleFinder()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleFinder])

  const select = (item: FinderItem | undefined) => {
    if (item === undefined) {
      return
    }
    closeFinder()
    void navigate(`/notes/${item.id}`)
  }

  const move = (delta: number) => {
    if (results.length === 0) {
      return
    }
    setActiveIndex((current) => {
      const next = current + delta
      if (next < 0) {
        return results.length - 1
      }
      if (next >= results.length) {
        return 0
      }
      return next
    })
  }

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || (event.ctrlKey && (event.key === 'j' || event.key === 'n'))) {
      event.preventDefault()
      move(1)
      return
    }
    if (event.key === 'ArrowUp' || (event.ctrlKey && (event.key === 'k' || event.key === 'p'))) {
      event.preventDefault()
      move(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      select(results[selectedIndex])
    }
  }

  return (
    <Dialog
      open={finderOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeFinder()
        }
      }}
    >
      <DialogPopup className='max-w-xl gap-2 p-3'>
        <DialogTitle className='sr-only'>File finder</DialogTitle>
        <div className='flex items-center gap-2 border-b pb-2'>
          <Search
            aria-hidden='true'
            className='size-4 text-muted-foreground'
          />
          <Input
            aria-label='Find file'
            autoFocus
            className='h-8 border-0 bg-transparent shadow-none focus-visible:ring-0'
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            placeholder='Find file by name or path'
            value={query}
          />
        </div>
        <ul className='flex max-h-80 flex-col gap-0.5 overflow-auto'>
          {results.length === 0 && (
            <li className='px-2 py-4 text-center text-sm text-muted-foreground'>No files found.</li>
          )}
          {results.map((item, index) => (
            <li key={item.id}>
              <button
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden',
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
                onClick={() => {
                  select(item)
                }}
                onMouseMove={() => {
                  setActiveIndex(index)
                }}
                type='button'
              >
                <span className='truncate'>{item.name}</span>
                <span className='ml-auto truncate text-xs text-muted-foreground'>{item.path}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogPopup>
    </Dialog>
  )
}
