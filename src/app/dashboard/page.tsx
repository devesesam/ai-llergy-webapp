import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface VenueMembership {
  venue_id: string
  role: string
  venues: {
    id: string
    name: string
    slug: string
    created_at: string
  } | null
}

interface MenuCount {
  venue_id: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get user's venues with menu item counts
  const { data: memberships } = await supabase
    .from('venue_members')
    .select(`
      venue_id,
      role,
      venues (
        id,
        name,
        slug,
        created_at
      )
    `)
    .eq('user_id', user?.id || '') as { data: VenueMembership[] | null }

  const venues = memberships || []

  // Get menu item counts for each venue
  const venueIds = venues.map(m => m.venue_id)
  const { data: menuCounts } = await supabase
    .from('menu_items')
    .select('venue_id')
    .in('venue_id', venueIds.length > 0 ? venueIds : ['']) as { data: MenuCount[] | null }

  const countsByVenue = menuCounts?.reduce((acc, item) => {
    acc[item.venue_id] = (acc[item.venue_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading text-white mb-2">Dashboard</h1>
        <p className="text-white/60">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface border border-white/10 p-6 rounded-2xl">
          <span className="block text-3xl font-heading text-white mb-1">{venues.length}</span>
          <span className="text-sm text-white/50 uppercase tracking-wider font-medium">Venues</span>
        </div>
        <div className="bg-surface border border-white/10 p-6 rounded-2xl">
          <span className="block text-3xl font-heading text-white mb-1">
            {Object.values(countsByVenue).reduce((a, b) => a + b, 0)}
          </span>
          <span className="text-sm text-white/50 uppercase tracking-wider font-medium">Menu Items</span>
        </div>
      </div>

      {/* Venues Section */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-heading text-white">Your Venues</h2>
          <Link href="/dashboard/venues/new" className="px-5 py-2.5 bg-primary text-background font-medium rounded-lg hover:bg-primary/90 transition-colors">
            + New Venue
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="text-center py-16 px-4 bg-surface border border-white/10 rounded-2xl border-dashed">
            <p className="text-white mb-2">You don&apos;t have any venues yet.</p>
            <p className="text-white/50 mb-6 text-sm">Create your first venue to start managing menus.</p>
            <Link href="/dashboard/venues/new" className="inline-block px-6 py-3 bg-primary text-background font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Create Your First Venue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(membership => (
              <Link
                key={membership.venue_id}
                href={`/dashboard/venues/${membership.venue_id}`}
                className="block bg-surface border border-white/10 p-6 rounded-2xl hover:border-primary/50 hover:bg-white/5 transition-all group"
              >
                <h3 className="text-xl font-heading text-white mb-1 group-hover:text-primary transition-colors">
                  {membership.venues?.name || 'Unknown Venue'}
                </h3>
                <p className="text-sm text-white/40 mb-4 bg-white/5 inline-block px-2 py-1 rounded">
                  /{membership.venues?.slug}
                </p>
                <div className="flex justify-between items-center text-sm border-t border-white/10 pt-4 mt-2">
                  <span className="text-white/70">{countsByVenue[membership.venue_id] || 0} menu items</span>
                  <span className="text-white/40 uppercase text-xs font-bold tracking-wider">{membership.role}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
