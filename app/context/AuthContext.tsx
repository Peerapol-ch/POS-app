'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/utils/supabaseClient'

interface User {
  id:  number
  userid: string
  role: 'owner' | 'chef' | 'staff' | 'customer'
  Name: string
}

interface AuthContextType {
  user:  User | null
  loading: boolean
  login: (userid: string, password:  string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isOwner: boolean
  canAccess: (page: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// กำหนดหน้าที่แต่ละ role เข้าถึงได้
const rolePermissions:  Record<string, string[]> = {
  owner: ['home', 'select-table', 'kds', 'accounting', 'menu-management', 'ingredients', 'users', 'customers'],
  chef: ['home', 'select-table', 'kds'],
  staff: ['home', 'select-table', 'kds'],
  customer: ['home'],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ตรวจสอบ session จาก localStorage
    const savedUser = localStorage.getItem('pos_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('pos_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (userid: string, password:  string): Promise<{ success:  boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('userid', userid)
        .eq('password', password)
        .single()

      if (error || !data) {
        return { success: false, error: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
      }

      const userData:  User = {
        id: data.id,
        userid:  data.userid,
        role: data. role,
        Name: data.Name,
      }

      // บันทึก session
      localStorage.setItem('pos_user', JSON.stringify(userData))
      setUser(userData)

      // อัพเดท access_time
      await supabase
        .from('user')
        .update({ access_time: new Date().toISOString() })
        .eq('id', data.id)

      return { success: true }
    } catch (err:  any) {
      return { success: false, error: err?. message || 'เกิดข้อผิดพลาด' }
    }
  }

  const logout = () => {
    localStorage. removeItem('pos_user')
    setUser(null)
  }

  const isOwner = user?.role === 'owner'

  const canAccess = (page: string): boolean => {
    if (! user) return false
    const permissions = rolePermissions[user.role] || []
    return permissions.includes(page)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isOwner, canAccess }}>
      {children}
    </AuthContext. Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}