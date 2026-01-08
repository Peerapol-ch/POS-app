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
  CircleDot
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
    if (menuMapRef.current. size > 0) return menuMapRef.current
    const { data } = await supabase. from('menu_items').select('id, name')
    const map = new Map<number, string>()
    data?. forEach((menu) => map.set(menu. id, menu.name))
    menuMapRef.current = map
    return map
  }, [])

  const loadOrders = useCallback(async (isSilent = false) => {
    if (! isSilent) setLoading(true)
    if (isSilent) setRefreshing(true)

    try {
      const [orderRes, itemRes, menuMap] = await Promise. all([
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

      const ordersWithItems:  Order[] = (orderRes.data || [])
        .map((order:  any) => ({
          id: order.id,
          order_id: order.order_id,
          table_id: order. table_id,
          status: order. status,
          total_amount: order. total_amount || 0,
          customer_count: order.customer_count || 1,
          payment_status: order.payment_status || 'unpaid',
          created_at: order. created_at,
          table_number:  order.tables?.table_number || null,
          items: (itemRes.data || [])
            .filter((item: any) => item.order_id === order. order_id)
            .map((item: any) => ({
              ... item,
              status: item.status || 'pending',
              itemName: menuMap. get(item.menu_item_id) || `เมนู #${item.menu_item_id}`,
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
      if (! isSilent) setError(err?. message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [soundEnabled, loadMenuMap])

  useEffect(() => {
    loadOrders(false)
  }, [])

  useEffect(() => {
    if (! autoRefresh) return
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

  const updateItemStatus = useCallback(async (itemId: number, newStatus: string, orderId:  string, orderDbId: number) => {
    setUpdatingItem(itemId)

    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          item.id === itemId ?  { ...item, status: newStatus } : item
        ),
      }))
    )

    try {
      await supabase. from('order_items').update({ status: newStatus }).eq('id', itemId)

      if (newStatus === 'cooking') {
        await supabase.from('orders').update({ status: 'cooking' }).eq('id', orderDbId)
      }

      if (soundEnabled) playSound()
    } catch (err: any) {
      loadOrders(true)
      alert(`เกิดข้อผิดพลาด:  ${err?. message}`)
    } finally {
      setUpdatingItem(null)
    }
  }, [soundEnabled, playSound, loadOrders])

  // ✅ แก้ไข submitOrder - เปลี่ยนสถานะโต๊ะเป็น Checkout
  const submitOrder = useCallback(async (orderDbId: number, orderIdText: string, tableId: number | null) => {
    setSendingOrder(orderDbId)

    setOrders((prev) => prev.filter((o) => o.id !== orderDbId))

    try {
      // 1. อัพเดท order_items เป็น completed
      const { error: itemsError } = await supabase
        . from('order_items')
        .update({ status: 'completed' })
        .eq('order_id', orderIdText)

      if (itemsError) throw itemsError

      // 2. อัพเดท order เป็น served
      const { error: orderError } = await supabase
        . from('orders')
        .update({ status: 'served' })
        .eq('id', orderDbId)

      if (orderError) throw orderError

      // 3. ✅ อัพเดทสถานะโต๊ะเป็น Checkout (ยกเว้นกลับบ้าน table_id = 9)
      if (tableId && tableId !== 9) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ current_status: 'Checkout' })  // ✅ เปลี่ยนเป็น Checkout (ตัวพิมพ์ใหญ่ตาม enum)
          .eq('id', tableId)

        if (tableError) {
          console.error('Table update error:', tableError)
        } else {
          console.log(`Table ${tableId} updated to Checkout`)
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
    const diff = Math.floor((Date. now() - new Date(createdAt).getTime()) / 1000)
    if (diff < 0) return { text: '0s', seconds: diff, urgent: false }
    if (diff < 60) return { text: `${diff}s`, seconds: diff, urgent: false }
    if (diff < 600) return { text: `${Math.floor(diff / 60)}m`, seconds: diff, urgent: false }
    if (diff < 3600) return { text: `${Math.floor(diff / 60)}m`, seconds: diff, urgent: true }
    return { text: `${Math.floor(diff / 3600)}h`, seconds: diff, urgent: true }
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
          <div className="relative">
            <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-500 rounded-full animate-spin mx-auto"></div>
            <ChefHat className="w-6 h-6 text-stone-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-base font-medium text-stone-500 mt-4">กำลังโหลด...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-stone-200">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-stone-500 mb-6 text-sm">{error}</p>
          <button
            onClick={() => loadOrders(false)}
            className="w-full py-2. 5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="px-4 lg:px-6 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-stone-100 p-2.5 rounded-xl">
                <ChefHat className="w-6 h-6 text-stone-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-stone-800">ห้องครัว</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time */}
              <div className="hidden md:flex items-center gap-2 text-stone-600">
                <Clock className="w-4 h-4 text-stone-400" />
                <span className="text-sm font-mono font-medium">
                  {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1. 5 px-2.5 py-1. 5 rounded-lg text-xs font-medium ${
                refreshing ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <CircleDot className={`w-3 h-3 ${refreshing ? 'animate-pulse' : ''}`} />
                {refreshing ? 'กำลังซิงค์' : 'เชื่อมต่อแล้ว'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1. 5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                soundEnabled
                  ? 'bg-stone-100 text-stone-700'
                  : 'bg-white text-stone-400 border border-stone-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> :  <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
            </button>

            <button
              onClick={() => setAutoRefresh(! autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                autoRefresh
                  ? 'bg-stone-100 text-stone-700'
                  : 'bg-white text-stone-400 border border-stone-200'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${autoRefresh ?  'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span className="hidden sm:inline">{autoRefresh ?  'อัตโนมัติ' : 'หยุดอัตโนมัติ'}</span>
            </button>

            <button
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' :  ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              onClick={() => setShowMenuModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-700 text-sm font-medium transition-all ml-auto"
            >
              <Monitor className="w-4 h-4" />
              <span>จัดการเมนู</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              <p className="text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> รอทำ
              </p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-sky-700">{stats.cooking}</p>
              <p className="text-xs text-sky-600 font-medium flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" /> กำลังทำ
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
              <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> เสร็จ
              </p>
            </div>
            <div className="bg-stone-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-stone-700">{stats.orders}</p>
              <p className="text-xs text-stone-500 font-medium flex items-center justify-center gap-1">
                <Package className="w-3 h-3" /> ออเดอร์
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="p-4 lg:p-6 pb-24">
        {orders.length > 0 ? (
          <div className="grid grid-cols-1 md: grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const hasPending = order.items.some((i) => !i.status || i.status === 'pending')
              const hasCooking = order.items.some((i) => i.status === 'cooking')
              const allCompleted = order.items.length > 0 && order.items.every((i) => i.status === 'completed')
              const isTakeaway = order.table_id === 9 || ! order.table_id

              let cardBorder = 'border-emerald-200'
              let headerBg = 'bg-emerald-50'
              let statusBadge = 'bg-emerald-100 text-emerald-700'
              let statusText = 'พร้อมส่ง'
              let StatusIcon = CheckCircle

              if (hasPending) {
                cardBorder = 'border-amber-200'
                headerBg = 'bg-amber-50'
                statusBadge = 'bg-amber-100 text-amber-700'
                statusText = 'รอทำ'
                StatusIcon = Clock
              } else if (hasCooking) {
                cardBorder = 'border-sky-200'
                headerBg = 'bg-sky-50'
                statusBadge = 'bg-sky-100 text-sky-700'
                statusText = 'กำลังทำ'
                StatusIcon = Flame
              }

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border-2 ${cardBorder} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Order Header */}
                  <div className={`${headerBg} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">Order</p>
                        <p className="text-lg font-bold text-stone-800">{order.order_id}</p>
                      </div>
                      <div className={`${statusBadge} px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusText}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1. 5 rounded-lg ${isTakeaway ? 'bg-violet-100' : 'bg-teal-100'}`}>
                          {isTakeaway ? (
                            <Home className="w-4 h-4 text-violet-600" />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4 text-teal-600" />
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${isTakeaway ? 'text-violet-700' : 'text-teal-700'}`}>
                          {isTakeaway ? 'กลับบ้าน' : `${order.table_number}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3. 5 h-3.5" />
                          {order. customer_count}
                        </span>
                        <span className="font-semibold text-stone-700">฿{order.total_amount?. toFixed(0) || 0}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    {allCompleted && (
                      <button
                        onClick={() => submitOrder(order.id, order.order_id, order. table_id)}
                        disabled={sendingOrder === order.id}
                        className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        {sendingOrder === order.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {sendingOrder === order. id ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
                      </button>
                    )}
                  </div>

                  {/* Items */}
                  <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                    {order.items. map((item) => {
                      const itemStatus = item.status || 'pending'
                      const timeInfo = getTimeElapsed(item.created_at)
                      const isUpdating = updatingItem === item. id

                      let itemBg = 'bg-emerald-50 border-emerald-100'
                      let timeBg = 'bg-emerald-500'
                      let buttonStyle = ''
                      let buttonText = ''
                      let showButton = false

                      if (itemStatus === 'pending') {
                        itemBg = timeInfo.urgent
                          ? 'bg-red-50 border-red-100'
                          :  'bg-amber-50 border-amber-100'
                        timeBg = timeInfo.urgent ? 'bg-red-500' : 'bg-amber-500'
                        buttonStyle = timeInfo.urgent
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-sky-500 hover:bg-sky-600'
                        buttonText = 'เริ่มทำ'
                        showButton = true
                      } else if (itemStatus === 'cooking') {
                        itemBg = 'bg-sky-50 border-sky-100'
                        timeBg = 'bg-sky-500'
                        buttonStyle = 'bg-emerald-500 hover:bg-emerald-600'
                        buttonText = 'เสร็จแล้ว'
                        showButton = true
                      }

                      return (
                        <div key={item.id} className={`rounded-xl p-3 border ${itemBg} transition-all`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm truncate ${itemStatus === 'completed' ? 'text-stone-400 line-through' :  'text-stone-800'}`}>
                                {item.itemName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                                <span className="bg-white px-1. 5 py-0.5 rounded font-medium">x{item.quantity}</span>
                                <span>฿{item. price}</span>
                              </div>
                            </div>
                            <span className={`${timeBg} px-2 py-0.5 rounded text-white text-[10px] font-bold flex items-center gap-1`}>
                              <Timer className="w-2. 5 h-2.5" />
                              {timeInfo.text}
                            </span>
                          </div>

                          {item.notes && (
                            <div className="bg-yellow-50 border border-yellow-100 text-yellow-700 p-2 rounded-lg text-xs mb-2">
                              📝 {item. notes}
                            </div>
                          )}

                          {showButton && (
                            <button
                              onClick={() => updateItemStatus(item. id, itemStatus === 'pending' ?  'cooking' :  'completed', order.order_id, order.id)}
                              disabled={isUpdating}
                              className={`w-full py-2 ${buttonStyle} text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1. 5`}
                            >
                              {isUpdating ? (
                                <Loader className="w-3. 5 h-3.5 animate-spin" />
                              ) : itemStatus === 'pending' ? (
                                <Flame className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              {isUpdating ? 'กำลังอัพเดท...' : buttonText}
                            </button>
                          )}

                          {itemStatus === 'completed' && (
                            <div className="flex items-center justify-center gap-1 py-1. 5 text-emerald-600 text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              เสร็จแล้ว
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-stone-400" />
              </div>
              <h3 className="text-xl font-semibold text-stone-700 mb-1">ยังไม่มีออเดอร์</h3>
              <p className="text-stone-400 text-sm">รอรับออเดอร์ใหม่... </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-stone-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs">ระบบพร้อมรับออเดอร์</span>
              </div>
            </div>
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