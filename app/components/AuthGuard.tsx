'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { ShieldAlert, Loader2, Home } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode // ลบเว้นวรรค
  requiredPage?: string
}

export default function AuthGuard({ children, requiredPage }: AuthGuardProps) {
  const { user, loading, canAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login') // ลบเว้นวรรค
    }
  }, [user, loading, router])

  // 1. หน้า Loading: เปลี่ยนเป็นธีมสีครีม/ส้ม
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm font-medium">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  // 2. หน้าไม่มีสิทธิ์เข้าถึง (Access Denied): เปลี่ยนเป็นธีมขาว/แดงอ่อนๆ ให้ดูสะอาดตา
  if (requiredPage && !canAccess(requiredPage)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden text-center p-8">
          
          {/* Icon */}
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-xl font-bold text-stone-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-stone-500 mb-8 text-sm">
            บัญชีของคุณไม่มีสิทธิ์ใช้งานหน้านี้ <br/>
            โปรดติดต่อผู้ดูแลระบบหากคิดว่าเกิดข้อผิดพลาด
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98] w-full"
          >
            <Home className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>

        </div>
      </main>
    )
  }

  return <>{children}</>
}