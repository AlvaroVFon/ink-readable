import type { ReactNode } from 'react'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className='flex flex-1 flex-col overflow-auto'>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
