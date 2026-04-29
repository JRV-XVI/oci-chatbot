'use client'

import * as React from 'react'
import Image from 'next/image'
import { ChevronLeft, LogOut, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'

interface AppSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onMembersClick: () => void
}

export function AppSidebar({
  isOpen,
  onToggle,
  onMembersClick,
}: AppSidebarProps) {
  const router = useRouter()

  const handleLogout = () => {
    // Clear auth data
    localStorage.clear()
    // Clear token cookie
    document.cookie = 'token=; path=/; max-age=0'
    // Redirect to login
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#0d1117] border-r border-[#2b3542] transition-all duration-300 flex flex-col z-40 ${
          isOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Top Section: Logo and Toggle */}
        <div className="border-b border-[#2b3542] p-3">
          <div className="flex items-center justify-between gap-2">
            {isOpen && (
              <div className="flex items-center justify-center rounded-xl border border-[#2b3542] bg-[#11161f] p-2">
                <Image
                  src="/CloudForge.svg"
                  alt="CloudForge"
                  width={42}
                  height={42}
                  priority
                />
              </div>
            )}
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 flex-shrink-0"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>



        {/* Middle Section: Action Buttons */}
        <div className="flex-1 border-b border-[#2b3542] p-3 space-y-2">
          {/* Members Button */}
          <Button
            onClick={onMembersClick}
            variant="outline"
            className={`w-full justify-start cursor-pointer ${!isOpen ? 'px-0 justify-center' : ''}`}
            title={isOpen ? '' : 'Members'}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            {isOpen && <span className="ml-2">Members</span>}
          </Button>

          {/* Spacer for future buttons */}
          <div className="flex-1" />
        </div>

        {/* Bottom Section: Logout */}
        <div className="border-t border-[#2b3542] p-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full justify-start cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 ${
              !isOpen ? 'px-0 justify-center' : ''
            }`}
            title={isOpen ? '' : 'Logout'}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}
