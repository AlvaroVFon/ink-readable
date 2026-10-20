import { Check, Copy } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import type { LanguageOptions, OptionValue } from './lib/languages'

import { CodePane } from './components/code-pane'
import { SegmentedControl } from './components/segmented-control'
import { generateTypes } from './lib/generate'
import { getLanguage, languages, resolveOptions } from './lib/languages'
import { getStoredPreferences, storePreferences } from './lib/preferences'

const SAMPLE_JSON = `{
  "id": 42,
  "name": "Ada Lovelace",
  "email": null,
  "tags": ["math", "poetry"],
  "address": { "city": "London", "zip": "W1" },
  "projects": [
    { "title": "Analytical Engine", "year": 1843 },
    { "title": "Notes", "year": 1843, "pages": 65 }
  ]
}
`

async function loadJson() {
  const { json } = await import('@codemirror/lang-json')
  return json()
}

/** Generates type definitions (TypeScript, Go, ...) from a JSON sample. */
export function JsonTypesPage() {
  const [preferences, setPreferences] = useState(getStoredPreferences)
  const [input, setInput] = useState(SAMPLE_JSON)
  const deferredInput = useDeferredValue(input)
  const { copied, copy } = useCopyToClipboard()

  const language = getLanguage(preferences.languageId)
  const options = resolveOptions(language, preferences.options[language.id])

  useEffect(() => {
    storePreferences(preferences)
  }, [preferences])

  const optionsKey = JSON.stringify(options)
  const result = useMemo(
    () => generateTypes(deferredInput, language, preferences.rootName, options),
    // `options` is rebuilt every render; its serialized form is the real dependency.
    // oxlint-disable-next-line react/exhaustive-deps
    [deferredInput, language, preferences.rootName, optionsKey],
  )

  const setOption = (key: string, value: OptionValue) => {
    setPreferences((current) => {
      const next: LanguageOptions = { ...current.options[language.id], [key]: value }
      return { ...current, options: { ...current.options, [language.id]: next } }
    })
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <header className='flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-6 py-4'>
        <h1 className='text-xl font-semibold tracking-tight'>JSON → Types</h1>
        <SegmentedControl
          choices={languages.map(({ id, label }) => ({ value: id, label }))}
          label='Language'
          onChange={(languageId) => {
            setPreferences((current) => ({ ...current, languageId }))
          }}
          value={language.id}
        />
        <label className='flex items-center gap-2 text-sm'>
          Root type
          <Input
            className='w-36'
            onChange={(event) => {
              const rootName = event.target.value
              setPreferences((current) => ({ ...current, rootName }))
            }}
            value={preferences.rootName}
          />
        </label>
        {language.options.map((option) =>
          option.kind === 'boolean' ? (
            <div
              key={option.key}
              className='flex items-center gap-2 text-sm'
            >
              <Switch
                aria-label={option.label}
                checked={options[option.key] === true}
                onCheckedChange={(checked) => {
                  setOption(option.key, checked)
                }}
              />
              <span aria-hidden='true'>{option.label}</span>
            </div>
          ) : (
            <div
              key={option.key}
              className='flex items-center gap-2 text-sm'
            >
              {option.label}
              <SegmentedControl
                choices={option.choices}
                label={option.label}
                onChange={(value) => {
                  setOption(option.key, value)
                }}
                value={String(options[option.key])}
              />
            </div>
          ),
        )}
      </header>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <section className='flex min-h-0 flex-col border-b md:border-r md:border-b-0'>
          <h2 className='px-6 pt-3 text-sm font-medium text-muted-foreground'>JSON</h2>
          <CodePane
            label='JSON input'
            loadLanguage={loadJson}
            onChange={setInput}
            value={input}
          />
        </section>
        <section className='flex min-h-0 flex-col'>
          <div className='flex items-center justify-between px-6 pt-3'>
            <h2 className='text-sm font-medium text-muted-foreground'>{language.label}</h2>
            <Button
              disabled={!result.ok || result.code === ''}
              onClick={() => {
                if (result.ok) {
                  void copy(result.code)
                }
              }}
              size='sm'
              variant='ghost'
            >
              {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          {!result.ok && (
            <p
              className='mx-6 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
              role='alert'
            >
              {result.error}
            </p>
          )}
          <CodePane
            label='Generated code'
            loadLanguage={language.loadHighlighting}
            value={result.ok ? result.code : ''}
          />
        </section>
      </div>
    </div>
  )
}
