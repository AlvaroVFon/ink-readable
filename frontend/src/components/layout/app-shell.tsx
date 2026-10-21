import type { ReactNode } from 'react'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

type AppShellProps = {
  sidebar?: ReactNode
  children: ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <TooltipProvider>
      {/* Pin the shell to the viewport so panes scroll internally instead of
          growing the page (which would scroll fixed editor chrome away). */}
      <SidebarProvider className='h-svh overflow-hidden bg-frame'>
        <AppSidebar>{sidebar}</AppSidebar>
        <SidebarInset className='flex min-h-0 flex-col bg-frame'>
          <AppHeader />
          <div className='flex min-h-0 flex-1 flex-col min-[900px]:pr-2 min-[900px]:pb-2'>
            <div className='app-sheet flex min-h-0 flex-1 flex-col overflow-hidden bg-sheet'>
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
