'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Filter, Download, UtensilsCrossed, Plus, Pencil } from 'lucide-react'

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

    return (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-heading text-gray-900">Current Menu</h2>
                <div className="flex gap-3">
                    <button className="btn-base btn-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="btn-base btn-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <Link href={`/dashboard/venues/${venueId}/menu/new`} className="btn-base btn-sm bg-primary text-white hover:bg-primary/90 shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add Item
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dish Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingredients</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Allergens</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {activeItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-5">
                                    <span className="font-medium text-gray-900 block">{item.name}</span>
                                    {!item.is_active && <span className="text-xs text-gray-400 italic mt-1 block">Hidden</span>}
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-500 max-w-xs">
                                    <span className="line-clamp-2">{item.ingredients || 'No ingredients listed'}</span>
                                </td>

                                {/* Allergens as Tags */}
                                <td className="px-6 py-5">
                                    {item.allergens && item.allergens.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.allergens.map(allergen => (
                                                <span key={allergen} className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                                    {allergen}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm italic">None listed</span>
                                    )}
                                </td>

                                <td className="px-6 py-5 text-right">
                                    <button className="btn-base btn-sm btn-ghost text-gray-500 hover:text-primary">
                                        <Pencil className="w-4 h-4" />
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {activeItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-16 px-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                            <UtensilsCrossed className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-900 font-medium mb-2">No menu items yet</p>
                                        <p className="text-gray-500 text-sm mb-6">Add your first dish to get started</p>
                                        <Link href={`/dashboard/venues/${venueId}/menu/new`} className="btn-base btn-md bg-primary text-white hover:bg-primary/90">
                                            <Plus className="w-5 h-5" />
                                            Add Menu Item
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
