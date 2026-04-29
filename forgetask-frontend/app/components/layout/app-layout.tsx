'use client'

import * as React from 'react'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: React.ReactNode
  onMembersClick: () => void
}

export function AppLayout({
  children,
  onMembersClick,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="h-full flex">
      <AppSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onMembersClick={onMembersClick}
      />

      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {children}
      </main>
    </div>
  )
}
