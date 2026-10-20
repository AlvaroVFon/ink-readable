import { Braces, FileText, Wrench } from 'lucide-react'
import { Link, useMatch } from 'react-router'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

/** Every tool, in sidebar order. Paths are relative to `/tools`. */
const TOOLS = [
  { path: 'json-types', label: 'JSON → Types', icon: Braces },
  { path: 'interface-docs', label: 'Interfaces → Docs', icon: FileText },
]

export function ToolsSidebar() {
  const activeTool = useMatch('/tools/:tool')?.params.tool

  return (
    <SidebarGroup className='p-2'>
      <SidebarGroupLabel className='gap-2 px-1'>
        <Wrench aria-hidden='true' />
        Tools
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {TOOLS.map(({ path, label, icon: Icon }) => (
            <SidebarMenuItem key={path}>
              <SidebarMenuButton
                isActive={path === activeTool}
                render={<Link to={`/tools/${path}`} />}
                tooltip={label}
              >
                <Icon aria-hidden='true' />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
