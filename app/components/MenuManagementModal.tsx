'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/utils/supabaseClient'
import {
  X,
  Search,
  Eye,
  EyeOff,
  Package,
  Grid3X3,
  Loader,
  ChefHat,
  Check,
  Filter
} from 'lucide-react'

interface MenuItem {
  id: number
  name: string
  price: number
  category_id: number
  is_available: boolean
}

interface Category {
  id: number
  name: string
}

interface MenuManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MenuManagementModal({ isOpen, onClose }: MenuManagementModalProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  // ✅ ป้องกัน scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const loadMenuItems = useCallback(async () => {
    setLoading(true)
    try {
      const [menuRes, catRes] = await Promise.all([
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('categories').select('*').order('display_order'),
      ])
      if (menuRes.error) throw menuRes.error
      setMenuItems(menuRes.data || [])
      setCategories(catRes.data || [])
    } catch (err: any) {
      console.error('Error loading menu:', err?.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadMenuItems()
      setSelectedCategory(null)
      setSearchQuery('')
    }
  }, [isOpen, loadMenuItems])

  const toggleMenuItem = useCallback(async (itemId: number, currentStatus: boolean) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10)
    
    setMenuItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, is_available: !currentStatus } : item)
    )

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId)

      if (error) throw error
    } catch (err: any) {
      setMenuItems((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, is_available: currentStatus } : item)
      )
      alert(`เกิดข้อผิดพลาด: ${err?.message}`)
    }
  }, [])

  const toggleCategoryItems = useCallback(async (categoryId: number | null, available: boolean) => {
    setLoading(true)
    try {
      const itemsToUpdate = categoryId === null
        ? menuItems.filter((i) =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((i) => i.id)
        : menuItems.filter((i) => i.category_id === categoryId).map((i) => i.id)

      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: available })
        .in('id', itemsToUpdate)

      if (error) throw error

      setMenuItems((prev) =>
        prev.map((item) => itemsToUpdate.includes(item.id) ? { ...item, is_available: available } : item)
      )
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err?.message}`)
    } finally {
      setLoading(false)
    }
  }, [menuItems, searchQuery])

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === null || item.category_id === selectedCategory
      return matchSearch && matchCategory
    })
  }, [menuItems, searchQuery, selectedCategory])

  const stats = useMemo(() => ({
    available: menuItems.filter((i) => i.is_available).length,
    unavailable: menuItems.filter((i) => !i.is_available).length,
    total: menuItems.length
  }), [menuItems])

  const getCategoryStats = useCallback((categoryId: number) => {
    const items = menuItems.filter((i) => i.category_id === categoryId)
    return {
      total: items.length,
      available: items.filter((i) => i.is_available).length
    }
  }, [menuItems])

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === null) return 'ทั้งหมด'
    return categories.find(c => c.id === selectedCategory)?.name || 'ทั้งหมด'
  }, [selectedCategory, categories])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Bottom Sheet on Mobile */}
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

        {/* ✅ Drag Handle - Mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 bg-stone-800">
          <div className="w-10 h-1 bg-stone-600 rounded-full" />
        </div>

        {/* Header - Compact on Mobile */}
        <div className="bg-stone-800 px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-stone-700 p-2 rounded-xl">
                <ChefHat className="w-5 h-5 text-stone-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">จัดการเมนู</h2>
                <p className="text-stone-400 text-xs hidden sm:block">เปิด/ปิดเมนูที่พร้อมขาย</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-stone-700 hover:bg-stone-600 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-stone-300" />
            </button>
          </div>

          {/* Stats - Horizontal on Mobile */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-emerald-600/20 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-400">{stats.available}</p>
              <p className="text-emerald-300 text-[10px] sm:text-xs">เปิดขาย</p>
            </div>
            <div className="flex-1 bg-stone-700 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-black text-stone-300">{stats.unavailable}</p>
              <p className="text-stone-400 text-[10px] sm:text-xs">ปิดขาย</p>
            </div>
            <div className="flex-1 bg-stone-700 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-black text-stone-300">{stats.total}</p>
              <p className="text-stone-400 text-[10px] sm:text-xs">ทั้งหมด</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white px-4 sm:px-6 py-3 border-b border-stone-200 flex-shrink-0">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเมนู..."
                className="w-full pl-9 pr-3 py-2.5 bg-stone-100 border-0 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            {/* Category Filter Button - Mobile */}
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`px-3 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                selectedCategory !== null 
                  ? 'bg-stone-800 text-white' 
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedCategoryName}</span>
              {selectedCategory !== null && (
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
            </button>
          </div>

          {/* Category Pills - Expandable */}
          {showCategoryFilter && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setShowCategoryFilter(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                ทั้งหมด
              </button>

              {categories.map((cat) => {
                const catStats = getCategoryStats(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setShowCategoryFilter(false)
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cat.name}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      selectedCategory === cat.id ? 'bg-stone-700' : 'bg-stone-200'
                    }`}>
                      {catStats.available}/{catStats.total}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => toggleCategoryItems(selectedCategory, true)}
              disabled={loading}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Eye className="w-4 h-4" />
              เปิดทั้งหมด
            </button>
            <button
              onClick={() => toggleCategoryItems(selectedCategory, false)}
              disabled={loading}
              className="flex-1 py-2 bg-stone-500 hover:bg-stone-600 disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <EyeOff className="w-4 h-4" />
              ปิดทั้งหมด
            </button>
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-stone-50">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : filteredMenuItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleMenuItem(item.id, item.is_available)}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                    item.is_available
                      ? 'bg-white border-emerald-200 shadow-sm'
                      : 'bg-stone-100 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${
                        item.is_available ? 'text-stone-800' : 'text-stone-500'
                      }`}>
                        {item.name}
                      </p>
                      <p className={`text-base font-bold mt-0.5 ${
                        item.is_available ? 'text-emerald-600' : 'text-stone-400'
                      }`}>
                        ฿{item.price.toFixed(0)}
                      </p>
                    </div>
                    
                    {/* Toggle Switch */}
                    <div className={`relative w-12 h-7 rounded-full transition-all ${
                      item.is_available ? 'bg-emerald-500' : 'bg-stone-300'
                    }`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                        item.is_available ? 'right-1' : 'left-1'
                      }`}>
                        {item.is_available && (
                          <Check className="w-3 h-3 text-emerald-500 absolute top-1 left-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">ไม่พบเมนู</p>
              <p className="text-stone-400 text-sm mt-1">ลองค้นหาด้วยคำอื่น</p>
            </div>
          )}
        </div>

        {/* ✅ Bottom Safe Area */}
        <div className="h-safe-area-inset-bottom bg-stone-50" />
      </div>

      {/* Category Filter Backdrop */}
      {showCategoryFilter && (
        <div 
          className="absolute inset-0 z-[-1]" 
          onClick={() => setShowCategoryFilter(false)} 
        />
      )}
    </div>
  )
}