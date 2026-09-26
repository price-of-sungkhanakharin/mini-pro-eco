import React from 'react'
import {
  Server,
  Activity,
  Layers,
  Database,
  ExternalLink,
  ShieldCheck,
  Cpu,
  HardDrive
} from 'lucide-react'

export default function EcosystemView() {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const tools = [
    {
      title: 'FastAPI Interactive Swagger Docs',
      subtitle: 'REST API Specifications & Interactive Testing',
      port: ':8000',
      url: `http://${host}:8000/docs`,
      desc: 'ทดสอบยิง API ทุกเส้น เช่น /parking/summary, /api/v1/roboflow/status, /predict',
      status: 'Active',
      color: 'amber'
    },
    {
      title: 'Ingestion Server & Live Telemetry',
      subtitle: 'Edge IoT Camera Ingestion & Telemetry API',
      port: ':5005',
      url: `http://${host}:5005/api/telemetry`,
      desc: 'รับภาพและข้อมูลสตรีมสดจากกล้อง ESP32-CAM พร้อมสั่งการ Deep Sleep',
      status: 'Active',
      color: 'emerald'
    },
    {
      title: 'MinIO Object Storage Console',
      subtitle: 'S3-Compatible Storage for Dataset & Image Snapshots',
      port: ':9001',
      url: `http://${host}:9001`,
      desc: 'เข้าดู Bucket รูปภาพ Snapshot กล้องวงจรปิด และไฟล์ Weights',
      status: 'Active',
      color: 'rose'
    },
    {
      title: 'Label Studio Annotation Platform',
      subtitle: 'Self-hosted Multi-modal Data Annotation Platform',
      port: ':8080',
      url: `http://${host}:8080`,
      desc: 'ระบบ Label ภาพและสร้าง Annotation สำหรับ Dataset ภายในเครื่อง',
      status: 'Active',
      color: 'blue'
    },
    {
      title: 'PostgreSQL Database Engine',
      subtitle: 'Relational & Time-Series Parking Occupancy Logs',
      port: ':5432',
      url: `${host}:5432`,
      desc: 'ฐานข้อมูลเก็บ User, Model Registry, Audit Roboflow และ parking_occupancy_logs',
      status: 'Active',
      color: 'indigo'
    },
    {
      title: 'Redis Cache & Queue',
      subtitle: 'In-Memory Cache & Asynchronous Task Queue',
      port: ':6379',
      url: `${host}:6379`,
      desc: 'ระบบแคชข้อมูลความเร็วสูงและคิวงานประมวลผลพื้นหลัง',
      status: 'Active',
      color: 'cyan'
    }
  ]

  return (
    <div className="setup-view-container">
      {/* Top Banner */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3">
          <div className="setup-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <Server className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>AI Ecosystem Central Dashboards & Observability</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                Docker Stack Live
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              รวมศูนย์การเข้าถึงแดชบอร์ดระบบของเพื่อน ทั้ง Grafana, MLflow, MinIO, Prometheus และ Backend APIs
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {tools.map((t, idx) => (
          <div key={idx} className="setup-content-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {t.port}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mt-3">{t.title}</h3>
              <p className="text-[11px] text-indigo-300 font-mono mt-0.5">{t.subtitle}</p>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{t.desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50">
              {t.url.startsWith('http') ? (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-600/50 transition-all hover:border-slate-500"
                >
                  <span>เปิดแดชบอร์ด ({t.port})</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ) : (
                <div className="text-center font-mono text-[11px] text-slate-400 py-1.5 bg-slate-800/40 rounded">
                  {t.url}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
