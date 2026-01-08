'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { 
  X, 
  Receipt, 
  Loader, 
  Calendar, 
  CheckCircle2,
  Banknote,
  QrCode,
  ShoppingBag,
  Plus,
  Coffee
} from 'lucide-react'
import DrinkSelectionModal from './DrinkSelectionModal'
import ReceiptModal from './ReceiptModal'

interface TakeawayCheckoutModalProps {
  dbId: number;      // ✅ เพิ่ม database id
  orderId: string;
  onClose: () => void;
  onSuccess?:  () => void;
}

interface OrderItem {
  id: number
  quantity: number
  price: number
  menu_items?:  {
    name: string
  }
}

interface OrderData {
  id: number
  order_id: string
  total_amount: number
  customer_count: number
  created_at: string
  status:  string
  table_id: number
  items: OrderItem[]
}

type PaymentMethod = 'cash' | 'promptpay' | null

export default function TakeawayCheckoutModal({ dbId, orderId, onClose, onSuccess }: TakeawayCheckoutModalProps) {
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const isPaymentStarted = useRef(false)
  
  const [showDrinkModal, setShowDrinkModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  
  const [receiptData, setReceiptData] = useState<{
    order_id: string
    created_at: string
    customer_count: number
    payment_status: string
    total_amount: number
    items:  OrderItem[]
    table_number: string | number
  } | null>(null)

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // ✅ ใช้ dbId (ตัวเลข) แทน order_id (string)
      console.log('Fetching order by DB ID:', dbId)

      const { data, error:  fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            menu_items (name)
          )
        `)
        .eq('id', dbId)  // ✅ ใช้ id ตัวเลข
        .single()

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        throw new Error(fetchError.message || 'ไม่สามารถดึงข้อมูลได้')
      }

      console.log('Fetched order:', data)

      if (data) {
        if (data.status === 'completed') {
          setError('รายการนี้ได้ชำระเงินแล้ว')
          return
        }

        if (data.status === 'cancelled') {
          setError('รายการนี้ถูกยกเลิกแล้ว')
          return
        }

        const items = data.order_items || []
        const calculatedTotal = items.reduce((sum:  number, item: any) => sum + (item.price * item. quantity), 0)

        setOrder({
          id:  data.id,
          order_id: data.order_id,
          total_amount: calculatedTotal,
          customer_count:  data.customer_count || 1,
          created_at: data.created_at,
          status: data.status,
          table_id: data.table_id,
          items: items
        })
      } else {
        setError('ไม่พบรายการนี้')
      }
    } catch (err:  any) {
      console.error('Error fetching order:', err)
      setError(err?. message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }, [dbId])  // ✅ dependency เป็น dbId

  useEffect(() => {
    if (dbId) {
      fetchOrderDetails()
    }
  }, [dbId, fetchOrderDetails])

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handlePayment = async () => {
    if (!order || !paymentMethod) return
    if (isProcessing) return
    if (isPaymentStarted.current) {
      console.log('Payment already started, ignoring.. .')
      return
    }

    isPaymentStarted.current = true
    setIsProcessing(true)
    
    try {
      const totalAmount = calculateTotal(order.items)
      const now = new Date().toISOString()

      console.log('========================================')
      console.log('=== Processing Takeaway Payment ===')
      console.log('Order DB ID:', order.id)
      console.log('Order ID:', order.order_id)
      console.log('Total:', totalAmount)
      console.log('Payment Method:', paymentMethod)
      console.log('========================================')

      // ✅ ใช้ order. id (database id) ในการ update
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: paymentMethod,
          status: 'completed',
          total_amount: totalAmount,
          updated_at: now
        })
        .eq('id', order.id)  // ✅ ใช้ id ตัวเลข

      if (orderError) {
        console.error('Order update error:', orderError)
        throw new Error('ไม่สามารถอัพเดทออเดอร์ได้:  ' + orderError.message)
      }

      console.log('✅ Order updated successfully!')

      // Close Session
      await supabase
        .from('table_sessions')
        .update({ status: 'completed' })
        .eq('table_id', 9)
        .eq('status', 'active')

      // เก็บข้อมูลสำหรับใบเสร็จ
      setReceiptData({
        order_id: order.order_id,
        created_at: now,
        customer_count: order.customer_count,
        payment_status: paymentMethod,
        total_amount: totalAmount,
        items: order.items,
        table_number: 'กลับบ้าน'
      })

      setShowReceipt(true)

    } catch (err:  any) {
      console.error('Payment Error:', err)
      alert('เกิดข้อผิดพลาดในการชำระเงิน:  ' + (err?. message || JSON.stringify(err)))
      isPaymentStarted.current = false
    } finally {
      setIsProcessing(false)
    }
  }

  // แสดงใบเสร็จ
  if (showReceipt && receiptData) {
    return (
      <ReceiptModal 
        data={receiptData}
        onClose={() => {
          if (onSuccess) onSuccess()
          onClose()
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
        
        {/* Left Column */}
        <div className="flex-1 flex flex-col bg-purple-50/30 border-r border-purple-100 relative">
          <div className="p-6 bg-white border-b border-purple-100 flex justify-between items-center shadow-sm z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
                รายการสั่งกลับบ้าน
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                🏠 Takeaway
                {order && <span className="ml-2 text-purple-600 font-mono font-bold">({order.order_id})</span>}
              </p>
            </div>
            
            {order && ! isProcessing && (
              <button 
                onClick={() => setShowDrinkModal(true)}
                className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <Coffee className="w-4 h-4" />
                เพิ่มน้ำ
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ?  (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-slate-400 font-medium">กำลังดึงข้อมูล... </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">ไม่พบข้อมูล</h3>
                <p className="text-slate-500">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-slate-100 rounded-lg font-medium hover:bg-slate-200"
                >
                  ปิด
                </button>
              </div>
            ) : order ? (
              <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-700 text-sm uppercase tracking-wider border-b border-purple-100">
                      <th className="p-4 font-semibold">รายการเมนู</th>
                      <th className="p-4 font-semibold text-center w-24">จำนวน</th>
                      <th className="p-4 font-semibold text-right w-32">ราคา/หน่วย</th>
                      <th className="p-4 font-semibold text-right w-32 bg-purple-100/50">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {order.items. length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          ไม่มีรายการอาหาร
                        </td>
                      </tr>
                    ) : (
                      order.items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-purple-50/50 transition-colors">
                          <td className="p-4 font-medium text-slate-700">
                            {item.menu_items?.name || 'ไม่ระบุชื่อ'}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-sm font-bold">
                              x{item.quantity}
                            </span>
                          </td>
                          <td className="p-4 text-right text-slate-500 font-mono">
                            {item.price.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-800 font-mono bg-purple-50/50">
                            {(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-purple-50 border-t border-purple-100">
                    <tr>
                      <td colSpan={3} className="p-4 text-right font-bold text-purple-700">รวมจำนวนรายการ</td>
                      <td className="p-4 text-right font-bold text-purple-800">
                        {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-[400px] bg-white flex flex-col h-full shadow-l-xl z-20">
          <div className="md:hidden p-4 border-b flex justify-end">
            <button onClick={onClose} disabled={isProcessing} className="p-2 bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
            <div className="hidden md:flex justify-end mb-2">
              <button 
                onClick={onClose} 
                disabled={isProcessing}
                className="group p-2 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium disabled:opacity-50"
              >
                ยกเลิก / ปิดหน้าต่าง <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {order && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> วันที่
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {new Date(order.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">ประเภท</div>
                  <div className="text-sm font-semibold text-purple-700">🏠 กลับบ้าน</div>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Receipt className="w-3 h-3" /> Order ID
                  </div>
                  <div className="font-mono font-bold text-purple-600 tracking-wider">
                    {order.order_id}
                  </div>
                </div>
              </div>
            )}

            {/* ยอดรวม */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200 text-center space-y-2">
              <div className="text-purple-700 font-semibold text-sm uppercase tracking-widest">ยอดสุทธิที่ต้องชำระ</div>
              <div className="text-5xl font-black text-purple-600 font-mono tracking-tighter">
                {order ?  calculateTotal(order.items).toLocaleString() : '0'}
                <span className="text-lg text-purple-500 font-bold ml-2">THB</span>
              </div>
            </div>

            {/* เลือกวิธีชำระเงิน */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                เลือกวิธีการชำระเงิน
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => !isProcessing && setPaymentMethod('cash')}
                  disabled={isProcessing}
                  className={`relative p-4 rounded-xl border-2 flex items-center gap-4 transition-all group ${
                    paymentMethod === 'cash' 
                      ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200 ring-offset-2' 
                      : 'border-slate-100 bg-white hover:border-green-300 hover:bg-green-50/50'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-3 rounded-full ${paymentMethod === 'cash' ?  'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-green-100 group-hover:text-green-600'}`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${paymentMethod === 'cash' ? 'text-green-800' : 'text-slate-700'}`}>เงินสด (Cash)</div>
                    <div className="text-xs text-slate-400">ชำระด้วยธนบัตรหรือเหรียญ</div>
                  </div>
                  {paymentMethod === 'cash' && <CheckCircle2 className="absolute right-4 w-6 h-6 text-green-500" />}
                </button>
                
                <button
                  onClick={() => !isProcessing && setPaymentMethod('promptpay')}
                  disabled={isProcessing}
                  className={`relative p-4 rounded-xl border-2 flex items-center gap-4 transition-all group ${
                    paymentMethod === 'promptpay' 
                      ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200 ring-offset-2' 
                      : 'border-slate-100 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-3 rounded-full ${paymentMethod === 'promptpay' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${paymentMethod === 'promptpay' ? 'text-blue-800' : 'text-slate-700'}`}>พร้อมเพย์ (PromptPay)</div>
                    <div className="text-xs text-slate-400">สแกน QR Code เพื่อชำระเงิน</div>
                  </div>
                  {paymentMethod === 'promptpay' && <CheckCircle2 className="absolute right-4 w-6 h-6 text-blue-500" />}
                </button>
              </div>
            </div>
          </div>

          {/* ปุ่มยืนยัน */}
          <div className="p-6 bg-white border-t border-slate-100 mt-auto">
            <button 
              onClick={handlePayment}
              disabled={loading || !!error || ! paymentMethod || isProcessing || !order}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 text-lg
                ${loading || !!error || !paymentMethod || isProcessing || !order
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover: shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  ยืนยันการชำระเงิน
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showDrinkModal && order && (
        <DrinkSelectionModal 
          orderId={order.order_id} 
          onClose={() => setShowDrinkModal(false)}
          onSuccess={() => {
            fetchOrderDetails() 
          }}
        />
      )}
    </div>
  )
}