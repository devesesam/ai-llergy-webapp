'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Venue {
  id: string
  name: string
  slug: string
  role: string
}

interface DashboardNavProps {
  user: User
  venues: Venue[]
}

export default function DashboardNav({ user, venues }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/venues', label: 'Venues', icon: '🏢' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  ]

  // Check if we are in a venue context
  const activeVenue = venues.find(v => pathname.includes(`/venues/${v.id}`))

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-surface border-b border-light">
        <button
          className="text-2xl text-text-muted"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <span className="text-xl font-heading text-primary">VenuePro</span>
        <div className="w-8" /> {/* Spacer */}
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-surface border-r border-light transform transition-transform duration-300 md:translate-x-0 md:static md:h-screen flex flex-col min-h-screen shadow-sm ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-light">
          <h2 className="text-2xl font-heading text-text mb-1">VenuePro</h2>
          <p className="text-xs text-text-muted truncate">{user.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-4 text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Menu</p>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-muted hover:text-text hover:bg-black/5'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Venues List */}
          {venues.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-4 mb-2">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Your Venues</p>
                <Link href="/dashboard/venues/new" className="text-xs text-primary hover:text-primary-hover font-medium">+ Add</Link>
              </div>

              {venues.map(venue => (
                <Link
                  key={venue.id}
                  href={`/dashboard/venues/${venue.id}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${pathname.includes(venue.id)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-black/5'
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="truncate font-medium">{venue.name}</span>
                  {activeVenue?.id === venue.id && <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-light mt-auto">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-text-muted hover:text-text hover:bg-red-500/10 hover:text-red-600 rounded-xl transition-all"
          >
            <span>🚪</span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden cursor-default w-full h-full border-none p-0"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  )
}
