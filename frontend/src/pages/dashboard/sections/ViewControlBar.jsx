import React from 'react'
import {
  Car,
  Bike,
  Sparkles,
  Activity
} from 'lucide-react'
import SectionHeading from '../../../components/ui/SectionHeading.jsx'
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx'

export default function ViewControlBar({
  totalCarFree,
  totalCarTotal,
  totalBikeFree,
  totalBikeTotal,
  avgChance,
  onlineCount = 0
}) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header Row with Title */}
      <SectionHeading
        title="Parking overview"
        subtitle="ระบบตรวจจับและทำนายความพร้อมช่องจอดรถแบบ Real-Time ด้วย AI Edge Computing"
      />

      {/* KPI Strip (4 Columns) */}
      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">Car vacancies</span>
            <Car className="dashboard-kpi-icon" strokeWidth={1.7} />
          </div>
          <div className="dashboard-kpi-value">
            <AnimatedNumber value={totalCarFree} />/<AnimatedNumber value={totalCarTotal} />
          </div>
          <div className="dashboard-kpi-detail">
            จำนวนช่องจอดรถยนต์ที่ว่าง
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">Bike vacancies</span>
            <Bike className="dashboard-kpi-icon" strokeWidth={1.7} />
          </div>
          <div className="dashboard-kpi-value">
            <AnimatedNumber value={totalBikeFree} />/<AnimatedNumber value={totalBikeTotal} />
          </div>
          <div className="dashboard-kpi-detail">
            จำนวนช่องจอดมอเตอร์ไซค์ที่ว่าง
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">Vacancy estimate</span>
            <Sparkles className="dashboard-kpi-icon" strokeWidth={1.7} />
          </div>
          <div className="dashboard-kpi-value">
            ~<AnimatedNumber value={avgChance} />%
          </div>
          <div className="dashboard-kpi-detail">
            ประมาณการจากอัตราช่องว่างปัจจุบัน (ไม่ใช่ผลพยากรณ์ AI)
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">Cameras online</span>
            <Activity className="dashboard-kpi-icon" strokeWidth={1.7} />
          </div>
          <div className="dashboard-kpi-value">
            <AnimatedNumber value={onlineCount} />/3
          </div>
          <div className="dashboard-kpi-detail">
            จำนวนกล้องที่ส่งภาพภายใน 15 นาที
          </div>
        </div>
      </div>
    </div>
  )
}
