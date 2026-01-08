'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { 
  X, 
  Receipt, 
  Loader, 
  Calendar, 
  User, 
  CheckCircle2,
  Banknote,
  QrCode,
  Plus,
  Coffee,
  Camera,
  Upload,
  Image as ImageIcon,
  Star,
  UserCheck,
  Trash2,
  Video,
  Circle,
  Gift,
  Sparkles,
} from 'lucide-react'
import DrinkSelectionModal from './DrinkSelectionModal'
import ReceiptModal from './ReceiptModal'

interface CheckoutModalProps {
  tableId: number;
  tableName: string | number;
  onClose: () => void;
  onSuccess?  :    () => void;
}

interface OrderItem {
  id: number
  quantity: number
  price: number
  menu_items?  :   {
    name: string
  }
}

interface CustomerInfo {
  id: string
  username: string | null
  points: number
  avatar_url:   string | null
}

interface OrderData {
  id: number
  order_id: string
  total_amount: number
  customer_count: number
  created_at: string
  customer_id: string | null
  items:   OrderItem[]
  customer? :  CustomerInfo | null
}

type PaymentMethod = 'cash' | 'promptpay' | null

export default function CheckoutModal({ tableId, tableName, onClose, onSuccess }: CheckoutModalProps) {
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [showDrinkModal, setShowDrinkModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  
  // สลิป
  const [slipImage, setSlipImage] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  
  // Camera Modal States
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ✅ เพิ่ม state สำหรับคะแนนที่ได้รับ
  const [earnedPoints, setEarnedPoints] = useState(0)
  
  const [receiptData, setReceiptData] = useState<{
    order_id: string
    created_at: string
    customer_count: number
    payment_status: string
    total_amount: number
    items: OrderItem[]
    table_number: string | number
    earned_points?:  number  // ✅ เพิ่มคะแนนที่ได้รับ
    new_total_points?: number  // ✅ เพิ่มคะแนนรวมใหม่
  } | null>(null)

  // ✅ ตรวจสอบว่าเป็น Mobile หรือไม่
  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // ✅ คำนวณคะแนนที่จะได้รับ (100 บาท = 1 คะแนน)
  const calculatePoints = (amount: number): number => {
    return Math.floor(amount / 100)
  }

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        . from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            menu_items (
              name
            )
          )
        `)
        .eq('table_id', tableId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const items = data.order_items || []
        const calculatedTotal = items.reduce((sum:  number, item: any) => sum + (item.price * item.quantity), 0)

        let customerInfo: CustomerInfo | null = null
        if (data.customer_id) {
          const { data: customerData } = await supabase
            .from('profiles')
            .select('id, username, points, avatar_url')
            .eq('id', data.customer_id)
            .single()
          
          if (customerData) {
            customerInfo = customerData
          }
        }

        const formattedData: OrderData = {
          id: data.id,
          order_id: data.order_id,
          total_amount: calculatedTotal,
          customer_count: data.customer_count,
          created_at: data. created_at,
          customer_id:  data.customer_id,
          items:  items,
          customer: customerInfo
        }
        setOrder(formattedData)

        // ✅ คำนวณคะแนนที่จะได้รับ
        if (data.customer_id) {
          const points = calculatePoints(calculatedTotal)
          setEarnedPoints(points)
        }
      } else {
        setError('ไม่พบรายการอาหารสำหรับโต๊ะนี้')
      }
    } catch (err:  any) {
      console.error('Error fetching order:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }, [tableId])

  useEffect(() => {
    if (tableId) {
      fetchOrderDetails()
    }
  }, [tableId, fetchOrderDetails])

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream. getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  // จัดการเลือกรูปสลิป
  const handleSlipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)')
        return
      }
      
      setSlipImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSlipPreview(reader. result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // เปิดกล้อง - ใช้ Web Camera API สำหรับ PC
  const handleOpenCamera = async () => {
    if (isMobile()) {
      if (cameraInputRef. current) {
        cameraInputRef. current.click()
      }
      return
    }

    setCameraError(null)
    setShowCameraModal(true)

    try {
      const stream = await navigator.mediaDevices. getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setCameraStream(stream)
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (err:  any) {
      console.error('Camera error:', err)
      setCameraError('ไม่สามารถเปิดกล้องได้:  ' + (err.message || 'กรุณาอนุญาตการใช้กล้อง'))
    }
  }

  // ถ่ายรูปจากกล้อง
  const handleCapturePhoto = () => {
    if (! videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video. videoWidth
    canvas.height = video. videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas. height)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `slip_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSlipImage(file)
        setSlipPreview(canvas.toDataURL('image/jpeg', 0.9))
        handleCloseCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  // ปิดกล้อง
  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
    setCameraError(null)
  }

  // เปิด Gallery
  const handleOpenGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // ลบรูปสลิป
  const handleRemoveSlip = () => {
    setSlipImage(null)
    setSlipPreview(null)
    if (fileInputRef.current) fileInputRef.current. value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  // อัพโหลดสลิปไป Supabase Storage
  const uploadSlipImage = async (): Promise<string | null> => {
    if (!slipImage || !order) return null
    
    setUploadingSlip(true)
    try {
      const fileExt = slipImage. name.split('.').pop() || 'jpg'
      const fileName = `${order.order_id}_${Date.now()}.${fileExt}`
      const filePath = `slips/${fileName}`

      const { error:  uploadError } = await supabase.storage
        .from('Money_transfer_slip_image')
        .upload(filePath, slipImage)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('Money_transfer_slip_image')
        .getPublicUrl(filePath)

      return urlData. publicUrl
    } catch (err: any) {
      console. error('Error uploading slip:', err)
      throw err
    } finally {
      setUploadingSlip(false)
    }
  }

  // ✅ อัพเดทคะแนนสมาชิก
  const updateCustomerPoints = async (customerId: string, pointsToAdd: number): Promise<number> => {
    try {
      // ดึงคะแนนปัจจุบัน
      const { data: currentData, error:  fetchError } = await supabase
        . from('profiles')
        .select('points')
        .eq('id', customerId)
        .single()

      if (fetchError) throw fetchError

      const currentPoints = currentData?. points || 0
      const newTotalPoints = currentPoints + pointsToAdd

      // อัพเดทคะแนน
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          points: newTotalPoints,
          updated_at:  new Date().toISOString()
        })
        .eq('id', customerId)

      if (updateError) throw updateError

      console.log(`Updated points for customer ${customerId}: ${currentPoints} + ${pointsToAdd} = ${newTotalPoints}`)
      return newTotalPoints
    } catch (err: any) {
      console. error('Error updating customer points:', err)
      throw err
    }
  }

  const handlePayment = async () => {
    if (!order || !paymentMethod) return

    if (paymentMethod === 'promptpay' && !slipImage) {
      alert('กรุณาถ่ายรูปหรืออัพโหลดสลิปการโอนเงิน')
      return
    }

    setIsProcessing(true)
    
    try {
      const totalAmount = calculateTotal(order.items)
      const now = new Date().toISOString()

      let slipUrl: string | null = null
      if (paymentMethod === 'promptpay' && slipImage) {
        slipUrl = await uploadSlipImage()
        if (!slipUrl) {
          throw new Error('ไม่สามารถอัพโหลดสลิปได้')
        }
      }

      const updateData:  any = {
        payment_status: paymentMethod,
        status: 'completed',
        total_amount: totalAmount,
        updated_at: now
      }
      
      if (slipUrl) {
        updateData. slip_url = slipUrl
      }

      const { error: orderError } = await supabase
        . from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (orderError) throw orderError

      const { error: tableError } = await supabase
        . from('tables')
        .update({ current_status: 'vacant' })
        .eq('id', tableId)

      if (tableError) throw tableError

      await supabase
        .from('table_sessions')
        .update({ status: 'completed' })
        .eq('table_id', tableId)
        .eq('status', 'active')

      // ✅ เพิ่มคะแนนให้สมาชิก (ถ้ามี customer_id)
      let newTotalPoints = 0
      const pointsEarned = calculatePoints(totalAmount)
      
      if (order. customer_id && pointsEarned > 0) {
        try {
          newTotalPoints = await updateCustomerPoints(order.customer_id, pointsEarned)
          console.log(`Customer earned ${pointsEarned} points.  New total: ${newTotalPoints}`)
        } catch (pointsError) {
          console.error('Failed to update points, but payment succeeded:', pointsError)
        }
      }

      const receiptInfo = {
        order_id: order. order_id,
        created_at: now,
        customer_count: order.customer_count,
        payment_status: paymentMethod,
        total_amount: totalAmount,
        items:  order.items,
        table_number:  tableName,
        earned_points: order.customer_id ? pointsEarned : undefined,
        new_total_points:  order.customer_id ?  newTotalPoints :  undefined,
      }
      
      setReceiptData(receiptInfo)
      setShowReceipt(true)
      setIsProcessing(false)

    } catch (err:  any) {
      console.error('Payment Error:', err)
      alert('เกิดข้อผิดพลาดในการชำระเงิน:  ' + (err. message || JSON.stringify(err)))
      setIsProcessing(false)
    }
  }

  const canConfirmPayment = () => {
    if (!paymentMethod) return false
    if (paymentMethod === 'promptpay' && !slipImage) return false
    return true
  }

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
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
          
          {/* Left Column */}
          <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 relative">
            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-lime-600" />
                  ใบรายการอาหาร
                </h2>
                <p className="text-slate-500 text-sm mt-1">ตรวจสอบรายการก่อนชำระเงิน</p>
              </div>
              
              {order && (
                <button 
                  onClick={() => setShowDrinkModal(true)}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover: bg-blue-100 transition-colors border border-blue-100 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <Coffee className="w-4 h-4" />
                  เพิ่มน้ำ
                </button>
              )}
            </div>

            {/* แสดงข้อมูลสมาชิกถ้ามี */}
            {order?. customer && (
              <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    {order.customer. avatar_url ? (
                      <img src={order.customer. avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-medium">สมาชิก</span>
                    </div>
                    <p className="font-bold text-slate-800">{order.customer.username || 'ลูกค้า'}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="w-4 h-4" />
                      <span className="font-bold">{order.customer. points || 0}</span>
                    </div>
                    <p className="text-xs text-slate-500">คะแนนสะสม</p>
                  </div>
                </div>

                {/* ✅ แสดงคะแนนที่จะได้รับ */}
                {earnedPoints > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm font-medium">คะแนนที่จะได้รับ</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-emerald-600">+{earnedPoints} คะแนน</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">ซื้อครบ 100 บาท = 1 คะแนน</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {loading ?  (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader className="w-12 h-12 text-lime-500 animate-spin" />
                  <p className="text-slate-400 font-medium">กำลังดึงข้อมูลใบเสร็จ...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="bg-red-100 p-4 rounded-full mb-4">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">ไม่พบข้อมูล</h3>
                  <p className="text-slate-500">{error}</p>
                </div>
              ) : order ?  (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-semibold">รายการเมนู</th>
                        <th className="p-4 font-semibold text-center w-24">จำนวน</th>
                        <th className="p-4 font-semibold text-right w-32">ราคา/หน่วย</th>
                        <th className="p-4 font-semibold text-right w-32 bg-slate-200/50">รวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-lime-50/50 transition-colors">
                          <td className="p-4 font-medium text-slate-700">
                            {item.menu_items?. name || 'ไม่ระบุชื่อ'}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-sm font-bold">
                              x{item.quantity}
                            </span>
                          </td>
                          <td className="p-4 text-right text-slate-500 font-mono">
                            {item.price. toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-800 font-mono bg-slate-50/50">
                            {(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-4 text-right font-bold text-slate-600">รวมจำนวนรายการ</td>
                        <td className="p-4 text-right font-bold text-slate-800">
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
          <div className="w-full md:w-[420px] bg-white flex flex-col h-full shadow-l-xl z-20">
            <div className="md:hidden p-4 border-b flex justify-end">
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
              <div className="hidden md:flex justify-end mb-2">
                <button onClick={onClose} className="group p-2 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium">
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
                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Receipt className="w-3 h-3" /> Order ID
                    </div>
                    <div className="font-mono font-bold text-slate-600 tracking-wider">
                      {order.order_id}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-lime-50 rounded-2xl p-5 border-2 border-lime-100 text-center space-y-1">
                <div className="text-lime-700 font-semibold text-sm uppercase tracking-widest">ยอดสุทธิที่ต้องชำระ</div>
                <div className="text-4xl font-black text-lime-600 font-mono tracking-tighter">
                  {order ?  calculateTotal(order.items).toLocaleString() : '0'}
                  <span className="text-base text-lime-500 font-bold ml-2">THB</span>
                </div>
                {/* ✅ แสดงคะแนนที่จะได้รับใน Summary */}
                {order?. customer_id && earnedPoints > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-emerald-600">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">รับ +{earnedPoints} คะแนน</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-lime-500 rounded-full"></div>
                  เลือกวิธีการชำระเงิน
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setPaymentMethod('cash')
                      handleRemoveSlip()
                    }}
                    className={`relative p-4 rounded-xl border-2 flex items-center gap-4 transition-all group ${
                      paymentMethod === 'cash' 
                        ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-200 ring-offset-2' 
                        :  'border-slate-100 bg-white hover:border-green-300 hover: bg-green-50/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${paymentMethod === 'cash' ? 'bg-green-500 text-white' :  'bg-slate-100 text-slate-500 group-hover:bg-green-100 group-hover:text-green-600'}`}>
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold ${paymentMethod === 'cash' ?  'text-green-800' : 'text-slate-700'}`}>เงินสด (Cash)</div>
                      <div className="text-xs text-slate-400">ชำระด้วยธนบัตรหรือเหรียญ</div>
                    </div>
                    {paymentMethod === 'cash' && <CheckCircle2 className="absolute right-4 w-6 h-6 text-green-500" />}
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('promptpay')}
                    className={`relative p-4 rounded-xl border-2 flex items-center gap-4 transition-all group ${
                      paymentMethod === 'promptpay' 
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200 ring-offset-2' 
                        : 'border-slate-100 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${paymentMethod === 'promptpay' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover: bg-blue-100 group-hover: text-blue-600'}`}>
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

              {/* ส่วนอัพโหลดสลิป */}
              {paymentMethod === 'promptpay' && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    อัพโหลดสลิปการโอนเงิน
                    <span className="text-red-500">*</span>
                  </div>

                  {/* Hidden Input สำหรับ Mobile Camera */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleSlipSelect}
                    className="hidden"
                  />

                  {/* Hidden Input สำหรับเลือกไฟล์ */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSlipSelect}
                    className="hidden"
                  />

                  {! slipPreview ?  (
                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 bg-blue-50/50">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-slate-600 font-medium mb-1">ถ่ายรูปหรือเลือกรูปสลิป</p>
                          <p className="text-xs text-slate-400">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <button
                            type="button"
                            onClick={handleOpenCamera}
                            className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg active:scale-95"
                          >
                            <Camera className="w-5 h-5" />
                            ถ่ายรูป
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenGallery}
                            className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors border-2 border-blue-200 active:scale-95"
                          >
                            <Upload className="w-5 h-5" />
                            เลือกไฟล์
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-green-50">
                        <div className="relative aspect-[4/3] bg-slate-100">
                          <img 
                            src={slipPreview} 
                            alt="สลิปการโอนเงิน" 
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 right-2">
                            <button
                              type="button"
                              onClick={handleRemoveSlip}
                              className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            อัพโหลดสลิปแล้ว
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'promptpay' && ! slipImage && (
                    <p className="text-center text-red-500 text-sm font-medium flex items-center justify-center gap-1">
                      <X className="w-4 h-4" />
                      กรุณาถ่ายรูปหรืออัพโหลดสลิปก่อนยืนยันการชำระเงิน
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 mt-auto">
              <button 
                onClick={handlePayment}
                disabled={loading || !!error || !canConfirmPayment() || isProcessing || uploadingSlip}
                className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 text-lg
                  ${loading || !!error || ! canConfirmPayment() || isProcessing || uploadingSlip
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-lime-500 to-emerald-600 text-white hover:shadow-lime-200 hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {isProcessing || uploadingSlip ?  (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    {uploadingSlip ? 'กำลังอัพโหลดสลิป...' : 'กำลังประมวลผล... '}
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

      {/* Camera Modal สำหรับ PC */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full">
            <div className="bg-blue-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Video className="w-6 h-6" />
                <span className="font-bold text-lg">ถ่ายรูปสลิป</span>
              </div>
              <button
                onClick={handleCloseCamera}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="relative bg-black aspect-video">
              {cameraError ?  (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="font-medium mb-2">ไม่สามารถเปิดกล้องได้</p>
                  <p className="text-sm text-gray-400">{cameraError}</p>
                  <button
                    onClick={handleCloseCamera}
                    className="mt-4 px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-white/50 rounded-lg"></div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                      วางสลิปให้อยู่ในกรอบ
                    </div>
                  </div>
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {! cameraError && (
              <div className="p-6 bg-slate-100 flex items-center justify-center gap-4">
                <button
                  onClick={handleCloseCamera}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCapturePhoto}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg"
                >
                  <Circle className="w-6 h-6 fill-current" />
                  ถ่ายรูป
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}