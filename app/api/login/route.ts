import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// ✅ แก้ชื่อตัวแปรให้ตรงกับไฟล์ .env ของคุณ (PUBLISHABLE_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL ERROR: Missing Supabase Env Vars")
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

export async function POST(request: Request) {
  console.log("--- Login Attempt Started ---") 
  try {
    const body = await request.json()
    const { userid, password } = body

    if (!userid || !password) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }

    // 1. ดึงข้อมูลจากตาราง user
    const { data: user, error } = await supabase
      .from('user') 
      .select('*')
      .eq('userid', userid)
      .single()

    if (error || !user) {
      console.log("❌ User Not Found")
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้นี้ หรือรหัสผู้ใช้ผิด' }, { status: 401 })
    }

    console.log("✅ User Found:", user.userid)

    // 2. ตรวจสอบรหัสผ่าน (รองรับทั้ง Hash และ Plain Text)
    let isMatch = false
    if (user.password && user.password.startsWith('$2b$')) {
      // แบบ Hash
      isMatch = await bcrypt.compare(password, user.password)
    } else {
      // แบบธรรมดา
      isMatch = (password === user.password)
    }

    if (!isMatch) {
      console.log("❌ Password Incorrect")
      return NextResponse.json({ success: false, error: 'รหัสผ่านผิด' }, { status: 401 })
    }

    // 3. Login สำเร็จ
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ success: true, user: userWithoutPassword })

  } catch (error: any) {
    console.error("❌ Server Error:", error)
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 })
  }
}