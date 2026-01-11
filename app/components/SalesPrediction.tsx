'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import {
  Brain,
  X,
  Zap,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Star,
  Calendar,
  Target,
  Award,
  ChevronRight,
  Minus
} from 'lucide-react'

interface TimeSlotData {
  name: string
  icon: any
  hours: string
  orders: number
  revenue: number
  percentage: number
}

interface DayPrediction {
  dayName: string
  dayOfWeek: number
  avgRevenue: number
  avgOrders: number
  trend: 'up' | 'down' | 'stable'
  peakHour: number
  bestTimeSlot: string
}

interface SalesPredictionData {
  bestDays: DayPrediction[]
  nextBestDay: { date: Date; prediction: number; dayName: string; peakHour: number }
  timeSlots: TimeSlotData[]
  peakHours: { hour: number; avgOrders: number }[]
  insights: string[]
  weekdayVsWeekend: { weekday: number; weekend: number }
  averageOrderValue: number
  busiestHour: { hour: number; orders: number }
  slowestHour: { hour: number; orders: number }
  totalOrders: number
  totalRevenue: number
  analyzedDays: number
}

interface SalesPredictionProps {
  isOpen: boolean
  onClose: () => void
}

const thaiDayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

export default function SalesPrediction({ isOpen, onClose }:  SalesPredictionProps) {
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<SalesPredictionData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'hours' | 'insights'>('overview')

  useEffect(() => {
    if (isOpen && !prediction) {
      loadPrediction()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const loadPrediction = async () => {
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)

      const { data:  historicalData, error } = await supabase
        .from('orders')
        .select('total_amount, customer_count, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['served', 'completed'])

      if (error) throw error

      const result = analyzeData(historicalData || [])
      setPrediction(result)
    } catch (err) {
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeData = (data: any[]): SalesPredictionData => {
    const dayStats: { [key:  number]: { revenues: number[]; orders: number[]; count: number; hourlyOrders: { [h: number]: number } } } = {}
    const hourStats: { [key: number]: { orders: number; revenue: number; count: number } } = {}

    for (let i = 0; i < 7; i++) {
      dayStats[i] = { revenues: [], orders:  [], count: 0, hourlyOrders: {} }
      for (let h = 0; h < 24; h++) dayStats[i].hourlyOrders[h] = 0
    }
    for (let i = 0; i < 24; i++) {
      hourStats[i] = { orders: 0, revenue: 0, count: 0 }
    }

    const dailyTotals:  { [key: string]: { total:  number; orders: number; dayOfWeek: number } } = {}

    data.forEach((order) => {
      const orderDate = new Date(order.created_at)
      const dayOfWeek = orderDate.getDay()
      const hour = orderDate.getHours()
      const dateKey = orderDate.toISOString().split('T')[0]

      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { total: 0, orders: 0, dayOfWeek }
      }
      dailyTotals[dateKey].total += order.total_amount || 0
      dailyTotals[dateKey].orders += 1

      hourStats[hour].orders += 1
      hourStats[hour].revenue += order.total_amount || 0
      hourStats[hour].count += 1

      dayStats[dayOfWeek].hourlyOrders[hour] = (dayStats[dayOfWeek].hourlyOrders[hour] || 0) + 1
    })

    Object.values(dailyTotals).forEach((day) => {
      dayStats[day.dayOfWeek].revenues.push(day.total)
      dayStats[day.dayOfWeek].orders.push(day.orders)
      dayStats[day.dayOfWeek].count += 1
    })

    const timeSlotRanges = [
      { name: 'เช้า', icon: Coffee, hours: '06:00-11:59', start: 6, end: 11 },
      { name: 'กลางวัน', icon: Sun, hours: '12:00-14:59', start:  12, end:  14 },
      { name: 'บ่าย', icon:  Sunset, hours: '15:00-17:59', start:  15, end:  17 },
      { name: 'เย็น', icon: Moon, hours: '18:00-21:59', start:  18, end:  21 },
      { name: 'ดึก', icon: Star, hours: '22:00-05:59', start:  22, end:  5 },
    ]

    let totalSlotOrders = 0
    const timeSlots: TimeSlotData[] = timeSlotRanges.map((slot) => {
      let slotOrders = 0
      let slotRevenue = 0

      for (let h = slot.start; h <= (slot.end < slot.start ? 23 : slot.end); h++) {
        slotOrders += hourStats[h].orders
        slotRevenue += hourStats[h].revenue
      }
      if (slot.end < slot.start) {
        for (let h = 0; h <= slot.end; h++) {
          slotOrders += hourStats[h].orders
          slotRevenue += hourStats[h].revenue
        }
      }
      totalSlotOrders += slotOrders

      return { ...slot, orders: slotOrders, revenue: slotRevenue, percentage: 0 }
    })

    timeSlots.forEach((slot) => {
      slot.percentage = totalSlotOrders > 0 ? (slot.orders / totalSlotOrders) * 100 :  0
    })

    const dayPredictions: DayPrediction[] = []
    const totalDays = Object.keys(dailyTotals).length

    for (let i = 0; i < 7; i++) {
      const stats = dayStats[i]
      if (stats.count > 0) {
        const avgRevenue = stats.revenues.reduce((a, b) => a + b, 0) / stats.count
        const avgOrders = stats.orders.reduce((a, b) => a + b, 0) / stats.count

        let peakHour = 0
        let maxOrders = 0
        for (let h = 0; h < 24; h++) {
          if (stats.hourlyOrders[h] > maxOrders) {
            maxOrders = stats.hourlyOrders[h]
            peakHour = h
          }
        }

        let bestTimeSlot = 'เย็น'
        if (peakHour >= 6 && peakHour <= 11) bestTimeSlot = 'เช้า'
        else if (peakHour >= 12 && peakHour <= 14) bestTimeSlot = 'กลางวัน'
        else if (peakHour >= 15 && peakHour <= 17) bestTimeSlot = 'บ่าย'
        else if (peakHour >= 18 && peakHour <= 21) bestTimeSlot = 'เย็น'
        else bestTimeSlot = 'ดึก'

        const midPoint = Math.floor(stats.revenues.length / 2)
        const firstAvg = stats.revenues.slice(0, midPoint).reduce((a, b) => a + b, 0) / (midPoint || 1)
        const secondAvg = stats.revenues.slice(midPoint).reduce((a, b) => a + b, 0) / (stats.revenues.length - midPoint || 1)

        let trend:  'up' | 'down' | 'stable' = 'stable'
        if (secondAvg > firstAvg * 1.1) trend = 'up'
        else if (secondAvg < firstAvg * 0.9) trend = 'down'

        dayPredictions.push({
          dayName: thaiDayNames[i],
          dayOfWeek: i,
          avgRevenue,
          avgOrders,
          trend,
          peakHour,
          bestTimeSlot
        })
      }
    }

    dayPredictions.sort((a, b) => b.avgRevenue - a.avgRevenue)
    const bestDays = dayPredictions.slice(0, 3)

    const today = new Date()
    let nextBestDate = new Date(today)
    const bestDayOfWeek = bestDays[0]?.dayOfWeek ??  0

    while (nextBestDate.getDay() !== bestDayOfWeek || nextBestDate <= today) {
      nextBestDate.setDate(nextBestDate.getDate() + 1)
    }

    const peakHours = Object.entries(hourStats)
      .map(([hour, stats]) => ({ hour:  parseInt(hour), avgOrders: stats.count > 0 ? stats.orders / totalDays : 0 }))
      .filter((h) => h.avgOrders > 0)
      .sort((a, b) => b.avgOrders - a.avgOrders)
      .slice(0, 5)

    const hourlyPattern = Object.entries(hourStats).map(([h, s]) => ({ hour: parseInt(h), orders: s.orders / totalDays }))
    const sortedHours = hourlyPattern.filter((h) => h.orders > 0).sort((a, b) => b.orders - a.orders)
    const busiestHour = sortedHours[0] || { hour: 12, orders: 0 }
    const slowestHour = sortedHours[sortedHours.length - 1] || { hour: 6, orders: 0 }

    const weekendRevenues = [...dayStats[0].revenues, ...dayStats[6].revenues]
    const weekdayRevenues = [1, 2, 3, 4, 5].flatMap((d) => dayStats[d].revenues)
    const weekendAvg = weekendRevenues.length > 0 ?  weekendRevenues.reduce((a, b) => a + b, 0) / weekendRevenues.length :  0
    const weekdayAvg = weekdayRevenues.length > 0 ? weekdayRevenues.reduce((a, b) => a + b, 0) / weekdayRevenues.length : 0

    const insights:  string[] = []
    const totalRevenue = data.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const avgOrderValue = data.length > 0 ?  totalRevenue / data.length : 0

    if (bestDays.length > 0) {
      insights.push(`วัน${bestDays[0].dayName}เป็นวันที่ขายดีที่สุด เฉลี่ย ฿${formatCurrency(bestDays[0].avgRevenue)}/วัน`)
    }
    if (peakHours.length > 0) {
      insights.push(`ช่วงเวลา ${formatHour(peakHours[0].hour)} น.  มีลูกค้ามากที่สุด`)
    }
    const bestSlot = timeSlots.reduce((max, s) => s.orders > max.orders ?  s : max, timeSlots[0])
    if (bestSlot) {
      insights.push(`ช่วง${bestSlot.name} (${bestSlot.hours}) ขายดีที่สุด ${bestSlot.percentage.toFixed(0)}%`)
    }
    if (weekendAvg > weekdayAvg * 1.1) {
      insights.push(`วันหยุดขายดีกว่าวันธรรมดา ${(((weekendAvg / weekdayAvg) - 1) * 100).toFixed(0)}%`)
    } else if (weekdayAvg > weekendAvg * 1.1) {
      insights.push(`วันธรรมดาขายดีกว่าวันหยุด ${(((weekdayAvg / weekendAvg) - 1) * 100).toFixed(0)}%`)
    }
    if (avgOrderValue > 0) {
      insights.push(`ยอดเฉลี่ยต่อบิล ฿${formatCurrency(avgOrderValue)}`)
    }

    return {
      bestDays,
      nextBestDay:  { date: nextBestDate, prediction: bestDays[0]?.avgRevenue || 0, dayName: thaiDayNames[bestDayOfWeek], peakHour: bestDays[0]?.peakHour || 12 },
      timeSlots,
      peakHours,
      insights,
      weekdayVsWeekend:  { weekday: weekdayAvg, weekend: weekendAvg },
      averageOrderValue:  avgOrderValue,
      busiestHour,
      slowestHour,
      totalOrders: data.length,
      totalRevenue,
      analyzedDays:  totalDays
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm">
      {/* Modified Container:
        - Mobile: inset-0 (full screen)
        - Tablet/Desktop: inset-4 / inset-8 (popup style)
      */}
      <div className="absolute inset-0 sm:inset-4 lg:inset-8 bg-stone-50 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-white border-b border-stone-200 p-4 lg:p-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-800">คาดการณ์ยอดขาย</h2>
                <p className="text-xs text-stone-400">วิเคราะห์จากข้อมูล {prediction?.analyzedDays || 0} วัน</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          {/* Tabs - Scrollable on very small screens */}
          <div className="flex gap-1 mt-4 bg-stone-100 p-1 rounded-xl overflow-x-auto">
            {[
              { id:  'overview', label: 'ภาพรวม', icon: Target },
              { id: 'days', label: 'รายวัน', icon:  Calendar },
              { id: 'hours', label: 'รายชั่วโมง', icon: Clock },
              { id: 'insights', label: 'คำแนะนำ', icon:  Lightbulb },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {/* Show Label on mobile if active, or just icon? Keeping text hidden on very small screens for cleanliness */}
                  <span className="sm:hidden text-xs">{tab.label}</span> 
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 sm:pb-6">
          {loading ?  (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-stone-500 font-medium">กำลังวิเคราะห์ข้อมูล...</p>
              </div>
            </div>
          ) : prediction ?  (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                // Added md:grid-cols-2 for tablets
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* Next Best Day Card */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <div className="bg-white rounded-2xl p-5 border border-stone-200 h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="font-semibold text-stone-800">วันขายดีถัดไป</span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xl md:text-2xl font-bold text-stone-800">
                          {prediction.nextBestDay.date.toLocaleDateString('th-TH', { weekday: 'long' })}
                        </p>
                        <p className="text-stone-500 text-sm">
                          {prediction.nextBestDay.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
                        <Clock className="w-4 h-4" />
                        <span>ช่วงขายดี:  {formatHour(prediction.nextBestDay.peakHour)} น. </span>
                      </div>

                      <div className="pt-4 border-t border-stone-100">
                        <p className="text-xs text-stone-400 mb-1">คาดการณ์รายได้</p>
                        <p className="text-2xl md:text-3xl font-bold text-emerald-600">฿{formatCurrency(prediction.nextBestDay.prediction)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Top 3 Days */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-stone-200 h-full">
                      <div className="px-4 py-3 border-b border-stone-100">
                        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          Top 3 วันขายดี
                        </h3>
                      </div>
                      <div className="divide-y divide-stone-50">
                        {prediction.bestDays.map((day, index) => (
                          <div key={day.dayOfWeek} className="px-4 py-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              index === 0 ?  'bg-amber-100 text-amber-700' : 
                              index === 1 ? 'bg-stone-100 text-stone-600' :
                              'bg-orange-50 text-orange-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-stone-800">{day.dayName}</p>
                                {day.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                                {day.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                              </div>
                              <p className="text-xs text-stone-400">{day.avgOrders.toFixed(0)} ออเดอร์</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-stone-800">฿{formatCurrency(day.avgRevenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Weekday vs Weekend */}
                    <div className="bg-white rounded-2xl p-4 border border-stone-200">
                      <h3 className="font-semibold text-stone-800 mb-3 text-sm">วันธรรมดา vs วันหยุด</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-sky-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-stone-500 mb-1">วันธรรมดา</p>
                          <p className="font-bold text-sky-700 text-sm md:text-base">฿{formatCurrency(prediction.weekdayVsWeekend.weekday)}</p>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-stone-500 mb-1">วันหยุด</p>
                          <p className="font-bold text-violet-700 text-sm md:text-base">฿{formatCurrency(prediction.weekdayVsWeekend.weekend)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="bg-white rounded-2xl p-4 border border-stone-200">
                      <h3 className="font-semibold text-stone-800 mb-3 text-sm">สถิติสำคัญ</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-stone-600">เฉลี่ย/บิล</span>
                          </div>
                          <span className="font-semibold text-stone-800">฿{formatCurrency(prediction.averageOrderValue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-sky-500" />
                            <span className="text-sm text-stone-600">ชั่วโมงขายดี</span>
                          </div>
                          <span className="font-semibold text-stone-800">{formatHour(prediction.busiestHour.hour)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-stone-400" />
                            <span className="text-sm text-stone-600">ชั่วโมงเงียบ</span>
                          </div>
                          <span className="font-semibold text-stone-800">{formatHour(prediction.slowestHour.hour)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Days Tab */}
              {activeTab === 'days' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* Next Best Day */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold text-stone-800">วันขายดีถัดไป</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-stone-800 mb-1">
                      {prediction.nextBestDay.date.toLocaleDateString('th-TH', { weekday: 'long' })}
                    </p>
                    <p className="text-stone-500 mb-4">
                      {prediction.nextBestDay.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 mb-1">คาดการณ์รายได้</p>
                        <p className="text-lg md:text-xl font-bold text-emerald-600">฿{formatCurrency(prediction.nextBestDay.prediction)}</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 mb-1">ช่วงขายดี</p>
                        <p className="text-lg md:text-xl font-bold text-stone-800">{formatHour(prediction.nextBestDay.peakHour)}</p>
                      </div>
                    </div>
                  </div>

                  {/* All Days Ranking */}
                  <div className="bg-white rounded-2xl border border-stone-200">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <h3 className="font-semibold text-stone-800">อันดับวันขายดี</h3>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {prediction.bestDays.map((day, index) => (
                        <div key={day.dayOfWeek} className="px-4 py-4 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-stone-100 text-stone-600' :
                            'bg-orange-50 text-orange-600'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-stone-800">{day.dayName}</p>
                              {day.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                              {day.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-stone-400">
                              <span>{day.avgOrders.toFixed(0)} ออเดอร์</span>
                              <Minus className="hidden md:block w-3 h-3" />
                              <span>ช่วง{day.bestTimeSlot}</span>
                              <Minus className="hidden md:block w-3 h-3" />
                              <span>Peak {formatHour(day.peakHour)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-base md:text-lg text-stone-800">฿{formatCurrency(day.avgRevenue)}</p>
                            <p className="text-xs text-stone-400">เฉลี่ย/วัน</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Hours Tab */}
              {activeTab === 'hours' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* Time Slots */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-500" />
                      ช่วงเวลาขายดี
                    </h3>
                    {prediction.timeSlots
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((slot, index) => {
                        const IconComponent = slot.icon
                        return (
                          <div key={slot.name} className="bg-white rounded-xl p-4 border border-stone-200">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                                <IconComponent className="w-6 h-6 text-stone-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-stone-800">{slot.name}</span>
                                    <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">{slot.hours}</span>
                                    {index === 0 && (
                                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">ขายดีสุด</span>
                                    )}
                                  </div>
                                  <span className="font-bold text-stone-800">{slot.percentage.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-stone-400 rounded-full"
                                    style={{ width: `${slot.percentage}%` }}
                                  />
                                </div>
                                <p className="text-xs text-stone-400 mt-2">{slot.orders} ออเดอร์ • ฿{formatCurrency(slot.revenue)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* Peak Hours */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 border border-stone-200">
                      <h3 className="font-semibold text-stone-800 mb-4">ชั่วโมงยอดนิยม</h3>
                      <div className="flex flex-wrap gap-2">
                        {prediction.peakHours.slice(0, 5).map((hour, index) => (
                          <div key={hour.hour} className={`px-4 py-3 rounded-xl flex-grow md:flex-grow-0 ${
                            index === 0
                              ? 'bg-stone-800 text-white'
                              :  'bg-stone-100 text-stone-600'
                          }`}>
                            <p className="font-bold text-lg">{formatHour(hour.hour)}</p>
                            <p className={`text-sm ${index === 0 ?  'text-stone-300' : 'text-stone-400'}`}>
                              {hour.avgOrders.toFixed(1)} ออเดอร์
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                        <Activity className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs text-stone-500 mb-1">ชั่วโมงขายดีสุด</p>
                        <p className="text-xl font-bold text-emerald-700">{formatHour(prediction.busiestHour.hour)}</p>
                      </div>
                      <div className="bg-stone-100 rounded-xl p-4 text-center border border-stone-200">
                        <Moon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                        <p className="text-xs text-stone-500 mb-1">ชั่วโมงเงียบสุด</p>
                        <p className="text-xl font-bold text-stone-600">{formatHour(prediction.slowestHour.hour)}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-stone-200">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">ยอดเฉลี่ย/บิล</span>
                        <span className="text-xl font-bold text-stone-800">฿{formatCurrency(prediction.averageOrderValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* Insights List */}
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      คำแนะนำจากข้อมูล
                    </h3>
                    {prediction.insights.map((insight, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-white rounded-xl border border-stone-200"
                      >
                        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ChevronRight className="w-5 h-5 text-stone-500" />
                        </div>
                        <p className="text-stone-700 leading-relaxed flex-1 pt-2">{insight}</p>
                      </div>
                    ))}
                  </div>

                  {/* Summary Stats */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl p-5 border border-stone-200">
                      <h3 className="font-semibold text-stone-800 mb-4">สรุปสถิติ</h3>
                      <div className="space-y-4">
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <p className="text-xs text-stone-400 mb-1">ยอดเฉลี่ย/บิล</p>
                          <p className="text-xl font-bold text-stone-800">฿{formatCurrency(prediction.averageOrderValue)}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <p className="text-xs text-stone-400 mb-1">วันขายดีที่สุด</p>
                          <p className="text-xl font-bold text-stone-800">{prediction.bestDays[0]?.dayName || '-'}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <p className="text-xs text-stone-400 mb-1">ชั่วโมงขายดี</p>
                          <p className="text-xl font-bold text-stone-800">{formatHour(prediction.busiestHour.hour)}</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <p className="text-xs text-stone-400 mb-1">ข้อมูลที่วิเคราะห์</p>
                          <p className="text-xl font-bold text-stone-800">{prediction.analyzedDays} วัน</p>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <p className="text-xs text-stone-400 mb-1">จำนวนออเดอร์ทั้งหมด</p>
                          <p className="text-xl font-bold text-stone-800">{formatCurrency(prediction.totalOrders)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}