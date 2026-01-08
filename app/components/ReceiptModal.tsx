'use client'

import { useEffect, useRef } from 'react'
import { X, Printer, CheckCircle, Receipt } from 'lucide-react'

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
  table_number?: string | number // รับเลขโต๊ะมาแสดงด้วยถ้ามี
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
    // ฟังก์ชันพิมพ์แบบง่ายๆ โดยเปิดหน้าต่างใหม่หรือใช้ window.print()
    // ในที่นี้เราจะจำลองการพิมพ์เฉพาะส่วนใบเสร็จ
    const printContent = receiptRef.current
    if (printContent) {
      const originalContents = document.body.innerHTML
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload() // Reload เพื่อคืนค่าหน้าจอเดิม (วิธีง่ายสุดสำหรับ Single Page)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        
        {/* Success Message */}
        <div className="flex items-center gap-2 text-emerald-400 mb-2 animate-in slide-in-from-bottom-4 duration-500">
            <CheckCircle className="w-6 h-6" />
            <span className="font-bold text-lg">ชำระเงินเรียบร้อยแล้ว</span>
        </div>

        {/* Receipt Card */}
        <div 
            ref={receiptRef}
            className="bg-white w-full rounded-none shadow-2xl overflow-hidden relative text-slate-800 font-mono text-sm leading-relaxed"
            style={{ 
                backgroundImage: 'radial-gradient(circle, #f1f5f9 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                filter: 'drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08))' 
            }}
        >
            {/* Paper Tear Effect Top */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/5 to-transparent"></div>

            <div className="p-8 flex flex-col gap-4">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-wider">ใบเสร็จรับเงิน</h2>
                    <p className="text-slate-500 text-xs mt-1">ร้านไก่ย่างพังโคน</p>
                </div>

                {/* Meta Info */}
                <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                        <span>วันที่:</span>
                        <span className="text-slate-800">{new Date().toLocaleString('th-TH')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>ออเดอร์:</span>
                        <span className="text-slate-800 font-bold">{data.order_id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>โต๊ะ:</span>
                        <span className="text-slate-800 font-bold">{data.table_number || 'กลับบ้าน'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>ชำระโดย:</span>
                        <span className="text-slate-800 uppercase font-bold">{data.payment_status}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="border-t-2 border-dashed border-slate-300 pt-4 min-h-[100px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs text-slate-400 border-b border-slate-100">
                                <th className="pb-2 font-normal">รายการ</th>
                                <th className="pb-2 font-normal text-center">จำนวน</th>
                                <th className="pb-2 font-normal text-right">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {data.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-2 pr-2 align-top">
                                        <div className="font-bold text-slate-700">{item.menu_items?.name}</div>
                                        <div className="text-[10px] text-slate-400">@{item.price}</div>
                                    </td>
                                    <td className="py-2 px-2 align-top text-center">x{item.quantity}</td>
                                    <td className="py-2 pl-2 align-top text-right font-bold">{item.price * item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="border-t-2 border-dashed border-slate-300 pt-4">
                    <div className="flex justify-between items-end">
                        <span className="font-bold text-lg">ยอดสุทธิ</span>
                        <div className="text-right">
                            <span className="text-2xl font-black">{data.total_amount.toLocaleString()}</span>
                            <span className="text-xs font-bold ml-1">บาท</span>
                        </div>
                    </div>
                    <div className="text-center mt-6 text-[10px] text-slate-400">
                        ขอบคุณที่ใช้บริการ<br/>
                        Thank you for your visit
                    </div>
                </div>
            </div>

            {/* Paper Tear Effect Bottom */}
             <div className="h-4 bg-white relative" style={{maskImage: 'radial-gradient(circle at 10px 10px, transparent 10px, black 10px)', maskSize: '20px 20px', maskPosition: '-10px 0'}}></div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
            <button 
                onClick={onClose}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                <X className="w-5 h-5" /> ปิด
            </button>
            <button 
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                <Printer className="w-5 h-5" /> พิมพ์ใบเสร็จ
            </button>
        </div>

      </div>
    </div>
  )
}