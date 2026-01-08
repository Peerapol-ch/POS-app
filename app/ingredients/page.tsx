'use client'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import QuickMenu from '@/app/components/QuickMenu'
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Save,
  Loader2,
  ChevronDown,
  Filter,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  History,
  Minus,
  Check,
  PackagePlus,
  DollarSign
} from 'lucide-react'

interface Ingredient {
  id: number
  name: string
  unit: string
  current_stock: number
  min_threshold: number
  cost_per_unit:  number
  created_at: string
  updated_at: string
}

interface InventoryLog {
  id:  number
  ingredient_id: number
  change_amount: number
  change_type: string
  cost_total: number
  created_by: string | null
  created_at: string
}

interface IngredientFormData {
  name: string
  unit: string
  current_stock: string
  min_threshold: string
  cost_per_unit:  string
}

interface StockAdjustmentData {
  amount: string
  type: 'add' | 'remove' | 'adjust'
  cost:  string  // ✅ เพิ่มราคาที่ซื้อมา
  reason:  string
}

const initialFormData: IngredientFormData = {
  name: '',
  unit: '',
  current_stock: '0',
  min_threshold: '0',
  cost_per_unit: '0',
}

const initialStockData: StockAdjustmentData = {
  amount: '',
  type: 'add',
  cost: '',  
  reason: '',
}

