'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import OrderSuccessModal, { OrderResult } from '@/app/components/OrderSuccessModal'
import CheckoutModal from '@/app/components/CheckoutModal'
import TakeawayQRModal from '@/app/components/TakeawayQRModal' 
import {
  Check,
  Loader,
  UtensilsCrossed,
  RotateCw,
  LayoutGrid,
  Banknote,
  ShoppingBag,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  Timer,
  ChefHat,
  Wallet
} from 'lucide-react'

interface Table {
  id: string | number
  table_number: string | number
  seat_capacity?: number
  current_status?: string
}

interface TakeawayOrder {
  id: number
  order_id: string
  created_at: string
  status: string
  table_id?: number 
}

export default function SelectTable() {
  const [data, setData] = useState<Table[]>([])
  const [takeawayOrders, setTakeawayOrders] = useState<TakeawayOrder[]>([])
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)
  const [checkoutTable, setCheckoutTable] = useState<{id: string|number, name: string|number} | null>(null)
  const [checkoutTakeaway, setCheckoutTakeaway] = useState<TakeawayOrder | null>(null)
  const [qrTakeaway, setQrTakeaway] = useState<TakeawayOrder | null>(null)

  const [showAllOrders, setShowAllOrders] = useState(false)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadTableData = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) setLoading(true)
      
      const { data: tableData, error: tableError } = await supabase.from('tables').select('*')
      if (tableError) throw tableError

      const { data: twData, error: twError } = await supabase
        .from('orders')
        .select('id, order_id, created_at, status, table_id')
        .eq('table_id', 9)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (twError) console.error("Error loading takeaway:", twError)

      setData((prevData) => {
        if (JSON.stringify(prevData) === JSON.stringify(tableData)) return prevData
        return tableData || []
      })
      
      setTakeawayOrders((twData || []) as TakeawayOrder[])
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      if (!isAutoRefresh) setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadTableData()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadTableData(true)
      }, 5000)
      return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current) }
    } else { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current) }
  }, [autoRefresh])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await loadTableData()
  }

  const handleTableClick = (table: Table) => {
    const status = table.current_status?.toLowerCase()
    
    if (status === 'vacant') {
      setSelectedTable(String(table.id))
      setActionError(null)
    } 
    else if (status === 'checkout') {
      setCheckoutTable({ id: table.id, name: table.table_number })
    }
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const handleTakeawayCheckout = (order: TakeawayOrder) => {
    if (order.status.toLowerCase() === 'served') {
      setCheckoutTakeaway(order)
      if (navigator.vibrate) navigator.vibrate(10)
    }
  }

  const generateOrderId = async () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const prefix = 'OR'

    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(-2)
    const dateStr = `${dd}${mm}${yy}`

    const { data: lastOrders } = await supabase
      .from('orders')
      .select('order_id, id')
      .gte('created_at', startOfDay)
      .like('order_id', `${prefix}-${dateStr}%`)
      .order('id', { ascending: false })
      .limit(1)

    let nextSequence = 1

    if (lastOrders && lastOrders.length > 0 && lastOrders[0].order_id) {
      const lastId = lastOrders[0].order_id
      const parts = lastId.split('-')
      if (parts.length === 3) {
        const lastNumber = parseInt(parts[2])
        if (!isNaN(lastNumber)) {
          nextSequence = lastNumber + 1
        }
      }
    }

    const seqStr = String(nextSequence).padStart(4, '0')
    return `${prefix}-${dateStr}-${seqStr}`
  }

  const handleTakeawayClick = () => {
    setSelectedTable('takeaway') 
    setActionError(null)
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const handleConfirm = async () => {
    if (!selectedTable) return
    setConfirming(true)
    setActionError(null)
    setOrderResult(null)

    try {
      const orderId = await generateOrderId()
      const isTakeaway = selectedTable === 'takeaway'

      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 2)

      if (isTakeaway) {
        const takeawayTableId = 9 

        await supabase.from('table_sessions').insert([{
          table_id: takeawayTableId,
          token: sessionToken,
          status: 'active',
          expires_at: expiresAt.toISOString()
        }])

        const { error: insertOrderError } = await supabase.from('orders').insert([{
          order_id: orderId,
          table_id: takeawayTableId,
          status: 'pending',
          total_amount: 0,
          customer_count: 1,
          payment_status: 'unpaid',
        }])
        if (insertOrderError) throw insertOrderError
        
        setOrderResult({ 
          orderId, 
          tableNumber: 'กลับบ้าน', 
          isTakeaway: true,
          tableId: takeawayTableId,
          sessionToken
        })
        loadTableData()

      } else {
        const selectedTableData = data.find((t) => String(t.id) === String(selectedTable))

        await supabase
          .from('tables')
          .update({ current_status: 'occupied' })
          .eq('id', selectedTable)

        const { error: insertOrderError } = await supabase.from('orders').insert([{
          order_id: orderId,
          table_id: Number(selectedTable),
          status: 'pending',
          total_amount: 0,
          customer_count: 1,
          payment_status: 'unpaid',
        }])
        if (insertOrderError) throw insertOrderError
        
        await supabase.from('table_sessions').insert([{
          table_id: Number(selectedTable),
          token: sessionToken,
          status: 'active',
          expires_at: expiresAt.toISOString()
        }])

        setData((prev) =>
          prev.map((t) => (String(t.id) === String(selectedTable) ? { ...t, current_status: 'occupied' } : t))
        )
        
        setOrderResult({
          orderId,
          tableNumber: selectedTableData?.table_number || 'ไม่ทราบ',
          tableId: selectedTableData?.id, 
          seatsCapacity: selectedTableData?.seat_capacity,
          // @ts-ignore
          sessionToken
        })
      }
      setSelectedTable(null)
    } catch (err: any) {
      console.error('Confirm raw error:', err)
      setActionError(err?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setConfirming(false)
    }
  }

  const getStatusInfo = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case 'vacant': return { label: 'ว่าง', badgeBg: 'bg-emerald-100', badgeColor: 'text-emerald-700' }
      case 'occupied': return { label: 'ไม่ว่าง', badgeBg: 'bg-orange-100', badgeColor: 'text-orange-700' }
      case 'reserved': return { label: 'จองไว้', badgeBg: 'bg-blue-100', badgeColor: 'text-blue-700' }
      case 'checkout': return { label: 'เช็คบิล', badgeBg: 'bg-lime-200', badgeColor: 'text-lime-800' }
      default: return { label: 'ไม่ทราบ', badgeBg: 'bg-slate-200', badgeColor: 'text-slate-600' }
    }
  }

  const getOrderStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': 
        return { 
          label: 'รอดำเนินการ', 
          bg: 'bg-amber-50', 
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          icon: Timer,
          iconColor: 'text-amber-600'
        }
      case 'cooking': 
        return { 
          label: 'กำลังทำ', 
          bg: 'bg-orange-50', 
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          icon: ChefHat,
          iconColor: 'text-orange-600'
        }
      case 'served': 
        return { 
          label: 'พร้อมชำระ', 
          bg: 'bg-lime-50', 
          border: 'border-lime-300',
          iconBg: 'bg-lime-100',
          icon: Wallet,
          iconColor: 'text-lime-600'
        }
      default: 
        return { 
          label: status, 
          bg: 'bg-slate-50', 
          border: 'border-slate-200',
          iconBg: 'bg-slate-100',
          icon: Package,
          iconColor: 'text-slate-500'
        }
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const now = new Date()
    const created = new Date(dateStr)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`
    return `${Math.floor(diffHours / 24)} วันที่แล้ว`
  }

  const getQueueNumber = (orderId: string) => {
    return orderId.slice(-4)
  }
  
  if (loading) return <main className="min-h-screen flex items-center justify-center p-6"><Loader className="w-10 h-10 animate-spin text-emerald-600"/></main>
  if (error) return <main className="min-h-screen flex items-center justify-center p-6">Error: {JSON.stringify(error)}</main>
  if (data.length === 0) return <main className="min-h-screen flex items-center justify-center p-6">No Data</main>

  const regularTables = data.filter((t) => {
    const name = String(t.table_number).toLowerCase()
    return !(name.includes('กลับบ้าน') || name.includes('takeaway') || t.id === 9 || t.id === '9')
  }).sort((a, b) => {
    const numA = parseInt(String(a.table_number).replace(/\D/g, '') || '0', 10)
    const numB = parseInt(String(b.table_number).replace(/\D/g, '') || '0', 10)
    return numA - numB
  })

  const vacantCount = regularTables.filter((t) => t.current_status?.toLowerCase() === 'vacant').length
  const checkoutCount = regularTables.filter((t) => t.current_status?.toLowerCase() === 'checkout').length

  const getTableNumber = (tableNumber: string | number) => parseInt(String(tableNumber).replace(/\D/g, '') || '0', 10)
  const selectedTableData = data.find((t) => String(t.id) === selectedTable)
  const getTable = (num: number) => regularTables.find((t) => getTableNumber(t.table_number) === num)

  const displayOrders = showAllOrders ? takeawayOrders : takeawayOrders.slice(0, 3)
  const hasMoreOrders = takeawayOrders.length > 3

  const pendingCount = takeawayOrders.filter(o => o.status.toLowerCase() === 'pending').length
  const cookingCount = takeawayOrders.filter(o => o.status.toLowerCase() === 'cooking').length
  const servedCount = takeawayOrders.filter(o => o.status.toLowerCase() === 'served').length
  
  // TableCard Component
  const TableCard = ({ table, className = '' }: { table: Table; className?: string }) => {
    const num = getTableNumber(table.table_number)
    const statusInfo = getStatusInfo(table.current_status)
    const status = table.current_status?.toLowerCase()
    const isVacant = status === 'vacant'
    const isCheckout = status === 'checkout'
    const isSelected = selectedTable === String(table.id)
    const isHovered = hoveredTable === String(table.id)
    const isClickable = isVacant || isCheckout

    return (
      <div className={`relative h-full ${className}`}>
        <button
          onClick={() => isClickable && handleTableClick(table)} 
          onMouseEnter={() => setHoveredTable(String(table.id))}
          onMouseLeave={() => setHoveredTable(null)}
          disabled={!isClickable}
          className={`w-full h-full relative rounded-xl md:rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center p-1 md:p-3
            ${isSelected 
              ? 'shadow-xl ring-2 md:ring-4 ring-emerald-400/50 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400' 
              : isVacant 
              ? 'bg-white hover:shadow-lg border-slate-200 hover:border-emerald-400' 
              : isCheckout 
              ? 'bg-lime-50 border-lime-400 hover:shadow-lg hover:bg-lime-100 cursor-pointer' 
              : 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200'}
          `}
        >
          <div className={`mb-0.5 md:mb-1 transition-transform ${isHovered && isClickable && !isSelected ? 'scale-110' : ''}`}>
            {isCheckout ? (
              <Banknote className={`w-4 h-4 md:w-8 md:h-8 ${isSelected ? 'text-white' : 'text-lime-600'}`} />
            ) : (
              <UtensilsCrossed className={`w-4 h-4 md:w-8 md:h-8 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
            )}
          </div>

          <div className={`font-black text-sm sm:text-base md:text-2xl ${isSelected ? 'text-white' : isCheckout ? 'text-lime-800' : 'text-slate-800'}`}>{num}</div>
          
          <div className={`text-[9px] md:text-xs mt-0.5 ${isSelected ? 'text-white/80' : isCheckout ? 'text-lime-700' : 'text-slate-500'}`}>{table.seat_capacity || 0} ที่</div>
          
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-2 md:bottom-2 w-full md:w-auto px-1">
            <span className={`block w-full md:w-auto ${statusInfo.badgeBg} ${statusInfo.badgeColor} px-1 py-0.5 rounded md:rounded-full text-[8px] md:text-[10px] font-bold truncate`}>
                {statusInfo.label}
            </span>
          </div>
        </button>
        {isSelected && (
          <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 z-10">
            <div className="bg-emerald-500 rounded-full w-5 h-5 md:w-8 md:h-8 flex items-center justify-center shadow-lg ring-2 ring-white">
              <Check className="w-2.5 h-2.5 md:w-4 md:h-4 text-white" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // TakeawayOrderCard Component
  const TakeawayOrderCard = ({ order }: { order: TakeawayOrder }) => {
    const config = getOrderStatusConfig(order.status)
    const StatusIcon = config.icon
    const isServed = order.status.toLowerCase() === 'served'
    const queueNumber = getQueueNumber(order.order_id)

    return (
      <div 
        className={`group relative rounded-2xl border-2 ${config.border} ${config.bg} p-3 md:p-4 transition-all duration-300 hover:shadow-md ${
          isServed ? 'ring-2 ring-lime-200 ring-offset-2' : ''
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`flex-shrink-0 w-12 h-12 md:w-16 md:h-16 ${config.iconBg} rounded-2xl flex items-center justify-center`}>
            <StatusIcon className={`w-6 h-6 md:w-8 md:h-8 ${config.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-black text-slate-800 text-base md:text-lg">Q#{queueNumber}</span>
              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-semibold ${config.iconBg} ${config.iconColor}`}>
                {config.label}
              </span>
            </div>
            
            <div className="text-xs md:text-sm text-slate-500 font-mono mb-1 truncate">{order.order_id}</div>
            
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400">
              <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span>{new Date(order.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
              <span>•</span>
              <span>{getTimeAgo(order.created_at)}</span>
            </div>
          </div>
          
          {isServed && (
            <button 
              onClick={() => handleTakeawayCheckout(order)}
              className="flex-shrink-0 px-3 py-2 md:px-4 md:py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm hover:from-lime-600 hover:to-emerald-600 transition-all shadow-lg shadow-lime-500/25 flex items-center gap-1 md:gap-2"
            >
              <CreditCard className="w-3 h-3 md:w-4 md:h-4" /> 
              <span>ชำระเงิน</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 p-4 md:p-8 pb-32 md:pb-40">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-4 md:mb-6">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 md:p-3 rounded-xl"><UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
                  <div><h1 className="text-lg md:text-2xl font-black text-slate-800">แผนผังโต๊ะ</h1><p className="text-slate-500 text-xs md:text-sm">ร้านไก่ย่างพังโคน</p></div>
                </div>
                <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 transition-colors">
                  <RotateCw className={`w-5 h-5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </header>

          {/* Takeaway Section */}
          <div className="mb-6 md:mb-8 bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 md:px-5 py-3 md:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 md:p-2.5 rounded-xl">
                    <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-white">สั่งกลับบ้าน</h2>
                  </div>
                </div>
                
                {takeawayOrders.length > 0 && (
                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="bg-amber-400 text-amber-900 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {pendingCount}
                      </span>
                    )}
                    {cookingCount > 0 && (
                      <span className="bg-orange-400 text-orange-900 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1">
                        <ChefHat className="w-3 h-3" /> {cookingCount}
                      </span>
                    )}
                    {servedCount > 0 && (
                      <span className="bg-lime-400 text-lime-900 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> {servedCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="flex gap-4 md:gap-5 flex-col lg:flex-row">
                <div className="w-full lg:w-56 flex-shrink-0">
                  <button
                    onClick={handleTakeawayClick}
                    className={`w-full h-full min-h-[120px] md:min-h-[160px] rounded-2xl border-2 border-dashed p-4 md:p-6 transition-all relative flex flex-row lg:flex-col items-center justify-center gap-4 lg:gap-3 text-center
                    ${selectedTable === 'takeaway' 
                      ? 'shadow-xl ring-4 ring-purple-400/50 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 border-solid' 
                      : 'bg-purple-50/50 hover:bg-purple-100/50 border-purple-300 hover:border-purple-400 group'
                    }`}
                  >
                    <div className={`p-3 md:p-4 rounded-2xl ${selectedTable === 'takeaway' ? 'bg-white/20' : 'bg-white shadow-sm group-hover:shadow-md transition-shadow'}`}>
                      <ShoppingBag className={`w-8 h-8 md:w-10 md:h-10 ${selectedTable === 'takeaway' ? 'text-white' : 'text-purple-600'}`} />
                    </div>
                    <div className="text-left lg:text-center">
                      <div className={`font-black text-base md:text-lg mb-0.5 md:mb-1 ${selectedTable === 'takeaway' ? 'text-white' : 'text-purple-700'}`}>
                        สร้างรายการใหม่
                      </div>
                      <div className={`text-xs md:text-sm ${selectedTable === 'takeaway' ? 'text-white/80' : 'text-purple-400'}`}>
                        กดเพื่อเริ่มสั่งอาหาร
                      </div>
                    </div>
                    {selectedTable === 'takeaway' && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex-1">
                  {takeawayOrders.length > 0 ? (
                    <div className="space-y-3">
                      {displayOrders.map((order) => (
                        <TakeawayOrderCard key={order.id} order={order} />
                      ))}

                      {hasMoreOrders && (
                        <button
                          onClick={() => setShowAllOrders(!showAllOrders)}
                          className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                          {showAllOrders ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              ซ่อนรายการ
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              ดูทั้งหมด ({takeawayOrders.length} รายการ)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-[120px] md:h-[160px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Package className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 opacity-30" />
                      <p className="font-medium text-sm md:text-base">ไม่มีรายการกลับบ้าน</p>
                      <p className="text-xs md:text-sm text-slate-300 mt-1">กดปุ่มเพื่อสร้างรายการใหม่</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table Layout */}
          <section className="mb-6 md:mb-8">
            <div className="bg-white/60 backdrop-blur rounded-2xl p-4 md:p-6 shadow-lg border">
              <h2 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> ผังโต๊ะร้าน</h2>
              
              <div className="w-full px-0">
                <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-3xl mx-auto w-full">
                  
                  {/* Row 1 */}
                  <div className="aspect-square md:aspect-[4/3] w-full"></div>
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(1) && <TableCard table={getTable(1)!} />}</div>
                  <div className="aspect-square md:aspect-[4/3] w-full"></div>
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(5) && <TableCard table={getTable(5)!} />}</div>
                  
                  {/* Row 2 */}
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(3) && <TableCard table={getTable(3)!} />}</div>
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(2) && <TableCard table={getTable(2)!} />}</div>
                  <div className="aspect-square md:aspect-[4/3] w-full"></div>
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(6) && <TableCard table={getTable(6)!} />}</div>
                  
                  {/* Row 3 */}
                  <div className="col-span-2 aspect-[2/1] md:aspect-[8/3] w-full">{getTable(4) && <TableCard table={getTable(4)!} />}</div>
                  <div className="aspect-square md:aspect-[4/3] w-full"></div>
                  <div className="aspect-square md:aspect-[4/3] w-full">{getTable(7) && <TableCard table={getTable(7)!} />}</div>
                  
                </div>
              </div>
              
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-20">
            <div className="bg-white rounded-xl p-3 shadow border flex items-center gap-3">
              <div className="bg-slate-100 p-2.5 rounded-lg"><UtensilsCrossed className="w-5 h-5 text-slate-600" /></div>
              <div><div className="text-xl font-black">{regularTables.length}</div><div className="text-xs text-slate-500">โต๊ะทั้งหมด</div></div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 shadow border border-emerald-200 flex items-center gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-lg"><Check className="w-5 h-5 text-emerald-600" /></div>
              <div><div className="text-xl font-black text-emerald-700">{vacantCount}</div><div className="text-xs text-emerald-600">โต๊ะว่างทั้งหมด</div></div>
            </div>
            <div className="bg-lime-50 rounded-xl p-3 shadow border border-lime-200 flex items-center gap-3">
              <div className="bg-lime-100 p-2.5 rounded-lg"><Banknote className="w-5 h-5 text-lime-600" /></div>
              <div><div className="text-xl font-black text-lime-700">{checkoutCount}</div><div className="text-xs text-lime-600">รอเช็คบิล</div></div>
            </div>
          </section>
        </div>

        {/* ✅ QuickMenu - ซ่อนเมื่อเลือกโต๊ะแล้ว */}
        <QuickMenu currentPage="select-table" hide={!!selectedTable} />
        
        <OrderSuccessModal result={orderResult} onClose={() => setOrderResult(null)} />
        
        {checkoutTable && (
          <CheckoutModal 
            tableId={Number(checkoutTable.id)} 
            tableName={checkoutTable.name} 
            onClose={() => setCheckoutTable(null)} 
            onSuccess={loadTableData} 
          />
        )}
        
        {checkoutTakeaway && (
          <CheckoutModal 
            tableId={checkoutTakeaway.table_id || 9} 
            tableName="กลับบ้าน" 
            onClose={() => setCheckoutTakeaway(null)} 
            onSuccess={loadTableData} 
          />
        )}
        
        {qrTakeaway && <TakeawayQRModal order={qrTakeaway} onClose={() => setQrTakeaway(null)} />}

        {/* Bottom Bar */}
        <div className={`fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 transition-all z-30 ${selectedTable ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-8'}`}>
          <div className="max-w-md mx-auto bg-white rounded-2xl p-3 shadow-2xl border flex items-center justify-between ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              {selectedTable === 'takeaway' ? (
                <div className="bg-purple-100 p-2 rounded-full">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
              ) : (
                <div className="bg-emerald-100 p-2 rounded-full">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <span className={`font-bold text-sm md:text-base ${selectedTable === 'takeaway' ? 'text-purple-700' : 'text-emerald-700'}`}>
                {selectedTable === 'takeaway' ? 'กลับบ้าน' : ` ${selectedTableData?.table_number}`}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedTable(null)} disabled={confirming} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs md:text-sm text-black transition-colors">ยกเลิก</button>
              <button onClick={handleConfirm} disabled={confirming} className={`px-4 py-2 rounded-xl font-bold text-white text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all ${selectedTable === 'takeaway' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {confirming ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {confirming ? 'กำลังสร้าง...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}