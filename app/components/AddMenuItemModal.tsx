'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  ShoppingBasket, 
  UtensilsCrossed, 
  Loader2,
  CheckCircle2,
  ImageOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

interface AddMenuItemModalProps {
  orderId: number | string // รับได้ทั้ง ID ตัวเลข หรือ UUID
  onClose: () => void
  onSuccess: () => void
}

interface CategoryData {
  id: number
  name: string
  display_order: number
}

interface MenuItem {
  id: number
  name: string
  price: number
  category_id: number | null
  image_url?: string | null
  is_available: boolean
  categories?: { name: string } | null
  category_name?: string 
}

interface SelectedItem extends MenuItem {
  quantity: number
}

// --- Skeleton Component (โหลดหลอกๆ กันกระตุก) ---
const MenuItemSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col h-full animate-pulse">
    <div className="aspect-[4/3] bg-slate-200" />
    <div className="p-3 flex flex-col gap-2 flex-1">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="mt-auto pt-2 flex justify-between">
        <div className="h-8 w-8 bg-slate-200 rounded-full" />
        <div className="h-8 w-8 bg-slate-200 rounded-full" />
      </div>
    </div>
  </div>
)

export default function AddMenuItemModal({ orderId, onClose, onSuccess }: AddMenuItemModalProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categoriesList, setCategoriesList] = useState<CategoryData[]>([])
  
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')

  const [isMobileBasketOpen, setIsMobileBasketOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // --- Optimized Data Fetching (โหลดเร็วขึ้น) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // ใช้ Promise.all ดึงข้อมูลพร้อมกัน 2 ทาง (ลดเวลารอ 50%)
        const [categoriesResult, menuResult] = await Promise.all([
          // 1. ดึงหมวดหมู่ (ซ่อน ID 16)
          supabase
            .from('categories')
            .select('id, name, display_order')
            .neq('id', 16) 
            .order('display_order', { ascending: true }),

          // 2. ดึงเมนู (ซ่อน ID 16)
          supabase
            .from('menu_items')
            .select('id, name, price, category_id, image_url, is_available, categories(name)')
            .eq('is_available', true)
            .neq('category_id', 16)
            .order('name', { ascending: true })
        ])

        if (categoriesResult.error) throw categoriesResult.error
        if (menuResult.error) throw menuResult.error
        
        setCategoriesList(categoriesResult.data || [])

        const mappedMenu: MenuItem[] = (menuResult.data || []).map((item: any) => ({
          ...item,
          category_name: item.categories?.name || 'อื่นๆ'
        }))

        setMenuItems(mappedMenu)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // กรองข้อมูล (Memoized เพื่อความลื่นไหล)
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategoryId === 'all' || item.category_id === selectedCategoryId
      return matchesSearch && matchesCategory
    })
  }, [menuItems, searchQuery, selectedCategoryId])

  // Scroll to top เมื่อเปลี่ยนหมวด
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [selectedCategoryId, searchQuery])

  const handleUpdateQuantity = (item: MenuItem, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (!existing && delta > 0) return [...prev, { ...item, quantity: 1 }]
      if (existing) {
        const newQty = existing.quantity + delta
        if (newQty <= 0) return prev.filter(i => i.id !== item.id)
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i)
      }
      return prev
    })
  }

  const getQuantity = (itemId: number) => selectedItems.find(i => i.id === itemId)?.quantity || 0

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return
    setSubmitting(true)
    
    try {
      const itemsToInsert = selectedItems.map(item => ({
        order_id: orderId, // ใช้ ID ที่ส่งมาจาก CheckoutModal (ต้องเป็น UUID ที่ถูกต้อง)
        menu_item_id: item.id, 
        quantity: item.quantity, 
        price: item.price, 
        notes: '' 
      }))

      // Debug: เช็คว่าส่ง ID อะไรไป
      console.log('Submitting Order ID:', orderId);

      const { error } = await supabase.from('order_items').insert(itemsToInsert)
      if (error) throw error
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || 'กรุณาตรวจสอบ Console'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center animate-in fade-in duration-200">
      
      <div className="bg-slate-50 w-full max-w-6xl h-[100dvh] md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-white px-4 py-3 md:p-5 border-b border-slate-200 flex gap-3 items-center justify-between shrink-0 z-20">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 md:w-7 md:h-7 text-lime-600" />
              เพิ่มรายการ
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-full transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
          
          {/* Left: Menu */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Search & Tabs */}
            <div className="bg-white border-b border-slate-200 z-10 shrink-0 shadow-sm">
              <div className="p-3 md:p-4 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="ค้นหาเมนู..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white border focus:border-lime-500 rounded-lg outline-none text-sm transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto p-3 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                    selectedCategoryId === 'all'
                      ? 'bg-lime-600 text-white border-lime-600 shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-lime-400'
                  }`}
                >
                  ทั้งหมด
                </button>
                
                {/* ถ้ากำลังโหลดให้แสดง Skeleton ของปุ่ม */}
                {loading && categoriesList.length === 0 
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-3 py-1.5 w-20 h-8 bg-slate-200 rounded-full animate-pulse shrink-0" />
                    ))
                  : categoriesList.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                          selectedCategoryId === cat.id
                            ? 'bg-lime-600 text-white border-lime-600 shadow-md' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-lime-400'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))
                }
              </div>
            </div>

            {/* Grid */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-5 bg-slate-100 scroll-smooth overscroll-contain pb-[140px] md:pb-5"
            >
              {loading ? (
                // --- Skeleton Grid (แก้กระตุกตอนโหลด) ---
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <MenuItemSkeleton key={i} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-60 text-slate-400 gap-2 opacity-70">
                  <Search className="w-12 h-12" />
                  <p className="font-medium">ไม่พบรายการอาหาร</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredItems.map(item => {
                    const qty = getQuantity(item.id)
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleUpdateQuantity(item, 1)}
                        className={`
                          bg-white rounded-xl border shadow-sm overflow-hidden cursor-pointer relative group flex flex-col transition-all active:scale-[0.98]
                          ${qty > 0 ? 'border-lime-500 ring-1 ring-lime-500' : 'border-slate-200 hover:border-lime-300 hover:shadow-md'}
                        `}
                      >
                        <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
                           {item.image_url ? (
                             <img 
                                src={item.image_url} 
                                alt={item.name} 
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                             />
                           ) : null}
                           <div className={`w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 ${item.image_url ? 'hidden' : ''}`}>
                             <ImageOff className="w-8 h-8 opacity-40" />
                           </div>
                           
                           {qty > 0 && (
                             <div className="absolute top-2 right-2 bg-lime-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-in zoom-in">
                               x{qty}
                             </div>
                           )}
                        </div>
                        
                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="font-bold text-slate-700 text-sm md:text-base line-clamp-1 mb-1">{item.name}</h3>
                          <p className="text-lime-600 font-bold text-sm">฿{item.price.toLocaleString()}</p>
                          
                          <div className={`mt-auto pt-3 flex items-center justify-between gap-2 ${qty === 0 ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'} transition-all duration-300`}>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item, -1); }} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-600 hover:text-red-500 hover:border-red-400">
                                <Minus className="w-3 h-3"/>
                              </button>
                              <span className="font-bold text-black w-4 text-center text-sm">{qty}</span>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item, 1); }} className="w-7 h-7 flex items-center justify-center bg-lime-500 text-white rounded hover:bg-lime-600">
                                <Plus className="w-3 h-3"/>
                              </button>
                          </div>
                          {qty === 0 && (
                             <div className="mt-auto pt-2 text-center text-xs text-slate-400 group-hover:text-lime-600 transition-colors">แตะเพื่อเพิ่ม</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Basket */}
          <div className={`
             bg-white border-t md:border-t-0 md:border-l border-slate-200 
             md:w-[320px] shrink-0 z-30
             fixed bottom-0 left-0 right-0 md:static
             flex flex-col transition-all duration-300 ease-in-out
             shadow-[0_-5px_20px_rgba(0,0,0,0.1)] md:shadow-none
             ${isMobileBasketOpen ? 'h-[80vh]' : 'h-auto'} 
             md:h-auto
          `}>
            
            <div 
              className="md:hidden flex items-center justify-center pt-2 pb-1 cursor-pointer bg-white rounded-t-2xl"
              onClick={() => setIsMobileBasketOpen(!isMobileBasketOpen)}
            >
               <div className="w-10 h-1 bg-slate-300 rounded-full mb-1"></div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 hidden md:flex items-center gap-2 font-bold text-slate-700">
              <ShoppingBasket className="w-5 h-5 text-lime-600" />
              รายการที่เลือก ({totalItems})
            </div>

            <div className={`flex-1 overflow-y-auto p-4 bg-slate-50/50 ${!isMobileBasketOpen ? 'hidden md:block' : 'block'}`}>
              {selectedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 gap-2">
                  <ShoppingBasket className="w-10 h-10" />
                  <p className="text-sm">ยังไม่มีรายการ</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex flex-col bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-700 text-sm truncate">{item.name}</div>
                          <div className="text-slate-400 text-xs">฿{item.price} / หน่วย</div>
                        </div>
                        <div className="font-bold text-slate-700 text-sm">฿{(item.price * item.quantity).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 rounded p-1">
                         <button onClick={() => handleUpdateQuantity(item, -1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded text-slate-500 hover:text-red-500"><Minus className="w-3 h-3"/></button>
                         {/* เลขจำนวนสีดำ */}
                         <span className="font-bold text-black text-sm w-8 text-center">{item.quantity}</span>
                         <button onClick={() => handleUpdateQuantity(item, 1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded text-slate-500 hover:text-lime-600"><Plus className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 pb-safe">
               <div className="flex justify-between items-center mb-3">
                 <div 
                   className="flex items-center gap-2 md:hidden"
                   onClick={() => setIsMobileBasketOpen(!isMobileBasketOpen)}
                 >
                    <div className="bg-lime-100 text-lime-700 p-2 rounded-lg relative">
                      <ShoppingBasket className="w-5 h-5" />
                      {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white">{totalItems}</span>}
                    </div>
                    <div>
                       <div className="text-xs text-slate-500">รวมทั้งหมด</div>
                       <div className="font-bold text-lime-700 text-lg leading-none">฿{totalAmount.toLocaleString()}</div>
                    </div>
                    {isMobileBasketOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                 </div>

                 <div className="hidden md:flex justify-between w-full items-end">
                    <div className="text-slate-500 text-sm">ยอดรวม</div>
                    <div className="text-2xl font-black text-lime-600">฿{totalAmount.toLocaleString()}</div>
                 </div>
               </div>
               
               <button
                 onClick={handleSubmit}
                 disabled={submitting || selectedItems.length === 0}
                 className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                   selectedItems.length > 0
                    ? 'bg-gradient-to-r from-lime-500 to-emerald-600 text-white hover:shadow-lime-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                 }`}
               >
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                 <span className="hidden md:inline">ยืนยันเพิ่มรายการ</span>
                 <span className="md:hidden">ยืนยัน</span>
               </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}