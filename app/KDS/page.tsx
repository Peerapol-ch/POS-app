'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import MenuManagementModal from '@/app/components/MenuManagementModal'
import {
  ChefHat,
  CheckCircle,
  AlertCircle,
  Loader,
  RotateCw,
  Volume2,
  VolumeX,
  Bell,
  Send,
  Monitor,
  Clock,
  Flame,
  Users,
  Home,
  UtensilsCrossed,
  Timer,
  RefreshCw,
  Package,
  CircleDot,
  Check,
  Play // ✅ เพิ่ม import Play
} from 'lucide-react'

interface OrderItem {
  id:  number
  order_id: string
  menu_item_id: number
  quantity: number
  price: number
  notes?:  string
  status: string
  created_at: string
  itemName? :  string
}

interface Order {
  id:  number
  order_id: string
  table_id: number | null
  status: string
  total_amount: number
  customer_count: number
  payment_status: string
  created_at: string
  table_number?: string
  items: OrderItem[]
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sendingOrder, setSendingOrder] = useState<number | null>(null)
  const [updatingItem, setUpdatingItem] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showMenuModal, setShowMenuModal] = useState(false)

  const previousOrdersRef = useRef<Order[]>([])
  const menuMapRef = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadMenuMap = useCallback(async () => {
    if (menuMapRef.current.size > 0) return menuMapRef.current
    const { data } = await supabase.from('menu_items').select('id, name')
    const map = new Map<number, string>()
    data?.forEach((menu) => map.set(menu.id, menu.name))
    menuMapRef.current = map
    return map
  }, [])

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    if (isSilent) setRefreshing(true)

    try {
      const [orderRes, itemRes, menuMap] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_id, table_id, status, total_amount, customer_count, payment_status, created_at, tables(table_number)')
          .in('status', ['pending', 'cooking'])
          .order('created_at', { ascending: true }),
        supabase
          .from('order_items')
          .select('id, order_id, menu_item_id, quantity, price, notes, status, created_at')
          .in('status', ['pending', 'cooking', 'completed'])
          .order('created_at', { ascending: true }),
        loadMenuMap()
      ])

      if (orderRes.error) throw orderRes.error

      const ordersWithItems: Order[] = (orderRes.data || [])
        .map((order: any) => ({
          id: order.id,
          order_id: order.order_id,
          table_id: order.table_id,
          status: order.status,
          total_amount: order.total_amount || 0,
          customer_count: order.customer_count || 1,
          payment_status: order.payment_status || 'unpaid',
          created_at: order.created_at,
          table_number:  order.tables?.table_number || null,
          items: (itemRes.data || [])
            .filter((item: any) => item.order_id === order.order_id)
            .map((item: any) => ({
              ...item,
              status: item.status || 'pending',
              itemName: menuMap.get(item.menu_item_id) || `เมนู #${item.menu_item_id}`,
            }))
        }))
        .filter((order) => order.items.length > 0)

      if (soundEnabled && isSilent && previousOrdersRef.current.length > 0) {
        if (ordersWithItems.length > previousOrdersRef.current.length) {
          playSound()
        }
      }

      previousOrdersRef.current = ordersWithItems
      setOrders(ordersWithItems)
      setError(null)
    } catch (err:  any) {
      if (!isSilent) setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [soundEnabled, loadMenuMap])

  useEffect(() => {
    loadOrders(false)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => loadOrders(true), 4000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadOrders])

  const playSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [])

  const updateItemStatus = useCallback(async (itemId: number, newStatus: string, orderId: string, orderDbId: number) => {
    setUpdatingItem(itemId)

    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        ),
      }))
    )

    try {
      await supabase.from('order_items').update({ status: newStatus }).eq('id', itemId)

      if (newStatus === 'cooking') {
        await supabase.from('orders').update({ status: 'cooking' }).eq('id', orderDbId)
      }

      if (soundEnabled) playSound()
    } catch (err: any) {
      loadOrders(true)
      alert(`เกิดข้อผิดพลาด: ${err?.message}`)
    } finally {
      setUpdatingItem(null)
    }
  }, [soundEnabled, playSound, loadOrders])

  const submitOrder = useCallback(async (orderDbId: number, orderIdText: string, tableId: number | null) => {
    setSendingOrder(orderDbId)

    setOrders((prev) => prev.filter((o) => o.id !== orderDbId))

    try {
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ status: 'completed' })
        .eq('order_id', orderIdText)

      if (itemsError) throw itemsError

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'served' })
        .eq('id', orderDbId)

      if (orderError) throw orderError

      if (tableId && tableId !== 9) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ current_status: 'Checkout' }) 
          .eq('id', tableId)

        if (tableError) {
          console.error('Table update error:', tableError)
        }
      }

      playSound()
    } catch (err:  any) {
      loadOrders(true)
      alert(`เกิดข้อผิดพลาด: ${err?.message}`)
    } finally {
      setSendingOrder(null)
    }
  }, [playSound, loadOrders])

  const getTimeElapsed = useCallback((createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    if (diff < 0) return { text: '0วิ', seconds: diff, urgent: false }
    if (diff < 60) return { text: '<1นาที', seconds: diff, urgent: false }
    if (diff < 600) return { text: `${Math.floor(diff / 60)}นาที`, seconds: diff, urgent: false }
    if (diff < 3600) return { text: `${Math.floor(diff / 60)}นาที`, seconds: diff, urgent: true }
    return { text: `${Math.floor(diff / 3600)}ชม.`, seconds: diff, urgent: true }
  }, [])

  const stats = useMemo(() => {
    const allItems = orders.flatMap((o) => o.items)
    return {
      pending: allItems.filter((i) => !i.status || i.status === 'pending').length,
      cooking: allItems.filter((i) => i.status === 'cooking').length,
      completed: allItems.filter((i) => i.status === 'completed').length,
      orders: orders.length,
    }
  }, [orders])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <Loader className="w-12 h-12 text-stone-400 animate-spin mx-auto mb-4" />
          <p className="text-stone-500 font-medium">กำลังโหลดข้อมูลครัว...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-stone-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-stone-800 mb-2">เชื่อมต่อขัดข้อง</h2>
          <p className="text-stone-500 mb-6 text-sm">{error}</p>
          <button onClick={() => loadOrders(false)} className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium">ลองใหม่</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-100/50 pb-20">
      {/* Header & Stats Bar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 lg:px-6 py-3">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-stone-900 p-2 rounded-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-stone-800 tracking-tight">ระบบครัว</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                <Clock className="w-4 h-4 text-stone-500" />
                <span className="text-lg font-mono font-bold text-stone-700">
                  {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                refreshing ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <CircleDot className={`w-3 h-3 ${refreshing ? 'animate-pulse' : ''}`} />
                {refreshing ? 'ซิงค์ข้อมูล' : 'ออนไลน์'}
              </div>
            </div>
          </div>

          {/* Action Bar & Stats */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Controls */}
            <div className="flex items-center gap-2 mb-2 md:mb-0">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-all border ${soundEnabled ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200'}`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-all border ${autoRefresh ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200'}`}
              >
                <RotateCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              </button>
              <button
                onClick={() => loadOrders(true)}
                disabled={refreshing}
                className="px-3 py-2 rounded-lg bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 text-sm font-bold flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>
               <button
                  onClick={() => setShowMenuModal(true)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 shadow-sm"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">จัดการเมนู</span>
                </button>
            </div>

            {/* Dashboard Stats - Thai Language */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 max-w-2xl w-full">
              <div className="bg-amber-100 rounded-lg p-2 flex flex-col items-center justify-center border-b-4 border-amber-400">
                <span className="text-2xl font-black text-amber-800 leading-none">{stats.pending}</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">รอทำ</span>
              </div>
              <div className="bg-sky-100 rounded-lg p-2 flex flex-col items-center justify-center border-b-4 border-sky-400">
                <span className="text-2xl font-black text-sky-800 leading-none">{stats.cooking}</span>
                <span className="text-[10px] font-bold text-sky-700 uppercase">กำลังทำ</span>
              </div>
              <div className="bg-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center border-b-4 border-emerald-400">
                <span className="text-2xl font-black text-emerald-800 leading-none">{stats.completed}</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">เสร็จแล้ว</span>
              </div>
              <div className="bg-stone-100 rounded-lg p-2 flex flex-col items-center justify-center border-b-4 border-stone-400">
                <span className="text-2xl font-black text-stone-800 leading-none">{stats.orders}</span>
                <span className="text-[10px] font-bold text-stone-600 uppercase">บิลทั้งหมด</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="p-4 lg:p-6">
        {orders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {orders.map((order) => {
              const hasPending = order.items.some((i) => !i.status || i.status === 'pending')
              const hasCooking = order.items.some((i) => i.status === 'cooking')
              const allCompleted = order.items.length > 0 && order.items.every((i) => i.status === 'completed')
              const isTakeaway = order.table_id === 9 || !order.table_id

              // Card Status Styling
              let statusColor = 'emerald'
              let StatusIcon = CheckCircle
              let statusLabel = 'พร้อมเสิร์ฟ'
              
              if (hasPending) {
                statusColor = 'amber'
                StatusIcon = Clock
                statusLabel = 'รอคิว'
              } else if (hasCooking) {
                statusColor = 'sky'
                StatusIcon = Flame
                statusLabel = 'กำลังทำ'
              }

              // Tailwind classes construction
              const borderClass = `border-${statusColor}-500`
              const bgHeaderClass = `bg-${statusColor}-50`
              const textHeaderClass = `text-${statusColor}-700`
              const badgeClass = `bg-${statusColor}-100 text-${statusColor}-800`

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-l-8 ${borderClass} flex flex-col h-full`}
                >
                  {/* Card Header */}
                  <div className={`p-3 border-b border-stone-100 ${bgHeaderClass} flex justify-between items-start`}>
                    <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${badgeClass}`}>
                                {statusLabel}
                            </span>
                            <span className="text-xs font-mono text-stone-400">#{order.order_id.split('-').pop()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${isTakeaway ? 'bg-purple-100 text-purple-700' : 'bg-stone-800 text-white'}`}>
                                {isTakeaway ? <Home className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
                            </div>
                            <span className="text-xl font-black text-stone-800">
                                {isTakeaway ? 'กลับบ้าน' : `${order.table_number}`}
                            </span>
                        </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                          <div className="text-xs font-medium text-stone-500 mb-0.5">รอมานาน</div>
                          {order.items.length > 0 && (
                             (() => {
                                 const timeInfo = getTimeElapsed(order.items[0].created_at)
                                 return (
                                     <div className={`text-lg font-black ${timeInfo.urgent ? 'text-red-500 animate-pulse' : 'text-stone-700'}`}>
                                         {timeInfo.text}
                                     </div>
                                 )
                             })()
                          )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-2 flex-1 flex flex-col gap-2">
                    {order.items.map((item) => {
                      const itemStatus = item.status || 'pending'
                      const isUpdating = updatingItem === item.id
                      
                      // Item Row Styling
                      let rowBg = 'bg-white'
                      let qtyColor = 'bg-stone-100 text-stone-600'
                      
                      if (itemStatus === 'pending') {
                          rowBg = 'bg-white'
                          qtyColor = 'bg-amber-100 text-amber-800'
                      } else if (itemStatus === 'cooking') {
                          rowBg = 'bg-sky-50/50'
                          qtyColor = 'bg-sky-100 text-sky-800'
                      } else if (itemStatus === 'completed') {
                          rowBg = 'bg-emerald-50/30 opacity-60 grayscale-[0.5]'
                          qtyColor = 'bg-emerald-100 text-emerald-800'
                      }

                      return (
                        <div key={item.id} className={`flex gap-3 p-3 rounded-lg border border-stone-100 ${rowBg} transition-all`}>
                          {/* Quantity Badge - Big & Clear */}
                          <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-lg font-black ${qtyColor}`}>
                            x{item.quantity}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                 <p className="text-base font-bold text-stone-800 leading-tight break-words">
                                     {item.itemName}
                                 </p>
                             </div>
                             
                             {/* Notes - High Contrast */}
                             {item.notes && (
                                 <div className="mt-1.5 inline-block bg-orange-100 border-l-4 border-orange-500 text-orange-800 text-xs font-bold px-2 py-1 rounded-r max-w-full break-words">
                                     ⚠️ {item.notes}
                                 </div>
                             )}
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0 flex items-center">
                             {itemStatus !== 'completed' && (
                                 <button
                                     onClick={() => updateItemStatus(item.id, itemStatus === 'pending' ? 'cooking' : 'completed', order.order_id, order.id)}
                                     disabled={isUpdating}
                                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95
                                      ${itemStatus === 'pending' 
                                          ? 'bg-stone-100 text-stone-400 hover:bg-sky-500 hover:text-white hover:shadow-sky-200' 
                                          : 'bg-sky-500 text-white hover:bg-emerald-500 hover:shadow-emerald-200'
                                      }
                                     `}
                                 >
                                     {isUpdating ? <Loader className="w-5 h-5 animate-spin" /> : 
                                      itemStatus === 'pending' ? <Play className="w-5 h-5 fill-current" /> : <Check className="w-5 h-5" />
                                     }
                                 </button>
                             )}
                             {itemStatus === 'completed' && (
                                 <div className="w-10 h-10 flex items-center justify-center text-emerald-500">
                                     <CheckCircle className="w-6 h-6" />
                                 </div>
                             )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer Actions */}
                  {allCompleted && (
                    <div className="p-3 bg-stone-50 border-t border-stone-100 mt-auto">
                      <button
                        onClick={() => submitOrder(order.id, order.order_id, order.table_id)}
                        disabled={sendingOrder === order.id}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                      >
                        {sendingOrder === order.id ? (
                          <> <Loader className="w-5 h-5 animate-spin" /> กำลังส่ง... </>
                        ) : (
                          <> <Send className="w-5 h-5" /> เสิร์ฟออเดอร์ </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-300">
            <Bell className="w-24 h-24 mb-4 opacity-20" />
            <h3 className="text-2xl font-bold text-stone-400">ว่างงานจ้า!</h3>
            <p className="text-stone-400">ยังไม่มีออเดอร์เข้ามาในครัว</p>
          </div>
        )}
      </div>

      <QuickMenu currentPage="kds" />

      <MenuManagementModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
      />
    </main>
  )
}