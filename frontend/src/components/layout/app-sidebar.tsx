import type { ReactNode } from 'react'

import { X } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

import { SectionNav } from './section-nav'

type AppSidebarProps = {
  children?: ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar
      collapsible='icon'
      className='bg-frame'
    >
      <SidebarHeader className='flex-row items-center justify-between px-3 pt-3 pb-1'>
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
        {isMobile && (
          <Button
            aria-label='Close sidebar'
            onClick={() => {
              setOpenMobile(false)
            }}
            size='icon-sm'
            variant='ghost'
          >
            <X aria-hidden='true' />
          </Button>
        )}
      </SidebarHeader>
      {isMobile && (
        <div className='px-1 pt-1'>
          <SectionNav variant='list' />
        </div>
      )}
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter className='px-4 pb-3 pt-1'>
        <p className='text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
          Saved on this device. No account.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
