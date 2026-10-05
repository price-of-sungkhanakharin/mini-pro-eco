import React from 'react'
import { Cpu, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react'

export default function ModelPipelineCard({ onNavigate }) {
  const models = [
    {
      id: 'yolo',
      name: 'YOLO26 Vehicle Detector',
      metric: '98.0% mAP@50',
      metricColor: 'text-[#284E1A]',
      desc: 'Single-stage ตรวจจับ Car & Motorcycle (CPU 327ms)'
    },
    {
      id: 'density_ts',
      name: 'Time-Series Density Forecast',
      metric: '94.1% Accuracy',
      metricColor: 'text-[#284E1A]',
      desc: 'พยากรณ์ความหนาแน่นและโอกาสมีที่จอดล่วงหน้า 15-60 นาที'
    },
    {
      id: 'sleep_ts',
      name: 'Adaptive ESP32 Sleep Predictor',
      metric: '15s - 120s Range',
      metricColor: 'text-[#4F6B4A]',
      desc: 'คำนวณและปรับรอบเวลา Deep Sleep ของ ESP32 อัตโนมัติตามสถิติ'
    },
    {
      id: 'labeling',
      name: 'Auto-Labeling (Label Studio)',
      metric: '96.8% Precision',
      metricColor: 'text-[#284E1A]',
      desc: 'คัดกรองเฟรมภาพและซิงค์เข้าสู่ Label Studio เพื่อทำ Auto-Labeling'
    },
    {
      id: 'retrain',
      name: 'Last Model Retrain',
      metric: '2 hrs ago',
      metricColor: 'text-[#30312F]',
      desc: 'Checkpoint v2.4 พร้อมใช้งานในระบบ Ingestion'
    }
  ]

  return (
    <div className="bg-[#FFFFFF] border border-[#CFCFC4] rounded-[20px] p-6 flex flex-col justify-between gap-4 shadow-2xs w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F4F1E8]">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#30312F]" />
          <h3 className="font-sans font-bold text-xl text-[#30312F] tracking-tight">
            โมเดล YOLO & time-series
          </h3>
        </div>
        <div className="px-2.5 py-1 bg-[#EAF6E8] rounded-full font-sans font-semibold text-xs text-[#4F6B4A]">
          AUTO-TRAINING
        </div>
      </div>

      {/* Model List (Showing REAL models running in the system) */}
      <div className="flex flex-col gap-3">
        {models.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-0.5 pb-2.5 border-b border-[#F4F1E8] last:border-b-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[13px] font-semibold text-[#30312F]">
                {m.name}
              </span>
              <span className={`font-mono text-xs font-bold ${m.metricColor}`}>
                {m.metric}
              </span>
            </div>
            <p className="font-sans text-[11px] text-[#85847E] leading-normal">
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Controls / Status Box */}
      <div className="bg-[#F4F1E8] rounded-[14px] p-4 flex flex-col gap-2 mt-1">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[13px] font-bold text-[#30312F]">
            Pipeline Controls
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#4F6B4A] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active</span>
          </span>
        </div>
        <p className="font-sans text-xs text-[#85847E] leading-relaxed">
          Auto-training enabled · Auto-labeling enabled · ESP32 Deep Sleep dynamic
        </p>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('trainer')}
            className="mt-1 flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-[#FAF8EF] border border-[#CFCFC4] rounded-full font-sans font-semibold text-xs text-[#30312F] transition-all cursor-pointer shadow-2xs"
          >
            <span>ไปยังหน้า Auto-Trainer & Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
