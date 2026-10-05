import React from 'react'
import {
  Camera,
  Cpu,
  Activity
} from 'lucide-react'
import { PillTag } from '../../../components/ui/FigmaCards'

export default function LogTicker({ currentRecord }) {
  const hasRecord = Boolean(currentRecord)

  const filename = currentRecord?.filename || '—'
  const chipTemp = currentRecord?.chip_temp_c !== undefined && currentRecord?.chip_temp_c !== null
    ? `${currentRecord.chip_temp_c}°C`
    : '—'
  const freeHeap = currentRecord?.free_heap !== undefined && currentRecord?.free_heap !== null
    ? `${Math.round(currentRecord.free_heap / 1024)}KB`
    : '—'
  const time = currentRecord?.local_time
    ? currentRecord.local_time.split(' ')[1] || currentRecord.local_time
    : '—'
  const clientIp = currentRecord?.client_ip || '—'
  const wifiRssi = currentRecord?.wifi_rssi_dbm !== undefined && currentRecord?.wifi_rssi_dbm !== null
    ? `${currentRecord.wifi_rssi_dbm}dBm`
    : '—'
  const lightAec = currentRecord?.light_aec_value !== undefined && currentRecord?.light_aec_value !== null
    ? `${currentRecord.light_aec_value}`
    : '—'

  const logItems = hasRecord
    ? [
        {
          id: 1,
          icon: Camera,
          title: `[CAM-01] Snapshot ${filename}`,
          detail: `Chip: ${chipTemp} · Free Heap: ${freeHeap}`,
          time
        },
        {
          id: 2,
          icon: Cpu,
          title: `ESP32 IP ${clientIp} Sync`,
          detail: `WiFi RSSI: ${wifiRssi} · AEC: ${lightAec}`,
          time: 'Live'
        }
      ]
    : []

  return (
    <div className="p-6 lg:p-7 rounded-[24px] bg-[#FFFDF7] border border-[#DEDED2] shadow-xs flex flex-col justify-between gap-5 min-w-0 box-sizing-border">
      {/* Heading */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
            <Activity className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#30312F]">Real-time Ingestion Logs</h3>
            <p className="text-[11px] text-[#85847E]">เหตุการณ์ล่าสุดจาก Edge Pipeline</p>
          </div>
        </div>
        <PillTag variant={hasRecord ? 'active' : 'neutral'}>
          {hasRecord ? 'LIVE FEED' : 'WAITING'}
        </PillTag>
      </div>

      {/* Scrollable Event Feed / Empty State */}
      <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
        {hasRecord && logItems.length > 0 ? (
          logItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex items-start gap-3 transition-colors hover:border-[#B8B8A8]"
              >
                {/* Icon Box */}
                <div className="w-9 h-9 rounded-[12px] bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center shrink-0 text-[#30312F]">
                  <Icon className="w-4 h-4" strokeWidth={1.7} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#30312F] truncate leading-tight">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono text-[#85847E] shrink-0 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-[#85847E] leading-snug truncate">
                    {item.detail}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-6 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-center text-xs text-[#85847E] font-medium">
            ยังไม่มีข้อมูลบันทึก Ingestion
          </div>
        )}
      </div>
    </div>
  )
}
