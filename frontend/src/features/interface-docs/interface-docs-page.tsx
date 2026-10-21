import { Check, Copy } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CodePane } from '@/features/json-types/components/code-pane'
import { NotesExportMenu } from '@/features/notes/components/notes-export-menu'
import { PrintableNote } from '@/features/notes/export/printable-note'
import { useExportNote } from '@/features/notes/export/use-export-note'
import { MarkdownPreview } from '@/features/notes/preview/markdown-preview'
import { ToolField, ToolHeader } from '@/features/tools/components/tool-header'
import { ToolPane } from '@/features/tools/components/tool-pane'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import type { InterfaceDocsPreferences } from './lib/preferences'

import { DocHeaderImage } from './components/doc-header-image'
import { DocSettingsPopover } from './components/doc-settings-popover'
import { generateDocs } from './lib/generate'
import { getMessages } from './lib/messages'
import {
  getStoredHeaderImage,
  getStoredPreferences,
  storeHeaderImage,
  storePreferences,
} from './lib/preferences'
import { getSourceLanguage, sourceLanguages } from './lib/sources'
import { typographyStyle } from './lib/typography'

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
  // Not persisted: a remembered date would go stale; it starts as today each visit.
  const [date, setDate] = useState(today)
  const [headerImage, setHeaderImage] = useState(getStoredHeaderImage)

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

  const changeHeaderImage = (image: string | null) => {
    setHeaderImage(image)
    storeHeaderImage(image)
  }

  const typography = useMemo(
    () => typographyStyle(preferences.typography),
    [preferences.typography],
  )
  const header =
    headerImage === null ? null : (
      <DocHeaderImage
        fit={preferences.headerImageFit}
        height={preferences.headerImageHeight}
        src={headerImage}
      />
    )

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
      <ToolHeader
        actions={
          <DocSettingsPopover
            headerImage={headerImage}
            onChange={update}
            onHeaderImageChange={changeHeaderImage}
            preferences={preferences}
          />
        }
        description='Turn TypeScript or Go declarations into a Markdown contract, ready to export as PDF.'
        title='Interfaces → Docs'
      >
        <ToolField label='Source'>
          <SegmentedControl
            choices={sourceLanguages.map(({ id, label }) => ({ value: id, label }))}
            label='Source language'
            onChange={(sourceId) => {
              update({ sourceId })
            }}
            value={language.id}
          />
        </ToolField>
        <ToolField label='Title'>
          <Input
            aria-label='Title'
            className='h-7 w-48 text-xs'
            onChange={(event) => {
              update({ title: event.target.value })
            }}
            placeholder={getMessages(locale).defaultTitle}
            value={title}
          />
        </ToolField>
        <ToolField label='Version'>
          <Input
            aria-label='Version'
            className='h-7 w-24 text-xs'
            onChange={(event) => {
              update({ version: event.target.value })
            }}
            value={version}
          />
        </ToolField>
        <ToolField label='Date'>
          <Input
            aria-label='Date'
            className='h-7 w-40 text-xs'
            onChange={(event) => {
              setDate(event.target.value)
            }}
            type='date'
            value={date}
          />
        </ToolField>
      </ToolHeader>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <ToolPane
          className='border-b border-rule/70 md:border-r md:border-b-0'
          title={language.label}
        >
          <CodePane
            key={language.id}
            label='Interface source'
            loadLanguage={language.loadHighlighting}
            onChange={(value) => {
              setDrafts((current) => ({ ...current, [language.id]: value }))
            }}
            value={source}
          />
        </ToolPane>
        <ToolPane
          actions={
            <>
              {exportError !== null && (
                <span
                  className='mr-1 text-[11px] text-destructive'
                  role='status'
                >
                  {exportError}
                </span>
              )}
              <SegmentedControl
                choices={VIEWS}
                label='Output view'
                onChange={(view) => {
                  update({ view: view === 'markdown' ? 'markdown' : 'preview' })
                }}
                value={preferences.view}
              />
              <Button
                disabled={markdown === ''}
                onClick={() => {
                  void copy(markdown)
                }}
                size='xs'
                variant='ghost'
              >
                {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
                {copied ? 'Copied' : 'Copy'}
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
            </>
          }
          bare={preferences.view === 'preview'}
          title={preferences.view === 'markdown' ? 'Markdown' : 'Preview'}
        >
          {!result.ok && (
            <p
              className='shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'
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
              className='min-h-0 flex-1 overflow-auto bg-desk/40 p-4'
              role='region'
              style={typography}
            >
              <article className='mx-auto max-w-4xl overflow-hidden rounded-xl border border-rule/80 bg-paper shadow-[0_12px_32px_-24px_rgb(0_0_0/0.35)]'>
                {header !== null && <div className='px-6 pt-6'>{header}</div>}
                <MarkdownPreview content={markdown} />
              </article>
            </div>
          )}
        </ToolPane>
      </div>
      {printJob !== null && (
        <PrintableNote
          key={printJob.id}
          content={printJob.content}
          header={header}
          onReady={() => {
            void print()
          }}
          paginated
          style={typography}
        />
      )}
    </div>
  )
}
