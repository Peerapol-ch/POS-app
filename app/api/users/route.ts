import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// ตั้งค่า Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabase = createClient(supabaseUrl,supabaseKey)

// --- GET: ดึงข้อมูลผู้ใช้ทั้งหมด ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('user') 
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// --- POST: เพิ่มผู้ใช้ใหม่ ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userid, password, role, Name } = body

    // 1. เช็คว่ามี User นี้หรือยัง
    const { data: existing } = await supabase
      .from('user')
      .select('id')
      .eq('userid', userid)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'รหัสผู้ใช้นี้มีอยู่แล้ว' }, { status: 400 })
    }

    // 2. Hash Password
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)

    // 3. Insert ลง DB
    const { error } = await supabase.from('user').insert({
      userid,
      password: hashedPassword, 
      role,
      Name
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// --- PUT: แก้ไขผู้ใช้ ---
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, userid, password, role, Name } = body

    // เช็ค User ซ้ำ (ยกเว้นตัวเอง)
    const { data: existing } = await supabase
      .from('user')
      .select('id')
      .eq('userid', userid)
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'รหัสผู้ใช้นี้มีอยู่แล้ว' }, { status: 400 })
    }

    const updateData: any = { userid, role, Name }

    // ถ้ามีการส่ง password ใหม่มา ค่อย Hash ใหม่
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10)
      updateData.password = bcrypt.hashSync(password, salt)
    }

    const { error } = await supabase
      .from('user')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// --- DELETE: ลบผู้ใช้ ---
export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { id } = body

    const { error } = await supabase
      .from('user')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}