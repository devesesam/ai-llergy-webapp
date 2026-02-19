'use client'

import { useState } from 'react'

interface MenuItem {
    id: string
    name: string
    ingredients: string | null
    allergens: string[] | null
    price: number | null
    is_active: boolean
}

interface MenuTableProps {
    venueId: string
    menuItems: MenuItem[]
}

export default function MenuTable({ venueId, menuItems }: MenuTableProps) {
    const [activeItems, setActiveItems] = useState(menuItems)
    const [filter, setFilter] = useState('')

    const toggleAllergen = (id: string, allergen: string) => {
        // In a real app, this would update DB
        console.log(`Toggled ${allergen} for item ${id}`)
    }

    // Helper to check if an allergen is present (assuming allergens is an array of strings like ['Dairy', 'Nuts'])
    // Or if it's a JSON object, we need to know the schema. 
    // Based on the previous file, it seemed to be a JSON object, but the Supabase type might be different.
    // usage in previous file: allergens: { dairy: true ... }
    // usage in VenueDetailPage: select('*') from menu_items.

    // Let's assume standard array of strings for now to match typical Supabase text[] or jsonb array.
    // If it's a JSON object in DB, we might need to parse.
    // For this Premium UI demo, we will check if the string exists in the array.

    const hasAllergen = (item: MenuItem, allergen: string) => {
        if (!item.allergens) return false
        // If allergens is array of strings
        if (Array.isArray(item.allergens)) {
            return item.allergens.map(a => a.toLowerCase()).includes(allergen.toLowerCase())
        }
        // If allergens is object (legacy/mock) - adapted for potential flexibility
        return false
    }

    return (
        <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="font-heading text-white">Current Menu</h2>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                        Filter
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                        Export
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-white/40 uppercase text-xs tracking-wider">
                            <th className="p-4 font-medium">Dish Name</th>
                            <th className="p-4 font-medium w-1/3">Ingredients</th>
                            <th className="p-4 font-medium text-center">Dairy</th>
                            <th className="p-4 font-medium text-center">Gluten</th>
                            <th className="p-4 font-medium text-center">Nuts</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activeItems.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <span className="font-medium text-white block">{item.name}</span>
                                    {!item.is_active && <span className="text-xs text-white/40 italic">Hidden</span>}
                                </td>
                                <td className="p-4 text-white/60 truncate max-w-xs">
                                    {item.ingredients || 'No ingredients listed'}
                                </td>

                                {/* Allergen Toggles - Visual Only for now */}
                                <td className="p-4 text-center">
                                    <AllergenToggle active={hasAllergen(item, 'dairy')} onClick={() => toggleAllergen(item.id, 'dairy')} />
                                </td>
                                <td className="p-4 text-center">
                                    <AllergenToggle active={hasAllergen(item, 'gluten')} onClick={() => toggleAllergen(item.id, 'gluten')} />
                                </td>
                                <td className="p-4 text-center">
                                    <AllergenToggle active={hasAllergen(item, 'nuts') || hasAllergen(item, 'peanuts') || hasAllergen(item, 'tree nuts')} onClick={() => toggleAllergen(item.id, 'nuts')} />
                                </td>

                                <td className="p-4 text-right">
                                    <button className="text-white/40 hover:text-primary transition-colors">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {activeItems.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-white/40">
                                    No menu items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AllergenToggle({ active, onClick }: { active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${active ? 'bg-primary' : 'bg-white/10'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    )
}
