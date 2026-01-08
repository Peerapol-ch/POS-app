'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import QuickMenu from '@/app/components/QuickMenu'
import {
  Package,
  AlertTriangle,
  Printer,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  FileText,
  CheckCircle,
  ShoppingCart
} from 'lucide-react'

interface LowStockIngredient {
  id:  number
  name: string
  unit: string
  current_stock: number
  min_threshold: number
  cost_per_unit: number
}

export default function LowStockPage() {
  const [ingredients, setIngredients] = useState<LowStockIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLowStockItems()
  }, [])

  const loadLowStockItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error:  fetchError } = await supabase
        . from('ingredients')
        .select('*')
        .order('name')

      if (fetchError) throw fetchError

      // กรองเฉพาะรายการที่ใกล้หมด
      const lowStockItems:  LowStockIngredient[] = (data || [])
        .filter(item => item.current_stock <= item.min_threshold)
        .map(item => ({
          id: item.id,
          name:  item.name,
          unit: item. unit,
          current_stock: item. current_stock,
          min_threshold:  item.min_threshold,
          cost_per_unit: item.cost_per_unit,
        }))
        .sort((a, b) => {
          // เรียงตามความเร่งด่วน (สต็อกน้อยที่สุดก่อน)
          const aRatio = a.current_stock / a. min_threshold
          const bRatio = b.current_stock / b.min_threshold
          return aRatio - bRatio
        })

      setIngredients(lowStockItems)
      setLastUpdated(new Date())
    } catch (err:  any) {
      console.error('Error loading data:', err)
      setError(err?. message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (! printWindow) {
      alert('กรุณาอนุญาตให้เปิด popup เพื่อพิมพ์')
      return
    }

    const styles = `
      <style>
        * {
          margin:  0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
          padding: 20px;
          color: #1a1a1a;
        }
        .header {
          text-align: center;
          margin-bottom:  30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 14px;
          color: #666;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
          padding:  15px;
          background: #f5f5f5;
          border-radius:  8px;
        }
        . summary-item {
          text-align: center;
        }
        .summary-item . value {
          font-size: 24px;
          font-weight: bold;
          color: #dc2626;
        }
        .summary-item .label {
          font-size:  12px;
          color: #666;
        }
        table {
          width:  100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background:  #333;
          color: white;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        .text-right {
          text-align: right;
        }
        . text-center {
          text-align: center;
        }
        . urgent {
          background:  #fee2e2 !important;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-critical {
          background:  #dc2626;
          color: white;
        }
        . status-warning {
          background: #f59e0b;
          color: white;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
        .checkbox {
          width: 18px;
          height: 18px;
          border:  2px solid #333;
          display: inline-block;
        }
        .write-box {
          min-width: 80px;
          height: 28px;
          border-bottom: 1px solid #333;
          display:  inline-block;
        }
        .total-row {
          background: #333 !important;
          color: white;
        }
        .total-row td {
          border-bottom: none;
        }
        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          height: 40px;
          margin-bottom: 5px;
        }
        @media print {
          body { padding: 10px; }
          .no-print { display:  none; }
        }
      </style>
    `

    printWindow. document.write(`
      <! DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>รายการวัตถุดิบที่ต้องสั่งซื้อ</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun: wght@400;600;700&display=swap" rel="stylesheet">
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>รายการวัตถุดิบที่ต้องสั่งซื้อ</h1>
          <p>ร้านไก่ย่างพังโคน</p>
          <p>วันที่พิมพ์:  ${formatDateTime(new Date())}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="value">${ingredients.length}</div>
            <div class="label">รายการที่ต้องสั่ง</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;" class="text-center">✓</th>
              <th style="width: 40px;" class="text-center">#</th>
              <th>ชื่อวัตถุดิบ</th>
              <th class="text-center">หน่วย</th>
              <th class="text-center">สถานะ</th>
              <th class="text-right">คงเหลือ</th>
              <th class="text-right">ขั้นต่ำ</th>
              <th class="text-center">จำนวนที่สั่ง</th>
              <th class="text-center">ราคา/หน่วย</th>
              <th class="text-center">รวม</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map((item, index) => {
              const ratio = item.current_stock / item.min_threshold
              const isUrgent = ratio <= 0.5
              const statusClass = isUrgent ? 'status-critical' : 'status-warning'
              const statusText = isUrgent ? 'ด่วน!' : 'ใกล้หมด'
              const rowClass = isUrgent ? 'urgent' : ''
              
              return `
                <tr class="${rowClass}">
                  <td class="text-center"><div class="checkbox"></div></td>
                  <td class="text-center">${index + 1}</td>
                  <td><strong>${item.name}</strong></td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-center"><span class="status-badge ${statusClass}">${statusText}</span></td>
                  <td class="text-right">${formatNumber(item.current_stock)} ${item.unit}</td>
                  <td class="text-right">${formatNumber(item.min_threshold)} ${item.unit}</td>
                  <td class="text-center"><div class="write-box"></div></td>
                  <td class="text-center"><div class="write-box"></div></td>
                  <td class="text-center"><div class="write-box"></div></td>
                </tr>
              `
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="7" class="text-right"><strong>รวมทั้งหมด</strong></td>
              <td class="text-center"><div class="write-box" style="background: rgba(255,255,255,0.2);"></div></td>
              <td></td>
              <td class="text-center"><div class="write-box" style="background: rgba(255,255,255,0.2);"></div></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p><strong>หมายเหตุ:</strong></p>
          <p style="margin-top: 10px; min-height: 60px; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          </p>
        </div>
      </body>
      </html>
    `)

    printWindow. document.close()
    printWindow.focus()
    
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const formatNumber = (num:  number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits:  0, maximumFractionDigits: 2 }).format(num)

  const formatDateTime = (date:  Date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalItems = ingredients.length
  const criticalItems = ingredients. filter(i => i.current_stock / i.min_threshold <= 0.5).length

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">กำลังโหลดข้อมูล... </p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm max-w-sm w-full text-center border border-stone-200">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-stone-500 text-sm mb-4">{error}</p>
          <button onClick={loadLowStockItems} className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
            ลองใหม่
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/ingredients"
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-bold text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  วัตถุดิบที่ต้องสั่งซื้อ
                </h1>
                <p className="text-red-100 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  อัพเดทล่าสุด:  {formatTime(lastUpdated)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadLowStockItems}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrint}
                disabled={ingredients.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-5 h-5" />
                <span className="hidden sm:inline">พิมพ์</span>
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur">
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-red-100">รายการทั้งหมด</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur">
              <p className="text-2xl font-bold text-yellow-300">{criticalItems}</p>
              <p className="text-xs text-red-100">ด่วนมาก</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4" ref={printRef}>
        {ingredients.length === 0 ?  (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="font-bold text-xl text-stone-800 mb-2">ยอดเยี่ยม!  🎉</h2>
            <p className="text-stone-500">ไม่มีวัตถุดิบที่ต้องสั่งซื้อในขณะนี้</p>
            <p className="text-stone-400 text-sm mt-2">สต็อกทุกรายการอยู่ในระดับที่เพียงพอ</p>
            <Link
              href="/ingredients"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
            >
              <Package className="w-5 h-5" />
              กลับไปหน้าวัตถุดิบ
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <ShoppingCart className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">รายการสั่งซื้อ</p>
                <p className="text-sm text-amber-600">กดพิมพ์เพื่อพิมพ์ใบสั่งซื้อ สามารถเขียนจำนวนและราคาเองได้</p>
              </div>
            </div>

            {/* List */}
            {ingredients.map((item, index) => {
              const ratio = item.current_stock / item.min_threshold
              const isCritical = ratio <= 0.5
              const isZero = item.current_stock === 0

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border overflow-hidden ${
                    isZero ? 'border-red-400 ring-2 ring-red-100' : 
                    isCritical ? 'border-red-300' : 'border-orange-200'
                  }`}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          isZero ? 'bg-red-600' : 
                          isCritical ? 'bg-red-500' : 'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-800">{item.name}</h3>
                          <p className="text-sm text-stone-500">หน่วย:  {item.unit}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isZero ? 'bg-red-100 text-red-700' :
                        isCritical ? 'bg-red-100 text-red-600' :  'bg-orange-100 text-orange-600'
                      }`}>
                        {isZero ? '🚨 หมดแล้ว!' : isCritical ? '⚠️ ด่วนมาก!' : '⏰ ใกล้หมด'}
                      </div>
                    </div>

                    {/* Stock Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-stone-500 mb-1">
                        <span>คงเหลือ:  {formatNumber(item.current_stock)} {item.unit}</span>
                        <span>ขั้นต่ำ: {formatNumber(item. min_threshold)} {item.unit}</span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isZero ? 'bg-red-600' : 
                            isCritical ? 'bg-red-400' : 'bg-orange-400'
                          }`}
                          style={{
                            width: `${Math.min((item.current_stock / item.min_threshold) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div className="bg-stone-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-xs text-stone-500">คงเหลือ</p>
                          <p className={`text-xl font-bold ${isZero ? 'text-red-600' : 'text-stone-800'}`}>
                            {formatNumber(item.current_stock)}
                          </p>
                          <p className="text-xs text-stone-400">{item.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">ต้องมีขั้นต่ำ</p>
                          <p className="text-xl font-bold text-stone-700">{formatNumber(item.min_threshold)}</p>
                          <p className="text-xs text-stone-400">{item.unit}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total Footer */}
            <div className="bg-stone-800 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <p className="font-bold">รายการที่ต้องสั่งซื้อ</p>
                    <p className="text-stone-300 text-sm">{totalItems} รายการ</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-stone-300 text-sm">ด่วนมาก</p>
                  <p className="text-2xl font-bold text-yellow-400">{criticalItems}</p>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-700 transition-colors"
            >
              <Printer className="w-6 h-6" />
              พิมพ์ใบสั่งซื้อ
            </button>
          </div>
        )}
      </div>

      <QuickMenu currentPage="ingredients" />
    </main>
  )
}