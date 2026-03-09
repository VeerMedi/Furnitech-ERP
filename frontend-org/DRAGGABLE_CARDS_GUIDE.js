/**
 * IMPLEMENTATION GUIDE: Make Any Card Draggable
 * 
 * Replace this pattern:
 * 
 * {enabledCards.includes('card-id') && (
 *   <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
 *     ...card content...
 *   </div>
 * )}
 * 
 * With this pattern:
 * 
 * {enabledCards.includes('card-id') && (
 *   <div
 *     draggable="true"
 *     onDragStart={(e) => {
 *       e.dataTransfer.setData('cardId', 'card-id');
 *       e.dataTransfer.setData('cardTitle', 'Card Display Title');
 *       handleDragStart('card-id', 'Card Display Title');
 *     }}
 *     onDragEnd={handleDragEnd}
 *     className="relative group bg-white rounded-2xl p-6 border border-red-200 shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl transition-all"
 *   >
 *     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 *       <GripVertical className="w-4 h-4 text-gray-400" />
 *     </div>
 *     
 *     ...card content...
 *   </div>
 * )}
 * 
 * COMPLETED CARDS (Already Draggable):
 * ✅ products-overview
 * ✅ total-orders
 * ✅ todays-orders
 * ✅ total-revenue
 * 
 * REMAINING CARDS TO IMPLEMENT:
 * ⏳ active-salesmen
 * ⏳ production-pending
 * ⏳ monthly-revenue
 * ⏳ low-stock-alerts
 * ⏳ raw-materials-status
 * ⏳ machine-utilization
 * ⏳ maintenance-alerts
 * ⏳ pending-deliveries
 * ⏳ in-transit
 * ⏳ completed-deliveries
 * 
 * Note: All backend API support is already in place for any card type.
 */

export const DRAGGABLE_CARDS_IMPLEMENTED = 4;
export const TOTAL_DRAGGABLE_CARDS = 14;
