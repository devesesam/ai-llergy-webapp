'use client'

import { motion } from 'framer-motion'

interface EquipmentListProps {
    venueId: string
}

export default function EquipmentList({ venueId }: EquipmentListProps) {
    // Mock data based on Stitch design
    const equipment = [
        {
            id: 1,
            name: 'Deep Fryer 1',
            type: 'Fryer',
            allergens: ['Gluten', 'Shellfish'],
            riskLevel: 'High',
        },
        {
            id: 2,
            name: 'Main Grill',
            type: 'Grill',
            allergens: ['Fish'],
            riskLevel: 'Medium',
        },
        {
            id: 3,
            name: 'Salad Station',
            type: 'Prep',
            allergens: ['Nuts', 'Dairy'],
            riskLevel: 'Low',
        },
    ]

    return (
        <div className="space-y-8">
            {/* Risk Warning Banner */}
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-4">
                <div className="p-2 bg-orange-500 rounded-lg text-white">
                    ⚠️
                </div>
                <div>
                    <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wide mb-1">Cross-Contamination Risk</h3>
                    <p className="text-orange-200/80 text-sm">
                        High risk detected in <strong>Deep Fryer 1</strong>. Ensure separate oil is used for gluten-free orders.
                    </p>
                </div>
            </div>

            {/* Equipment Grid */}
            <div>
                <h2 className="text-xl font-heading text-white mb-4">Kitchen Equipment</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipment.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-5 bg-surface border border-white/10 rounded-2xl hover:border-white/20 transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-medium text-white group-hover:text-primary transition-colors">{item.name}</h3>
                                    <p className="text-sm text-white/40">{item.type}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' :
                                        item.riskLevel === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-green-500/20 text-green-400'
                                    }`}>
                                    {item.riskLevel} Risk
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {item.allergens.map(allergen => (
                                    <span key={allergen} className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/80">
                                        {allergen}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}

                    {/* Add New Card */}
                    <button className="flex flex-col items-center justify-center p-5 border border-dashed border-white/10 rounded-2xl text-white/20 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[140px]">
                        <span className="text-2xl mb-2">+</span>
                        <span className="text-sm font-medium">Add Equipment</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
