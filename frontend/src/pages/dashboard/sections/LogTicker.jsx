import React from 'react'
import {
  Camera,
  Cpu
} from 'lucide-react'
import LiveDot from '../../../components/ui/LiveDot.jsx'

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
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between gap-4 min-w-0 box-sizing-border">
      {/* Heading */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base text-[var(--color-ink)]">Real-time Ingestion Logs</h3>
          <LiveDot color={hasRecord ? 'green' : 'amber'} />
        </div>
        <span className="text-xs text-[var(--color-ink-secondary)]">ESP32 Telemetry</span>
      </div>

      {/* Scrollable Event Feed / Empty State */}
      <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
        {hasRecord && logItems.length > 0 ? (
          logItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3 transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                {/* 40px Icon Box in Chip Surface */}
                <div className="w-10 h-10 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-ink)]">
                  <Icon className="w-4 h-4 text-[var(--color-ink)]" strokeWidth={1.7} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)] truncate leading-tight">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-ink-secondary)] shrink-0 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-secondary)] leading-snug truncate">
                    {item.detail}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-6 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center text-xs text-[var(--color-ink-secondary)] font-medium">
            ยังไม่มีข้อมูลบันทึก Ingestion
          </div>
        )}
      </div>
    </div>
  )
}
