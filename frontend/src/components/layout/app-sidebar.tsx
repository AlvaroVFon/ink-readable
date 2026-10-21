import type { ReactNode } from 'react'

import { FolderOpen } from 'lucide-react'
import { Link } from 'react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { isTauri, openDataDir } from '@/lib/tauri'

type AppSidebarProps = {
  children?: ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  return (
    <Sidebar
      className='border-r border-sidebar-border/80'
      collapsible='icon'
    >
      <SidebarHeader className='border-b border-sidebar-border/70 px-2 py-2.5'>
        <Link
          aria-label='Ink & Readable'
          className='flex items-center gap-2.5 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 group-data-[collapsible=icon]:justify-center'
          to='/'
        >
          <span
            aria-hidden='true'
            className='flex size-6 shrink-0 items-center justify-center rounded-[min(var(--radius),6px)] bg-ink font-heading text-[13px] leading-none font-semibold text-paper'
          >
            I
          </span>
          <span className='flex min-w-0 flex-col leading-none group-data-[collapsible=icon]:hidden'>
            <span className='truncate font-heading text-[15px] font-semibold tracking-tight text-ink'>
              Ink &amp; Readable
            </span>
            <span className='mt-1.5 text-[10px] font-medium text-graphite'>Markdown editor</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      {isTauri() && (
        <SidebarFooter className='border-t border-sidebar-border/70 p-2'>
          <SidebarMenuButton
            onClick={() => {
              void openDataDir()
            }}
            tooltip='Open data folder'
          >
            <FolderOpen aria-hidden='true' />
            <span>Data folder</span>
          </SidebarMenuButton>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
