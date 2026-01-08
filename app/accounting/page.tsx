'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import SalesPrediction from '@/app/components/SalesPrediction'
import {
  BarChart3,
  ShoppingBag,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Brain,
  CalendarDays,
  TrendingUp,
  Clock,
  Utensils,
  Filter,
  ChevronDown,
  X,
  Package,
  Home,
  CreditCard,
  Minus,
  PieChart,
  Target,
  Zap,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react'

type ViewMode = 'day' | 'week' | 'month'
type SortBy = 'time' | 'amount' | 'status'

interface DailySales {
  date: string
  total:   number
  orders: number
  customers: number
  dayOfWeek: number
}

interface HourlySales {
  hour: number
  total:  number
  orders:  number
}

interface OrderItem {
  id:   number
  quantity: number
  price: number
  menu_items? :  {
    name: string
  }
}

interface OrderDetail {
  id:   number
  order_id: string
  table_id: number | null
  table_number: string | null
  total_amount: number
  customer_count:   number
  status: string
  payment_status: string
  created_at:   string
  slip_url?: string | null  // ✅ เพิ่ม slip_url
  items? :  OrderItem[]
}

export default function AccountingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [showPrediction, setShowPrediction] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview')
  const [sortBy, setSortBy] = useState<SortBy>('time')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [loadingOrderItems, setLoadingOrderItems] = useState(false)
  const [showSlipModal, setShowSlipModal] = useState(false)  // ✅ เพิ่ม state สำหรับ Modal รูปสลิป

  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [averageOrder, setAverageOrder] = useState(0)
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [dailyData, setDailyData] = useState<DailySales[]>([])
  const [hourlyData, setHourlyData] = useState<HourlySales[]>([])
  const [previousRevenue, setPreviousRevenue] = useState(0)

  const [cashTotal, setCashTotal] = useState(0)
  const [promptPayTotal, setPromptPayTotal] = useState(0)
  const [unpaidAmount, setUnpaidAmount] = useState(0)

  const [peakHour, setPeakHour] = useState<number | null>(null)
  const [avgPerCustomer, setAvgPerCustomer] = useState(0)

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadData()
  }, [viewMode, currentDate])

  useEffect(() => {
    setCalendarDate(new Date(currentDate))
  }, [currentDate])

  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (viewMode === 'week') {
      const day = start.getDay()
      start.setDate(start. getDate() - day + (day === 0 ? -6 : 1))
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    }
    return { start, end }
  }

  const getPreviousDateRange = () => {
    const { start, end } = getDateRange()
    const prevStart = new Date(start)
    const prevEnd = new Date(end)

    if (viewMode === 'day') {
      prevStart.setDate(prevStart.getDate() - 1)
      prevEnd.setDate(prevEnd.getDate() - 1)
    } else if (viewMode === 'week') {
      prevStart.setDate(prevStart.getDate() - 7)
      prevEnd.setDate(prevEnd.getDate() - 7)
    } else {
      prevStart.setMonth(prevStart. getMonth() - 1)
      prevEnd.setMonth(prevEnd.getMonth() - 1)
    }
    return { start: prevStart, end: prevEnd }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { start, end } = getDateRange()
      const { start: prevStart, end: prevEnd } = getPreviousDateRange()

      // ✅ เพิ่ม slip_url ใน select
      const { data: ordersData, error:  ordersError } = await supabase
        .from('orders')
        .select('*, tables(table_number)')
        .gte('created_at', start. toISOString())
        .lte('created_at', end.toISOString())
        .in('status', ['served', 'completed'])
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const { data: prevOrdersData } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString())
        .in('status', ['served', 'completed'])

      const ordersList:  OrderDetail[] = (ordersData || []).map((order) => ({
        id: order. id,
        order_id: order. order_id,
        table_id: order.table_id,
        table_number: order.tables?. table_number || null,
        total_amount: order. total_amount || 0,
        customer_count: order.customer_count || 1,
        status:  order.status,
        payment_status:  order.payment_status || 'unpaid',
        created_at: order. created_at,
        slip_url:  order.slip_url || null,  // ✅ เพิ่ม slip_url
      }))

      const revenue = ordersList.reduce((sum, o) => sum + o.total_amount, 0)
      const customers = ordersList.reduce((sum, o) => sum + o. customer_count, 0)
      const prevRev = (prevOrdersData || []).reduce((sum:  number, o:  any) => sum + (o.total_amount || 0), 0)

      let cashSum = 0
      let promptPaySum = 0
      let unpaidSum = 0

      ordersList.forEach(order => {
        const status = order.payment_status?. toLowerCase()
        if (status === 'cash') {
          cashSum += order. total_amount
        } else if (status === 'promptpay') {
          promptPaySum += order.total_amount
        } else {
          unpaidSum += order.total_amount
        }
      })

      const hourlyMap:  { [key: number]: HourlySales } = {}
      ordersList.forEach((order) => {
        const hour = new Date(order.created_at).getHours()
        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { hour, total: 0, orders: 0 }
        }
        hourlyMap[hour].total += order.total_amount
        hourlyMap[hour].orders += 1
      })

      const hourlyArray = Object.values(hourlyMap).sort((a, b) => a.hour - b.hour)
      setHourlyData(hourlyArray)

      let maxOrders = 0
      let peakH = null
      for (const data of hourlyArray) {
        if (data.orders > maxOrders) {
          maxOrders = data.orders
          peakH = data.hour
        }
      }

      setOrders(ordersList)
      setTotalRevenue(revenue)
      setTotalOrders(ordersList.length)
      setTotalCustomers(customers)
      setAverageOrder(ordersList.length > 0 ? revenue / ordersList.length :  0)
      setAvgPerCustomer(customers > 0 ? revenue / customers :  0)
      setPreviousRevenue(prevRev)
      setCashTotal(cashSum)
      setPromptPayTotal(promptPaySum)
      setUnpaidAmount(unpaidSum)
      setPeakHour(peakH)

      if (viewMode !== 'day') {
        const dailyMap: { [key:  string]: DailySales } = {}
        ordersList.forEach((order) => {
          const orderDate = new Date(order.created_at)
          const dateKey = orderDate.toISOString().split('T')[0]
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, total: 0, orders: 0, customers: 0, dayOfWeek:  orderDate.getDay() }
          }
          dailyMap[dateKey].total += order.total_amount
          dailyMap[dateKey].orders += 1
          dailyMap[dateKey].customers += order.customer_count
        })
        setDailyData(Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)))
      }
    } catch (err:  any) {
      console.error('Error loading data:', err)
      setError(err?. message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderItems = async (order:  OrderDetail) => {
    setSelectedOrder(order)
    setLoadingOrderItems(true)

    try {
      const { data: items, error } = await supabase
        . from('order_items')
        .select('*, menu_items(name)')
        .eq('order_id', order.order_id)

      if (error) throw error

      setSelectedOrder({
        ...order,
        items: items || []
      })
    } catch (err) {
      console. error('Error loading order items:', err)
    } finally {
      setLoadingOrderItems(false)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 :  -7))
    else newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 :  -1))
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  const selectDate = (date:  Date) => {
    setCurrentDate(date)
    setShowCalendar(false)
  }

  const navigateCalendarMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 :  -1))
    setCalendarDate(newDate)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days:  (Date | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date. getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return date.getDate() === currentDate.getDate() && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
  }

  const formatCurrency = (amount:  number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  const formatDateDisplay = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
    } else if (viewMode === 'week') {
      const { start, end } = getDateRange()
      return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('th-TH', { month: 'short' })}`
    } else {
      return currentDate.toLocaleDateString('th-TH', { month:  'long', year: 'numeric' })
    }
  }

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  const formatHour = (hour:  number) => `${hour.toString().padStart(2, '0')}:00`

  const getPercentChange = () => {
    if (previousRevenue === 0) return totalRevenue > 0 ? 100 : 0
    return ((totalRevenue - previousRevenue) / previousRevenue) * 100
  }

  const getSortedOrders = () => {
    const sorted = [...orders]
    switch (sortBy) {
      case 'time':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'amount':
        return sorted.sort((a, b) => b.total_amount - a.total_amount)
      case 'status': 
        return sorted.sort((a, b) => {
          const score = (status:  string) => {
            if (status === 'unpaid') return 3
            if (status === 'promptpay') return 2
            return 1
          }
          return score(b.payment_status) - score(a.payment_status)
        })
      default: 
        return sorted
    }
  }

  const isTakeaway = (order: OrderDetail) => order.table_id === 9

  const percentChange = getPercentChange()
  const dineInOrders = orders.filter(o => ! isTakeaway(o)).length
  const takeawayOrders = orders. filter(o => isTakeaway(o)).length
  const dineInRevenue = orders.filter(o => ! isTakeaway(o)).reduce((sum, o) => sum + o. total_amount, 0)
  const takeawayRevenue = orders.filter(o => isTakeaway(o)).reduce((sum, o) => sum + o. total_amount, 0)

  const maxHourlyOrders = Math.max(... hourlyData.map(h => h.orders), 1)
  const maxDailyTotal = Math.max(... dailyData.map(d => d. total), 1)

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">กำลังโหลดข้อมูล... </p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm max-w-sm w-full text-center border border-stone-200">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-stone-500 text-sm mb-4">{error}</p>
          <button onClick={loadData} className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
            ลองใหม่
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800">การบัญชี</h1>
                <p className="text-xs text-stone-400">รายงานยอดขาย</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrediction(!showPrediction)}
                className={`p-2.5 rounded-xl transition-all ${
                  showPrediction ? 'bg-violet-100 text-violet-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Brain className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                วันนี้
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigateDate('prev')}
              className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-stone-600" />
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex-1 bg-stone-800 rounded-xl py-3 text-white font-medium text-center hover:bg-stone-700 transition-colors"
            >
              {formatDateDisplay()}
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === mode ?  'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {mode === 'day' ?  'วัน' : mode === 'week' ?  'สัปดาห์' : 'เดือน'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCalendar(false)} />
          <div ref={calendarRef} className="relative bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8">
            <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateCalendarMonth('prev')} className="p-2 hover:bg-stone-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-stone-800">{thaiMonths[calendarDate.getMonth()]} {calendarDate.getFullYear() + 543}</h3>
              <button onClick={() => navigateCalendarMonth('next')} className="p-2 hover:bg-stone-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {thaiDays.map((day, i) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${i === 0 ?  'text-red-400' : i === 6 ? 'text-blue-400' : 'text-stone-400'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(calendarDate).map((date, index) => (
                <div key={index} className="aspect-square p-0.5">
                  {date ?  (
                    <button
                      onClick={() => selectDate(date)}
                      className={`w-full h-full rounded-xl text-sm font-medium flex items-center justify-center transition-all ${
                        isSelected(date) ? 'bg-stone-800 text-white' : isToday(date) ? 'bg-stone-100 text-stone-800 ring-2 ring-stone-300' : 'hover:bg-stone-50'
                      } ${date.getDay() === 0 && ! isSelected(date) ? 'text-red-400' : ''} ${date.getDay() === 6 && !isSelected(date) ? 'text-blue-400' : ''}`}
                    >
                      {date. getDate()}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setCurrentDate(new Date()); setShowCalendar(false) }} className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-medium">วันนี้</button>
              <button onClick={() => setShowCalendar(false)} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Slip Image Modal */}
      {showSlipModal && selectedOrder?. slip_url && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowSlipModal(false)} />
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh]">
            <div className="bg-sky-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <ImageIcon className="w-5 h-5" />
                <span className="font-bold">สลิปการโอนเงิน</span>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-4 bg-stone-100">
              <img
                src={selectedOrder.slip_url}
                alt="สลิปการโอนเงิน"
                className="w-full h-auto rounded-xl"
              />
            </div>
            <div className="p-4 bg-white border-t border-stone-100 flex gap-3">
              <a
                href={selectedOrder.slip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover: bg-sky-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                เปิดในแท็บใหม่
              </a>
              <button
                onClick={() => setShowSlipModal(false)}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className={`p-5 ${isTakeaway(selectedOrder) ? 'bg-violet-50' : 'bg-sky-50'}`}>
              <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10">
                <X className="w-5 h-5 text-stone-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTakeaway(selectedOrder) ? 'bg-violet-100' : 'bg-sky-100'}`}>
                  {isTakeaway(selectedOrder) ? <Home className="w-6 h-6 text-violet-600" /> :  <Utensils className="w-6 h-6 text-sky-600" />}
                </div>
                <div>
                  <p className="text-stone-500 text-sm">{isTakeaway(selectedOrder) ? 'สั่งกลับบ้าน' :  `โต๊ะ ${selectedOrder.table_number}`}</p>
                  <p className="font-bold text-stone-800">{selectedOrder. order_id}</p>
                </div>
              </div>
            </div>

            <div className="p-5 border-b border-stone-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">เวลา</p>
                  <p className="font-semibold text-stone-700">{formatTime(selectedOrder.created_at)}</p>
                </div>
                <div className="text-center p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">ลูกค้า</p>
                  <p className="font-semibold text-stone-700">{selectedOrder.customer_count} คน</p>
                </div>
                <div className="text-center p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">ชำระ</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedOrder. payment_status === 'cash' ? 'bg-emerald-100 text-emerald-700' : 
                    selectedOrder.payment_status === 'promptpay' ? 'bg-sky-100 text-sky-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedOrder.payment_status === 'cash' ?  'เงินสด' : selectedOrder. payment_status === 'promptpay' ? 'พร้อมเพย์' : 'ค้าง'}
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ แสดงปุ่มดูสลิปถ้าเป็น PromptPay และมี slip_url */}
            {selectedOrder.payment_status === 'promptpay' && selectedOrder.slip_url && (
              <div className="px-5 py-3 border-b border-stone-100">
                <button
                  onClick={() => setShowSlipModal(true)}
                  className="w-full py-3 bg-sky-50 text-sky-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors border border-sky-200"
                >
                  <ImageIcon className="w-5 h-5" />
                  ดูสลิปการโอนเงิน
                </button>
              </div>
            )}

            {/* ✅ แสดงข้อความถ้าเป็น PromptPay แต่ไม่มีสลิป */}
            {selectedOrder.payment_status === 'promptpay' && ! selectedOrder.slip_url && (
              <div className="px-5 py-3 border-b border-stone-100">
                <div className="py-3 bg-amber-50 text-amber-600 rounded-xl text-center text-sm font-medium border border-amber-200">
                  ไม่มีรูปสลิป
                </div>
              </div>
            )}

            <div className="p-5 flex-1 overflow-y-auto">
              <h4 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                รายการอาหาร
              </h4>

              {loadingOrderItems ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin"></div>
                </div>
              ) : selectedOrder.items && selectedOrder.items. length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-stone-200 rounded-lg flex items-center justify-center text-stone-600 font-medium text-sm">
                          {item.quantity}
                        </span>
                        <span className="text-stone-700">{item.menu_items?. name || 'ไม่ระบุ'}</span>
                      </div>
                      <span className="font-semibold text-stone-800">฿{formatCurrency(item. price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">ไม่มีรายการ</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-stone-50 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">ยอดรวม</span>
                <span className="text-2xl font-bold text-stone-800">฿{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        <SalesPrediction isOpen={showPrediction} onClose={() => setShowPrediction(false)} />

        {/* Revenue Summary */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-stone-500 text-sm mb-1">รายรับรวม</p>
              <p className="text-3xl font-bold text-stone-800">฿{formatCurrency(totalRevenue)}</p>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
              percentChange >= 0 ? 'bg-emerald-50 text-emerald-600' :  'bg-red-50 text-red-600'
            }`}>
              {percentChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(percentChange).toFixed(1)}%
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-stone-50 rounded-xl">
              <p className="text-xl font-bold text-stone-800">{totalOrders}</p>
              <p className="text-xs text-stone-500">ออเดอร์</p>
            </div>
            <div className="text-center p-3 bg-stone-50 rounded-xl">
              <p className="text-xl font-bold text-stone-800">{totalCustomers}</p>
              <p className="text-xs text-stone-500">ลูกค้า</p>
            </div>
            <div className="text-center p-3 bg-stone-50 rounded-xl">
              <p className="text-xl font-bold text-stone-800">฿{formatCurrency(averageOrder)}</p>
              <p className="text-xs text-stone-500">เฉลี่ย/บิล</p>
            </div>
            <div className="text-center p-3 bg-stone-50 rounded-xl">
              <p className="text-xl font-bold text-stone-800">฿{formatCurrency(avgPerCustomer)}</p>
              <p className="text-xs text-stone-500">เฉลี่ย/คน</p>
            </div>
          </div>
        </div>

        {/* Payment & Order Type Analysis */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-stone-500" />
              การชำระเงิน
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">เงินสด</span>
                  <span className="font-medium text-stone-800">฿{formatCurrency(cashTotal)}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 :  0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">พร้อมเพย์</span>
                  <span className="font-medium text-stone-800">฿{formatCurrency(promptPayTotal)}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${totalRevenue > 0 ? (promptPayTotal / totalRevenue) * 100 :  0}%` }}></div>
                </div>
              </div>
              {unpaidAmount > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600">ค้างชำระ</span>
                    <span className="font-medium text-amber-600">฿{formatCurrency(unpaidAmount)}</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${totalRevenue > 0 ? (unpaidAmount / totalRevenue) * 100 : 0}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2 text-sm">
              <PieChart className="w-4 h-4 text-stone-500" />
              ประเภทออเดอร์
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-sky-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-sky-600" />
                  <span className="text-sm text-stone-700">ทานที่ร้าน</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-stone-800">{dineInOrders}</p>
                  <p className="text-xs text-stone-500">฿{formatCurrency(dineInRevenue)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-violet-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-violet-600" />
                  <span className="text-sm text-stone-700">กลับบ้าน</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-stone-800">{takeawayOrders}</p>
                  <p className="text-xs text-stone-500">฿{formatCurrency(takeawayRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        {(peakHour !== null || totalOrders > 0) && (
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              ข้อมูลเชิงลึก
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {peakHour !== null && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">ช่วงขายดี</p>
                    <p className="font-bold text-stone-800">{formatHour(peakHour)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-stone-500">ยอดสูงสุด</p>
                  <p className="font-bold text-stone-800">฿{formatCurrency(Math.max(... orders. map(o => o.total_amount), 0))}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hourly Chart (Day View) */}
        {viewMode === 'day' && hourlyData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-stone-500" />
              ออเดอร์ตามช่วงเวลา
            </h3>
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 24 }, (_, i) => i).map(hour => {
                const data = hourlyData. find(h => h.hour === hour)
                const ordersCount = data?. orders || 0
                const height = ordersCount > 0 ? (ordersCount / maxHourlyOrders) * 100 : 0

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center h-24">
                      <div
                        className={`w-full max-w-[12px] rounded-t transition-all ${ordersCount > 0 ? 'bg-stone-300 hover:bg-stone-400' : 'bg-stone-100'}`}
                        style={{ height:  `${Math.max(height, ordersCount > 0 ? 8 : 2)}%` }}
                        title={`${formatHour(hour)}:  ${ordersCount} ออเดอร์`}
                      ></div>
                    </div>
                    {hour % 4 === 0 && (
                      <span className="text-[10px] text-stone-400 mt-1">{hour}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-stone-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'overview' ?  'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            ภาพรวม
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'orders' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            ออเดอร์
            <span className={`px-1. 5 py-0.5 rounded text-xs ${activeTab === 'orders' ? 'bg-white/20' : 'bg-stone-100'}`}>
              {orders.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ?  (
          <>
            {viewMode !== 'day' && dailyData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-stone-200">
                <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-stone-500" />
                  ยอดขายรายวัน
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {dailyData. slice().reverse().map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-16 text-right">
                        <p className="text-sm font-medium text-stone-700">{new Date(day.date).getDate()}</p>
                        <p className="text-xs text-stone-400">{thaiDays[day.dayOfWeek]}</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-6 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-stone-400 rounded-full flex items-center justify-end pr-2"
                            style={{ width:  `${(day.total / maxDailyTotal) * 100}%`, minWidth: day.total > 0 ? '40px' : '0' }}
                          >
                            {day.total > 0 && <span className="text-xs text-white font-medium">฿{formatCurrency(day.total)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="w-16 text-right text-xs text-stone-500">
                        {day.orders} บิล
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-7 h-7 text-stone-400" />
                </div>
                <p className="font-medium text-stone-600 mb-1">ไม่มีข้อมูล</p>
                <p className="text-sm text-stone-400">ลองเลือกวันอื่นดู</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-stone-200">
            {orders.length > 0 && (
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-sm text-stone-500">{orders.length} รายการ</span>
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1. 5 text-sm text-stone-600 hover: text-stone-800 font-medium"
                  >
                    <Filter className="w-4 h-4" />
                    {sortBy === 'time' ? 'เวลา' : sortBy === 'amount' ? 'ยอด' : 'สถานะ'}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-stone-100 py-1 z-10 min-w-[120px]">
                      {[
                        { value: 'time', label: 'เรียงตามเวลา' },
                        { value: 'amount', label: 'เรียงตามยอด' },
                        { value: 'status', label: 'เรียงตามสถานะ' },
                      ]. map((option) => (
                        <button
                          key={option. value}
                          onClick={() => { setSortBy(option. value as SortBy); setShowSortMenu(false) }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                            sortBy === option.value ? 'text-stone-800 font-medium' : 'text-stone-600'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {orders.length > 0 ?  (
              <div className="divide-y divide-stone-50">
                {getSortedOrders().map((order) => (
                  <button
                    key={order.id}
                    onClick={() => loadOrderItems(order)}
                    className="w-full p-4 hover:bg-stone-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isTakeaway(order) ? 'bg-violet-50' : 'bg-sky-50'
                      }`}>
                        {isTakeaway(order) ? <Home className="w-5 h-5 text-violet-600" /> : <Utensils className="w-5 h-5 text-sky-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-stone-800 text-sm">{order.order_id}</p>
                          <span className={`w-2 h-2 rounded-full ${
                            order.payment_status === 'cash' ? 'bg-emerald-400' : 
                            order. payment_status === 'promptpay' ? 'bg-sky-400' :  'bg-amber-400'
                          }`}></span>
                          {/* ✅ แสดงไอคอนรูปภาพถ้ามีสลิป */}
                          {order.payment_status === 'promptpay' && order.slip_url && (
                            <ImageIcon className="w-3. 5 h-3.5 text-sky-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <span>{isTakeaway(order) ? 'กลับบ้าน' : `โต๊ะ ${order.table_number}`}</span>
                          <Minus className="w-3 h-3" />
                          <span>{formatTime(order.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-stone-800">฿{formatCurrency(order.total_amount)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-7 h-7 text-stone-400" />
                </div>
                <p className="font-medium text-stone-600">ไม่มีออเดอร์</p>
              </div>
            )}
          </div>
        )}
      </div>

      <QuickMenu currentPage="accounting" />
    </main>
  )
}