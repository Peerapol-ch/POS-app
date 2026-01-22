'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import {
  UtensilsCrossed,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  
  // Mock Auth Context
  const authContext = useAuth ? useAuth() : { user: null, login: async () => ({ success: true, error: '' }), loading: false }
  const { user, login, loading: authLoading } = authContext

  const [userid, setUserid] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userid.trim()) {
      setError('กรุณากรอกรหัสผู้ใช้')
      return
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน')
      return
    }

    setLoading(true)
    // await new Promise(r => setTimeout(r, 1000)) 
    
    const result = await login(userid.trim(), password)
    setLoading(false)

    if (result.success) {
      router.push('/')
    } else {
      setError((result as any).error || 'เข้าสู่ระบบไม่สำเร็จ')
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </main>
    )
  }

  return (
    // เปลี่ยน Background เป็นสี Stone-50 (ขาวอมเทาอุ่นๆ)
    <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans text-stone-800">
      
      {/* Background Pattern: เปลี่ยนจุดเป็นสีน้ำตาลจางๆ */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#78350f 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="pt-10 pb-6 px-8 text-center">
          {/* Logo Background: สีส้ม/น้ำตาลอ่อนจางๆ */}
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-700">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-1">ร้านไก่ย่างพังโคน</h1>
          <p className="text-stone-500 text-sm">ลงชื่อเข้าใช้เพื่อจัดการระบบ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
          
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* User Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 ml-1">รหัสผู้ใช้</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-600 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={userid}
                onChange={(e) => setUserid(e.target.value)}
                placeholder="กรอกรหัสผู้ใช้ของคุณ"
                // เปลี่ยน Focus border เป็นสี Amber (น้ำตาลทอง)
                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 ml-1">รหัสผ่าน</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-11 pr-12 py-3 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all [&::-ms-reveal]:hidden"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-all"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button: เปลี่ยนเป็นสี Amber-600 (น้ำตาลทองเข้ม) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <span>เข้าสู่ระบบ</span>
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
          
          <div className="text-center pt-2">
             <p className="text-xs text-stone-400">
               ติดปัญหาการใช้งาน? ติดต่อผู้ดูแลระบบ
             </p>
          </div>
        </form>
      </div>
    </main>
  )
}