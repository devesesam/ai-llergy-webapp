# Changelog

## Overview

This directive tracks significant changes, fixes, and improvements to the AI-llergy webapp. Use this as a reference for understanding what was changed and why.

---

## February 2026 - Dashboard Modernization (Phase 2)

### Visual Design Overhaul

**Problem:** Dashboard looked dated ("90s style") with poor button proportions, flat design, and cramped elements.

**Solution:** Comprehensive CSS utility system and component updates.

#### CSS Additions (globals.css)

| Utility | Purpose |
|---------|---------|
| `.shadow-card` | Layered shadow for cards at rest |
| `.shadow-card-hover` | Elevated shadow for hover states |
| `.btn-base` | Base button styles (flex, gap, transitions) |
| `.btn-sm`, `.btn-md`, `.btn-lg` | Button size variants |
| `.badge` | Pill-shaped status badges |
| `.badge-success/warning/danger/neutral` | Badge color variants |
| `.tag` | Allergen tag styling |

#### Files Modified

| File | Changes |
|------|---------|
| `src/app/globals.css` | Added shadow system, button system, badge system |
| `src/app/dashboard/page.tsx` | Stats cards with gradients, venue cards with icons/badges |
| `src/components/dashboard/DashboardNav.tsx` | Emoji icons → Lucide React |
| `src/components/dashboard/EquipmentList.tsx` | Modern cards, proper badges, empty state |
| `src/components/dashboard/MenuTable.tsx` | Proper button sizing, allergen tags column |

### Functionality Improvements

#### Settings Tab Added

**Problem:** No way to edit venue settings from dashboard.

**Solution:**
- Created `VenueSettings.tsx` component
- Added Settings tab to `VenueTabs.tsx`
- Created `PATCH /api/venues/[venueId]` endpoint

**Files Created:**
- `src/components/dashboard/VenueSettings.tsx`
- `src/app/api/venues/[venueId]/route.ts`

**Files Modified:**
- `src/components/dashboard/VenueTabs.tsx`
- `src/app/dashboard/venues/[venueId]/page.tsx`

#### Menu Table Allergen Display

**Problem:** Menu table only showed 3 allergen columns (Dairy, Gluten, Nuts) as toggles.

**Solution:**
- Replaced individual toggle columns with single "Allergens" column
- Display allergens as amber-colored tags
- Scalable for all 23 allergens

**Before:**
```
| Dish | Ingredients | Dairy | Gluten | Nuts | Actions |
```

**After:**
```
| Dish | Ingredients | Allergens (tags) | Actions |
```

#### Add Item Button

**Problem:** "Add Menu Item" button only appeared in empty state.

**Solution:** Added persistent "Add Item" button to table header next to Filter/Export.

#### Mock Data Removed

**Problem:** Equipment list showed hardcoded mock data.

**Solution:**
- Removed mock equipment array
- Shows clean empty state by default
- Added `// TODO: Fetch from Supabase` comment

### Bug Fixes

| Bug | Fix | File |
|-----|-----|------|
| Back button invisible on venue detail page | Changed `text-white/50` to `text-gray-500` | `[venueId]/page.tsx` |
| Button text not fitting | Created proper button sizing system | `globals.css` |
| Empty state layout broken | Added `flex flex-col items-center justify-center` | Multiple files |

---

## Directives Created/Updated

| Directive | Status | Purpose |
|-----------|--------|---------|
| `dashboard-ui-components.md` | Updated | Component patterns, file reference |
| `design-system.md` | Updated | Shadow, button, badge systems |
| `icon-system.md` | Existing | Lucide React usage |
| `api-endpoints.md` | Created | API route documentation |
| `changelog.md` | Created | This file |

---

## Known TODOs

| Item | Priority | Notes |
|------|----------|-------|
| Equipment data from Supabase | Medium | Currently empty, needs DB schema |
| Menu item edit modal | Medium | Edit button exists but no functionality |
| Filter/Export functionality | Low | Buttons exist but non-functional |
| Import function (CSV/Sheets) | Low | User-requested, needs design |

---

## Migration Notes for Future Agents

### When modifying dashboard components:
1. Use `btn-base` classes for all buttons (not inline padding)
2. Use `badge` classes for status indicators
3. Use `shadow-card` for card elevation
4. Use Lucide React icons (see `icon-system.md`)

### When adding new API endpoints:
1. Follow pattern in `api-endpoints.md`
2. Use `createServerClient` from `@supabase/ssr`
3. Check RLS policies if accessing protected tables
4. Add role checks for sensitive operations
