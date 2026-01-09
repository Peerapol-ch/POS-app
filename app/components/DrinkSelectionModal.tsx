'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { X, Search, Plus, Minus, Coffee, Loader, CheckCircle2, ShoppingBag } from 'lucide-react'

interface MenuItem {
  id: number
  name: string
  price: number
  image_url?: string
}

interface DrinkSelectionModalProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function DrinkSelectionModal({ orderId, onClose, onSuccess }: DrinkSelectionModalProps) {
  const [drinks, setDrinks] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // State สำหรับการเลือกและยืนยัน
  const [selectedDrink, setSelectedDrink] = useState<MenuItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchDrinks = async () => {
      try {
        setLoading(true)
        // category_id 16 = เครื่องดื่ม
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, name, price, image_url')
          .eq('category_id', 16) 
          .eq('is_available', true)
          .order('name')

        if (error) throw error
        setDrinks(data || [])
      } catch (err) {
        console.error('Error fetching drinks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDrinks()
  }, [])

  // เมื่อเลือกเครื่องดื่ม ให้ตั้งค่าเริ่มต้น
  const handleSelectDrink = (drink: MenuItem) => {
    if (selectedDrink?.id === drink.id) {
        // ถ้ากดตัวเดิม ให้ยกเลิกการเลือก
        setSelectedDrink(null)
        setQuantity(1)
    } else {
        setSelectedDrink(drink)
        setQuantity(1)
    }
  }

  const handleAdjustQuantity = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta))
  }

  const handleConfirmAdd = async () => {
    if (!selectedDrink) return

    try {
      setIsSubmitting(true)
      
      const { error } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          menu_item_id: selectedDrink.id,
          quantity: quantity,
          price: selectedDrink.price,
          status: 'completed', // ใช้สถานะ served/completed ตามที่ตกลง
          notes: 'เพิ่มจากหน้าเช็คบิล'
        })

      if (error) throw error

      onSuccess() // แจ้ง Parent เพื่อรีโหลดข้อมูล
      
      // Reset selection
      setSelectedDrink(null)
      setQuantity(1)
      
    } catch (err: any) {
      console.error('Error adding drink:', err)
      alert(`ไม่สามารถเพิ่มรายการได้: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredDrinks = drinks.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    // Wrapper: Mobile = items-end (bottom sheet style), Desktop = items-center
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in zoom-in duration-200">
      
      {/* Container: Mobile = h-[92vh] rounded-t-3xl, Desktop = h-[85vh] rounded-3xl */}
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] md:h-[85vh] relative transition-all">
        
        {/* === Header === */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 md:p-5 flex justify-between items-center text-white shadow-md z-10 shrink-0">
          <div>
            <h3 className="font-black text-lg md:text-xl flex items-center gap-2">
                <Coffee className="w-5 h-5 md:w-6 md:h-6" /> เพิ่มเครื่องดื่ม
            </h3>
            <p className="text-blue-100 text-xs mt-1">เลือกรายการและระบุจำนวน</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* === Search === */}
        <div className="p-3 md:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อเมนู..." 
              className="w-full pl-10 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm md:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // autoFocus // ปิด autoFocus บนมือถือเพื่อไม่ให้ keyboard เด้งปิดบังหน้าจอทันที
            />
          </div>
        </div>

        {/* === Grid List === */}
        {/* pb-40 เผื่อพื้นที่ให้ Bottom Bar บนมือถือที่มี Safe Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-50 pb-44 md:pb-32"> 
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-slate-400 text-sm">กำลังโหลดเมนู...</span>
            </div>
          ) : filteredDrinks.length === 0 ? (
            <div className="text-center p-8 text-slate-400 flex flex-col items-center gap-2">
                <Coffee className="w-12 h-12 opacity-20" />
                <span>ไม่พบรายการเครื่องดื่ม</span>
            </div>
          ) : (
            // Grid: Mobile = 2 cols, Desktop = 3 cols
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {filteredDrinks.map(drink => {
                const isSelected = selectedDrink?.id === drink.id
                return (
                    <button
                        key={drink.id}
                        onClick={() => handleSelectDrink(drink)}
                        className={`relative flex flex-col items-center p-2 md:p-3 rounded-xl md:rounded-2xl border-2 transition-all duration-200 shadow-sm overflow-hidden group
                            ${isSelected 
                                ? 'border-blue-500 bg-blue-50 shadow-blue-100 ring-2 ring-blue-200 ring-offset-2 scale-[1.02] z-10' 
                                : 'border-white bg-white hover:border-blue-200 hover:shadow-md'
                            }
                        `}
                    >
                        {/* Checkmark Badge */}
                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md z-10 animate-in zoom-in duration-200">
                                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                            </div>
                        )}

                        {/* Image */}
                        <div className="w-full aspect-square bg-slate-100 rounded-lg md:rounded-xl mb-2 md:mb-3 overflow-hidden flex items-center justify-center text-4xl shadow-inner relative">
                            {drink.image_url ? (
                                <img src={drink.image_url} alt={drink.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <Coffee className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
                            )}
                        </div>

                        {/* Text */}
                        <div className="text-center w-full">
                            <div className={`font-bold text-xs md:text-sm truncate w-full mb-0.5 md:mb-1 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                {drink.name}
                            </div>
                            <div className="text-xs md:text-sm font-semibold text-slate-500">
                                ฿{drink.price.toLocaleString()}
                            </div>
                        </div>
                    </button>
                )
              })}
            </div>
          )}
        </div>

        {/* === Bottom Confirmation Bar === */}
        {/* Slide-up panel */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 md:p-5 z-20 transition-transform duration-300 ease-out rounded-t-3xl
            ${selectedDrink ? 'translate-y-0' : 'translate-y-full'}
        `}>
            {selectedDrink && (
                <div className="flex flex-col gap-4 md:gap-5 pb-safe"> {/* pb-safe for iPhone X+ home indicator */}
                    {/* Info & Quantity Row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-800 text-base md:text-lg">{selectedDrink.name}</div>
                            <div className="text-slate-500 text-xs md:text-sm">หน่วยละ ฿{selectedDrink.price.toLocaleString()}</div>
                        </div>
                        
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 md:gap-3 bg-slate-100 rounded-xl p-1 md:p-1.5 shadow-inner">
                            <button 
                                onClick={() => handleAdjustQuantity(-1)}
                                className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all border border-slate-200"
                            >
                                <Minus className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <span className="w-6 md:w-8 text-center font-bold text-lg md:text-xl text-slate-800">{quantity}</span>
                            <button 
                                onClick={() => handleAdjustQuantity(1)}
                                className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:text-green-500 hover:bg-green-50 active:scale-95 transition-all border border-slate-200"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button 
                        onClick={handleConfirmAdd}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-none disabled:text-slate-500"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" /> 
                                เพิ่ม - ฿{(selectedDrink.price * quantity).toLocaleString()}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}