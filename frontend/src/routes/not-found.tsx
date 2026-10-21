import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className='flex min-h-svh flex-col bg-frame'>
      <header className='flex h-12 shrink-0 items-center px-3'>
        <Link
          aria-label='Ink & Readable'
          className='brand-lockup'
          to='/'
        >
          <img
            alt='Ink & Readable'
            draggable={false}
            src='/logo.png'
          />
        </Link>
      </header>
      <div className='flex flex-1 items-center justify-center p-6'>
        <section className='app-sheet flex w-full max-w-md flex-col items-center gap-4 p-8 text-center sm:p-10'>
          <h1 className='text-2xl font-semibold tracking-tight'>Page not found</h1>
          <p className='text-sm text-muted-foreground'>
            The page you are looking for does not exist.
          </p>
          <Link
            className={buttonVariants()}
            to='/'
          >
            Go to Notes
          </Link>
        </section>
      </div>
    </div>
  )
}
