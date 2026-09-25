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
      <SidebarProvider className='h-svh overflow-hidden'>
        <AppSidebar>{sidebar}</AppSidebar>
        <SidebarInset>
          <AppHeader />
          <div className='flex min-h-0 flex-1 flex-col overflow-auto'>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
