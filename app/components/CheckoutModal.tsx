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
  Gift,
  Sparkles,
  Calculator,
  Minus,
} from 'lucide-react'
import DrinkSelectionModal from './DrinkSelectionModal'
import ReceiptModal from './ReceiptModal'

interface CheckoutModalProps {
  tableId: number;
  tableName: string | number;
  onClose: () => void;
  onSuccess?:  () => void;
}

interface OrderItem {
  id: number
  quantity: number
  price: number
  menu_items?:  {
    name:  string
  }
}

interface CustomerInfo {
  id: string
  username: string | null
  points: number
  avatar_url:  string | null
}

interface OrderData {
  id: number
  order_id: string
  total_amount: number
  customer_count: number
  created_at: string
  customer_id: string | null
  items:  OrderItem[]
  customer?:  CustomerInfo | null
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

  // คะแนนสะสม
  const [earnedPoints, setEarnedPoints] = useState(0)

  // State สำหรับการทอนเงิน
  const [receivedAmount, setReceivedAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // State สำหรับจัดการการแก้ไขรายการ
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)
  
  const [receiptData, setReceiptData] = useState<{
    order_id: string
    created_at: string
    customer_count: number
    payment_status: string
    total_amount: number
    items: OrderItem[]
    table_number: string | number
    earned_points?:  number 
    new_total_points?: number
    received_amount?: number
    change_amount?: number
  } | null>(null)

  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  const calculatePoints = (amount: number): number => {
    return Math.floor(amount / 100)
  }

  const calculateChange = (): number => {
    if (!order) return 0
    const total = calculateTotal(order.items)
    return Math.max(0, receivedAmount - total)
  }

  const getSuggestedBills = (total: number): number[] => {
    const bills: number[] = []
    bills.push(total) // พอดี
    const roundedUp100 = Math.ceil(total / 100) * 100
    if (roundedUp100 !== total) bills.push(roundedUp100)
    const standardBills = [100, 500, 1000, 2000]
    standardBills.forEach(bill => {
      if (bill >= total && !bills.includes(bill)) {
        bills.push(bill)
      }
    })
    return [...new Set(bills)].sort((a, b) => a - b).slice(0, 5)
  }

  const handleSelectAmount = (amount:  number) => {
    setReceivedAmount(amount)
    setShowCustomInput(false)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    setCustomAmount(numericValue)
    if (numericValue) {
      setReceivedAmount(parseInt(numericValue))
    } else {
      setReceivedAmount(0)
    }
  }

  const calculateTotal = (items:  OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
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
          created_at: data.created_at,
          customer_id:  data.customer_id,
          items:  items,
          customer: customerInfo
        }
        setOrder(formattedData)

        if (data.customer_id) {
          const points = calculatePoints(calculatedTotal)
          setEarnedPoints(points)
        }
        