const commonUnits = ['กก. ', 'กรัม', 'ลิตร', 'มล.', 'ชิ้น', 'ถุง', 'กล่อง', 'ขวด', 'แพ็ค', 'โหล']

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'ok'>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null)
  const [formData, setFormData] = useState<IngredientFormData>(initialFormData)
  const [stockData, setStockData] = useState<StockAdjustmentData>(initialStockData)
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error:  fetchError } = await supabase
        . from('ingredients')
        .select('*')
        .order('name')

      if (fetchError) throw fetchError
      setIngredients(data || [])
    } catch (err:  any) {
      console.error('Error loading data:', err)
      setError(err?. message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryLogs = async (ingredientId: number) => {
    setLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setInventoryLogs(data || [])
    } catch (err: any) {
      console. error('Error loading logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleAddIngredient = () => {
    setFormData(initialFormData)
    setShowAddModal(true)
  }

  const handleEditIngredient = (item: Ingredient) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      unit: item.unit,
      current_stock: item.current_stock. toString(),
      min_threshold: item. min_threshold.toString(),
      cost_per_unit: item.cost_per_unit.toString(),
    })
    setShowEditModal(true)
  }

  const handleDeleteIngredient = (item: Ingredient) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleAdjustStock = (item:  Ingredient) => {
    setSelectedItem(item)
    setStockData(initialStockData)
    setShowStockModal(true)
  }

  const handleViewHistory = async (item: Ingredient) => {
    setSelectedItem(item)
    setShowHistoryModal(true)
    await loadInventoryLogs(item.id)
  }

  const handleSaveAdd = async () => {
    if (!formData.name || ! formData.unit) {
      alert('กรุณากรอกชื่อและหน่วยวัตถุดิบ')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase. from('ingredients').insert({
        name: formData.name,
        unit:  formData.unit,
        current_stock: parseFloat(formData. current_stock) || 0,
        min_threshold:  parseFloat(formData. min_threshold) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      })

      if (error) throw error

      await loadData()
      setShowAddModal(false)
      setFormData(initialFormData)
    } catch (err:  any) {
      console.error('Error adding ingredient:', err)
      alert('เกิดข้อผิดพลาด:  ' + err?. message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedItem || !formData.name || !formData. unit) {
      alert('กรุณากรอกชื่อและหน่วยวัตถุดิบ')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({
          name:  formData.name,
          unit: formData.unit,
          current_stock:  parseFloat(formData.current_stock) || 0,
          min_threshold:  parseFloat(formData.min_threshold) || 0,
          cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id)

      if (error) throw error

      await loadData()
      setShowEditModal(false)
      setSelectedItem(null)
      setFormData(initialFormData)
    } catch (err: any) {
      console. error('Error updating ingredient:', err)
      alert('เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedItem) return

    setSaving(true)
    try {
      await supabase
        .from('inventory_logs')
        .delete()
        .eq('ingredient_id', selectedItem. id)

      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', selectedItem.id)

      if (error) throw error

      await loadData()
      setShowDeleteModal(false)
      setSelectedItem(null)
    } catch (err: any) {
      console.error('Error deleting ingredient:', err)
      alert('เกิดข้อผิดพลาด: ' + err?. message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStockAdjustment = async () => {
    if (!selectedItem || !stockData. amount) {
      alert('กรุณากรอกจำนวน')
      return
    }

    const amount = parseFloat(stockData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณากรอกจำนวนที่ถูกต้อง')
      return
    }

    setSaving(true)
    try {
      let newStock = selectedItem.current_stock
      let changeAmount = amount
      let costTotal = 0

      // ✅ คำนวณราคา
      const inputCost = parseFloat(stockData.cost) || 0

      if (stockData.type === 'add') {
        newStock += amount
        // ถ้ากรอกราคามา ใช้ราคาที่กรอก ถ้าไม่ใช้ราคาเดิม
        costTotal = inputCost > 0 ? inputCost : amount * selectedItem.cost_per_unit

        // ✅ คำนวณราคาเฉลี่ยต่อหน่วยใหม่ (ถ้ามีการกรอกราคา)
        if (inputCost > 0) {
          const oldValue = selectedItem.current_stock * selectedItem.cost_per_unit
          const newValue = oldValue + inputCost
          const newCostPerUnit = newValue / newStock

          // อัพเดทราคาต่อหน่วยใหม่
          await supabase
            .from('ingredients')
            .update({ cost_per_unit:  newCostPerUnit })
            .eq('id', selectedItem.id)
        }
      } else if (stockData.type === 'remove') {
        newStock -= amount
        changeAmount = -amount
        costTotal = amount * selectedItem.cost_per_unit
        if (newStock < 0) {
          alert('จำนวนสต็อกไม่เพียงพอ')
          setSaving(false)
          return
        }
      } else {
        // adjust - set to exact value
        changeAmount = amount - selectedItem.current_stock
        newStock = amount
        costTotal = Math.abs(changeAmount) * selectedItem.cost_per_unit
      }

      // Update ingredient stock
      const { error:  updateError } = await supabase
        .from('ingredients')
        .update({
          current_stock: newStock,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', selectedItem.id)

      if (updateError) throw updateError

      // Log the change
      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert({
          ingredient_id:  selectedItem.id,
          change_amount: changeAmount,
          change_type:  stockData.type === 'add' ?  'เพิ่มสต็อก' : stockData.type === 'remove' ? 'ใช้งาน' : 'ปรับยอด',
          cost_total: costTotal,
        })

      if (logError) console.error('Error logging:', logError)

      await loadData()
      setShowStockModal(false)
      setSelectedItem(null)
      setStockData(initialStockData)
    } catch (err: any) {
      console. error('Error adjusting stock:', err)
      alert('เกิดข้อผิดพลาด: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(amount)

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute:  '2-digit'
    })
  }

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery. toLowerCase())
    const isLowStock = item. current_stock <= item.min_threshold

    if (filterStatus === 'low') return matchesSearch && isLowStock
    if (filterStatus === 'ok') return matchesSearch && !isLowStock
    return matchesSearch
  })

  const totalItems = ingredients.length
  const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_threshold).length
  const totalValue = ingredients.reduce((sum, i) => sum + (i.current_stock * i. cost_per_unit), 0)

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
          <button onClick={loadData} className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
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
                <Package className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800">วัตถุดิบ</h1>
                <p className="text-xs text-stone-400">{totalItems} รายการ</p>
              </div>
            </div>
            <button
              onClick={handleAddIngredient}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">เพิ่มวัตถุดิบ</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <p className="text-xs text-stone-500 mb-1">ทั้งหมด</p>
              <p className="text-xl font-bold text-stone-800">{totalItems}</p>
            </div>
            <div className={`rounded-xl p-3 border ${lowStockItems > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className="text-xs text-stone-500 mb-1">ใกล้หมด</p>
              <p className={`text-xl font-bold ${lowStockItems > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowStockItems}</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
              <p className="text-xs text-stone-500 mb-1">มูลค่ารวม</p>
              <p className="text-lg font-bold text-sky-700">฿{formatCurrency(totalValue)}</p>
            </div>
          </div>

          {/* ✅ เพิ่มปุ่ม Low Stock Report */}
{lowStockItems > 0 && (
  <Link
    href="/ingredients/low-stock"
    className="flex items-center justify-between p-4 mb-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white hover:from-red-600 hover:to-orange-600 transition-all"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold">วัตถุดิบที่ต้องสั่งซื้อ</p>
        <p className="text-red-100 text-sm">{lowStockItems} รายการใกล้หมด</p>
      </div>
    </div>
    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
      <FileText className="w-5 h-5" />
      <span className="font-medium">ดู & พิมพ์</span>
    </div>
  </Link>
)}

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาวัตถุดิบ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e. target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                  filterStatus !== 'all' ?  'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Filter className="w-5 h-5" />
                <ChevronDown className="w-4 h-4" />
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-stone-200 py-2 min-w-[150px] z-50">
                  <button
                    onClick={() => { setFilterStatus('all'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 ${filterStatus === 'all' ? 'text-stone-800 font-medium' : 'text-stone-600'}`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => { setFilterStatus('low'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2 ${filterStatus === 'low' ? 'text-red-600 font-medium' :  'text-stone-600'}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    ใกล้หมด
                  </button>
                  <button
                    onClick={() => { setFilterStatus('ok'); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2 ${filterStatus === 'ok' ?  'text-emerald-600 font-medium' : 'text-stone-600'}`}
                  >
                    <Check className="w-4 h-4" />
                    ปกติ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredIngredients. length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 mb-1">ไม่พบวัตถุดิบ</p>
            <p className="text-sm text-stone-400">ลองค้นหาใหม่หรือเพิ่มวัตถุดิบใหม่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIngredients. map((item) => {
              const isLowStock = item.current_stock <= item.min_threshold
              const stockValue = item.current_stock * item. cost_per_unit

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border overflow-hidden ${
                    isLowStock ? 'border-red-200' : 'border-stone-200'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-800">{item.name}</h3>
                          {isLowStock && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              ใกล้หมด
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-500">หน่วย:  {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${isLowStock ?  'text-red-600' : 'text-stone-800'}`}>
                          {formatNumber(item.current_stock)}
                        </p>
                        <p className="text-xs text-stone-400">{item.unit}</p>
                      </div>
                    </div>

                    {/* Stock Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-stone-500 mb-1">
                        <span>สต็อก</span>
                        <span>ขั้นต่ำ:  {formatNumber(item.min_threshold)} {item.unit}</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLowStock ? 'bg-red-400' : 'bg-emerald-400'
                          }`}
                          style={{
                            width:  `${Math.min((item.current_stock / Math.max(item. min_threshold * 2, 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div>
                        <span className="text-stone-500">ราคา/หน่วย:  </span>
                        <span className="font-medium text-stone-700">฿{formatCurrency(item.cost_per_unit)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">มูลค่า:  </span>
                        <span className="font-medium text-sky-600">฿{formatCurrency(stockValue)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdjustStock(item)}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1. 5 hover:bg-emerald-100 transition-colors"
                      >
                        <PackagePlus className="w-4 h-4" />
                        ปรับสต็อก
                      </button>
                      <button
                        onClick={() => handleViewHistory(item)}
                        className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                        title="ประวัติ"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditIngredient(item)}
                        className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                        title="แก้ไข"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteIngredient(item)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-stone-800 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{showAddModal ?  'เพิ่มวัตถุดิบใหม่' :  'แก้ไขวัตถุดิบ'}</h2>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ชื่อวัตถุดิบ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น หมูสับ, ผักกาด"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">หน่วย *</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {commonUnits.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setFormData({ ...formData, unit })}
                      className={`px-3 py-1. 5 rounded-lg text-sm font-medium transition-colors ${
                        formData.unit === unit
                          ? 'bg-stone-800 text-white'
                          : 'bg-stone-100 text-stone-600 hover: bg-stone-200'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="หรือพิมพ์หน่วยเอง"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">จำนวนปัจจุบัน</label>
                <input
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus: ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">จำนวนขั้นต่ำ (แจ้งเตือน)</label>
                <input
                  type="number"
                  value={formData.min_threshold}
                  onChange={(e) => setFormData({ ...formData, min_threshold: e.target. value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus: outline-none focus: ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">ราคาต่อหน่วย (บาท)</label>
                <input
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false) }}
                className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover: bg-stone-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={showAddModal ?  handleSaveAdd : handleSaveEdit}
                disabled={saving}
                className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</> : <><Save className="w-5 h-5" /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Stock Adjustment Modal - เพิ่มช่องราคา */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStockModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-emerald-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">ปรับสต็อก</h2>
                  <p className="text-emerald-100 text-sm">{selectedItem.name}</p>
                </div>
                <button onClick={() => setShowStockModal(false)} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Current Stock Info */}
              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <p className="text-sm text-stone-500 mb-1">สต็อกปัจจุบัน</p>
                <p className="text-3xl font-bold text-stone-800">{formatNumber(selectedItem. current_stock)}</p>
                <p className="text-sm text-stone-500">{selectedItem.unit}</p>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ประเภทการปรับ</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockData({ ...stockData, type: 'add', cost:  '' })}
                    className={`py-3 rounded-xl font-medium flex flex-col items-center gap-1 transition-colors border-2 ${
                      stockData.type === 'add'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        :  'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">เพิ่ม</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockData({ ...stockData, type: 'remove', cost: '' })}
                    className={`py-3 rounded-xl font-medium flex flex-col items-center gap-1 transition-colors border-2 ${
                      stockData.type === 'remove'
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    <span className="text-sm">ใช้/ลด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockData({ ...stockData, type: 'adjust', cost: '' })}
                    className={`py-3 rounded-xl font-medium flex flex-col items-center gap-1 transition-colors border-2 ${
                      stockData.type === 'adjust'
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <Minus className="w-5 h-5" />
                    <span className="text-sm">ตั้งค่า</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {stockData.type === 'adjust' ? 'ตั้งค่าเป็น' : 'จำนวน'} ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  value={stockData.amount}
                  onChange={(e) => setStockData({ ...stockData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-stone-100 rounded-xl text-stone-800 text-xl font-semibold text-center placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              {/* ✅ Cost Input - แสดงเฉพาะเมื่อเพิ่มสต็อก */}
              {stockData.type === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      ราคาที่ซื้อมา (บาท)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={stockData. cost}
                    onChange={(e) => setStockData({ ...stockData, cost: e.target. value })}
                    placeholder={`ค่าเริ่มต้น:  ฿${formatCurrency(parseFloat(stockData. amount || '0') * selectedItem.cost_per_unit)}`}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-emerald-50 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-emerald-200"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    * ถ้าไม่กรอก จะใช้ราคาเดิม (฿{formatCurrency(selectedItem.cost_per_unit)}/{selectedItem.unit})
                  </p>
                  
                  {/* แสดงราคาต่อหน่วยใหม่ */}
                  {stockData.amount && stockData.cost && parseFloat(stockData. cost) > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        💡 ราคาเฉลี่ยต่อหน่วยใหม่:  <span className="font-bold">
                          ฿{formatCurrency(
                            (selectedItem.current_stock * selectedItem.cost_per_unit + parseFloat(stockData.cost)) / 
                            (selectedItem.current_stock + parseFloat(stockData. amount))
                          )}
                        </span>/{selectedItem.unit}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {stockData.amount && (
                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-sm text-stone-500 mb-2">ผลลัพธ์</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-lg text-stone-500">{formatNumber(selectedItem.current_stock)}</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-2xl font-bold text-stone-800">
                      {stockData.type === 'add' && formatNumber(selectedItem.current_stock + parseFloat(stockData. amount || '0'))}
                      {stockData.type === 'remove' && formatNumber(Math.max(0, selectedItem.current_stock - parseFloat(stockData.amount || '0')))}
                      {stockData.type === 'adjust' && formatNumber(parseFloat(stockData. amount || '0'))}
                    </span>
                    <span className="text-stone-500">{selectedItem.unit}</span>
                  </div>
                  
                  {/* แสดงมูลค่าที่เพิ่ม */}
                  {stockData.type === 'add' && (
                    <div className="mt-3 pt-3 border-t border-stone-200 text-center">
                      <p className="text-sm text-stone-500">
                        มูลค่าที่เพิ่ม:  <span className="font-bold text-emerald-600">
                          ฿{formatCurrency(
                            parseFloat(stockData. cost) > 0 
                              ? parseFloat(stockData. cost)
                              : parseFloat(stockData. amount || '0') * selectedItem.cost_per_unit
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveStockAdjustment}
                disabled={saving || !stockData.amount}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก... </> : <><Check className="w-5 h-5" /> ยืนยัน</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden max-h-[80vh]">
            <div className="bg-stone-800 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">ประวัติการเปลี่ยนแปลง</h2>
                  <p className="text-stone-300 text-sm">{selectedItem.name}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
                </div>
              ) : inventoryLogs.length === 0 ?  (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">ยังไม่มีประวัติ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventoryLogs. map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        log. change_amount > 0 ?  'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {log.change_amount > 0 ? <TrendingUp className="w-5 h-5" /> :  <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-800">{log.change_type}</p>
                        <p className="text-xs text-stone-500">{formatDate(log.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${log.change_amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {log. change_amount > 0 ? '+' : ''}{formatNumber(log.change_amount)}
                        </p>
                        <p className="text-xs text-stone-500">฿{formatCurrency(log.cost_total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors"
              >
                ปิด
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
              <p className="text-stone-500 text-sm mb-1">คุณต้องการลบวัตถุดิบ</p>
              <p className="font-semibold text-stone-800 mb-4">"{selectedItem.name}"</p>
              <p className="text-xs text-red-400 mb-6">การดำเนินการนี้จะลบประวัติทั้งหมดด้วย</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-colors">
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={saving}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังลบ...</> :  <><Trash2 className="w-5 h-5" /> ลบ</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickMenu currentPage="ingredients" />
    </main>
  )
}