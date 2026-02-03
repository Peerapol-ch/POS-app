'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Save,
  Loader2,
  Shield,
  User,
  Crown,
  ChefHat,
  UserCheck,
  Eye,
  EyeOff,
  Check,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
} from 'lucide-react'

interface UserProfile {
  id: number
  userid: string | null
  password?: string | null // ✅ เปลี่ยนเป็น optional
  role: 'owner' | 'chef' | 'staff' | null
  Name: string | null
  access_time: string | null
  created_at: string | null
}

interface UserFormData {
  userid: string
  password: string
  confirmPassword: string
  role: 'owner' | 'chef' | 'staff'
  Name: string
}

const initialFormData: UserFormData = {
  userid: '',
  password: '',
  confirmPassword: '',
  role: 'staff',
  Name: '',
}

const roleConfig = {
  owner: {
    label: 'เจ้าของร้าน',
    icon: Crown,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'เข้าถึงได้ทุกฟังก์ชัน'
  },
  chef: {
    label: 'พ่อครัว',
    icon: ChefHat,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'จัดการออเดอร์และครัว'
  },
  staff: {
    label: 'พนักงาน',
    icon: UserCheck,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    description: 'รับออเดอร์และเสิร์ฟ'
  }
}

const getRoleConfig = (role: string | null) => {
  if (role && roleConfig[role as keyof typeof roleConfig]) {
    return roleConfig[role as keyof typeof roleConfig]
  }
  return roleConfig.staff
}

