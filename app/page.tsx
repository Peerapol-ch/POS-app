'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import AuthGuard from '@/app/components/AuthGuard'
import QuickMenu from '@/app/components/QuickMenu'
import {
  UtensilsCrossed,
  TrendingUp,
  Users,
  ShoppingBag,
  ChefHat,
  LayoutGrid,
  ArrowRight,
  Flame,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  CircleDollarSign,
  Calendar,
  Zap,
  Award,
  Timer,
  BarChart3,
  Package,
  AlertTriangle,
  Shield,
  User,
  LogOut,
  UserCircle,
  RefreshCw,
} from 'lucide-react'

interface DashboardData {
  todaySales: number
  todayOrders: number
  totalTables: number
  vacantTables: number
  occupiedTables: number
  topMenuItems: { name: string; quantity: number; revenue: number }[]
  recentOrders: { order_id: string; table_number: string; total: number; status: string; created_at: string }[]
  lowStockCount: number
  userCount: number
  customerCount: number
}

interface CurrentUser {
  id: number
  userid: string
  role: 'owner' | 'chef' | 'staff'
  name: string
}

function DashboardContent() {
  const router = useRouter()
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      } catch (err) {
        console.error('Error parsing user:', err)
        router.push('/login')
      }
    }
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const hour = currentTime.getHours()
    if (hour < 12) setGreeting('สวัสดีตอนเช้า')
    else if (hour < 17) setGreeting('สวัสดีตอนบ่าย')
    else if (hour < 20) setGreeting('สวัสดีตอนเย็น')
    else setGreeting('สวัสดีตอนกลางคืน')
  }, [currentTime])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      const { data: tables, error: tablesError } = await supabase.from('tables').select('*')
      if (tablesError) throw tablesError

      const regularTables = (tables || []).filter((t) => {
        const name = String(t.table_number).toLowerCase()
        return !name.includes('กลับบ้าน') && !name.includes('takeaway')
      })

      const vacantTables = regularTables.filter((t) => t.current_status?.toLowerCase() === 'vacant').length
      const occupiedTables = regularTables.filter((t) => t.current_status?.toLowerCase() === 'occupied').length

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, tables(table_number)')
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const todaySales = (orders || []).reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const todayOrders = (orders || []).length

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, menu_items(name, price)')
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)

      if (itemsError) console.error('Items error:', itemsError)

      const menuStats: { [key: string]: { name: string; quantity: number; revenue: number } } = {}

      ;(orderItems || []).forEach((item) => {
        const menuName = item.menu_items?.name || `Menu #${item.menu_item_id}`
        const price = item.price || item.menu_items?.price || 0

        if (!menuStats[menuName]) {
          menuStats[menuName] = { name: menuName, quantity: 0, revenue: 0 }
        }
        menuStats[menuName].quantity += item.quantity || 1
        menuStats[menuName].revenue += price * (item.quantity || 1)
      })

      const topMenuItems = Object.values(menuStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      const recentOrders = (orders || []).slice(0, 5).map((order) => ({
        order_id: order.order_id,
        table_number: order.tables?.table_number || 'กลับบ้าน',
        total: order.total_amount || 0,
        status: order.status,
        created_at: order.created_at,
      }))

      let lowStockCount = 0
      try {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('ingredients')
          .select('id, current_stock, min_threshold')

        if (!ingredientsError && ingredients) {
          lowStockCount = ingredients.filter((i) => i.current_stock <= i.min_threshold).length
        }
      } catch (err) {
        console.error('Error loading ingredients:', err)
      }

      let userCount = 0
      try {
        const { data: users, error: usersError } = await supabase.from('user').select('id')

        if (!usersError && users) {
          userCount = users.length
        }
      } catch (err) {
        console.error('Error loading users:', err)
      }

      let customerCount = 0
      try {
        const { data: customers, error: customersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'customer')

        if (!customersError && customers) {
          customerCount = customers.length
        }
      } catch (err) {
        console.error('Error loading customers:', err)
      }

      setData({
        todaySales,
        todayOrders,
        totalTables: regularTables.length,
        vacantTables,
        occupiedTables,
        topMenuItems,
        recentOrders,
        lowStockCount,
        userCount,
        customerCount,
      })
      setError(null)
    } catch (err: any) {
      console.error('Dashboard error:', err)
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
  }

  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบ?')) {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }

  const canAccess = (page: string): boolean => {
    if (!currentUser) return false
    
    const pagePermissions: { [key: string]: string[] } = {
      'home': ['owner', 'chef', 'staff'],
      'select-table': ['owner', 'chef', 'staff'],
      'kds': ['owner', 'chef', 'staff'],
      'accounting': ['owner'],
      'menu-management': ['owner'],
      'ingredients': ['owner'],
      'users': ['owner'],
      'customers': ['owner'],
    }

    const allowedRoles = pagePermissions[page] || []
    return allowedRoles.includes(currentUser.role)
  }

  const isOwner = currentUser?.role === 'owner'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return `${diff} วิ`
    if (diff < 3600) return `${Math.floor(diff / 60)} น.`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.`
    return `${Math.floor(diff / 86400)} วัน`
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-500 text-white'
      case 'cooking':
        return 'bg-blue-500 text-white'
      case 'served':
        return 'bg-green-500 text-white'
      case 'completed':
        return 'bg-emerald-500 text-white'
      case 'cancelled':
        return 'bg-red-500 text-white'
      default:
        return 'bg-slate-400 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'รอทำ'
      case 'cooking':
        return 'กำลังทำ'
      case 'served':
        return 'เสิร์ฟแล้ว'
      case 'completed':
        return 'เสร็จสิ้น'
      case 'cancelled':
        return 'ยกเลิก'
      default:
        return status
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'เจ้าของร้าน'
      case 'chef':
        return 'พ่อครัว'
      case 'staff':
        return 'พนักงาน'
      default:
        return 'ผู้ใช้'
    }
  }

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑'
      case 'chef':
        return '👨‍🍳'
      case 'staff':
        return '🧑‍💼'
      default:
        return '👤'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">ร้านไก่ย่างพังโคน</h2>
          <p className="text-emerald-200 text-sm">กำลังโหลด...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-orange-900 p-4">
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-white/20">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-200 text-sm mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    )
  }

  const allQuickButtons = [
    {
      href: '/select-table',
      icon: LayoutGrid,
      label: 'แผนผังโต๊ะ',
      description: 'เปิดโต๊ะ / สั่งอาหาร',
      gradient: 'from-emerald-500 to-teal-600',
      page: 'select-table',
    },
    {
      href: '/KDS',
      icon: ChefHat,
      label: 'หน้าจอครัว',
      description: 'จัดการออเดอร์',
      gradient: 'from-blue-500 to-indigo-600',
      page: 'kds',
    },
    {
      href: '/accounting',
      icon: BarChart3,
      label: 'การบัญชี',
      description: 'รายรับ / สถิติ',
      gradient: 'from-amber-500 to-orange-600',
      page: 'accounting',
    },
    {
      href: '/menu-management',
      icon: UtensilsCrossed,
      label: 'จัดการเมนู',
      description: 'เพิ่ม / แก้ไข',
      gradient: 'from-rose-500 to-pink-600',
      page: 'menu-management',
    },
    {
      href: '/ingredients',
      icon: Package,
      label: 'วัตถุดิบ',
      description: 'จัดการสต็อก',
      gradient: 'from-teal-500 to-cyan-600',
      page: 'ingredients',
      badge: data?.lowStockCount,
      badgeColor: 'bg-red-500',
    },
    {
      href: '/users',
      icon: Shield,
      label: 'จัดการผู้ใช้',
      description: 'สิทธิ์การเข้าถึง',
      gradient: 'from-indigo-500 to-purple-600',
      page: 'users',
    },
    {
      href: '/customers',
      icon: UserCircle,
      label: 'ข้อมูลลูกค้า',
      description: 'ประวัติ / คะแนน',
      gradient: 'from-purple-500 to-pink-600',
      page: 'customers',
    },
  ]

  const visibleButtons = allQuickButtons.filter((btn) => canAccess(btn.page))

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header - Compact for Mobile */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Info */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white leading-tight">ร้านไก่ย่างพังโคน</h1>
                <p className="text-emerald-100 text-xs">{formatDate(currentTime)}</p>
              </div>
            </div>

            {/* Center: Time - Mobile */}
            <div className="sm:hidden text-center">
              <p className="text-white font-bold text-lg font-mono">{formatTime(currentTime)}</p>
              <p className="text-emerald-100 text-[10px]">{formatDate(currentTime)}</p>
            </div>

            {/* Right: User & Actions */}
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* User Button */}
              {currentUser && (
                <div className="flex items-center gap-2 bg-white/20 rounded-xl px-2 py-1.5">
                  <span className="text-lg">{getRoleEmoji(currentUser.role)}</span>
                  <span className="text-white text-sm font-medium hidden sm:block max-w-[80px] truncate">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="w-7 h-7 bg-red-500/30 hover:bg-red-500/50 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Greeting - Mobile Friendly */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{greeting}</p>
            <p className="text-white font-bold text-lg">{currentUser?.name || 'ผู้ใช้'}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-4">
        
        {/* Sales Card - Owner Only */}
        {isOwner && data && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5">
            {/* Main Sales */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <CircleDollarSign className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  ยอดขายวันนี้
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-800 truncate">
                  {formatCurrency(data.todaySales)}
                </p>
              </div>
              {data.lowStockCount > 0 && (
                <Link
                  href="/ingredients"
                  className="shrink-0 flex items-center gap-1 bg-red-100 px-2.5 py-1.5 rounded-full"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 text-xs font-bold">{data.lowStockCount}</span>
                </Link>
              )}
            </div>

            {/* Stats Grid - 4 columns on mobile */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-blue-500 rounded-xl p-2.5 sm:p-3 text-center">
                <ShoppingBag className="w-5 h-5 text-white/80 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-black text-white">{data.todayOrders}</p>
                <p className="text-blue-100 text-[10px] sm:text-xs">ออเดอร์</p>
              </div>
              <div className="bg-emerald-500 rounded-xl p-2.5 sm:p-3 text-center">
                <CheckCircle className="w-5 h-5 text-white/80 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-black text-white">{data.vacantTables}</p>
                <p className="text-emerald-100 text-[10px] sm:text-xs">ว่าง</p>
              </div>
              <div className="bg-orange-500 rounded-xl p-2.5 sm:p-3 text-center">
                <Users className="w-5 h-5 text-white/80 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-black text-white">{data.occupiedTables}</p>
                <p className="text-orange-100 text-[10px] sm:text-xs">ไม่ว่าง</p>
              </div>
              <div className="bg-purple-500 rounded-xl p-2.5 sm:p-3 text-center">
                <UserCircle className="w-5 h-5 text-white/80 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-black text-white">{data.customerCount}</p>
                <p className="text-purple-100 text-[10px] sm:text-xs">สมาชิก</p>
              </div>
            </div>
          </div>
        )}

        {/* Simple Stats for non-owner */}
        {!isOwner && data && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-white">{data.todayOrders}</p>
                <p className="text-slate-400 text-xs">ออเดอร์</p>
              </div>
              <div className="border-l border-white/10">
                <p className="text-2xl font-black text-emerald-400">{data.vacantTables}</p>
                <p className="text-slate-400 text-xs">โต๊ะว่าง</p>
              </div>
              <div className="border-l border-white/10">
                <p className="text-2xl font-black text-orange-400">{data.occupiedTables}</p>
                <p className="text-slate-400 text-xs">ไม่ว่าง</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid - Stack on Mobile */}
        {isOwner && data && (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top Menu */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-white" />
                  <h2 className="text-base font-bold text-white">เมนูขายดี</h2>
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                </div>
              </div>

              <div className="p-3 sm:p-4">
                {data.topMenuItems && data.topMenuItems.length > 0 ? (
                  <div className="space-y-2">
                    {data.topMenuItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                              ? 'bg-slate-400'
                              : index === 2
                              ? 'bg-orange-400'
                              : 'bg-slate-300'
                          }`}
                        >
                          {index === 0 ? <Award className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(item.revenue)}</p>
                        </div>
                        <div className="bg-emerald-500 px-2.5 py-1 rounded-lg shrink-0">
                          <span className="text-sm font-bold text-white">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white" />
                  <h2 className="text-base font-bold text-white">ออเดอร์ล่าสุด</h2>
                </div>
                <Link
                  href="/KDS"
                  className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg text-xs text-white font-medium"
                >
                  ดูทั้งหมด
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-3 sm:p-4">
                {data.recentOrders && data.recentOrders.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentOrders.map((order) => (
                      <div
                        key={order.order_id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">
                            {String(order.table_number).includes('กลับบ้าน') ? '🏠' : '🪑'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono font-semibold text-sm text-slate-800 truncate">
                              {order.order_id.slice(-8)}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Timer className="w-3 h-3" />
                              <span>{getTimeAgo(order.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">ยังไม่มีออเดอร์</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleButtons.map((btn) => {
            const IconComponent = btn.icon
            return (
              <Link
                key={btn.href}
                href={btn.href}
                className={`group relative overflow-hidden bg-gradient-to-br ${btn.gradient} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all active:scale-[0.98]`}
              >
                {/* Badge */}
                {btn.badge !== undefined && btn.badge > 0 && (
                  <div className={`absolute top-2 right-2 ${btn.badgeColor} text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse`}>
                    {btn.badge}
                  </div>
                )}
                
                {/* Content */}
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5 truncate">{btn.label}</h3>
                <p className="text-white/70 text-[10px] sm:text-xs truncate">{btn.description}</p>
              </Link>
            )
          })}
        </div>
      </div>

      <QuickMenu currentPage="home" />
    </main>
  )
}

export default function Home() {
  return (
    <AuthGuard requiredPage="home">
      <DashboardContent />
    </AuthGuard>
  )
}