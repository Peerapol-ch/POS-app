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
  
  // ✅ ใช้ State แทน AuthContext
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')

  // ✅ โหลด User จาก LocalStorage
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
    if (hour < 12) setGreeting('สวัสดีตอนเช้า ☀️')
    else if (hour < 17) setGreeting('สวัสดีตอนบ่าย 🌤️')
    else if (hour < 20) setGreeting('สวัสดีตอนเย็น 🌅')
    else setGreeting('สวัสดีตอนกลางคืน 🌙')
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
    }
  }

  // ✅ Logout Function
  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบ?')) {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }

  // ✅ ฟังก์ชันตรวจสอบสิทธิ์
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
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return `${diff} วินาที`
    if (diff < 3600) return `${Math.floor(diff / 60)} นาที`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.`
    return `${Math.floor(diff / 86400)} วัน`
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      case 'cooking':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      case 'served':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'completed':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
      case 'cancelled':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
      default:
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳ รอทำ'
      case 'cooking':
        return '🔥 กำลังทำ'
      case 'served':
        return '✅ เสิร์ฟแล้ว'
      case 'completed':
        return '🎉 เสร็จสิ้น'
      case 'cancelled':
        return '❌ ยกเลิก'
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ร้านไก่ย่างพังโคน</h2>
          <p className="text-emerald-200">กำลังโหลดข้อมูล...</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-orange-900 p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            ลองใหม่อีกครั้ง
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
      textColor: 'text-emerald-100',
      page: 'select-table',
    },
    {
      href: '/KDS',
      icon: ChefHat,
      label: 'หน้าจอครัว',
      description: 'KDS / จัดการออเดอร์',
      gradient: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-100',
      page: 'kds',
    },
    {
      href: '/accounting',
      icon: BarChart3,
      label: 'การบัญชี',
      description: 'รายรับ / สถิติ',
      gradient: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-100',
      page: 'accounting',
    },
    {
      href: '/menu-management',
      icon: UtensilsCrossed,
      label: 'จัดการเมนู',
      description: 'เพิ่ม / แก้ไข / ลบ',
      gradient: 'from-rose-500 to-pink-600',
      textColor: 'text-rose-100',
      page: 'menu-management',
    },
    {
      href: '/ingredients',
      icon: Package,
      label: 'วัตถุดิบ',
      description: 'จัดการสต็อก',
      gradient: 'from-teal-500 to-cyan-600',
      textColor: 'text-teal-100',
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
      textColor: 'text-indigo-100',
      page: 'users',
      badge: data?.userCount,
      badgeColor: 'bg-white/30',
    },
    {
      href: '/customers',
      icon: UserCircle,
      label: 'ข้อมูลลูกค้า',
      description: 'ประวัติ / คะแนน',
      gradient: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-100',
      page: 'customers',
      badge: data?.customerCount,
      badgeColor: 'bg-white/30',
    },
  ]

  const visibleButtons = allQuickButtons.filter((btn) => canAccess(btn.page))

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 via-emerald-500/90 to-teal-500/90 backdrop-blur-sm"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/20">
                  <UtensilsCrossed className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">{greeting}</p>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">ร้านไก่ย่างพังโคน</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-emerald-200" />
                  <p className="text-emerald-100 text-sm">{formatDate(currentTime)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* User Info */}
              {currentUser && (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20 flex items-center gap-3 flex-1 md:flex-none justify-between md:justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{currentUser.name}</p>
                      <p className="text-emerald-200 text-xs">{getRoleLabel(currentUser.role)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-2 w-10 h-10 bg-red-500/20 hover:bg-red-500/40 rounded-xl flex items-center justify-center transition-colors"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-5 h-5 text-red-300" />
                  </button>
                </div>
              )}

              {/* Live Clock */}
              <div className="hidden sm:block bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-white font-mono tracking-wider">
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-green-300 text-xs font-medium">ออนไลน์</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 -mt-4 pb-12">
        {/* Sales Card - Owner Only */}
        {isOwner && data && (
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl border border-slate-200/50 p-5 md:p-8 mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50"></div>

            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-lg opacity-50"></div>
                    <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg">
                      <CircleDollarSign className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      ยอดขายวันนี้
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        {formatCurrency(data.todaySales)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{data.todayOrders} ออเดอร์</span>
                  </div>
                  {data.lowStockCount > 0 && (
                    <Link
                      href="/ingredients"
                      className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-red-600 font-bold">{data.lowStockCount} วัตถุดิบใกล้หมด</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <ShoppingBag className="w-6 h-6 mb-2 opacity-80" />
                  <p className="text-2xl font-black">{data.todayOrders}</p>
                  <p className="text-blue-100 text-xs font-medium">ออเดอร์</p>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <CheckCircle className="w-6 h-6 mb-2 opacity-80" />
                  <p className="text-2xl font-black">{data.vacantTables}</p>
                  <p className="text-emerald-100 text-xs font-medium">โต๊ะว่าง</p>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <Users className="w-6 h-6 mb-2 opacity-80" />
                  <p className="text-2xl font-black">{data.occupiedTables}</p>
                  <p className="text-orange-100 text-xs font-medium">โต๊ะไม่ว่าง</p>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <UserCircle className="w-6 h-6 mb-2 opacity-80" />
                  <p className="text-2xl font-black">{data.customerCount}</p>
                  <p className="text-purple-100 text-xs font-medium">สมาชิก</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple Stats for non-owner */}
        {!isOwner && data && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-2">
                <p className="text-3xl font-black text-white">{data.todayOrders}</p>
                <p className="text-slate-300 text-sm">ออเดอร์วันนี้</p>
              </div>
              <div className="p-2 border-t sm:border-t-0 sm:border-l border-white/10">
                <p className="text-3xl font-black text-emerald-400">{data.vacantTables}</p>
                <p className="text-slate-300 text-sm">โต๊ะว่าง</p>
              </div>
              <div className="p-2 border-t sm:border-t-0 sm:border-l border-white/10">
                <p className="text-3xl font-black text-orange-400">{data.occupiedTables}</p>
                <p className="text-slate-300 text-sm">โต๊ะไม่ว่าง</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid - Owner Only */}
        {isOwner && data && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Top Menu */}
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                      เมนูขายดี
                      <Sparkles className="w-5 h-5 text-yellow-200" />
                    </h2>
                    <p className="text-orange-100 text-sm">อันดับยอดนิยมวันนี้</p>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5 flex-1">
                {data.topMenuItems && data.topMenuItems.length > 0 ? (
                  <div className="space-y-3">
                    {data.topMenuItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all group"
                      >
                        <div
                          className={`relative w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0 ${
                            index === 0
                              ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                              : index === 1
                              ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                              : index === 2
                              ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                              : 'bg-gradient-to-br from-slate-300 to-slate-400'
                          }`}
                        >
                          {index === 0 && <Award className="w-5 h-5 md:w-6 md:h-6" />}
                          {index !== 0 && index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                            {item.name}
                          </p>
                          <p className="text-xs md:text-sm text-slate-500">{formatCurrency(item.revenue)}</p>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-md shrink-0">
                          <span className="text-base md:text-lg font-black text-white">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลวันนี้</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-white">ออเดอร์ล่าสุด</h2>
                      <p className="text-blue-100 text-sm">อัพเดทแบบเรียลไทม์</p>
                    </div>
                  </div>
                  <Link
                    href="/KDS"
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-colors"
                  >
                    <span className="text-white text-xs md:text-sm font-medium">ดูทั้งหมด</span>
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </Link>
                </div>
              </div>

              <div className="p-4 md:p-5 flex-1">
                {data.recentOrders && data.recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentOrders.map((order) => (
                      <div
                        key={order.order_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all gap-2"
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl md:text-2xl shrink-0">
                            {String(order.table_number).includes('กลับบ้าน') ? '🏠' : '🪑'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-sm md:text-base text-slate-800 truncate">{order.order_id}</p>
                            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
                              <Timer className="w-3 h-3 md:w-3.5 md:h-3.5" />
                              <span>{getTimeAgo(order.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`self-start sm:self-center px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-bold shadow-sm ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">ยังไม่มีออเดอร์วันนี้</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className={`grid grid-cols-2 ${isOwner ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          {visibleButtons.map((btn) => {
            const IconComponent = btn.icon
            return (
              <Link
                key={btn.href}
                href={btn.href}
                className={`group relative overflow-hidden bg-gradient-to-br ${btn.gradient} rounded-3xl p-4 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                {btn.badge !== undefined && btn.badge > 0 && (
                  <div
                    className={`absolute top-2 right-2 ${btn.badgeColor} text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${
                      btn.badgeColor === 'bg-red-500' ? 'animate-pulse' : ''
                    }`}
                  >
                    {btn.badge}
                  </div>
                )}
                <div className="relative">
                  <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-black text-white mb-0.5">{btn.label}</h3>
                  <p className={`${btn.textColor} text-xs`}>{btn.description}</p>
                </div>
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