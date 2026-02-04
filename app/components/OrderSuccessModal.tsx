'use client'

import { useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Home, 
  UtensilsCrossed,
  Printer,
  Calendar,
  Clock,
  Hash,
  QrCode,
  Share2,
  Sparkles
} from 'lucide-react'
import OrderBillModal from './OrderBillModal'

export interface OrderResult {
  orderId: string
  tableNumber?: string | number
  tableId?: string | number
  seatsCapacity?: number
  isTakeaway?: boolean
  sessionToken?: string
}

interface OrderSuccessModalProps {
  result: OrderResult | null
  onClose: () => void
}

export default function OrderSuccessModal({ result, onClose }: OrderSuccessModalProps) {
  const [copied, setCopied] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  
  // ✅ ป้องกัน scroll
  useEffect(() => {
    if (result) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [result])

  if (!result) return null

  const { orderId, tableNumber, tableId, isTakeaway, sessionToken } = result
  
  const baseUrl = 'https://phang-khon-chicken.vercel.app'
  const queueNumber = orderId.slice(-4)
  
  const now = new Date()
  const formatDate = now.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
  const formatTime = now.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  const qrUrl = `${baseUrl}/scan_qrcode?t=${sessionToken}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      setCopied(true)
      if (navigator.vibrate) navigator.vibrate(10)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    const shareText = `
🍗 ร้านไก่ย่างพังโคน
━━━━━━━━━━━━━━
📋 คิว: Q#${queueNumber}
🔖 Order: ${orderId}
📅 ${formatDate} ${formatTime}
${isTakeaway ? '🏠 สั่งกลับบ้าน' : `🪑 : ${tableNumber}`}
━━━━━━━━━━━━━━
📱 สแกน QR หรือกดลิงก์เพื่อสั่งอาหาร:
${qrUrl}
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: `บิลสั่งอาหาร Q#${queueNumber}`,
          text: shareText,
          url: qrUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(qrUrl)
      alert('คัดลอกลิงก์แล้ว')
    }
  }

  const openOrderPage = () => {
    window.open(qrUrl, '_blank')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
          
          {/* ✅ Drag Handle - Mobile */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header - Clean & Minimal */}
          <div className="relative px-5 pt-4 pb-5 text-center">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>

            {/* Success Icon */}
            <div className="flex justify-center mb-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isTakeaway ? 'bg-violet-100' : 'bg-emerald-100'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isTakeaway ? 'bg-violet-500' : 'bg-emerald-500'
                }`}>
                  {isTakeaway ? (
                    <Home className="w-5 h-5 text-white" />
                  ) : (
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-slate-800">
              {isTakeaway ? 'สั่งกลับบ้านสำเร็จ' : 'เปิดโต๊ะสำเร็จ'}
            </h2>
            
            {/* Queue Number */}
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-bold ${
              isTakeaway ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              Q#{queueNumber}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {/* QR Code Card */}
            <div className="bg-slate-50 rounded-2xl p-4 text-center mb-4">
              <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <QRCodeCanvas 
                  value={qrUrl}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-500 text-sm">
                <QrCode className="w-4 h-4" />
                <span>สแกนเพื่อสั่งอาหาร</span>
              </div>
              
              <button
                onClick={openOrderPage}
                className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิดหน้าสั่งอาหาร
              </button>
            </div>

            {/* Order Info */}
            <div className="space-y-3">
              {/* Order ID */}
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Order ID
                  </p>
                  <p className="text-sm font-bold font-mono text-slate-700 truncate mt-0.5">
                    {orderId}
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    copied 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> วันที่
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDate}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" /> เวลา
                  </p>
                  <p className="text-sm font-semibold text-slate-700 font-mono mt-0.5">{formatTime}</p>
                </div>
              </div>

              {/* Order Type Badge */}
              <div className={`rounded-xl p-3 flex items-center justify-center gap-2 ${
                isTakeaway 
                  ? 'bg-violet-50 border border-violet-100' 
                  : 'bg-emerald-50 border border-emerald-100'
              }`}>
                {isTakeaway ? (
                  <>
                    <Home className={`w-4 h-4 text-violet-600`} />
                    <span className="font-semibold text-violet-700 text-sm">สั่งกลับบ้าน (Takeaway)</span>
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700 text-sm"> {tableNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions - Fixed Bottom */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            {/* Action Buttons Row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setShowBillModal(true)}
                className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
              >
                <Printer className="w-5 h-5 text-slate-600" />
                <span className="text-[10px] font-medium text-slate-600">พิมพ์บิล</span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
              >
                <Share2 className="w-5 h-5 text-slate-600" />
                <span className="text-[10px] font-medium text-slate-600">แชร์</span>
              </button>

              <button
                onClick={openOrderPage}
                className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
              >
                <ExternalLink className="w-5 h-5 text-slate-600" />
                <span className="text-[10px] font-medium text-slate-600">เปิดลิงก์</span>
              </button>
            </div>

            {/* OK Button */}
            <button
              onClick={onClose}
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isTakeaway 
                  ? 'bg-violet-600 hover:bg-violet-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-5 h-5" />
              ตกลง
            </button>

            {/* Safe Area */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </div>
      </div>

      {/* Bill Modal */}
      {showBillModal && (
        <OrderBillModal
          orderId={orderId}
          tableId={tableId || 9}
          tableNumber={tableNumber}
          isTakeaway={isTakeaway || false}
          sessionToken={sessionToken}
          onClose={() => setShowBillModal(false)}
        />
      )}
    </>
  )
}