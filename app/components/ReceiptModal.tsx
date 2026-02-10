'use client'

import { useEffect, useRef } from 'react'
import { X, Printer, CheckCircle, Receipt, Download, Share2 } from 'lucide-react'

interface OrderItem {
  id: number
  quantity: number
  price: number
  menu_items?: {
    name: string
  }
}

interface ReceiptData {
  order_id: string
  created_at: string
  customer_count: number
  payment_status: string
  total_amount: number
  items: OrderItem[]
  table_number?: string | number
}

interface ReceiptModalProps {
  data: ReceiptData
  onClose: () => void
}

export default function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  // ป้องกันการ Scroll ของ Body เมื่อ Modal เปิด
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handlePrint = () => {
    const printContent = receiptRef.current
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบเสร็จ - ${data.order_id}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'Courier New', monospace; 
                  padding: 20px;
                  max-width: 300px;
                  margin: 0 auto;
                }
                .receipt { 
                  background: white;
                  padding: 16px;
                }
                .header { 
                  text-align: center; 
                  border-bottom: 2px dashed #ccc;
                  padding-bottom: 12px;
                  margin-bottom: 12px;
                }
                .header h2 { font-size: 16px; font-weight: bold; }
                .header p { font-size: 10px; color: #666; }
                .meta { font-size: 10px; margin-bottom: 12px; }
                .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .items { border-top: 2px dashed #ccc; padding-top: 12px; }
                .items table { width: 100%; font-size: 10px; }
                .items th { text-align: left; padding-bottom: 8px; font-weight: normal; color: #666; }
                .items td { padding: 4px 0; vertical-align: top; }
                .items .name { font-weight: bold; }
                .items .price-each { font-size: 9px; color: #999; }
                .items .qty { text-align: center; }
                .items .total { text-align: right; font-weight: bold; }
                .total-section { 
                  border-top: 2px dashed #ccc; 
                  padding-top: 12px;
                  margin-top: 12px;
                }
                .total-row { display: flex; justify-content: space-between; align-items: flex-end; }
                .total-label { font-weight: bold; }
                .total-amount { font-size: 20px; font-weight: bold; }
                .footer { text-align: center; margin-top: 16px; font-size: 9px; color: #666; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <h2>ใบเสร็จรับเงิน</h2>
                  <p>ร้านไก่ย่างพังโคน</p>
                </div>
                <div class="meta">
                  <div class="meta-row"><span>วันที่:</span><span>${new Date().toLocaleString('th-TH')}</span></div>
                  <div class="meta-row"><span>ออเดอร์:</span><span><b>${data.order_id}</b></span></div>
                  <div class="meta-row"><span>:</span><span><b>${data.table_number || 'กลับบ้าน'}</b></span></div>
                  <div class="meta-row"><span>ชำระโดย:</span><span><b>${data.payment_status}</b></span></div>
                </div>
                <div class="items">
                  <table>
                    <thead>
                      <tr><th>รายการ</th><th class="qty">จำนวน</th><th class="total">รวม</th></tr>
                    </thead>
                    <tbody>
                      ${data.items.map(item => `
                        <tr>
                          <td>
                            <div class="name">${item.menu_items?.name || '-'}</div>
                            <div class="price-each">@${item.price}</div>
                          </td>
                          <td class="qty">x${item.quantity}</td>
                          <td class="total">${(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                <div class="total-section">
                  <div class="total-row">
                    <span class="total-label">ยอดสุทธิ</span>
                    <div><span class="total-amount">${data.total_amount.toLocaleString()}</span> บาท</div>
                  </div>
                </div>
                <div class="footer">
                  ขอบคุณที่ใช้บริการ<br/>
                  Thank you for your visit
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
        }, 250)
      }
    }
  }

  // ✅ Share function สำหรับมือถือ
  const handleShare = async () => {
    const receiptText = `
🧾 ใบเสร็จรับเงิน
━━━━━━━━━━━━━━━━
ร้านไก่ย่างพังโคน
📅 ${new Date().toLocaleString('th-TH')}
🔖 ออเดอร์: ${data.order_id}
🪑 : ${data.table_number || 'กลับบ้าน'}
━━━━━━━━━━━━━━━━
${data.items.map(item => `• ${item.menu_items?.name} x${item.quantity} = ฿${(item.price * item.quantity).toLocaleString()}`).join('\n')}
━━━━━━━━━━━━━━━━
💰 ยอดรวม: ฿${data.total_amount.toLocaleString()}
━━━━━━━━━━━━━━━━
ขอบคุณที่ใช้บริการ 🙏
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: `ใบเสร็จ ${data.order_id}`,
          text: receiptText,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(receiptText)
      alert('คัดลอกใบเสร็จแล้ว')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col w-full sm:max-w-sm max-h-[95vh] sm:max-h-[90vh]">
        
        {/* ✅ Drag Handle - Mobile */}
        <div className="sm:hidden flex justify-center py-2 bg-transparent">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Success Message */}
        <div className="flex items-center justify-center gap-2 text-emerald-400 py-3 animate-in slide-in-from-bottom-4 duration-500">
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold">ชำระเงินเรียบร้อยแล้ว</span>
        </div>

        {/* Receipt Card - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white sm:rounded-t-2xl rounded-t-3xl">
          <div 
            ref={receiptRef}
            className="p-5 sm:p-6"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-slate-200 pb-4 mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-black text-slate-800">ใบเสร็จรับเงิน</h2>
              <p className="text-slate-500 text-xs">ร้านไก่ย่างพังโคน</p>
            </div>

            {/* Meta Info */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่</span>
                <span className="text-slate-800 font-medium">{new Date().toLocaleString('th-TH')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ออเดอร์</span>
                <span className="text-slate-800 font-bold font-mono">{data.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500"></span>
                <span className="text-slate-800 font-bold">{data.table_number || 'กลับบ้าน'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ชำระโดย</span>
                <span className="text-slate-800 font-bold uppercase">{data.payment_status}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t-2 border-dashed border-slate-200 pt-4">
              <div className="space-y-3">
                {data.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {item.menu_items?.name}
                      </p>
                      <p className="text-xs text-slate-400">@{item.price} บาท</p>
                    </div>
                    <div className="text-center px-2 shrink-0">
                      <span className="text-sm text-slate-600">x{item.quantity}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-800">
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t-2 border-dashed border-slate-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">ยอดสุทธิ</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-800">
                    {data.total_amount.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500 ml-1">บาท</span>
                </div>
              </div>
              
              <div className="text-center mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  ขอบคุณที่ใช้บริการ 🙏<br/>
                  Thank you for your visit
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Actions - Fixed at Bottom */}
        <div className="bg-white border-t border-slate-100 p-4 sm:rounded-b-2xl">
          <div className="grid grid-cols-3 gap-2">
            {/* Close */}
            <button 
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-slate-600" />
              <span className="text-xs font-medium text-slate-600">ปิด</span>
            </button>

            {/* Share - สำหรับมือถือ */}
            <button 
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors active:scale-95"
            >
              <Share2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">แชร์</span>
            </button>

            {/* Print */}
            <button 
              onClick={handlePrint}
              className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors active:scale-95"
            >
              <Printer className="w-5 h-5 text-white" />
              <span className="text-xs font-medium text-white">พิมพ์</span>
            </button>
          </div>

          {/* Safe Area */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </div>
    </div>
  )
}