        if (paymentMethod === 'cash' || paymentMethod === null) {
           if (!showCustomInput) {
             setReceivedAmount(calculatedTotal)
           }
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
  }, [tableId, paymentMethod, showCustomInput])

  useEffect(() => {
    if (tableId) {
      fetchOrderDetails()
    }
  }, [tableId, fetchOrderDetails])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  useEffect(() => {
    if (paymentMethod !== 'cash') {
      setReceivedAmount(order ?  calculateTotal(order.items) : 0)
      setCustomAmount('')
      setShowCustomInput(false)
    }
  }, [paymentMethod, order])

  const handleUpdateQuantity = async (itemId: number, currentQty: number, change: number) => {
    const newQty = currentQty + change
    
    if (newQty <= 0) {
      handleDeleteItem(itemId)
      return
    }

    setUpdatingItemId(itemId)
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: newQty })
        .eq('id', itemId)

      if (error) throw error
      await fetchOrderDetails()
    } catch (err: any) {
      console.error('Error updating quantity:', err)
      alert('ไม่สามารถแก้ไขจำนวนได้: ' + err.message)
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('คุณต้องการลบรายการสินค้านี้ใช่หรือไม่?')) return

    setUpdatingItemId(itemId)
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      await fetchOrderDetails()
    } catch (err: any) {
      console.error('Error deleting item:', err)
      alert('ไม่สามารถลบรายการได้: ' + err.message)
    } finally {
      setUpdatingItemId(null)
    }
  }

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
        setSlipPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOpenCamera = async () => {
    setCameraError(null)
    setShowCameraModal(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
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

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `slip_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSlipImage(file)
        setSlipPreview(canvas.toDataURL('image/jpeg', 0.9))
        handleCloseCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
    setCameraError(null)
  }

  const handleOpenGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleRemoveSlip = () => {
    setSlipImage(null)
    setSlipPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const uploadSlipImage = async (): Promise<string | null> => {
    if (!slipImage || !order) return null
    setUploadingSlip(true)
    try {
      const fileExt = slipImage.name.split('.').pop() || 'jpg'
      const fileName = `${order.order_id}_${Date.now()}.${fileExt}`
      const filePath = `slips/${fileName}`
      const { error:  uploadError } = await supabase.storage
        .from('Money_transfer_slip_image')
        .upload(filePath, slipImage)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('Money_transfer_slip_image')
        .getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (err: any) {
      console.error('Error uploading slip:', err)
      throw err
    } finally {
      setUploadingSlip(false)
    }
  }

  const updateCustomerPoints = async (customerId: string, pointsToAdd: number): Promise<number> => {
    try {
      const { data: currentData, error:  fetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', customerId)
        .single()
      if (fetchError) throw fetchError
      const currentPoints = currentData?.points || 0
      const newTotalPoints = currentPoints + pointsToAdd
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          points: newTotalPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
      if (updateError) throw updateError
      return newTotalPoints
    } catch (err: any) {
      console.error('Error updating customer points:', err)
      throw err
    }
  }

  const handlePayment = async () => {
    if (!order || !paymentMethod) return
    if (paymentMethod === 'promptpay' && !slipImage) {
      alert('กรุณาถ่ายรูปหรืออัพโหลดสลิปการโอนเงิน')
      return
    }
    if (paymentMethod === 'cash') {
      const total = calculateTotal(order.items)
      if (receivedAmount < total) {
        alert(`จำนวนเงินที่รับ (${receivedAmount.toLocaleString()} บาท) น้อยกว่ายอดที่ต้องชำระ (${total.toLocaleString()} บาท)`)
        return
      }
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
        updateData.slip_url = slipUrl
      }
      const { error:  orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
      if (orderError) throw orderError
      const { error: tableError } = await supabase
        .from('tables')
        .update({ current_status: 'vacant' })
        .eq('id', tableId)
      if (tableError) throw tableError
      await supabase
        .from('table_sessions')
        .update({ status: 'completed' })
        .eq('table_id', tableId)
        .eq('status', 'active')
      let newTotalPoints = 0
      const pointsEarned = calculatePoints(totalAmount)
      if (order.customer_id && pointsEarned > 0) {
        try {
          newTotalPoints = await updateCustomerPoints(order.customer_id, pointsEarned)
        } catch (pointsError) {
          console.error('Failed to update points, but payment succeeded:', pointsError)
        }
      }
      const receiptInfo = {
        order_id: order.order_id,
        created_at: now,
        customer_count: order.customer_count,
        payment_status: paymentMethod,
        total_amount: totalAmount,
        items:  order.items,
        table_number:  tableName,
        earned_points: order.customer_id ? pointsEarned : undefined,
        new_total_points: order.customer_id ?  newTotalPoints :  undefined,
        received_amount: paymentMethod === 'cash' ? receivedAmount : undefined,
        change_amount:  paymentMethod === 'cash' ? calculateChange() : undefined,
      }
      setReceiptData(receiptInfo)
      setShowReceipt(true)
      setIsProcessing(false)
    } catch (err:  any) {
      console.error('Payment Error:', err)
      alert('เกิดข้อผิดพลาดในการชำระเงิน:  ' + (err.message || JSON.stringify(err)))
      setIsProcessing(false)
    }
  }

  const canConfirmPayment = () => {
    if (!paymentMethod) return false
    if (paymentMethod === 'promptpay' && !slipImage) return false
    if (paymentMethod === 'cash' && order) {
      const total = calculateTotal(order.items)
      if (receivedAmount < total) return false
    }
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

  const totalAmount = order ? calculateTotal(order.items) : 0
  const suggestedBills = getSuggestedBills(totalAmount)
  const changeAmount = calculateChange()

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
        
        <div className="bg-white w-full max-w-5xl flex flex-col md:flex-row 
          h-[100dvh] md:h-[90vh] md:rounded-3xl shadow-2xl overflow-hidden relative">
          
          {/* ==================== LEFT COLUMN (Order Items) ==================== */}
          <div className="w-full md:flex-1 flex flex-col bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 
            h-[45vh] md:h-full shrink-0">
            
            <div className="p-3 md:p-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm z-10 shrink-0">
              <div>
                <h2 className="text-base md:text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 md:w-6 md:h-6 text-lime-600" />
                  ใบรายการ
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1 hidden md:block">ตรวจสอบรายการก่อนชำระเงิน</p>
                <p className="text-slate-500 text-[10px] mt-0.5 md:hidden truncate max-w-[150px]">{tableName}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {order && (
                  <button 
                    onClick={() => setShowDrinkModal(true)}
                    className="flex items-center gap-1 md:gap-2 bg-blue-50 text-blue-600 px-2 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm text-[10px] md:text-base"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">เพิ่มน้ำ</span>
                    <Coffee className="w-3 h-3 md:w-4 md:h-4 sm:hidden" />
                  </button>
                )}
                <button onClick={onClose} className="md:hidden p-1.5 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500">
                    <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 md:p-6 scroll-smooth bg-slate-50">
              
              {/* Member Info */}
              {order?.customer && (
                <div className="mb-2 md:mb-4 p-2 md:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg md:rounded-xl border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                      {order.customer.avatar_url ? (
                        <img src={order.customer.avatar_url} alt="" className="w-full h-full object-cover rounded-lg md:rounded-xl" />
                      ) : (
                        <User className="w-4 h-4 md:w-6 md:h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 md:gap-2">
                        <UserCheck className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                        <span className="text-[10px] md:text-xs text-purple-600 font-medium">สมาชิก</span>
                      </div>
                      <p className="font-bold text-xs md:text-base text-slate-800 truncate">{order.customer.username || 'ลูกค้า'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-amber-600 justify-end">
                        <Star className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="font-bold text-xs md:text-base">{order.customer.points || 0}</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-500">คะแนนสะสม</p>
                    </div>
                  </div>

                  {earnedPoints > 0 && (
                    <div className="mt-1 md:mt-3 pt-1 md:pt-3 border-t border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Gift className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-[10px] md:text-sm font-medium">คะแนนที่จะได้รับ</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                          <span className="font-bold text-[10px] md:text-sm text-emerald-600">+{earnedPoints} คะแนน</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {loading ?  (
                <div className="flex flex-col items-center justify-center h-24 md:h-full space-y-4">
                  <Loader className="w-6 h-6 md:w-10 md:h-10 text-lime-500 animate-spin" />
                  <p className="text-[10px] md:text-sm text-slate-400 font-medium">กำลังดึงข้อมูล...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-24 md:h-full text-center">
                  <div className="bg-red-100 p-2 md:p-4 rounded-full mb-2 md:mb-4">
                    <X className="w-5 h-5 md:w-8 md:h-8 text-red-500" />
                  </div>
                  <h3 className="text-sm md:text-lg font-bold text-slate-700">ไม่พบข้อมูล</h3>
                  <p className="text-[10px] md:text-sm text-slate-500">{error}</p>
                </div>
              ) : order ? (
                <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[300px] md:min-w-[350px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 text-[10px] md:text-sm uppercase tracking-wider border-b border-slate-200">
                          {/* ลด Padding ให้แคบลง */}
                          <th className="py-2 px-1 md:p-2 font-semibold">รายการ</th>
                          <th className="py-2 px-1 md:p-2 font-semibold text-center w-20 md:w-24">จำนวน</th>
                          <th className="py-2 px-1 md:p-2 font-semibold text-right w-16 hidden sm:table-cell">ราคา</th>
                          <th className="py-2 px-1 md:p-2 font-semibold text-right w-20 md:w-28 bg-slate-200/50">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-lime-50/50 transition-colors text-xs md:text-base group">
                            {/* 1. ชื่อรายการ (บังคับบรรทัดเดียว) */}
                            <td className="py-3 px-1 md:p-2 font-medium text-slate-700 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* ปุ่มลบ */}
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={updatingItemId === item.id}
                                  className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                
                                {/* Container ชื่อ: ใช้ min-w-0 เพื่อให้ flex-child ยอมหด และ truncate ทำงาน */}
                                <div className="min-w-0 flex-1">
                                  {/* truncate + whitespace-nowrap = บังคับ 1 บรรทัด + ... ถ้าล้น */}
                                  <div className="truncate whitespace-nowrap font-bold text-slate-700 text-sm md:text-base">
                                    {item.menu_items?.name || 'ไม่ระบุชื่อ'}
                                  </div>
                                  <div className="sm:hidden text-[10px] text-slate-400 mt-0.5 truncate">
                                    {item.price.toLocaleString()} / หน่วย
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. จำนวน (Compact) */}
                            <td className="py-3 px-1 md:p-2 text-center align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                  disabled={updatingItemId === item.id}
                                  className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>

                                <div className="w-5 md:w-7 text-center font-bold text-slate-800 text-xs md:text-sm">
                                  {updatingItemId === item.id ? (
                                    <Loader className="w-3 h-3 animate-spin mx-auto text-lime-500" />
                                  ) : (
                                    item.quantity
                                  )}
                                </div>

                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                  disabled={updatingItemId === item.id}
                                  className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-lime-100 text-slate-600 hover:text-lime-600 disabled:opacity-50 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* 3. ราคาต่อหน่วย */}
                            <td className="py-3 px-1 md:p-2 text-right text-slate-500 font-mono hidden sm:table-cell align-middle">
                              {item.price.toLocaleString()}
                            </td>

                            {/* 4. ราคารวม */}
                            <td className="py-3 px-1 md:p-2 text-right font-bold text-slate-800 font-mono bg-slate-50/50 align-middle">
                              {(item.price * item.quantity).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="py-2 px-1 md:p-4 text-right font-bold text-slate-600 text-[10px] md:text-sm">
                             <span className="sm:hidden">รวม</span>
                             <span className="hidden sm:inline">รวมจำนวนรายการ</span>
                          </td>
                          <td className="py-2 px-1 md:p-4 text-right font-bold text-slate-800 text-xs md:text-sm hidden sm:table-cell"></td>
                          <td className="py-2 px-1 md:p-4 text-right font-bold text-slate-800 text-xs md:text-base">
                            {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ==================== RIGHT COLUMN (Payment & Actions) ==================== */}
          {/* ปรับลดขนาด Width ตรงนี้จาก 420px -> 340px */}
          <div className="w-full md:w-[340px] bg-white flex flex-col flex-1 min-h-0 md:h-full shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-l-xl z-20 md:border-l border-slate-200 relative">
            
            <div className="flex-1 overflow-y-auto p-3 md:p-6 flex flex-col gap-3 md:gap-5 bg-white pb-20 md:pb-6">
              
              <div className="hidden md:flex justify-end mb-2">
                <button onClick={onClose} className="group p-2 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium">
                  ยกเลิก / ปิดหน้าต่าง <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Order Info Summary */}
              {order && (
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> วันที่
                    </div>
                    <div className="text-xs md:text-sm font-semibold text-slate-700">
                      {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Receipt className="w-3 h-3" /> Order ID
                    </div>
                    <div className="font-mono font-bold text-xs md:text-sm text-slate-600 tracking-wider">
                      {order.order_id}
                    </div>
                  </div>
                </div>
              )}

              {/* Total Amount Badge */}
              <div className="bg-lime-50 rounded-xl md:rounded-2xl p-2 md:p-5 border-2 border-lime-100 text-center space-y-0.5 md:space-y-1 shrink-0">
                <div className="text-lime-700 font-semibold text-[10px] md:text-sm uppercase tracking-widest">ยอดสุทธิที่ต้องชำระ</div>
                <div className="text-2xl md:text-4xl font-black text-lime-600 font-mono tracking-tighter">
                  {totalAmount.toLocaleString()}
                  <span className="text-xs md:text-base text-lime-500 font-bold ml-1 md:ml-2">THB</span>
                </div>
                {order?.customer_id && earnedPoints > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-1 md:mt-2 text-emerald-600">
                    <Gift className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-[10px] md:text-sm font-medium">รับ +{earnedPoints} คะแนน</span>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-2 md:space-y-3">
                <div className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-3 md:h-4 bg-lime-500 rounded-full"></div>
                  วิธีการชำระเงิน
                </div>
                {/* ปุ่มเลือก Cash/PromptPay */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
                    <button 
                      onClick={() => { setPaymentMethod('cash'); handleRemoveSlip(); }}
                      className={`relative p-2 md:p-4 rounded-xl border-2 flex flex-col md:flex-row items-center gap-1 md:gap-4 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-100 bg-white'}`}
                    >
                      <Banknote className={`w-5 h-5 md:w-6 md:h-6 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-slate-400'}`} />
                      <span className={`text-xs md:text-base font-bold ${paymentMethod === 'cash' ? 'text-green-800' : 'text-slate-600'}`}>เงินสด</span>
                      {paymentMethod === 'cash' && <CheckCircle2 className="absolute top-1 right-1 text-green-500 w-4 h-4" />}
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('promptpay')}
                      className={`relative p-2 md:p-4 rounded-xl border-2 flex flex-col md:flex-row items-center gap-1 md:gap-4 transition-all ${paymentMethod === 'promptpay' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-100 bg-white'}`}
                    >
                      <QrCode className={`w-5 h-5 md:w-6 md:h-6 ${paymentMethod === 'promptpay' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-xs md:text-base font-bold ${paymentMethod === 'promptpay' ? 'text-blue-800' : 'text-slate-600'}`}>PromptPay</span>
                      {paymentMethod === 'promptpay' && <CheckCircle2 className="absolute top-1 right-1 text-blue-500 w-4 h-4" />}
                    </button>
                </div>
              </div>

              {/* Cash Calculation UI */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2 md:space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-1 h-3 md:h-4 bg-green-500 rounded-full"></div>
                    <Calculator className="w-3 h-3 md:w-4 md:h-4" />
                    คำนวณเงินทอน
                  </div>

                  {/* Grid ปุ่มตัวเลข (ทำให้เล็กลงหน่อยในมือถือ) */}
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                    {suggestedBills.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleSelectAmount(amount)}
                        className={`p-2 rounded-lg md:rounded-xl border transition-all text-center ${receivedAmount === amount && !showCustomInput ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-700'}`}
                      >
                        <div className="font-bold text-xs md:text-base">฿{amount.toLocaleString()}</div>
                      </button>
                    ))}
                    <button
                        onClick={() => { setShowCustomInput(true); setCustomAmount(''); setReceivedAmount(0); }}
                        className={`p-2 rounded-lg md:rounded-xl border border-dashed transition-all text-center ${showCustomInput ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}
                    >
                        <div className="text-[10px] md:text-xs">กรอกเอง</div>
                    </button>
                  </div>

                  {/* Custom Input */}
                  {showCustomInput && (
                    <div className="relative">
                       <input 
                          type="number" pattern="[0-9]*" inputMode="numeric"
                          value={customAmount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          placeholder="จำนวนเงิน"
                          className="w-full p-2 md:p-3 text-center border-2 border-green-300 rounded-xl bg-green-50 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                       />
                    </div>
                  )}

                  {/* เงินทอน Display */}
                  <div className="bg-slate-50 rounded-xl p-2 md:p-4 border border-slate-200 flex justify-between items-center">
                     <span className="text-xs text-slate-500">เงินทอน</span>
                     <span className={`font-black text-lg md:text-2xl ${changeAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                       ฿{changeAmount.toLocaleString()}
                     </span>
                  </div>
                  {receivedAmount < totalAmount && receivedAmount > 0 && (
                     <p className="text-red-500 text-[10px] md:text-xs text-right mt-1">ขาดอีก ฿{(totalAmount - receivedAmount).toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Upload Slip UI */}
              {paymentMethod === 'promptpay' && (
                <div className="space-y-2 md:space-y-3 animate-in slide-in-from-top-4 duration-300">
                   <div className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                     <div className="w-1 h-3 md:h-4 bg-blue-500 rounded-full"></div>
                     สลิปการโอน <span className="text-red-500">*</span>
                   </div>

                   <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleSlipSelect} className="hidden" />
                   <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSlipSelect} className="hidden" />

                   {!slipPreview ? (
                      <div className="border-2 border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/50 text-center">
                         <div className="flex gap-2 justify-center mt-2">
                            <button type="button" onClick={handleOpenCamera} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1">
                               <Camera className="w-3 h-3" /> ถ่ายรูป
                            </button>
                            <button type="button" onClick={handleOpenGallery} className="flex-1 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                               <Upload className="w-3 h-3" /> เลือกรูป
                            </button>
                         </div>
                      </div>
                   ) : (
                      <div className="relative border-2 border-green-300 rounded-xl overflow-hidden bg-slate-100 aspect-video">
                         <img src={slipPreview} className="w-full h-full object-contain" />
                         <button onClick={handleRemoveSlip} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><Trash2 className="w-4 h-4"/></button>
                      </div>
                   )}
                </div>
              )}
            </div>

            {/* ==================== FOOTER BUTTON (FIXED BOTTOM) ==================== */}
            <div className="p-3 md:p-6 bg-white border-t border-slate-100 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
              <button 
                onClick={handlePayment}
                disabled={loading || !!error || !canConfirmPayment() || isProcessing || uploadingSlip}
                className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-lg
                  ${loading || !!error || !canConfirmPayment() || isProcessing || uploadingSlip
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-lime-500 to-emerald-600 text-white hover:shadow-lime-200 active:scale-[0.98]'
                  }
                `}
              >
                {isProcessing || uploadingSlip ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ยืนยันการชำระเงิน</span>
                    {paymentMethod === 'cash' && changeAmount > 0 && (
                      <span className="text-white/90 text-xs ml-1 font-normal">(ทอน ฿{changeAmount.toLocaleString()})</span>
                    )}
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
            onSuccess={() => { fetchOrderDetails() }}
          />
        )}
      </div>

      {/* Camera Modal (Mobile & PC Optimized) */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col animate-in fade-in duration-200">
          
          {/* Header (Top Bar) */}
          <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pt-safe">
            <div className="text-white">
              <h3 className="font-bold text-lg">ถ่ายรูปสลิป</h3>
              <p className="text-xs text-gray-300">วางสลิปให้อยู่ในกรอบ</p>
            </div>
            <button 
              onClick={handleCloseCamera} 
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Camera Area */}
          <div className="relative flex-1 bg-black overflow-hidden">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6 z-10">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/50">
                  <X className="w-10 h-10 text-red-500" />
                </div>
                <p className="font-bold text-xl mb-2">ไม่สามารถเปิดกล้องได้</p>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">{cameraError}</p>
                <button 
                  onClick={handleCloseCamera} 
                  className="mt-8 px-8 py-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors font-medium border border-white/20"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="absolute inset-0 bg-black/30"></div>
                  
                  <div className="relative w-[75%] aspect-[3/4] max-w-sm border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/90 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/90 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/90 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/90 rounded-br-xl"></div>
                    
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400/80 shadow-[0_0_15px_rgba(74,222,128,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Controls (Bottom Bar) */}
          <div className="bg-black text-white px-6 pb-8 pt-6 flex items-center justify-between pb-safe z-20">
            <button 
              onClick={handleOpenGallery}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-white" />
            </button>

            <button 
              onClick={handleCapturePhoto} 
              disabled={!!cameraError}
              className="relative group disabled:opacity-50"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform group-active:scale-95">
                <div className="w-16 h-16 bg-white rounded-full group-hover:bg-gray-200 transition-colors"></div>
              </div>
            </button>

            <div className="w-14"></div> 
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  )
}