import { NextRequest, NextResponse } from "next/server";
import { getMenu } from "@/lib/menu-service";
import { getVenueBySlug } from "@/lib/venues";
import { buildIngredientIndex } from "@/lib/ingredients";

/**
 * GET /api/ingredients?venue=kisa — the venue's ingredient index for the search
 * dropdown (folded dish texts + searchable terms). Built from the cached menu, so it
 * follows the sheet within the same 10-minute window as the results.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("venue") || "";
  const venue = getVenueBySlug(slug);
  if (!venue) {
    return NextResponse.json({ error: `Unknown venue: ${slug}` }, { status: 400 });
  }
  try {
    const menu = await getMenu(venue);
    return NextResponse.json(buildIngredientIndex(menu));
  } catch (error) {
    console.error("Error building ingredient index:", error);
    return NextResponse.json({ error: "Failed to load ingredients" }, { status: 500 });
  }
}