// ✅ ฟังก์ชันตรวจสอบความแข็งแรงของรหัสผ่าน
const checkPasswordStrength = (password: string): { 
  score: number
  label: string
  color: string
  suggestions: string[] 
} => {
  let score = 0
  const suggestions: string[] = []

  if (password.length >= 8) {
    score += 25
  } else {
    suggestions.push('ควรมีอย่างน้อย 8 ตัวอักษร')
  }

  if (/[a-z]/.test(password)) {
    score += 15
  } else {
    suggestions.push('ควรมีตัวอักษรพิมพ์เล็ก (a-z)')
  }

  if (/[A-Z]/.test(password)) {
    score += 20
  } else {
    suggestions.push('ควรมีตัวอักษรพิมพ์ใหญ่ (A-Z)')
  }

  if (/[0-9]/.test(password)) {
    score += 20
  } else {
    suggestions.push('ควรมีตัวเลข (0-9)')
  }

  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password)) {
    score += 20
  } else {
    suggestions.push('ควรมีอักขระพิเศษ (!@#$%...)')
  }

  let label = 'อ่อนแอมาก'
  let color = 'bg-red-500'

  if (score >= 80) {
    label = 'แข็งแรงมาก'
    color = 'bg-emerald-500'
  } else if (score >= 60) {
    label = 'แข็งแรง'
    color = 'bg-green-500'
  } else if (score >= 40) {
    label = 'ปานกลาง'
    color = 'bg-yellow-500'
  } else if (score >= 20) {
    label = 'อ่อนแอ'
    color = 'bg-orange-500'
  }

  return { score, label, color, suggestions }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState({ 
    score: 0, 
    label: '', 
    color: '', 
    suggestions: [] as string[] 
  })
  const [showPasswordHints, setShowPasswordHints] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(checkPasswordStrength(formData.password))
    } else {
      setPasswordStrength({ score: 0, label: '', color: '', suggestions: [] })
    }
  }, [formData.password])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      // ✅ ดึงข้อมูลผู้ใช้ (ไม่ดึง password ออกมาแสดง)
      const { data, error: fetchError } = await supabase
        .from('user')
        .select('id, userid, role, Name, access_time, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error loading users:', err)
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setFormData(initialFormData)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowPasswordHints(false)
    setShowAddModal(true)
  }

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setFormData({
      userid: user.userid || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'staff',
      Name: user.Name || '',
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowPasswordHints(false)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const validateForm = (isEdit: boolean = false): string | null => {
    if (!formData.userid.trim()) {
      return 'กรุณากรอกรหัสผู้ใช้'
    }
    if (formData.userid.length < 3) {
      return 'รหัสผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.userid)) {
      return 'รหัสผู้ใช้ต้องเป็นตัวอักษร ตัวเลข หรือ _ เท่านั้น'
    }

    if (!formData.Name.trim()) {
      return 'กรุณากรอกชื่อ'
    }
    if (formData.Name.length < 2) {
      return 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'
    }

    if (!isEdit || formData.password) {
      if (!formData.password && !isEdit) {
        return 'กรุณากรอกรหัสผ่าน'
      }
      if (formData.password && formData.password.length < 6) {
        return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      }
      if (formData.password && passwordStrength.score < 40) {
        return 'รหัสผ่านอ่อนแอเกินไป กรุณาเลือกรหัสผ่านที่แข็งแรงกว่านี้'
      }
      if (formData.password !== formData.confirmPassword) {
        return 'รหัสผ่านไม่ตรงกัน'
      }
    }

    return null
  }

  const handleSaveAdd = async () => {
    const validationError = validateForm(false)
    if (validationError) {
      alert(validationError)
      return
    }

    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('user')
        .select('id')
        .eq('userid', formData.userid.trim())
        .maybeSingle()

      if (existing) {
        alert('❌ รหัสผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกรหัสอื่น')
        setSaving(false)
        return
      }

      // ✅ ส่ง plain text password - Supabase Trigger จะ hash ให้อัตโนมัติ
      const { error } = await supabase.from('user').insert({
        userid: formData.userid.trim(),
        password: formData.password, // ✅ Trigger จะเข้ารหัสให้
        role: formData.role,
        Name: formData.Name.trim(),
      })

      if (error) throw error

      await loadUsers()
      setShowAddModal(false)
      setFormData(initialFormData)
      alert('✅ เพิ่มผู้ใช้สำเร็จ')
    } catch (err: any) {
      console.error('Error adding user:', err)
      alert('❌ เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    const validationError = validateForm(true)
    if (validationError) {
      alert(validationError)
      return
    }

    if (!selectedUser) return

    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('user')
        .select('id')
        .eq('userid', formData.userid.trim())
        .neq('id', selectedUser.id)
        .maybeSingle()

      if (existing) {
        alert('❌ รหัสผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกรหัสอื่น')
        setSaving(false)
        return
      }

      const updateData: any = {
        userid: formData.userid.trim(),
        role: formData.role,
        Name: formData.Name.trim(),
      }

      // ✅ อัพเดทรหัสผ่านเฉพาะเมื่อมีการกรอก (Trigger จะ hash ให้)
      if (formData.password) {
        updateData.password = formData.password
      }

      const { error } = await supabase
        .from('user')
        .update(updateData)
        .eq('id', selectedUser.id)

      if (error) throw error

      await loadUsers()
      setShowEditModal(false)
      setSelectedUser(null)
      setFormData(initialFormData)
      alert('✅ แก้ไขข้อมูลสำเร็จ')
    } catch (err: any) {
      console.error('Error updating user:', err)
      alert('❌ เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error

      await loadUsers()
      setShowDeleteModal(false)
      setSelectedUser(null)
      alert('✅ ลบผู้ใช้สำเร็จ')
    } catch (err: any) {
      console.error('Error deleting user:', err)
      alert('❌ เกิดข้อผิ��พลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredUsers = users.filter((user) => {
    const userid = user.userid || ''
    const name = user.Name || ''
    const role = user.role || ''
    const matchesSearch =
      userid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || role === filterRole
    return matchesSearch && matchesRole
  })

  const totalUsers = users.length
  const roleStats = {
    owner: users.filter(u => u.role === 'owner').length,
    chef: users.filter(u => u.role === 'chef').length,
    staff: users.filter(u => u.role === 'staff').length,
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">กำลังโหลดข้อมูล...</p>
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
          <button onClick={loadUsers} className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
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
              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800">จัดการผู้ใช้</h1>
                <p className="text-xs text-stone-400">{totalUsers} คน</p>
              </div>
            </div>
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">เพิ่มผู้ใช้</span>
            </button>
          </div>

          {/* Role Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const count = roleStats[role as keyof typeof roleStats]
              const IconComponent = config.icon
              return (
                <button
                  key={role}
                  onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
                  className={`rounded-xl p-3 border transition-all ${
                    filterRole === role
                      ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-1 ${config.borderColor}`
                      : 'bg-stone-50 border-stone-100 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <IconComponent className={`w-4 h-4 ${filterRole === role ? config.textColor : 'text-stone-500'}`} />
                    <p className={`text-xl font-bold ${filterRole === role ? config.textColor : 'text-stone-800'}`}>{count}</p>
                  </div>
                  <p className={`text-xs ${filterRole === role ? config.textColor : 'text-stone-500'}`}>{config.label}</p>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            {filterRole !== 'all' && (
              <button
                onClick={() => setFilterRole('all')}
                className="px-4 py-2.5 bg-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-300 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                ล้าง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 mb-1">ไม่พบผู้ใช้</p>
            <p className="text-sm text-stone-400">ลองค้นหาใหม่หรือเพิ่มผู้ใช้ใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const config = getRoleConfig(user.role)
              const IconComponent = config.icon

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl border overflow-hidden ${config.borderColor}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 ${config.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                        <IconComponent className="w-7 h-7" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-800 truncate">{user.Name || 'ไม่ระบุชื่อ'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-stone-500 mb-1">
                          <span className="font-mono">@{user.userid || '-'}</span>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                          {user.access_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              เข้าล่าสุด: {formatDateTime(user.access_time)}
                            </span>
                          )}
                          <span>สร้างเมื่อ {formatDate(user.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddModal(false); setShowEditModal(false) }} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-stone-800 px-5 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6" />
                  <h2 className="text-lg font-semibold">{showAddModal ? 'เพิ่มผู้ใช้ใหม่' : 'แก้ไขผู้ใช้'}</h2>
                </div>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อ *</label>
                <div className="relative">
                  <User className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    placeholder="ชื่อ-นามสกุล"
                    className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>

              {/* User ID */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">รหัสผู้ใช้ (User ID) *</label>
                <div className="relative">
                  <Key className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.userid}
                    onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                    placeholder="ตัวอักษร ตัวเลข หรือ _ เท่านั้น"
                    className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
                  />
                </div>
                <p className="text-xs text-stone-400 mt-1">ใช้สำหรับเข้าสู่ระบบ (a-z, A-Z, 0-9, _)</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center justify-between">
                  <span>รหัสผ่าน {showAddModal ? '*' : '(เว้นว่างถ้าไม่ต้องการเปลี่ยน)'}</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordHints(!showPasswordHints)}
                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    {showPasswordHints ? 'ซ่อนคำแนะนำ' : 'คำแนะนำ'}
                  </button>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="รหัสผ่านที่แข็งแรง"
                    className="w-full pl-10 pr-12 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-600">ความแข็งแรง:</span>
                      <span className={`text-xs font-bold ${
                        passwordStrength.score >= 80 ? 'text-emerald-600' :
                        passwordStrength.score >= 60 ? 'text-green-600' :
                        passwordStrength.score >= 40 ? 'text-yellow-600' :
                        passwordStrength.score >= 20 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Hints */}
                {showPasswordHints && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      เคล็ดลับสร้างรหัสผ่านที่แข็งแรง:
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      {passwordStrength.suggestions.length > 0 ? (
                        passwordStrength.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-center gap-2 text-emerald-600">
                          <Check className="w-3 h-3" />
                          <span>รหัสผ่านของคุณแข็งแรงมาก!</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ยืนยันรหัสผ่าน *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="w-full pl-10 pr-12 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    รหัสผ่านไม่ตรงกัน
                  </p>
                )}
                {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-emerald-500 text-xs mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    รหัสผ่านตรงกัน
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">สิทธิ์การใช้งาน *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(roleConfig).map(([role, config]) => {
                    const IconComponent = config.icon
                    const isSelected = formData.role === role
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role as any })}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? `${config.bgColor} ${config.borderColor} ${config.textColor}`
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${isSelected ? config.color : 'bg-stone-200'}`}>
                          <IconComponent className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                        </div>
                        <p className={`font-semibold text-sm ${isSelected ? config.textColor : 'text-stone-800'}`}>{config.label}</p>
                        <p className={`text-xs mt-1 ${isSelected ? config.textColor : 'text-stone-500'}`}>{config.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3 flex-shrink-0">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false) }}
                className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={showAddModal ? handleSaveAdd : handleSaveEdit}
                disabled={saving}
                className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</> : <><Save className="w-5 h-5" /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">ยืนยันการลบ?</h2>
              <p className="text-stone-500 text-sm mb-1">คุณต้องการลบผู้ใช้</p>
              <p className="font-semibold text-stone-800 mb-4">"{selectedUser.Name || selectedUser.userid || 'ไม่ระบุ'}"</p>
              <p className="text-xs text-red-400 mb-6">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors">
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={saving}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังลบ...</> : <><Trash2 className="w-5 h-5" /> ลบ</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickMenu currentPage="users" />
    </main>
  )
}