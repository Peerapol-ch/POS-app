'use client'

import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  ShoppingBag
} from 'lucide-react'

interface TakeawayOrder {
  id: number
  order_id: string
  created_at: string
  status: string
  table_id?: number // เพิ่ม field นี้เผื่อใช้
}

interface TakeawayQRModalProps {
  order: TakeawayOrder
  onClose: () => void
}

export default function TakeawayQRModal({ order, onClose }: TakeawayQRModalProps) {
  const [copied, setCopied] = useState(false)
  const baseUrl = 'https://phang-khon-chicken.vercel.app'
  const targetId = order.table_id || 9
  const orderUrl = `${baseUrl}/scan_qrcode?t=${targetId}`

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm mx-auto transform transition-all animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 delay-100">
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative">
            
            {/* Header Banner */}
            <div className="relative h-32 bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full opacity-10 mix-blend-overlay" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="3" cy="3" r="2" fill="currentColor" className="text-white" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#dots)" />
                </svg>
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-all backdrop-blur-sm z-20 group active:scale-90"
                >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Content */}
            <div className="relative px-8 pb-10 pt-0 flex flex-col items-center bg-white mt-[-3rem] rounded-t-[2.5rem]">
                
                {/* Floating Icon */}
                <div className="relative -top-10 mb-[-2rem] p-2 rounded-full bg-white">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 shadow-xl shadow-purple-500/30 flex items-center justify-center border-[4px] border-white p-1">
                        <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-white drop-shadow-md" />
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-purple-800 text-center mb-1">
                    ออเดอร์กลับบ้าน
                </h2>
                <p className="text-slate-500 font-mono text-sm text-center mb-6">
                    {order.order_id}
                </p>

                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 relative group cursor-pointer transition-transform hover:scale-105 duration-300 mb-6">
                     <a href={orderUrl} target="_blank" rel="noopener noreferrer">
                        <QRCodeCanvas value={orderUrl} size={180} level="L" includeMargin={false} />
                    </a>
                </div>

                {/* Link Action */}
                 <div className="w-full bg-slate-50 rounded-2xl p-2 flex items-center justify-between border border-slate-100 mb-4">
                    <div className="flex-1 min-w-0 px-3">
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Link</div>
                         <div className="text-xs text-slate-600 truncate font-mono">{orderUrl}</div>
                    </div>
                    <button 
                        onClick={handleCopyUrl}
                        className={`p-2 rounded-xl transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-purple-600'}`}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                 </div>

                 {/* Open Link Button */}
                 <a 
                    href={orderUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-200 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" /> เปิดหน้าสั่งอาหาร
                    </span>
                </a>
            </div>
        </div>
      </div>
    </div>
  )
}