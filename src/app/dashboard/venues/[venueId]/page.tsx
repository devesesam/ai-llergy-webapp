import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Venue, MenuItem } from '@/lib/supabase/types'
import VenueTabs from '@/components/dashboard/VenueTabs'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  // Debug: Check auth status
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[VenueDetail] Auth check:', { userId: user?.id, authError: authError?.message })

  // Get venue details
  const { data: venueData, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single() as { data: Venue | null; error: unknown }

  console.log('[VenueDetail] Venue query:', { venueId, venueData, error })

  if (error || !venueData) {
    notFound()
  }

  const venue = venueData

  // Get menu items for this venue
  const { data: menuItemsData } = await supabase
    .from('menu_items')
    .select('*')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true }) as { data: MenuItem[] | null }

  const items = menuItemsData || []

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Link href="/dashboard/venues" className="inline-block mb-6 text-white/50 hover:text-white transition-colors text-sm">
        &larr; Back to Venues
      </Link>

      <VenueTabs venueId={venue.id} venueName={venue.name} menuItems={items} />
    </div>
  )
}
