import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Venue } from '@/lib/supabase/types'
import VenueSettings from '@/components/dashboard/VenueSettings'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenueSettingsPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single() as { data: Venue | null; error: unknown }

  if (error || !venue) {
    notFound()
  }

  return (
    <VenueSettings
      venueId={venue.id}
      venueName={venue.name}
      venueSlug={venue.slug}
      inviteCode={venue.invite_code}
    />
  )
}
