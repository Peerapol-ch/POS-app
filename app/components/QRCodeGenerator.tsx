'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'
import { Download, Printer } from 'lucide-react'

interface QRCodeGeneratorProps {
  value: string       // ข้อมูลใน QR (URL หรือ PromptPay ID)
  label?: string      // ข้อความกำกับด้านล่าง
  size?: number       // ขนาด (default 200)
  logoUrl?: string    // โลโก้ตรงกลาง (ถ้ามี)
}

export default function QRCodeGenerator({ 
  value, 
  label, 
  size = 200,
  logoUrl 
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  // ฟังก์ชันดาวน์โหลด QR Code เป็นรูปภาพ
  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `qrcode-${label || 'image'}.png`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 w-fit mx-auto">
      
      {/* ส่วนแสดง QR Code */}
      <div ref={qrRef} className="p-4 bg-white rounded-xl border-2 border-slate-100">
        <QRCodeCanvas
          value={value}
          size={size}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"} // ระดับความละเอียด (L, M, Q, H) - H ดีสุดใส่โลโก้ได้
          includeMargin={false}
          imageSettings={logoUrl ? {
            src: logoUrl,
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true, // เจาะรูตรงกลางให้โลโก้
          } : undefined}
        />
      </div>

      {label && (
        <p className="font-bold text-slate-700 text-lg">{label}</p>
      )}

      {/* ปุ่ม Action */}
      <div className="flex gap-2 w-full">
        <button 
          onClick={downloadQRCode}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" /> บันทึก
        </button>
      </div>
    </div>
  )
}