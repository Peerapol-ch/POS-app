'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Image as ImageIcon,
  Star,
  StarOff,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Filter,
  Grid3X3,
  List,
  Save,
  Loader2,
  Upload,
  Link,
  Check,
  ImagePlus
} from 'lucide-react'

interface Category {
  id:  number
  name: string
  display_order: number
}

interface MenuItem {
  id: number
  category_id: number
  name: string
  description: string | null
  price:  number
  image_url:  string | null
  is_available: boolean
  is_recommended: boolean
  created_at: string
  updated_at:  string
  category?:  Category
}

interface MenuFormData {
  name: string
  description: string
  price: string
  category_id: number | null
  image_url: string
  is_available:  boolean
  is_recommended: boolean
}

const initialFormData: MenuFormData = {
  name: '',
  description: '',
  price: '',
  category_id: null,
  image_url: '',
  is_available: true,
  is_recommended: false,
}

// ✅ ค่า MAX FILE SIZE = 10MB
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<MenuFormData>(initialFormData)

  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: categoriesData, error:  categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*, category:  categories(*)')
        .order('category_id')
        .order('name')

      if (menuError) throw menuError
      setMenuItems(menuData || [])
    } catch (err:  any) {
      console.error('Error loading data:', err)
      setError(err?. message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  // ✅ อัพโหลดรูปไปยัง Supabase Storage
  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = `menu_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('profiles_avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`อัพโหลดไม่สำเร็จ: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('profiles_avatars')
      .getPublicUrl(fileName)

    return urlData. publicUrl
  }

  // ✅ ฟังก์ชัน format ขนาดไฟล์
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e. target.files?.[0]
    if (!file) return

    // ✅ ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes. includes(file.type)) {
      alert('รองรับเฉพาะไฟล์ PNG, JPG, JPEG, WEBP เท่านั้น')
      return
    }

    // ✅ ตรวจสอบขนาดไฟล์ (max 10MB)
    if (file. size > MAX_FILE_SIZE_BYTES) {
      alert(`ขนาดไฟล์ต้องไม่เกิน ${MAX_FILE_SIZE_MB}MB\nไฟล์ของคุณมีขนาด ${formatFileSize(file.size)}`)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // แสดง preview ก่อน
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader. readAsDataURL(file)
      setUploadProgress(10)

      // Simulate progress สำหรับไฟล์ใหญ่
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // อัพโหลดไปยัง Supabase
      const imageUrl = await uploadToSupabase(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      setFormData({ ...formData, image_url: imageUrl })

    } catch (err:  any) {
      console.error('Upload error:', err)
      alert('เกิดข้อผิดพลาดในการอัพโหลด:  ' + err?. message)
      setImagePreview(null)
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: '' })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddMenu = () => {
    setFormData(initialFormData)
    setImagePreview(null)
    setImageMode('upload')
    setShowAddModal(true)
  }

  const handleEditMenu = (item: MenuItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item. price.toString(),
      category_id:  item.category_id,
      image_url: item.image_url || '',
      is_available:  item.is_available,
      is_recommended: item.is_recommended,
    })
    setImagePreview(item.image_url || null)
    setImageMode(item.image_url ? 'url' : 'upload')
    setShowEditModal(true)
  }

  const handleDeleteMenu = (item: MenuItem) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleSaveAdd = async () => {
    if (!formData.name || ! formData.price || !formData.category_id) {
      alert('กรุณากรอกข้อมูลให้ครบ')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase. from('menu_items').insert({
        name: formData.name,
        description: formData.description || null,
        price:  parseFloat(formData. price),
        category_id: formData.category_id,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        is_recommended: formData.is_recommended,
      })

      if (error) throw error

      await loadData()
      setShowAddModal(false)
      setFormData(initialFormData)
      setImagePreview(null)
    } catch (err:  any) {
      console.error('Error adding menu:', err)
      alert('เกิดข้อผิดพลาด: ' + err?. message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedItem || !formData.name || !formData. price || !formData.category_id) {
      alert('กรุณากรอกข้อมูลให้ครบ')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: formData. name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          category_id: formData.category_id,
          image_url: formData.image_url || null,
          is_available: formData.is_available,
          is_recommended: formData. is_recommended,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id)

      if (error) throw error

      await loadData()
      setShowEditModal(false)
      setSelectedItem(null)
      setFormData(initialFormData)
      setImagePreview(null)
    } catch (err: any) {
      console. error('Error updating menu:', err)
      alert('เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedItem) return

    setSaving(true)
    try {
      const { error } = await supabase
        . from('menu_items')
        .delete()
        .eq('id', selectedItem.id)

      if (error) throw error

      await loadData()
      setShowDeleteModal(false)
      setSelectedItem(null)
    } catch (err:  any) {
      console.error('Error deleting menu:', err)
      alert('เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        . from('menu_items')
        .update({ is_available: ! item.is_available, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error

      setMenuItems(prev => prev.map(m =>
        m.id === item.id ?  { ...m, is_available: !m.is_available } : m
      ))
    } catch (err: any) {
      console.error('Error toggling available:', err)
    }
  }

  const handleToggleRecommended = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        . from('menu_items')
        .update({ is_recommended:  !item.is_recommended, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error

      setMenuItems(prev => prev.map(m =>
        m.id === item.id ? { ... m, is_recommended: !m.is_recommended } : m
      ))
    } catch (err:  any) {
      console.error('Error toggling recommended:', err)
    }
  }

  const formatCurrency = (amount:  number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(amount)

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery. toLowerCase())
    const matchesCategory = selectedCategory === null || item.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedItems = filteredItems.reduce((acc, item) => {
    const categoryName = item.category?. name || 'ไม่มีหมวดหมู่'
    if (! acc[categoryName]) acc[categoryName] = []
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  const availableCount = menuItems.filter(m => m.is_available).length

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
          <button onClick={loadData} className="w-full py-2. 5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
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
                <UtensilsCrossed className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800">จัดการเมนู</h1>
                <p className="text-xs text-stone-400">{menuItems.length} รายการ • {availableCount} พร้อมขาย</p>
              </div>
            </div>
            <button
              onClick={handleAddMenu}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">เพิ่มเมนู</span>
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเมนู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCategoryFilter(! showCategoryFilter)}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 rounded-xl text-stone-600 hover:bg-stone-200 transition-colors"
              >
                <Filter className="w-5 h-5" />
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCategoryFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-stone-200 py-2 min-w-[180px] z-50">
                  <button
                    onClick={() => { setSelectedCategory(null); setShowCategoryFilter(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 ${selectedCategory === null ? 'text-stone-800 font-medium' : 'text-stone-600'}`}
                  >
                    ทั้งหมด ({menuItems.length})
                  </button>
                  {categories.map((cat) => {
                    const count = menuItems.filter(m => m. category_id === cat.id).length
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setShowCategoryFilter(false) }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex justify-between ${selectedCategory === cat. id ? 'text-stone-800 font-medium' :  'text-stone-600'}`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-stone-400">{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex bg-stone-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-7 h-7 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 mb-1">ไม่พบเมนู</p>
            <p className="text-sm text-stone-400">ลองค้นหาใหม่หรือเพิ่มเมนูใหม่</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([categoryName, items]) => (
              <div key={categoryName}>
                <h2 className="font-semibold text-stone-800 mb-3 flex items-center gap-2 text-sm">
                  <span className="w-1. 5 h-1.5 bg-stone-400 rounded-full"></span>
                  {categoryName}
                  <span className="font-normal text-stone-400">({items.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-all ${! item.is_available ? 'opacity-60' : ''}`}
                    >
                      <div className="aspect-square bg-stone-100 relative">
                        {item.image_url ?  (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-stone-300" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {item.is_recommended && (
                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                              <Star className="w-3 h-3" /> แนะนำ
                            </span>
                          )}
                          {! item.is_available && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">หมด</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleRecommended(item)}
                          className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.is_recommended ?  'bg-amber-100 text-amber-600' : 'bg-white/80 text-stone-400 hover:bg-white'}`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-stone-800 truncate text-sm">{item.name}</h3>
                        <p className="text-lg font-bold text-stone-800">฿{formatCurrency(item.price)}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleToggleAvailable(item)}
                            className={`flex-1 py-1. 5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${item.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}
                          >
                            {item.is_available ? <><ToggleRight className="w-4 h-4" /> พร้อมขาย</> :  <><ToggleLeft className="w-4 h-4" /> หมด</>}
                          </button>
                          <button onClick={() => handleEditMenu(item)} className="p-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMenu(item)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([categoryName, items]) => (
              <div key={categoryName} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                  <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full"></span>
                    {categoryName}
                    <span className="font-normal text-stone-400">({items.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-stone-100">
                  {items.map((item) => (
                    <div key={item.id} className={`p-4 flex items-center gap-4 hover: bg-stone-50 transition-colors ${!item.is_available ? 'opacity-60' : ''}`}>
                      <div className="w-14 h-14 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                        {item.image_url ?  (
                          <img src={item. image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-stone-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-stone-800 truncate">{item.name}</h3>
                          {item.is_recommended && <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-lg font-bold text-stone-800">฿{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => handleToggleAvailable(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${item. is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}
                      >
                        {item.is_available ? 'พร้อมขาย' : 'หมด'}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleRecommended(item)} className={`p-2 rounded-lg transition-colors ${item. is_recommended ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-400'}`}>
                          <Star className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleEditMenu(item)} className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteMenu(item)} className="p-2 bg-red-50 text-red-500 rounded-lg hover: bg-red-100 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddModal(false); setShowEditModal(false) }} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-stone-800 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{showAddModal ?  'เพิ่มเมนูใหม่' : 'แก้ไขเมนู'}</h2>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">รูปภาพ</label>

                <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${imageMode === 'upload' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
                  >
                    <Upload className="w-4 h-4" />
                    อัพโหลด
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${imageMode === 'url' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
                  >
                    <Link className="w-4 h-4" />
                    ใส่ลิงก์
                  </button>
                </div>

                {imageMode === 'upload' ?  (
                  <div className="space-y-3">
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${uploading ? 'border-stone-300 bg-stone-50 cursor-wait' : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50 cursor-pointer'}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ?  (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" />
                          <p className="text-sm text-stone-500 mb-2">กำลังอัพโหลด...</p>
                          <div className="w-full max-w-[200px] h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width:  `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{uploadProgress}%</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center mb-3">
                            <ImagePlus className="w-7 h-7 text-stone-400" />
                          </div>
                          <p className="text-sm text-stone-600 font-medium">คลิกเพื่อเลือกรูป</p>
                          {/* ✅ แสดงขนาดไฟล์สูงสุดที่รองรับ */}
                          <p className="text-xs text-stone-400 mt-1">PNG, JPG, WEBP ขนาดไม่เกิน {MAX_FILE_SIZE_MB}MB</p>
                        </div>
                      )}
                    </div>

                    {(imagePreview || formData.image_url) && !uploading && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                          <img src={imagePreview || formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-emerald-700 mb-1">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">อัพโหลดสำเร็จ</span>
                          </div>
                          <p className="text-xs text-stone-500 break-all">
                            {formData.image_url?. substring(0, 60)}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e. target.value })
                        setImagePreview(e. target.value)
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                    {formData.image_url && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-stone-200">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อเมนู *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ไก่ย่าง, ส้มตำ"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">หมวดหมู่ *</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ... formData, category_id: parseInt(e.target. value) || null })}
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ราคา (บาท) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus: ring-stone-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  rows={2}
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus: outline-none focus: ring-2 focus:ring-stone-400 resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_available:  !formData.is_available })}
                  className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border-2 ${formData.is_available ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}
                >
                  {formData.is_available ? <Check className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  พร้อมขาย
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_recommended: !formData. is_recommended })}
                  className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border-2 ${formData.is_recommended ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}
                >
                  {formData.is_recommended ? <Star className="w-5 h-5" /> : <StarOff className="w-5 h-5" />}
                  แนะนำ
                </button>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false) }}
                className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={showAddModal ?  handleSaveAdd : handleSaveEdit}
                disabled={saving || uploading}
                className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</> : <><Save className="w-5 h-5" /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">ยืนยันการลบ? </h2>
              <p className="text-stone-500 text-sm mb-1">คุณต้องการลบเมนู</p>
              <p className="font-semibold text-stone-800 mb-4">"{selectedItem.name}"</p>
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
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังลบ...</> : <><Trash2 className="w-5 h-5" /> ลบเมนู</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickMenu currentPage="menu-management" />
    </main>
  )
}