import { useEffect, useRef, useState, type RefObject } from 'react'

import { collectOutline, type OutlineItem } from '../lib/outline'

type DocumentOutlineProps = {
  /** Scroll container that holds the preview. */
  scrollRef: RefObject<HTMLDivElement | null>
}

/**
 * The margin rail: one tick per H1–H3, the active section in the accent color.
 * It is the app's only bold visual gesture and it carries real document
 * structure, not decoration.
 */
export function DocumentOutline({ scrollRef }: DocumentOutlineProps) {
  const [items, setItems] = useState<OutlineItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const headingsRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll === null) {
      return () => {}
    }

    let frame = 0
    const collect = () => {
      headingsRef.current = Array.from(
        scroll.querySelectorAll<HTMLElement>(
          '.markdown-preview h1, .markdown-preview h2, .markdown-preview h3',
        ),
      ).filter((heading) => heading.id !== '')
      setItems(collectOutline(scroll))
    }
    const scheduleCollect = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(collect)
    }

    collect()
    const observer = new MutationObserver(scheduleCollect)
    observer.observe(scroll, { childList: true, subtree: true, characterData: true })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [scrollRef])

  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll === null) {
      return () => {}
    }

    const knownIds = new Set(items.map((item) => item.id))
    let frame = 0
    const update = () => {
      const rootTop = scroll.getBoundingClientRect().top
      let current: string | null = null
      for (const heading of headingsRef.current) {
        if (heading.getBoundingClientRect().top - rootTop <= 72) {
          current = heading.id
        }
      }
      if (current !== null && !knownIds.has(current)) {
        current = items[0]?.id ?? null
      }
      setActiveId(current ?? items[0]?.id ?? null)
    }
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(update)
    }

    update()
    scroll.addEventListener('scroll', scheduleUpdate, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      scroll.removeEventListener('scroll', scheduleUpdate)
    }
  }, [scrollRef, items])

  if (items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label='Document outline'
      className='document-outline'
    >
      {items.map((item) => (
        <button
          key={item.id}
          aria-current={activeId === item.id ? 'location' : undefined}
          className='document-outline-item'
          data-active={activeId === item.id}
          data-level={item.level}
          onClick={() => {
            headingsRef.current
              .find((heading) => heading.id === item.id)
              ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
          }}
          title={item.text}
          type='button'
        >
          <span className='sr-only'>{item.text}</span>
        </button>
      ))}
    </nav>
  )
}
