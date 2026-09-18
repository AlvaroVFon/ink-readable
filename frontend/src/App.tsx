import { BookOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className='flex min-h-svh items-center justify-center bg-background p-6 text-foreground'>
      <section className='flex max-w-md flex-col items-center gap-5 text-center'>
        <div className='flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
          <BookOpen aria-hidden='true' className='size-6' />
        </div>
        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-tight'>Ink Readable</h1>
          <p className='text-muted-foreground'>
            Your personal Markdown workspace is ready.
          </p>
        </div>
        <Button>Open workspace</Button>
      </section>
    </main>
  )
}

export default App
