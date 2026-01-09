'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
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
  currentPage?:  'home' | 'select-table' | 'kds' | 'accounting' | 'menu-management' | 'ingredients' | 'users' | 'customers'
}

export default function QuickMenu({ currentPage = 'home' }: QuickMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const { user, logout, canAccess } = useAuth()

  const allMenuItems = [
    {
      href: '/',
      icon: Home,
      label: 'หน้าหลัก',
      description: 'Dashboard & สรุปยอด',
      color:  'from-violet-500 to-purple-600',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      page: 'home',
    },
    {
      href:  '/select-table',
      icon: LayoutGrid,
      label:  'แผนผังโต๊ะ',
      description:  'เปิดโต๊ะ & สั่งอาหาร',
      color: 'from-emerald-500 to-teal-600',
      iconBg:  'bg-emerald-100',
      iconColor: 'text-emerald-600',
      page: 'select-table',
    },
    {
      href: '/KDS',
      icon: ChefHat,
      label: 'หน้าจอครัว',
      description: 'จัดการออเดอร์ & เมนู',
      color: 'from-blue-500 to-cyan-600',
      iconBg:  'bg-blue-100',
      iconColor: 'text-blue-600',
      page:  'kds',
    },
    {
      href:  '/accounting',
      icon: BarChart3,
      label: 'การบัญชี',
      description:  'รายรับ & สถิติการขาย',
      color: 'from-amber-500 to-orange-600',
      iconBg:  'bg-amber-100',
      iconColor: 'text-amber-600',
      page:  'accounting',
    },
    {
      href: '/menu-management',
      icon: UtensilsCrossed,
      label:  'จัดการเมนู',
      description:  'เพิ่ม แก้ไข ลบเมนูอาหาร',
      color: 'from-rose-500 to-pink-600',
      iconBg:  'bg-rose-100',
      iconColor: 'text-rose-600',
      page:  'menu-management',
    },
    {
      href: '/ingredients',
      icon: Package,
      label: 'วัตถุดิบ',
      description: 'จัดการสต็อกวัตถุดิบ',
      color: 'from-teal-500 to-cyan-600',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      page: 'ingredients',
    },
    {
      href:  '/users',
      icon: Shield,
      label:  'จัดการผู้ใช้',
      description:  'สิทธิ์การเข้าถึงระบบ',
      color: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      page: 'users',
    },
    {
      href:  '/customers',
      icon: Users,
      label: 'ข้อมูลลูกค้า',
      description: 'ประวัติ & คะแนนสะสม',
      color:  'from-purple-500 to-pink-600',
      iconBg:  'bg-purple-100',
      iconColor: 'text-purple-600',
      page:  'customers',
    },
  ]

  // กรองเฉพาะเมนูที่ผู้ใช้มีสิทธิ์เข้าถึง และไม่ใช่หน้าปัจจุบัน
  const visibleItems = allMenuItems.filter(
    (item) => item.page !== currentPage && canAccess(item.page)
  )

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <>
      {/* FAB Container */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
        {/* Menu Popup */}
        {showMenu && (
          <div className="absolute bottom-16 right-0 w-[calc(100vw-32px)] sm:w-80 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 origin-bottom-right">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative p-4 md:p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                      <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold truncate">{user.Name}</p>
                      <p className="text-gray-400 text-xs md:text-sm">
                        {user.role === 'owner'
                          ? 'เจ้าของร้าน'
                          : user.role === 'chef'
                          ?  'พ่อครัว'
                          : user.role === 'staff'
                          ?  'พนักงาน'
                          :  'ผู้ใช้'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2 md:p-3 space-y-1 md:space-y-2 max-h-[60vh] overflow-y-auto">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="group relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 overflow-hidden"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    />
                    <div
                      className={`relative w-10 h-10 md:w-12 md:h-12 ${item.iconBg} rounded-xl md:rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shrink-0`}
                    >
                      <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm md:text-base group-hover:text-gray-900 transition-colors truncate">
                        {item.label}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{item.description}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shrink-0">
                      <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 ${item.iconColor}`} />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Logout Button */}
              <div className="p-2 md:p-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl hover:bg-red-50 transition-all text-red-600"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm md:text-base">ออกจากระบบ</p>
                    <p className="text-xs md:text-sm text-red-400">Logout</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`relative w-12 h-12 md:w-14 md:h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 ${
            showMenu
              ? 'bg-gray-800 rotate-45 scale-90'
              : 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 hover:scale-105 hover:shadow-2xl'
          }`}
        >
          <div className="relative">
            {showMenu ? <X className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <Plus className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          </div>
          {!showMenu && (
            <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-ping opacity-30" />
          )}
        </button>
      </div>

      {/* Backdrop */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  )
}