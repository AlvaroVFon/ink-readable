import { Check, Copy } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { CodePane } from '@/features/json-types/components/code-pane'
import { SegmentedControl } from '@/features/json-types/components/segmented-control'
import { NotesExportMenu } from '@/features/notes/components/notes-export-menu'
import { PrintableNote } from '@/features/notes/export/printable-note'
import { useExportNote } from '@/features/notes/export/use-export-note'
import { MarkdownPreview } from '@/features/notes/preview/markdown-preview'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import type { InterfaceDocsPreferences } from './lib/preferences'

import { generateDocs } from './lib/generate'
import { DOC_LOCALES, getMessages } from './lib/messages'
import { getStoredPreferences, storePreferences } from './lib/preferences'
import { getSourceLanguage, sourceLanguages } from './lib/sources'

const VIEWS = [
  { value: 'preview', label: 'Preview' },
  { value: 'markdown', label: 'Markdown' },
]

async function loadMarkdown() {
  const { markdown } = await import('@codemirror/lang-markdown')
  return markdown()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Today as `YYYY-MM-DD` in local time. */
function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

type Toggle = { key: 'tableOfContents' | 'examples'; label: string }

const TOGGLES: Toggle[] = [
  { key: 'tableOfContents', label: 'Table of contents' },
  { key: 'examples', label: 'JSON examples' },
]

/**
 * Turns interface declarations (TypeScript, Go, ...) into a Markdown document
 * to agree on the contract with a third party.
 */
export function InterfaceDocsPage() {
  const [preferences, setPreferences] = useState(getStoredPreferences)
  // One draft per language: switching languages keeps what was typed in each.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const { copied, copy } = useCopyToClipboard()

  const language = getSourceLanguage(preferences.sourceId)
  const source = drafts[language.id] ?? language.sample
  const deferredSource = useDeferredValue(source)
  const [date] = useState(today)

  useEffect(() => {
    storePreferences(preferences)
  }, [preferences])

  const { title, version, locale, tableOfContents, examples } = preferences
  const result = useMemo(
    () =>
      generateDocs(deferredSource, language, {
        title,
        version,
        date,
        locale,
        tableOfContents,
        examples,
      }),
    [deferredSource, language, title, version, date, locale, tableOfContents, examples],
  )
  const markdown = result.ok ? result.markdown : ''

  const update = (changes: Partial<InterfaceDocsPreferences>) => {
    setPreferences((current) => ({ ...current, ...changes }))
  }

  const getMarkdown = useCallback(() => markdown, [markdown])
  const {
    exportMarkdown,
    exportPdf,
    print,
    printJob,
    error: exportError,
  } = useExportNote({
    name: title.trim() === '' ? getMessages(locale).defaultTitle : title,
    getContent: getMarkdown,
  })

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <header className='flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-6 py-4'>
        <h1 className='text-xl font-semibold tracking-tight'>Interfaces → Docs</h1>
        <SegmentedControl
          choices={sourceLanguages.map(({ id, label }) => ({ value: id, label }))}
          label='Source language'
          onChange={(sourceId) => {
            update({ sourceId })
          }}
          value={language.id}
        />
        <label className='flex items-center gap-2 text-sm'>
          Title
          <Input
            className='w-48'
            onChange={(event) => {
              update({ title: event.target.value })
            }}
            placeholder={getMessages(locale).defaultTitle}
            value={title}
          />
        </label>
        <label className='flex items-center gap-2 text-sm'>
          Version
          <Input
            className='w-24'
            onChange={(event) => {
              update({ version: event.target.value })
            }}
            value={version}
          />
        </label>
        <div className='flex items-center gap-2 text-sm'>
          Document language
          <SegmentedControl
            choices={[...DOC_LOCALES]}
            label='Document language'
            onChange={(value) => {
              update({ locale: value })
            }}
            value={locale}
          />
        </div>
        {TOGGLES.map(({ key, label }) => (
          <div
            key={key}
            className='flex items-center gap-2 text-sm'
          >
            <Switch
              aria-label={label}
              checked={preferences[key]}
              onCheckedChange={(checked) => {
                update({ [key]: checked })
              }}
            />
            <span aria-hidden='true'>{label}</span>
          </div>
        ))}
      </header>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <section className='flex min-h-0 flex-col border-b md:border-r md:border-b-0'>
          <h2 className='px-6 pt-3 text-sm font-medium text-muted-foreground'>{language.label}</h2>
          <CodePane
            key={language.id}
            label='Interface source'
            loadLanguage={language.loadHighlighting}
            onChange={(value) => {
              setDrafts((current) => ({ ...current, [language.id]: value }))
            }}
            value={source}
          />
        </section>
        <section className='flex min-h-0 flex-col'>
          <div className='flex flex-wrap items-center justify-between gap-2 px-6 pt-3'>
            <SegmentedControl
              choices={VIEWS}
              label='Output view'
              onChange={(view) => {
                update({ view: view === 'markdown' ? 'markdown' : 'preview' })
              }}
              value={preferences.view}
            />
            <div className='flex items-center gap-1'>
              {exportError !== null && (
                <span
                  className='text-xs text-destructive'
                  role='status'
                >
                  {exportError}
                </span>
              )}
              <Button
                disabled={markdown === ''}
                onClick={() => {
                  void copy(markdown)
                }}
                size='sm'
                variant='ghost'
              >
                {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <NotesExportMenu
                disabled={markdown === ''}
                label='Export document'
                onSelect={(format) => {
                  if (format === 'markdown') {
                    void exportMarkdown()
                  } else {
                    exportPdf()
                  }
                }}
              />
            </div>
          </div>
          {!result.ok && (
            <p
              className='mx-6 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
              role='alert'
            >
              {result.error}
            </p>
          )}
          {preferences.view === 'markdown' ? (
            <CodePane
              label='Generated Markdown'
              loadLanguage={loadMarkdown}
              value={markdown}
            />
          ) : (
            <div
              aria-label='Document preview'
              className='min-h-0 flex-1 overflow-auto px-6 py-4'
              role='region'
            >
              <MarkdownPreview content={markdown} />
            </div>
          )}
        </section>
      </div>
      {printJob !== null && (
        <PrintableNote
          key={printJob.id}
          content={printJob.content}
          onReady={() => {
            void print()
          }}
        />
      )}
    </div>
  )
}
