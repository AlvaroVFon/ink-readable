import { ImagePlus, Settings2, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { SegmentedControl } from '@/features/json-types/components/segmented-control'

import type { InterfaceDocsPreferences } from '../lib/preferences'
import type { Typography } from '../lib/typography'

import { DOC_LOCALES } from '../lib/messages'
import { DEFAULT_TYPOGRAPHY, FONT_FAMILIES, TYPOGRAPHY_LIMITS } from '../lib/typography'

/** Larger images bloat the preferences and the PDF without adding anything. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const selectClassName =
  'h-8 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-3'>
      <h3 className='font-heading text-sm font-medium'>{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-3 text-sm'>
      <span aria-hidden='true'>{label}</span>
      {children}
    </div>
  )
}

type NumberFieldProps = {
  label: string
  value: number
  limits: { min: number; max: number; step: number }
  unit: string
  onChange: (value: number) => void
}

function NumberField({ label, value, limits, unit, onChange }: NumberFieldProps) {
  return (
    <Row label={label}>
      <span className='flex items-center gap-2'>
        <input
          aria-label={label}
          className='w-28 accent-primary'
          max={limits.max}
          min={limits.min}
          onChange={(event) => {
            onChange(Number(event.target.value))
          }}
          step={limits.step}
          type='range'
          value={value}
        />
        <span className='w-14 text-right text-xs text-muted-foreground tabular-nums'>
          {value}
          {unit}
        </span>
      </span>
    </Row>
  )
}

type FontSelectProps = {
  label: string
  value: Typography['bodyFont']
  onChange: (value: Typography['bodyFont']) => void
}

function FontSelect({ label, value, onChange }: FontSelectProps) {
  return (
    <Row label={label}>
      <select
        aria-label={label}
        className={selectClassName}
        onChange={(event) => {
          const font = FONT_FAMILIES.find((family) => family.value === event.target.value)
          if (font !== undefined) {
            onChange(font.value)
          }
        }}
        value={value}
      >
        {FONT_FAMILIES.map((family) => (
          <option
            key={family.value}
            value={family.value}
          >
            {family.label}
          </option>
        ))}
      </select>
    </Row>
  )
}

type DocSettingsPopoverProps = {
  preferences: InterfaceDocsPreferences
  headerImage: string | null
  onChange: (changes: Partial<InterfaceDocsPreferences>) => void
  onHeaderImageChange: (image: string | null) => void
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    })
    reader.addEventListener('error', () => {
      reject(new Error('Could not read the image.'))
    })
    reader.readAsDataURL(file)
  })
}

/**
 * Document settings: cover image, typography and content options. Everything
 * is applied to the preview and to the exported PDF.
 */
export function DocSettingsPopover({
  preferences,
  headerImage,
  onChange,
  onHeaderImageChange,
}: DocSettingsPopoverProps) {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const { typography } = preferences

  const updateTypography = (changes: Partial<Typography>) => {
    onChange({ typography: { ...typography, ...changes } })
  }

  const pickImage = async (file: File | undefined) => {
    if (file === undefined) {
      return
    }
    if (!file.type.startsWith('image/')) {
      setImageError('Choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('The image is larger than 2 MB.')
      return
    }
    try {
      onHeaderImageChange(await readAsDataUrl(file))
      setImageError(null)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not read the image.')
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label='Document settings'
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        <Settings2 aria-hidden='true' />
        Settings
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='flex max-h-[80vh] w-96 flex-col gap-5 overflow-y-auto'
      >
        <Section title='Header image'>
          <input
            ref={fileInput}
            accept='image/*'
            aria-label='Header image file'
            className='sr-only'
            onChange={(event) => {
              void pickImage(event.target.files?.[0])
              event.target.value = ''
            }}
            type='file'
          />
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => {
                fileInput.current?.click()
              }}
              size='sm'
              variant='outline'
            >
              <ImagePlus aria-hidden='true' />
              {headerImage === null ? 'Choose image' : 'Replace image'}
            </Button>
            {headerImage !== null && (
              <Button
                onClick={() => {
                  onHeaderImageChange(null)
                  setImageError(null)
                }}
                size='sm'
                variant='ghost'
              >
                <Trash2 aria-hidden='true' />
                Remove
              </Button>
            )}
          </div>
          {imageError !== null && (
            <p
              className='text-xs text-destructive'
              role='alert'
            >
              {imageError}
            </p>
          )}
          {headerImage !== null && (
            <>
              <NumberField
                label='Image height'
                limits={{ min: 40, max: 400, step: 10 }}
                onChange={(value) => {
                  onChange({ headerImageHeight: value })
                }}
                unit='px'
                value={preferences.headerImageHeight}
              />
              <Row label='Image fit'>
                <SegmentedControl
                  choices={[
                    { value: 'contain', label: 'Fit' },
                    { value: 'cover', label: 'Fill' },
                  ]}
                  label='Image fit'
                  onChange={(value) => {
                    onChange({ headerImageFit: value === 'cover' ? 'cover' : 'contain' })
                  }}
                  value={preferences.headerImageFit}
                />
              </Row>
            </>
          )}
          <p className='text-xs text-muted-foreground'>
            Shown in the preview and the PDF, not in the Markdown.
          </p>
        </Section>

        <Section title='Typography'>
          <FontSelect
            label='Body font'
            onChange={(bodyFont) => {
              updateTypography({ bodyFont })
            }}
            value={typography.bodyFont}
          />
          <FontSelect
            label='Heading font'
            onChange={(headingFont) => {
              updateTypography({ headingFont })
            }}
            value={typography.headingFont}
          />
          <NumberField
            label='Text size'
            limits={TYPOGRAPHY_LIMITS.baseSize}
            onChange={(baseSize) => {
              updateTypography({ baseSize })
            }}
            unit='px'
            value={typography.baseSize}
          />
          <NumberField
            label='Heading size'
            limits={TYPOGRAPHY_LIMITS.headingScale}
            onChange={(headingScale) => {
              updateTypography({ headingScale })
            }}
            unit='×'
            value={typography.headingScale}
          />
          <NumberField
            label='Code size'
            limits={TYPOGRAPHY_LIMITS.codeSize}
            onChange={(codeSize) => {
              updateTypography({ codeSize })
            }}
            unit='%'
            value={typography.codeSize}
          />
          <NumberField
            label='Line height'
            limits={TYPOGRAPHY_LIMITS.lineHeight}
            onChange={(lineHeight) => {
              updateTypography({ lineHeight })
            }}
            unit=''
            value={typography.lineHeight}
          />
          <Button
            className='self-start'
            onClick={() => {
              onChange({ typography: DEFAULT_TYPOGRAPHY })
            }}
            size='sm'
            variant='ghost'
          >
            Reset typography
          </Button>
        </Section>

        <Section title='Content'>
          <Row label='Document language'>
            <SegmentedControl
              choices={[...DOC_LOCALES]}
              label='Document language'
              onChange={(locale) => {
                onChange({ locale })
              }}
              value={preferences.locale}
            />
          </Row>
          <Row label='Table of contents'>
            <Switch
              aria-label='Table of contents'
              checked={preferences.tableOfContents}
              onCheckedChange={(tableOfContents) => {
                onChange({ tableOfContents })
              }}
            />
          </Row>
          <Row label='JSON examples'>
            <Switch
              aria-label='JSON examples'
              checked={preferences.examples}
              onCheckedChange={(examples) => {
                onChange({ examples })
              }}
            />
          </Row>
        </Section>
      </PopoverContent>
    </Popover>
  )
}
