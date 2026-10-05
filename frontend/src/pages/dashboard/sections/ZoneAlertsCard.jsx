import React from 'react'
import { AlertTriangle, Car, Bike, ShieldAlert } from 'lucide-react'

export default function ZoneAlertsCard({
  cam1Counts,
  cam2Counts,
  cam3Counts
}) {
  // Evaluates clear parking status level
  const getParkingStatus = (free, total) => {
    if (total <= 0) return { label: 'ไม่มีข้อมูล', bg: 'bg-[#F4F1E8]', text: 'text-[#85847E]', isAlert: false }
    const occPct = Math.round(((total - free) / total) * 100)
    if (free === 0) {
      return { label: 'เต็มแล้ว (Full)', bg: 'bg-[#FDECEC]', text: 'text-[#A33A3A]', isAlert: true }
    }
    if (free === 1 || occPct >= 80) {
      return { label: 'ใกล้เต็ม (Nearly Full)', bg: 'bg-[#FFF4E5]', text: 'text-[#8A6A1F]', isAlert: true }
    }
    if (occPct >= 40) {
      return { label: 'จอดปานกลาง (Moderate)', bg: 'bg-[#FAF8EF]', text: 'text-[#85847E]', isAlert: false }
    }
    return { label: 'ว่างมาก (Available)', bg: 'bg-[#EAF6E8]', text: 'text-[#4F6B4A]', isAlert: false }
  }

  // Camera Groups structured hierarchically: Camera -> Vehicle Type -> Zone
  const cameraGroups = [
    {
      code: 'CAM-01',
      title: 'ลานหน้าภาค 1 (กลางแจ้ง)',
      vehicles: [
        {
          type: 'car',
          typeLabel: 'รถยนต์ (Car)',
          icon: Car,
          zone: 'Zone A · ช่องจอดรถยนต์หลัก',
          free: cam1Counts?.car?.free ?? 1,
          total: cam1Counts?.car?.total ?? 6
        },
        {
          type: 'bike',
          typeLabel: 'รถมอเตอร์ไซค์ (Motorcycle)',
          icon: Bike,
          zone: 'Zone A · ซองจอดรถจักรยานยนต์',
          free: cam1Counts?.bike?.free ?? 6,
          total: cam1Counts?.bike?.total ?? 9
        }
      ]
    },
    {
      code: 'CAM-02',
      title: 'ลานหน้าภาค 2 (ในร่ม)',
      vehicles: [
        {
          type: 'car',
          typeLabel: 'รถยนต์ (Car)',
          icon: Car,
          zone: 'Zone B · ช่องจอดรถอาจารย์/บุคลากร',
          free: cam2Counts?.car?.free ?? 0,
          total: cam2Counts?.car?.total ?? 5
        },
        {
          type: 'bike',
          typeLabel: 'รถมอเตอร์ไซค์ (Motorcycle)',
          icon: Bike,
          zone: 'Zone B · ช่องจอดมอไซค์ใต้ชายคา',
          free: cam2Counts?.bike?.free ?? 4,
          total: cam2Counts?.bike?.total ?? 13
        }
      ]
    },
    {
      code: 'CAM-03',
      title: 'ลานข้างตึกภาคคอมพิวเตอร์',
      vehicles: [
        {
          type: 'bike',
          typeLabel: 'รถมอเตอร์ไซค์ (Motorcycle)',
          icon: Bike,
          zone: 'Zone C · ลานจอดมอไซค์นักศึกษา',
          free: cam3Counts?.bike?.free ?? 18,
          total: cam3Counts?.bike?.total ?? 25
        }
      ]
    }
  ]

  // Count active alerts (Full or Nearly Full)
  let alertCount = 0
  cameraGroups.forEach((group) => {
    group.vehicles.forEach((v) => {
      const st = getParkingStatus(v.free, v.total)
      if (st.isAlert) alertCount++
    })
  })

  return (
    <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-6 flex flex-col gap-4 shadow-2xs w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F4F1E8]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#30312F]" />
          <h3 className="font-sans font-bold text-xl text-[#30312F] tracking-tight">
            แจ้งเตือนสถานะโซน
          </h3>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full font-sans font-semibold text-xs ${
            alertCount > 0
              ? 'bg-[#FDECEC] text-[#A33A3A]'
              : 'bg-[#EAF6E8] text-[#4F6B4A]'
          }`}
        >
          {alertCount > 0 ? `${alertCount} ACTIVE` : 'ALL NORMAL'}
        </div>
      </div>

      {/* Subtitle */}
      <p className="font-sans text-xs text-[#85847E] -mt-1">
        แยกกรุ๊ปตามกล้อง ระบุประเภทรถและโซนอย่างเป็นระเบียบ
      </p>

      {/* Group List by Camera */}
      <div className="flex flex-col gap-3.5">
        {cameraGroups.map((camGroup) => (
          <div
            key={camGroup.code}
            className="p-3.5 bg-[#FAF8EF] border border-[#CFCFC4] rounded-[16px] flex flex-col gap-2.5"
          >
            {/* Camera Group Title */}
            <div className="flex items-center justify-between border-b border-[#E8E6DB] pb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#CFCFC4] text-[#30312F]">
                  {camGroup.code}
                </span>
                <span className="font-sans text-xs font-semibold text-[#30312F]">
                  {camGroup.title}
                </span>
              </div>
            </div>

            {/* Vehicle Rows inside this Camera */}
            <div className="flex flex-col gap-2">
              {camGroup.vehicles.map((v) => {
                const Icon = v.icon
                const st = getParkingStatus(v.free, v.total)

                return (
                  <div
                    key={v.zone}
                    className="p-2.5 bg-white rounded-[12px] border border-[#E8E6DB] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    {/* Vehicle Type & Zone */}
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-[8px] bg-[#FAF8EF] border border-[#CFCFC4] flex items-center justify-center shrink-0 text-[#30312F] mt-0.5 sm:mt-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-sans text-xs font-semibold text-[#30312F] truncate">
                          {v.typeLabel}
                        </div>
                        <div className="font-sans text-[11px] text-[#85847E] truncate">
                          {v.zone}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Numbers */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-9 sm:pl-0">
                      <span className="font-mono text-xs font-semibold text-[#30312F]">
                        ว่าง <strong className="font-bold text-[#284E1A]">{v.free}</strong>/{v.total}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-sans font-semibold text-[11px] whitespace-nowrap ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
