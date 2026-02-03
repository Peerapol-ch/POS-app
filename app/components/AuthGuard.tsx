'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredPage?: string
  allowedRoles?: ('owner' | 'chef' | 'staff')[]
}

interface User {
  id: number
  userid: string
  role: 'owner' | 'chef' | 'staff'
  name: string
}

export default function AuthGuard({ 
  children, 
  requiredPage,
  allowedRoles 
}: AuthGuardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const currentUserStr = localStorage.getItem('currentUser')
      
      if (!currentUserStr) {
        // ✅ ไม่ได้ Login - ไป Login Page
        router.push('/login')
        return
      }

      try {
        const currentUser = JSON.parse(currentUserStr) as User
        setUser(currentUser)

        // ✅ ตรวจสอบสิทธิ์ตาม Role
        if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
          alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
          router.push('/')
          return
        }

        setLoading(false)
      } catch (error) {
        console.error('Invalid user data:', error)
        localStorage.removeItem('currentUser')
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, allowedRoles])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}