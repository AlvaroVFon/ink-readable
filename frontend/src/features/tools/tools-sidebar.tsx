import { BookText, FileCode2, ListChecks, Wrench } from 'lucide-react'
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
  {
    path: 'json-types',
    label: 'JSON to Types',
    description: 'Types from a JSON sample',
    icon: FileCode2,
  },
  {
    path: 'interface-docs',
    label: 'Interfaces to Docs',
    description: 'Markdown docs from interfaces',
    icon: BookText,
  },
  {
    path: 'json-schema',
    label: 'JSON Schema',
    description: 'Schema from JSON or types',
    icon: ListChecks,
  },
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
          {TOOLS.map(({ path, label, description, icon: Icon }) => (
            <SidebarMenuItem key={path}>
              <SidebarMenuButton
                isActive={path === activeTool}
                size='lg'
                render={<Link to={`/tools/${path}`} />}
                tooltip={label}
              >
                <Icon aria-hidden='true' />
                <span className='flex min-w-0 flex-col leading-tight'>
                  <span className='truncate'>{label}</span>
                  <span className='truncate text-xs font-normal text-muted-foreground'>
                    {description}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
