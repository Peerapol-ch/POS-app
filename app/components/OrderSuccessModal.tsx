'use client'

import { useState } from 'react'
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
  Hash
} from 'lucide-react'
import OrderBillModal from './OrderBillModal'

export interface OrderResult {
  orderId: string
  tableNumber?:  string | number
  tableId?: string | number
  seatsCapacity?: number
  isTakeaway?: boolean
  sessionToken?: string  // ✅ ใช้ token นี้
}

interface OrderSuccessModalProps {
  result: OrderResult | null
  onClose: () => void
}

export default function OrderSuccessModal({ result, onClose }: OrderSuccessModalProps) {
  const [copied, setCopied] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  
  if (!result) return null

  const { orderId, tableNumber, tableId, isTakeaway, sessionToken } = result
  
  const baseUrl = 'https://phang-khon-chicken.vercel.app'
  
  const now = new Date()
  const formatDate = now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatTime = now. toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  // ✅ ใช้ sessionToken แทน tableId
  const qrUrl = `${baseUrl}/scan_qrcode?t=${sessionToken}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const openOrderPage = () => {
    window.open(qrUrl, '_blank')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Header with gradient */}
          <div className={`relative pt-8 pb-6 px-6 ${
            isTakeaway 
              ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600' 
              : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600'
          }`}>
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                {isTakeaway ?  (
                  <Home className="w-8 h-8 text-white" />
                ) : (
                  <UtensilsCrossed className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white text-center">
              {isTakeaway ? 'สั่งกลับบ้านสำเร็จ!' : 'เปิดโต๊ะสำเร็จ!'}
            </h2>
            
            {/* Subtitle */}
            <p className="text-white/80 text-center mt-1">
              {isTakeaway ? 'Takeaway Order Created' : `Table ${tableNumber}`}
            </p>
          </div>

          {/* QR Code Section */}
          <div className="px-6 py-5 text-center border-b border-slate-100">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-slate-100">
              <QRCodeCanvas 
                value={qrUrl}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-slate-500 mt-3 flex items-center justify-center gap-1">
              📱 สแกนเพื่อสั่งอาหาร
            </p>
            <button
              onClick={openOrderPage}
              className={`mt-2 text-sm font-medium flex items-center justify-center gap-1 mx-auto ${
                isTakeaway ?  'text-purple-600 hover: text-purple-700' : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              กดเพื่อเปิดหน้าสั่งอาหาร
            </button>
          </div>

          {/* Order Info */}
          <div className="px-6 py-4 space-y-3">
            {/* Order ID */}
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Hash className="w-3 h-3" /> ORDER ID
                </p>
                <p className={`text-lg font-bold font-mono ${isTakeaway ? 'text-purple-600' : 'text-emerald-600'}`}>
                  {orderId}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-600' 
                    :  'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> วันที่
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDate}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> เวลา
                </p>
                <p className="text-sm font-semibold text-slate-700 font-mono mt-0.5">{formatTime}</p>
              </div>
            </div>

            {/* Order Type */}
            <div className={`rounded-xl p-3 flex items-center justify-center gap-2 ${
              isTakeaway 
                ?  'bg-purple-50 text-purple-700' 
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {isTakeaway ?  (
                <>
                  <Home className="w-5 h-5" />
                  <span className="font-bold">Takeaway (กลับบ้าน)</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-5 h-5" />
                  <span className="font-bold"> {tableNumber}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {/* Print Bill Button */}
            <button
              onClick={() => setShowBillModal(true)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${
                isTakeaway 
                  ?  'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100' 
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Printer className="w-5 h-5" />
              พิมพ์บิลให้ลูกค้า
            </button>

            {/* OK Button */}
            <button
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                isTakeaway 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-purple-500/30' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30'
              }`}
            >
              <Check className="w-5 h-5" />
              ตกลง
            </button>
          </div>
        </div>
      </div>

      {/* Bill Modal - ✅ ส่ง sessionToken ไปด้วย */}
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