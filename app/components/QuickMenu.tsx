'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UtensilsCrossed,
  LayoutGrid,
  Plus,
  X,
  Home,
  ChefHat,
  ArrowRight,
  BarChart3,
  Package,
  Shield,
  LogOut,
  User,
  Users,
} from 'lucide-react'

interface QuickMenuProps {
  currentPage?: 'home' | 'select-table' | 'kds' | 'accounting' | 'menu-management' | 'ingredients' | 'users' | 'customers'
  hide?: boolean
}

interface CurrentUser {
  id: number
  userid: string
  role: 'owner' | 'chef' | 'staff'
  name: string
}

export default function QuickMenu({ currentPage = 'home', hide = false }: QuickMenuProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      } catch (err) {
        console.error('Error parsing user:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (hide) {
      setShowMenu(false)
    }
  }, [hide])

  const canAccess = (page: string): boolean => {
    if (!currentUser) return false

    const pagePermissions: { [key: string]: string[] } = {
      home: ['owner', 'chef', 'staff'],
      'select-table': ['owner', 'chef', 'staff'],
      kds: ['owner', 'chef', 'staff'],
      accounting: ['owner'],
      'menu-management': ['owner'],
      ingredients: ['owner'],
      users: ['owner'],
      customers: ['owner'],
    }

    const allowedRoles = pagePermissions[page] || []
    return allowedRoles.includes(currentUser.role)
  }

  const allMenuItems = [
    {
      href: '/',
      icon: Home,
      label: 'หน้าหลัก',
      description: 'Dashboard & สรุปยอด',
      iconBg: 'bg-violet-500',
      page: 'home',
    },
    {
      href: '/select-table',
      icon: LayoutGrid,
      label: 'แผนผังโต๊ะ',
      description: 'เปิดโต๊ะ & สั่งอาหาร',
      iconBg: 'bg-emerald-500',
      page: 'select-table',
    },
    {
      href: '/KDS',
      icon: ChefHat,
      label: 'หน้าจอครัว',
      description: 'จัดการออเดอร์',
      iconBg: 'bg-blue-500',
      page: 'kds',
    },
    {
      href: '/accounting',
      icon: BarChart3,
      label: 'การบัญชี',
      description: 'รายรับ & สถิติ',
      iconBg: 'bg-amber-500',
      page: 'accounting',
    },
    {
      href: '/menu-management',
      icon: UtensilsCrossed,
      label: 'จัดการเมนู',
      description: 'เพิ่ม แก้ไข ลบ',
      iconBg: 'bg-rose-500',
      page: 'menu-management',
    },
    {
      href: '/ingredients',
      icon: Package,
      label: 'วัตถุดิบ',
      description: 'จัดการสต็อก',
      iconBg: 'bg-teal-500',
      page: 'ingredients',
    },
    {
      href: '/users',
      icon: Shield,
      label: 'จัดการผู้ใช้',
      description: 'สิทธิ์การเข้าถึง',
      iconBg: 'bg-indigo-500',
      page: 'users',
    },
    {
      href: '/customers',
      icon: Users,
      label: 'ข้อมูลลูกค้า',
      description: 'ประวัติ & คะแนน',
      iconBg: 'bg-pink-500',
      page: 'customers',
    },
  ]

  const visibleItems = allMenuItems.filter(
    (item) => item.page !== currentPage && canAccess(item.page)
  )

  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบ?')) {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'เจ้าของร้าน', color: 'text-amber-400', bg: 'bg-amber-500/20' }
      case 'chef':
        return { label: 'พ่อครัว', color: 'text-orange-400', bg: 'bg-orange-500/20' }
      case 'staff':
        return { label: 'พนักงาน', color: 'text-blue-400', bg: 'bg-blue-500/20' }
      default:
        return { label: 'ผู้ใช้', color: 'text-gray-400', bg: 'bg-gray-500/20' }
    }
  }

  if (!currentUser || hide) return null

  const roleConfig = getRoleConfig(currentUser.role)

  return (
    <>
      {/* FAB Container */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
        {/* Menu Popup */}
        {showMenu && (
          <div className="absolute bottom-16 md:bottom-18 right-0 w-[calc(100vw-32px)] sm:w-80 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 origin-bottom-right">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              
              {/* Header */}
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                </div>
                
                <div className="relative flex items-center gap-3">
                  <div className={`w-11 h-11 ${roleConfig.bg} rounded-xl flex items-center justify-center ring-2 ring-white/10`}>
                    <User className={`w-5 h-5 ${roleConfig.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate text-sm">{currentUser.name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className={`text-xs ${roleConfig.color}`}>{roleConfig.label}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2 max-h-[55vh] overflow-y-auto">
                {visibleItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm group-hover:text-gray-900 truncate">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{item.description}</p>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-red-600 text-sm">ออกจากระบบ</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB Button - ✅ ลบ Badge ออกแล้ว */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`relative w-13 h-13 md:w-14 md:h-14 rounded-xl shadow-lg flex items-center justify-center transition-all duration-300 ${
            showMenu
              ? 'bg-slate-700 rotate-45 scale-95'
              : 'bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 hover:scale-105 hover:shadow-xl'
          }`}
          style={{ width: '52px', height: '52px' }}
        >
          <div className="relative">
            {showMenu ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Plus className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
      </div>

      {/* Backdrop */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  )
}