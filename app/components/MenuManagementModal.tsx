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
  ChefHat
} from 'lucide-react'

interface MenuItem {
  id:  number
  name: string
  price: number
  category_id: number
  is_available: boolean
}

interface Category {
  id:  number
  name:  string
}

interface MenuManagementModalProps {
  isOpen:  boolean
  onClose: () => void
}

export default function MenuManagementModal({ isOpen, onClose }: MenuManagementModalProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const loadMenuItems = useCallback(async () => {
    setLoading(true)
    try {
      const [menuRes, catRes] = await Promise.all([
        supabase. from('menu_items').select('*').order('name'),
        supabase.from('categories').select('*').order('display_order'),
      ])
      if (menuRes.error) throw menuRes.error
      setMenuItems(menuRes.data || [])
      setCategories(catRes.data || [])
    } catch (err:  any) {
      console.error('Error loading menu:', err?. message)
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
    setMenuItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, is_available: ! currentStatus } : item)
    )

    try {
      const { error } = await supabase
        . from('menu_items')
        .update({ is_available:  !currentStatus })
        .eq('id', itemId)

      if (error) throw error
    } catch (err: any) {
      setMenuItems((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, is_available: currentStatus } : item)
      )
      alert(`เกิดข้อผิดพลาด: ${err?. message}`)
    }
  }, [])

  const toggleCategoryItems = useCallback(async (categoryId: number | null, available: boolean) => {
    setLoading(true)
    try {
      const itemsToUpdate = categoryId === null
        ? menuItems. filter((i) =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((i) => i.id)
        : menuItems. filter((i) => i.category_id === categoryId).map((i) => i.id)

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
      const matchSearch = item.name. toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === null || item.category_id === selectedCategory
      return matchSearch && matchCategory
    })
  }, [menuItems, searchQuery, selectedCategory])

  const stats = useMemo(() => ({
    available: menuItems.filter((i) => i.is_available).length,
    unavailable: menuItems. filter((i) => !i.is_available).length,
    total: menuItems.length
  }), [menuItems])

  const getCategoryStats = useCallback((categoryId: number) => {
    const items = menuItems.filter((i) => i.category_id === categoryId)
    return {
      total: items.length,
      available: items.filter((i) => i.is_available).length
    }
  }, [menuItems])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-stone-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-stone-700 p-2 rounded-lg">
                <ChefHat className="w-5 h-5 text-stone-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">จัดการเมนู</h2>
                <p className="text-stone-400 text-sm">เปิด/ปิดเมนูที่พร้อมขาย</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-300" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-emerald-600/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.available}</p>
              <p className="text-emerald-300 text-xs">เปิดขาย</p>
            </div>
            <div className="bg-stone-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-stone-300">{stats.unavailable}</p>
              <p className="text-stone-400 text-xs">ปิดขาย</p>
            </div>
            <div className="bg-stone-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-stone-300">{stats.total}</p>
              <p className="text-stone-400 text-xs">ทั้งหมด</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-2 px-3 py-1. 5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === null
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              ทั้งหมด
              <span className={`px-1.5 py-0.5 rounded text-xs ${selectedCategory === null ? 'bg-stone-700' : 'bg-stone-100'}`}>
                {stats.total}
              </span>
            </button>

            {categories.map((cat) => {
              const catStats = getCategoryStats(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-stone-800 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  {cat.name}
                  <span className={`px-1.5 py-0.5 rounded text-xs ${selectedCategory === cat.id ? 'bg-stone-700' :  'bg-stone-100'}`}>
                    {catStats.available}/{catStats.total}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search & Actions */}
        <div className="bg-white px-6 py-4 border-b border-stone-200 flex-shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleCategoryItems(selectedCategory, true)}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              เปิดทั้งหมด
            </button>
            <button
              onClick={() => toggleCategoryItems(selectedCategory, false)}
              disabled={loading}
              className="flex-1 py-2.5 bg-stone-500 hover: bg-stone-600 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4" />
              ปิดทั้งหมด
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : filteredMenuItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleMenuItem(item. id, item.is_available)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    item.is_available
                      ? 'bg-white border-emerald-200 hover:border-emerald-300'
                      :  'bg-stone-100 border-stone-200 hover:border-stone-300 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${item.is_available ? 'text-stone-800' : 'text-stone-500'}`}>
                        {item.name}
                      </p>
                      <p className={`text-lg font-bold mt-1 ${item.is_available ?  'text-emerald-600' : 'text-stone-400'}`}>
                        ฿{item.price. toFixed(0)}
                      </p>
                    </div>
                    {/* Toggle Switch */}
                    <div className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-all ${
                      item.is_available ?  'bg-emerald-500 justify-end' : 'bg-stone-300 justify-start'
                    }`}>
                      <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400">ไม่พบเมนู</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}