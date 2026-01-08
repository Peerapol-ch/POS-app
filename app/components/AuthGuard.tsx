'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { ShieldAlert, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React. ReactNode
  requiredPage?: string
}

export default function AuthGuard({ children, requiredPage }: AuthGuardProps) {
  const { user, loading, canAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (! loading && ! user) {
      router. push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">กำลังตรวจสอบสิทธิ์... </p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  // ตรวจสอบสิทธิ์เข้าถึงหน้า
  if (requiredPage && !canAccess(requiredPage)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-orange-900 p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-red-200 mb-6">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover: to-teal-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </main>
    )
  }

  return <>{children}</>
}