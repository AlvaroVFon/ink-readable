import { Check, Copy } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { ToolField, ToolHeader } from '@/features/tools/components/tool-header'
import { ToolPane } from '@/features/tools/components/tool-pane'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import type { LanguageOptions, OptionValue } from './lib/languages'

import { CodePane } from './components/code-pane'
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
      <ToolHeader
        description='Turn a JSON sample into TypeScript or Go types.'
        title='JSON → Types'
      >
        <ToolField label='Language'>
          <SegmentedControl
            choices={languages.map(({ id, label }) => ({ value: id, label }))}
            label='Language'
            onChange={(languageId) => {
              setPreferences((current) => ({ ...current, languageId }))
            }}
            value={language.id}
          />
        </ToolField>
        <ToolField label='Root type'>
          <Input
            aria-label='Root type'
            className='h-7 w-36 text-xs'
            onChange={(event) => {
              const rootName = event.target.value
              setPreferences((current) => ({ ...current, rootName }))
            }}
            value={preferences.rootName}
          />
        </ToolField>
        {language.options.map((option) =>
          option.kind === 'boolean' ? (
            <div
              key={option.key}
              className='flex items-center gap-2 text-xs'
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
            <ToolField
              key={option.key}
              label={option.label}
            >
              <SegmentedControl
                choices={option.choices}
                label={option.label}
                onChange={(value) => {
                  setOption(option.key, value)
                }}
                value={String(options[option.key])}
              />
            </ToolField>
          ),
        )}
      </ToolHeader>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <ToolPane
          className='border-b border-rule/70 md:border-r md:border-b-0'
          title='JSON'
        >
          <CodePane
            label='JSON input'
            loadLanguage={loadJson}
            onChange={setInput}
            value={input}
          />
        </ToolPane>
        <ToolPane
          actions={
            <Button
              disabled={!result.ok || result.code === ''}
              onClick={() => {
                if (result.ok) {
                  void copy(result.code)
                }
              }}
              size='xs'
              variant='ghost'
            >
              {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          }
          title={language.label}
        >
          {!result.ok && (
            <p
              className='shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'
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
        </ToolPane>
      </div>
    </div>
  )
}
