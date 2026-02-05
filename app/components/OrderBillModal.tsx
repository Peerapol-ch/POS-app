'use client'

import { useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  X, 
  Printer, 
  Home, 
  UtensilsCrossed,
  Calendar,
  Clock,
  Hash,
  QrCode,
  Heart,
  Share2,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'

interface OrderBillModalProps {
  orderId: string
  tableId: number | string
  tableNumber?: string | number
  isTakeaway: boolean
  sessionToken?: string
  createdAt?: string
  onClose: () => void
}

export default function OrderBillModal({ 
  orderId, 
  tableId, 
  tableNumber,
  isTakeaway, 
  sessionToken,
  createdAt,
  onClose 
}: OrderBillModalProps) {
  const billRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  
  const now = createdAt ? new Date(createdAt) : new Date()
  
  const baseUrl = 'https://phang-khon-chicken.vercel.app'
  const queueNumber = orderId.slice(-4)
  
  // ✅ ป้องกัน scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const qrUrl = `${baseUrl}/scan_qrcode?t=${sessionToken}`

  // ✅ Copy QR URL
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ✅ Share function
  const handleShare = async () => {
    const shareText = `
🍗 ร้านไก่ย่างพังโคน
━━━━━━━━━━━━━━
📋 คิว: Q#${queueNumber}
🔖 Order: ${orderId}
📅 ${formatDate(now)} ${formatTime(now)}
${isTakeaway ? '🏠 สั่งกลับบ้าน' : `🪑 : ${tableNumber || tableId}`}
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
      await navigator.clipboard.writeText(shareText)
      alert('คัดลอกข้อมูลแล้ว')
    }
  }

  const handlePrint = () => {
    const printContent = billRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCanvas = printContent.querySelector('canvas')
    const qrDataUrl = qrCanvas?.toDataURL('image/png') || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>บิลสั่งอาหาร - ${orderId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Sarabun', sans-serif;
              background: white;
              display: flex;
              justify-content: center;
              padding: 20px;
            }
            .bill {
              width: 80mm;
              background: white;
              padding: 15px;
              border: 2px dashed #ccc;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 2px dashed #ddd;
              margin-bottom: 15px;
            }
            .logo { font-size: 20px; font-weight: bold; }
            .queue-number {
              font-size: 28px;
              font-weight: bold;
              color: ${isTakeaway ? '#9333ea' : '#059669'};
              margin-top: 8px;
            }
            .qr-section {
              text-align: center;
              padding: 15px 0;
              border-bottom: 2px dashed #ddd;
            }
            .qr-code img { width: 120px; height: 120px; }
            .qr-label { font-size: 12px; color: #666; margin-top: 8px; }
            .info-section { padding: 10px 0; font-size: 12px; }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dotted #ddd;
            }
            .order-type {
              text-align: center;
              padding: 12px;
              margin: 12px 0;
              border-radius: 8px;
              font-weight: bold;
              color: white;
              background: ${isTakeaway ? '#9333ea' : '#059669'};
            }
            .footer {
              text-align: center;
              padding-top: 12px;
              border-top: 2px dashed #ddd;
              font-size: 11px;
              color: #666;
            }
            @media print { body { padding: 0; } .bill { border: none; } }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="header">
              <div class="logo">🍗 ไก่ย่างพังโคน</div>
              <div class="queue-number">Q#${queueNumber}</div>
            </div>
            <div class="qr-section">
              <div class="qr-code"><img src="${qrDataUrl}" /></div>
              <div class="qr-label">สแกนเพื่อสั่งอาหาร</div>
            </div>
            <div class="info-section">
              <div class="info-row"><span>Order ID</span><b>${orderId}</b></div>
              <div class="info-row"><span>วันที่</span><span>${formatDate(now)}</span></div>
              <div class="info-row"><span>เวลา</span><span>${formatTime(now)}</span></div>
            </div>
            <div class="order-type">
              ${isTakeaway ? '🏠 สั่งกลับบ้าน' : `🪑 ${tableNumber || tableId}`}
            </div>
            <div class="footer">สแกน QR Code เพื่อสั่งอาหาร<br/>ขอบคุณที่ใช้บริการ ❤️</div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300 sm:animate-in sm:zoom-in-95">
        
        {/* ✅ Drag Handle - Mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${
          isTakeaway 
            ? 'bg-gradient-to-r from-purple-600 to-purple-500' 
            : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
        }`}>
          <div className="flex items-center gap-2 text-white">
            <Printer className="w-5 h-5" />
            <span className="font-bold">บิลสั่งอาหาร</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ✅ Bill Preview - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          <div 
            ref={billRef}
            className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-200 overflow-hidden"
          >
            {/* Shop Header */}
            <div className="text-center p-4 border-b-2 border-dashed border-slate-200">
              <div className="text-lg font-black text-slate-800">🍗 ไก่ย่างพังโคน</div>
              <div className={`text-3xl font-black mt-2 tracking-wider ${
                isTakeaway ? 'text-purple-600' : 'text-emerald-600'
              }`}>
                Q#{queueNumber}
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center py-5 px-4 border-b-2 border-dashed border-slate-200">
              <div className="inline-block p-2 bg-white rounded-xl border-2 border-slate-100 shadow-sm">
                <QRCodeCanvas 
                  value={qrUrl}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-3 text-slate-500 text-sm">
                <QrCode className="w-4 h-4" />
                <span>สแกนเพื่อสั่งอาหาร</span>
              </div>
            </div>

            {/* Order Info */}
            <div className="px-4 py-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-dotted border-slate-200">
                <span className="flex items-center gap-2 text-slate-500">
                  <Hash className="w-3.5 h-3.5" />
                  Order
                </span>
                <span className="font-bold text-slate-800 font-mono text-xs">{orderId}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-dotted border-slate-200">
                <span className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  วันที่
                </span>
                <span className="font-medium text-slate-700 text-xs">{formatDate(now)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  เวลา
                </span>
                <span className="font-medium text-slate-700 font-mono">{formatTime(now)}</span>
              </div>
            </div>

            {/* Order Type */}
            <div className="px-4 pb-4">
              <div className={`rounded-xl p-3 text-center ${
                isTakeaway 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              }`}>
                <div className="flex items-center justify-center gap-2 text-white">
                  {isTakeaway ? (
                    <>
                      <Home className="w-5 h-5" />
                      <span className="font-bold">สั่งกลับบ้าน</span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="font-bold">โต๊ะ {tableNumber || tableId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-3 px-4 border-t-2 border-dashed border-slate-200 bg-slate-50">
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                <span>ขอบคุณที่ใช้บริการ</span>
                <Heart className="w-3 h-3 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Actions - Fixed Bottom */}
        <div className="p-4 bg-white border-t border-slate-100">
          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-medium text-slate-600">ปิด</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 text-slate-600" />
              )}
              <span className="text-[10px] font-medium text-slate-600">
                {copied ? 'แล้ว!' : 'คัดลอก'}
              </span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors active:scale-95"
            >
              <Share2 className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-600">แชร์</span>
            </button>

            <button
              onClick={handlePrint}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-colors active:scale-95 ${
                isTakeaway 
                  ? 'bg-purple-500 hover:bg-purple-600' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              <Printer className="w-5 h-5 text-white" />
              <span className="text-[10px] font-medium text-white">พิมพ์</span>
            </button>
          </div>

          {/* QR Link - Copyable */}
          <div 
            onClick={handleCopyLink}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 truncate flex-1 font-mono">{qrUrl}</span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </div>

          {/* Safe Area */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </div>
    </div>
  )
}