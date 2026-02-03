'use client'

import { useRef } from 'react'
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
  Heart
} from 'lucide-react'

interface OrderBillModalProps {
  orderId: string
  tableId: number | string
  tableNumber?: string | number
  isTakeaway: boolean
  sessionToken?: string
  createdAt?:  string
  onClose:  () => void
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
  
  const now = createdAt ? new Date(createdAt) : new Date()
  
  const baseUrl = 'https://phang-khon-chicken.vercel.app'

  // ✅ ดึงเลข 4 ตัวท้ายของ Order ID มาเป็นหมายเลขคิว
  const queueNumber = orderId.slice(-4)
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year:  'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const formatTime = (date:  Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour:  '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const qrUrl = `${baseUrl}/scan_qrcode?t=${sessionToken}`

  const handlePrint = () => {
    const printContent = billRef.current
    if (! printContent) return

    const printWindow = window.open('', '_blank')
    if (! printWindow) return

    const qrCanvas = printContent.querySelector('canvas')
    const qrDataUrl = qrCanvas?. toDataURL('image/png') || ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>บิลสั่งอาหาร - ${orderId}</title>
          <style>
            * {
              margin:  0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Sarabun', 'Prompt', -apple-system, sans-serif;
              background: white;
              display: flex;
              justify-content: center;
              padding: 20px;
            }
            .bill {
              width: 80mm;
              background: white;
              padding: 15px;
              border:  2px dashed #ccc;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 2px dashed #ddd;
              margin-bottom: 15px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 4px;
            }
            .shop-subtitle {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            .queue-number {
              font-size: 32px;
              font-weight: bold;
              color: #059669;
              margin-top: 8px;
              letter-spacing: 2px;
            }
            .qr-section {
              text-align: center;
              padding: 20px 0;
              border-bottom: 2px dashed #ddd;
              margin-bottom: 15px;
            }
            .qr-code {
              background: white;
              padding:  10px;
              display: inline-block;
              border:  2px solid #eee;
              border-radius: 12px;
            }
            .qr-code img {
              width: 150px;
              height: 150px;
            }
            .qr-label {
              font-size: 13px;
              color: #666;
              margin-top: 12px;
            }
            .info-section {
              padding: 10px 0;
            }
            .info-row {
              display:  flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom:  1px dotted #ddd;
              font-size: 13px;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            . info-label {
              color: #666;
            }
            .info-value {
              font-weight: bold;
              color:  #333;
            }
            .order-type {
              text-align: center;
              padding: 15px;
              margin:  15px 0;
              border-radius: 12px;
              font-size: 18px;
              font-weight: bold;
            }
            .takeaway {
              background: linear-gradient(135deg, #9333ea, #a855f7);
              color: white;
            }
            . dine-in {
              background:  linear-gradient(135deg, #059669, #10b981);
              color: white;
            }
            . footer {
              text-align: center;
              padding-top: 15px;
              border-top: 2px dashed #ddd;
              margin-top: 15px;
            }
            .footer-text {
              font-size: 11px;
              color: #888;
            }
            .scan-text {
              font-size: 14px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
            }
            @media print {
              body { padding: 0; }
              .bill { border:  none; }
            }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="header">
              <div class="logo">ไก่ย่างพังโคน</div>
              <div class="shop-subtitle">บิลสั่งอาหาร</div>
              <div class="queue-number">Q#${queueNumber}</div>
            </div>
            
            <div class="qr-section">
              <div class="qr-code">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
              <div class="qr-label">สแกนเพื่อสั่งอาหาร</div>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Order ID</span>
                <span class="info-value">${orderId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">วันที่</span>
                <span class="info-value">${formatDate(now)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">เวลา</span>
                <span class="info-value">${formatTime(now)}</span>
              </div>
            </div>
            
            <div class="order-type ${isTakeaway ?  'takeaway' : 'dine-in'}">
              ${isTakeaway ?  'สั่งกลับบ้าน (Takeaway)' : `โต๊ะ ${tableNumber || tableId}`}
            </div>
            
            <div class="footer">
              <p class="scan-text">สแกน QR Code เพื่อสั่งอาหาร</p>
              <p class="footer-text">ขอบคุณที่ใช้บริการ</p>
            </div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-4 ${isTakeaway ? 'bg-gradient-to-r from-purple-600 to-purple-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Printer className="w-5 h-5" />
              <span className="font-bold">พิมพ์บิลสั่งอาหาร</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1. 5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Bill Preview */}
        <div className="p-6 bg-slate-100">
          <div 
            ref={billRef}
            className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-300 overflow-hidden"
          >
            {/* Shop Header */}
            <div className="text-center p-5 border-b-2 border-dashed border-slate-200">
              <div className="text-xl font-black text-slate-800">ร้านไก่ย่างพังโคน</div>
              <div className="text-sm text-slate-500 mt-1">บิลสั่งอาหาร</div>
              {/* ✅ หมายเลขคิว */}
              <div className={`text-3xl font-black mt-3 tracking-wider ${
                isTakeaway ?  'text-purple-600' : 'text-emerald-600'
              }`}>
                Q#{queueNumber}
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center py-6 px-4 border-b-2 border-dashed border-slate-200">
              <div className="inline-block p-3 bg-white rounded-xl border-2 border-slate-100 shadow-sm">
                <QRCodeCanvas 
                  value={qrUrl}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-slate-500">
                <QrCode className="w-4 h-4" />
                <span className="text-sm">สแกนเพื่อสั่งอาหาร</span>
              </div>
            </div>

            {/* Order Info */}
            <div className="px-5 py-4">
              <div className="flex justify-between items-center py-3 border-b border-dotted border-slate-200">
                <span className="flex items-center gap-2 text-slate-500 text-sm">
                  <Hash className="w-4 h-4" />
                  Order ID
                </span>
                <span className="font-bold text-slate-800 font-mono">{orderId}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-dotted border-slate-200">
                <span className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  วันที่
                </span>
                <span className="font-semibold text-slate-700 text-sm">{formatDate(now)}</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock className="w-4 h-4" />
                  เวลา
                </span>
                <span className="font-semibold text-slate-700 font-mono">{formatTime(now)}</span>
              </div>
            </div>

            {/* Order Type */}
            <div className="px-5 pb-5">
              <div className={`rounded-xl p-4 text-center ${
                isTakeaway 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                  :  'bg-gradient-to-r from-emerald-500 to-emerald-600'
              }`}>
                <div className="flex items-center justify-center gap-2 text-white">
                  {isTakeaway ? (
                    <>
                      <Home className="w-5 h-5" />
                      <span className="font-bold text-lg">สั่งกลับบ้าน (Takeaway)</span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="font-bold text-lg">โต๊ะ {tableNumber || tableId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-4 px-5 border-t-2 border-dashed border-slate-200 bg-slate-50">
              <div className="flex items-center justify-center gap-2 text-slate-700 font-bold mb-1">
                <QrCode className="w-4 h-4" />
                <span>สแกน QR Code เพื่อสั่งอาหาร</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                <span>ขอบคุณที่ใช้บริการ</span>
                <Heart className="w-3 h-3 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 hover: bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isTakeaway 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover: to-purple-700' 
                :  'bg-gradient-to-r from-emerald-500 to-emerald-600 hover: from-emerald-600 hover:to-emerald-700'
            }`}
          >
            <Printer className="w-5 h-5" />
            พิมพ์บิล
          </button>
        </div>
      </div>
    </div>
  )
}