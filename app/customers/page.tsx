'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import AuthGuard from '@/app/components/AuthGuard'
import { useAuth } from '@/app/context/AuthContext'
import QuickMenu from '@/app/components/QuickMenu'
import {
  Users,
  Search,
  Star,
  ShoppingBag,
  Clock,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  Filter,
  User,
  Crown,
  Gift,
  Eye,
  Award,
  CircleDollarSign,
  History,
  RefreshCw,
  UserCheck,
  TrendingUp,
} from 'lucide-react'

interface Customer {
  id: string
  username: string | null
  role: string
  points: number
  avatar_url:   string | null
  created_at: string
  updated_at: string
  totalOrders? :  number
  totalSpent?:  number
}

interface Order {
  id:   number
  order_id: string
  table_id: number
  status: string
  total_amount: number
  customer_count: number
  payment_status: string
  created_at:   string
  tables? :  { table_number: string }
}

interface OrderItem {
  id: number
  order_id: string  
  menu_item_id:   number
  quantity: number
  price: number
  menu_items?:  { name: string }
}

function CustomersContent() {
  const { isOwner } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'points' | 'orders' | 'spent' | 'recent'>('points')
  const [showSortMenu, setShowSortMenu] = useState(false)


  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data:  profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('points', { ascending: false })

      if (profilesError) throw profilesError

      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('customer_id', profile.id)

          const totalOrders = orders?.length || 0
          const totalSpent = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

          return {
            ...profile,
            totalOrders,
            totalSpent,
          }
        })
      )

      setCustomers(customersWithStats)
    } catch (err:   any) {
      console.error('Error loading customers:', err)
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (customerId: string) => {
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        . from('orders')
        .select('*, tables(table_number)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending:   false })
        .limit(20)

      if (error) throw error
      setCustomerOrders(data || [])
    } catch (err: any) {
      console.error('Error loading orders:', err)
    } finally {
      setLoadingOrders(false)
    }
  }


  const loadOrderItems = async (orderId: string) => {
    setLoadingItems(true)
    try {
      console.log('Loading items for order:', orderId)  
      
      const { data, error } = await supabase
        . from('order_items')
        .select('*, menu_items(name)')
        .eq('order_id', orderId) 

      if (error) {
        console.error('Error fetching order items:', error)
        throw error
      }
      
      console.log('Order items found:', data)  
      setOrderItems(data || [])
    } catch (err: any) {
      console.error('Error loading order items:', err)
      setOrderItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailModal(true)
    setSelectedOrder(null)
    setOrderItems([])
    await loadCustomerOrders(customer.id)
  }

  const handleViewOrder = async (order: Order) => {
    if (selectedOrder?.order_id === order. order_id) {
      setSelectedOrder(null)
      setOrderItems([])
    } else {
      setSelectedOrder(order)
      await loadOrderItems(order.order_id)  
    }
  }

  const formatCurrency = (amount:  number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year:   'numeric',
    })
  }

  const formatDateTime = (dateString:   string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'cooking':
        return 'bg-blue-100 text-blue-700'
      case 'served':
        return 'bg-green-100 text-green-700'
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusText = (status:   string) => {
    switch (status?. toLowerCase()) {
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

  const getPaymentStatusColor = (status: string) => {
    switch (status?. toLowerCase()) {
      case 'cash':
        return 'bg-emerald-100 text-emerald-700'
      case 'promptpay':
        return 'bg-blue-100 text-blue-700'
      case 'unpaid':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'cash':
        return 'เงินสด'
      case 'promptpay': 
        return 'พร้อมเพย์'
      case 'unpaid': 
        return 'ยังไม่ชำระ'
      default:
        return status
    }
  }

  const getTierInfo = (points: number) => {
    if (points >= 1000)
      return {
        tier: 'VIP',
        color: 'from-amber-400 to-yellow-500',
        icon: Crown,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      }
    if (points >= 500)
      return {
        tier:  'Gold',
        color:  'from-yellow-400 to-amber-500',
        icon:   Award,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
      }
    if (points >= 100)
      return {
        tier:   'Silver',
        color: 'from-slate-400 to-slate-500',
        icon:   Star,
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
      }
    return {
      tier: 'Bronze',
      color: 'from-orange-400 to-orange-500',
      icon:  Gift,
      bgColor: 'bg-orange-50',
      textColor:  'text-orange-700',
      borderColor: 'border-orange-200',
    }
  }

  // Sort customers
  const sortedCustomers = [...customers]. sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return (b.points || 0) - (a.points || 0)
      case 'orders': 
        return (b. totalOrders || 0) - (a.totalOrders || 0)
      case 'spent': 
        return (b.totalSpent || 0) - (a.totalSpent || 0)
      case 'recent':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      default:
        return 0
    }
  })

  // Filter customers
  const filteredCustomers = sortedCustomers.filter((customer) => {
    const username = customer.username || ''
    return username.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Stats
  const totalCustomers = customers.  length
  const activeCustomers = customers.filter((c) => (c.totalOrders || 0) > 0).length
  const totalSpentAll = customers.reduce((sum, c) => sum + (c. totalSpent || 0), 0)

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
          <button
            onClick={loadCustomers}
            className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800">ข้อมูลลูกค้า</h1>
                <p className="text-xs text-stone-400">{totalCustomers} คน</p>
              </div>
            </div>
            <button
              onClick={loadCustomers}
              className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center hover:bg-stone-200 transition-colors"
              title="รีเฟรช"
            >
              <RefreshCw className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-purple-600">ลูกค้าทั้งหมด</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{totalCustomers}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600">มีออเดอร์</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{activeCustomers}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600">ยอดรวม</span>
              </div>
              <p className="text-xl font-bold text-amber-700">฿{formatCurrency(totalSpentAll)}</p>
            </div>
          </div>

          {/* Search & Sort */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
              >
                <Filter className="w-5 h-5 text-stone-600" />
                <ChevronDown className="w-4 h-4 text-stone-600" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-stone-200 py-2 min-w-[160px] z-50">
                  <button
                    onClick={() => {
                      setSortBy('points')
                      setShowSortMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2 ${
                      sortBy === 'points' ? 'text-purple-600 font-medium' :  'text-stone-600'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    คะแนนมากสุด
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('orders')
                      setShowSortMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2 ${
                      sortBy === 'orders' ? 'text-purple-600 font-medium' : 'text-stone-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    ออเดอร์มากสุด
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('spent')
                      setShowSortMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover: bg-stone-50 flex items-center gap-2 ${
                      sortBy === 'spent' ? 'text-purple-600 font-medium' : 'text-stone-600'
                    }`}
                  >
                    <CircleDollarSign className="w-4 h-4" />
                    ใช้จ่ายมากสุด
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('recent')
                      setShowSortMenu(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2 ${
                      sortBy === 'recent' ? 'text-purple-600 font-medium' :  'text-stone-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    ล่าสุด
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredCustomers.length === 0 ?  (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 mb-1">ไม่พบลูกค้า</p>
            <p className="text-sm text-stone-400">ลองค้นหาใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, index) => {
              const tierInfo = getTierInfo(customer.points || 0)
              const TierIcon = tierInfo.icon

              return (
                <div
                  key={customer.id}
                  className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all ${tierInfo.borderColor}`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank & Avatar */}
                      <div className="relative">
                        <div
                          className={`w-14 h-14 bg-gradient-to-br ${tierInfo.color} rounded-xl flex items-center justify-center text-white shadow-lg`}
                        >
                          {customer.avatar_url ? (
                            <img src={customer.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <User className="w-7 h-7" />
                          )}
                        </div>
                        {index < 3 && (
                          <div
                            className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${
                              index === 0 ?  'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-500'
                            }`}
                          >
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-800 truncate">{customer. username || 'ลูกค้า'}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierInfo.bgColor} ${tierInfo.textColor} flex items-center gap-1`}
                          >
                            <TierIcon className="w-3 h-3" />
                            {tierInfo.tier}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-stone-500">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-amber-600">{customer.points || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-4 h-4 text-stone-400" />
                            {customer.totalOrders || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600">฿{formatCurrency(customer.totalSpent || 0)}</span>
                          </span>
                        </div>

                        <p className="text-xs text-stone-400 mt-1">เข้าร่วม {formatDate(customer.created_at)}</p>
                      </div>

                      {/* View Button */}
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="p-3 bg-purple-50 text-purple-600 rounded-xl hover: bg-purple-100 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className={`bg-gradient-to-r ${getTierInfo(selectedCustomer.points || 0).color} px-5 py-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    {selectedCustomer.avatar_url ? (
                      <img src={selectedCustomer. avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <User className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedCustomer.username || 'ลูกค้า'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                        {getTierInfo(selectedCustomer.points || 0).tier}
                      </span>
                      <span className="text-sm opacity-80">{formatDate(selectedCustomer. created_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-stone-50 border-b border-stone-200">
              <div className="bg-white rounded-xl p-3 text-center border border-stone-100">
                <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-stone-800">{selectedCustomer. points || 0}</p>
                <p className="text-xs text-stone-500">คะแนน</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-stone-100">
                <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-stone-800">{selectedCustomer.totalOrders || 0}</p>
                <p className="text-xs text-stone-500">ออเดอร์</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-stone-100">
                <CircleDollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-stone-800">฿{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                <p className="text-xs text-stone-500">ใช้จ่าย</p>
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                <History className="w-5 h-5 text-stone-600" />
                ประวัติการสั่งอาหาร
              </h3>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">ยังไม่มีประวัติการสั่งอาหาร</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-stone-50 rounded-xl border transition-all ${
                        selectedOrder?.order_id === order. order_id ? 'border-purple-300 ring-2 ring-purple-100' : 'border-stone-200'
                      }`}
                    >
                      <button onClick={() => handleViewOrder(order)} className="w-full p-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-lg border border-stone-200">
                              {order.tables?. table_number ?  '🪑' : '🏠'}
                            </div>
                            <div>
                              <p className="font-mono font-bold text-sm text-stone-800">{order.order_id}</p>
                              <p className="text-xs text-stone-500">{formatDateTime(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-stone-800">฿{formatCurrency(order.total_amount || 0)}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                                {getPaymentStatusText(order.payment_status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Order Items - ✅ เปรียบเทียบด้วย order_id */}
                      {selectedOrder?.order_id === order.order_id && (
                        <div className="border-t border-stone-200 p-3 bg-white rounded-b-xl">
                          {loadingItems ? (
                            <div className="flex items-center justify-center py-3">
                              <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
                            </div>
                          ) : orderItems.length === 0 ? (
                            <p className="text-stone-500 text-sm text-center py-2">ไม่มีรายการ</p>
                          ) : (
                            <div className="space-y-2">
                              {orderItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs font-bold">
                                      {item. quantity}
                                    </span>
                                    <span className="text-stone-700">{item.menu_items?.name || `เมนู #${item.menu_item_id}`}</span>
                                  </div>
                                  <span className="font-medium text-stone-800">฿{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                              ))}
                              <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between font-bold text-sm">
                                <span className="text-stone-600">รวม</span>
                                <span className="text-purple-600">฿{formatCurrency(order.total_amount || 0)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickMenu currentPage="customers" />
    </main>
  )
}

export default function CustomersPage() {
  return (
    <AuthGuard requiredPage="customers">
      <CustomersContent />
    </AuthGuard>
  )
}