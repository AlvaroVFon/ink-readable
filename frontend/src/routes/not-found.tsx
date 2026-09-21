import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <section className='flex max-w-md flex-col items-center gap-4 text-center'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-tight'>Page not found</h1>
          <p className='text-muted-foreground'>The page you are looking for does not exist.</p>
        </div>
        <Link
          className={buttonVariants()}
          to='/'
        >
          Go to Notes
        </Link>
      </section>
    </div>
  )
}
