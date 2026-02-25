'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { 
  ShoppingBag, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react'

interface MenuRankingData {
  menu_item_id: number
  name: string
  total_quantity: number
  total_revenue: number
  order_count: number
}

interface MenuRankingProps {
  startDate: Date
  endDate: Date
}

export default function MenuRanking({ startDate, endDate }: MenuRankingProps) {
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'top' | 'bottom'>('top')
  const [topItems, setTopItems] = useState<MenuRankingData[]>([])
  const [bottomItems, setBottomItems] = useState<MenuRankingData[]>([])

  useEffect(() => {
    loadRankingData()
  }, [startDate, endDate])

  const loadRankingData = async () => {
    setLoading(true)
    try {
      // 1. ดึง Order ID ในช่วงเวลาที่กำหนด
      const { data: ordersInRange } = await supabase
        .from('orders')
        .select('order_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['served', 'completed'])

      if (!ordersInRange || ordersInRange.length === 0) {
        setTopItems([]); setBottomItems([]); return
      }

      const orderIds = ordersInRange.map(o => o.order_id)

      // 2. ดึงรายการอาหารจาก Order IDs เหล่านั้น
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity, price, menu_items(name)')
        .in('order_id', orderIds)

      const menuMap: { [key: number]: MenuRankingData } = {}
      
      ;(itemsData || []).forEach((item: any) => {
        const id = item.menu_item_id
        if (!menuMap[id]) {
          menuMap[id] = {
            menu_item_id: id,
            name: item.menu_items?.name || `เมนู #${id}`,
            total_quantity: 0,
            total_revenue: 0,
            order_count: 0,
          }
        }
        menuMap[id].total_quantity += item.quantity
        menuMap[id].total_revenue += item.price * item.quantity
        menuMap[id].order_count += 1
      })

      const allRankings = Object.values(menuMap)
      setTopItems([...allRankings].sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 10))
      setBottomItems([...allRankings].sort((a, b) => a.total_quantity - b.total_quantity).slice(0, 10))
    } catch (err) {
      console.error('Ranking Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('th-TH').format(amount)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
      >
        <h3 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
          <ShoppingBag className="w-4 h-4 text-stone-500" />
          เมนูขายดี & ขายไม่ค่อยออก
        </h3>
        <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-4">
            <button
              onClick={() => setActiveTab('top')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'top' ? 'bg-emerald-500 text-white' : 'text-stone-500'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> ขายดี
            </button>
            <button
              onClick={() => setActiveTab('bottom')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'bottom' ? 'bg-red-500 text-white' : 'text-stone-500'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> ขายไม่ค่อยออก
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-center py-4 text-xs text-stone-400">กำลังคำนวณ...</p>
            ) : (activeTab === 'top' ? topItems : bottomItems).map((item, index) => (
              <div key={item.menu_item_id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  activeTab === 'top' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                    <span className="text-sm font-semibold">฿{formatCurrency(item.total_revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${activeTab === 'top' ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${(item.total_quantity / (activeTab === 'top' ? (topItems[0]?.total_quantity || 1) : (bottomItems[0]?.total_quantity || 1))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}