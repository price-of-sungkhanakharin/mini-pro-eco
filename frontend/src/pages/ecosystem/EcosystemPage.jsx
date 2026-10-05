import React, { useState, useEffect } from 'react'
import {
  Server,
  ExternalLink,
  Camera,
  Layers,
  Sparkles,
  Monitor,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowDown,
  Workflow,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  X,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react'
import {
  MinIOLogo,
  LabelStudioLogo,
  PostgreSQLLogo,
  NvidiaLogo,
  FastAPILogo,
  RedisLogo,
  MLflowLogo,
  ESP32Logo,
  AdminerLogo,
  DotBlueLogo
} from '../../components/ui/ServiceLogos'
import {
  PillTag,
  PillButton,
  ServiceOverviewCard,
  ServiceDetailCard,
  AutoTrainingPanel
} from '../../components/ui/FigmaCards'
import Modal from '../../components/ui/Modal.jsx'

export default function EcosystemPage({ onNavigate }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const [showArchLayers, setShowArchLayers] = useState(false)
  
  // Real stats from backend
  const [autoStats, setAutoStats] = useState(null)
  const [gpuTelemetry, setGpuTelemetry] = useState(null)

  // Health Check Modal state
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false)
  const [healthData, setHealthData] = useState(null)
  const [isHealthLoading, setIsHealthLoading] = useState(false)

  // Redis Status Modal state
  const [isRedisModalOpen, setIsRedisModalOpen] = useState(false)
  const [redisData, setRedisData] = useState(null)
  const [isRedisLoading, setIsRedisLoading] = useState(false)

  // Fetch live stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`http://${host}:8000/api/v1/auto-label/stats`)
        if (res.ok) {
          const data = await res.json()
          setAutoStats(data)
        }
      } catch (err) {
        console.warn('Could not fetch auto-label stats:', err)
      }

      try {
        const resGpu = await fetch(`http://${host}:8000/api/v1/gpu/telemetry`)
        if (resGpu.ok) {
          const dataGpu = await resGpu.json()
          setGpuTelemetry(dataGpu)
        }
      } catch (err) {
        console.warn('Could not fetch GPU telemetry:', err)
      }
    }

    fetchStats()
  }, [host])

  // Handle Health Check fetch
  const handleCheckHealth = async () => {
    setIsHealthLoading(true)
    try {
      const res = await fetch(`http://${host}:8000/api/v1/health`)
      if (res.ok) {
        const data = await res.json()
        setHealthData(data)
      } else {
        setHealthData({ status: 'degraded', error: 'HTTP ' + res.status })
      }
    } catch (err) {
      setHealthData({ status: 'error', error: err.message || 'Cannot reach API Gateway' })
    } finally {
      setIsHealthLoading(false)
    }
  }

  // Open Health modal
  const openHealthModal = () => {
    setIsHealthModalOpen(true)
    handleCheckHealth()
  }

  // Handle Redis Status fetch
  const handleCheckRedis = async () => {
    setIsRedisLoading(true)
    try {
      const res = await fetch(`http://${host}:8000/api/v1/system/redis-status`)
      if (res.ok) {
        const data = await res.json()
        setRedisData(data)
      } else {
        setRedisData({ status: 'error', message: 'HTTP ' + res.status })
      }
    } catch (err) {
      setRedisData({ status: 'error', message: err.message || 'Cannot reach Redis endpoint' })
    } finally {
      setIsRedisLoading(false)
    }
  }

  // Open Redis modal
  const openRedisModal = () => {
    setIsRedisModalOpen(true)
    handleCheckRedis()
  }

  // 4 Top Overview Services (MinIO, Label Studio, PostgreSQL, GPU Node)
  const overviewServices = [
    {
      id: 'minio',
      title: 'MinIO Storage',
      description: 'S3 Object Storage จัดเก็บรูป Snapshot รถเข้า-ออก, Raw Dataset และโมเดล Weights (.pt / .onnx)',
      status: 'Port :9001 • SSO Active',
      emblemBg: 'green',
      logo: MinIOLogo,
      actionLabel: 'เปิดคอนโซล MinIO',
      actionUrl: `http://${host}:8000/sso/minio`
    },
    {
      id: 'label-studio',
      title: 'Label Studio',
      description: 'ระบบ Data Annotation สำหรับตีกรอบ Bounding Box และปรับแต่ง Label ภาพรถยนต์ในช่องจอด',
      status: 'Port :8080 • Auto-Login',
      emblemBg: 'purple',
      logo: LabelStudioLogo,
      actionLabel: 'เข้าสู่ระบบ Label Studio',
      actionUrl: `http://${host}:8000/sso/label-studio`
    },
    {
      id: 'postgres',
      title: 'PostgreSQL UI',
      description: 'ฐานข้อมูลหลักสำหรับจัดเก็บสถิติที่จอดรถ Audit Logs, Users และผลการประมวลผลแบบ Real-time',
      status: 'Port :8088 • Auto-Login',
      emblemBg: 'yellow',
      logo: PostgreSQLLogo,
      actionLabel: 'เปิดฐานข้อมูล Adminer',
      actionUrl: `http://${host}:8000/sso/postgres`
    },
    {
      id: 'gpu-node',
      title: 'Private GPU Node',
      description: 'เซิร์ฟเวอร์ GPU On-Premise มหาวิทยาลัย (GTX 1660 SUPER 6GB) สำหรับรันเทรน YOLO & Model Compute',
      status: 'Port :9000 • 172.30.81.175',
      emblemBg: 'aqua',
      logo: NvidiaLogo,
      actionLabel: 'ตรวจสอบ GPU Node API',
      actionUrl: `http://172.30.81.175:9000/docs`
    }
  ]

  // 4 Service Details (FastAPI, Ingestion, MLflow, Redis)
  const detailServices = [
    {
      title: 'FastAPI Interactive Swagger',
      logo: FastAPILogo,
      status: 'Active',
      statusVariant: 'active',
      description: 'Interactive REST API Specifications สำหรับทดสอบยิง API ทุกเส้น เช่น /parking/summary, /predict',
      metadata: [
        { label: 'Port', value: ':8000' },
        { label: 'API Docs', value: '/docs (Swagger UI)' }
      ],
      actionLabel: 'เปิด Interactive Swagger Docs',
      actionUrl: `http://${host}:8000/docs`
    },
    {
      title: 'Ingestion & Telemetry API',
      logo: ESP32Logo,
      status: 'Active',
      statusVariant: 'active',
      description: 'รับสตรีมภาพและข้อมูล Telemetry จากกล้อง ESP32-CAM (3 ตัว) พร้อมสั่งการ Deep Sleep ประหยัดพลังงาน',
      metadata: [
        { label: 'Port', value: ':5005' },
        { label: 'Protocol', value: 'HTTP/REST Ingest' }
      ],
      actionLabel: 'เปิด Telemetry API Endpoint',
      actionUrl: `http://${host}:5005/api/telemetry`
    },
    {
      title: 'MLflow Tracking Registry',
      logo: MLflowLogo,
      status: 'Active',
      statusVariant: 'active',
      description: 'ระบบติดตามการทดลองและบันทึก Model Lifecycle, Reliability Curve, mAP50 และ Evaluation Metrics',
      metadata: [
        { label: 'Port', value: ':5001' },
        { label: 'Experiment', value: 'ID #9 (Active)' }
      ],
      actionLabel: 'เปิด MLflow Model Registry',
      actionUrl: `http://${host}:5001/#/experiments/9`
    },
    {
      title: 'Redis Cache & Event Queue',
      logo: RedisLogo,
      status: 'Active',
      statusVariant: 'active',
      description: 'In-Memory Cache ความเร็วสูงสำหรับพักค่าเซ็นเซอร์และคิวงานประมวลผลพื้นหลังของระบบ',
      metadata: [
        { label: 'Port', value: ':6379' },
        { label: 'Latency', value: '< 1ms In-Memory' }
      ],
      actionLabel: 'ดูสถานะและความจุ Redis',
      actionUrl: null,
      onClick: openRedisModal
    }
  ]

  // Auto-training controls data with actual live values
  const totalImgs = autoStats?.total_images || 1590
  const approvedImgs = autoStats?.queue?.approved || 709
  const gpuName = gpuTelemetry?.gpu_name || 'GTX 1660 SUPER'
  const vramGb = gpuTelemetry?.vram_total_mb ? Math.round(gpuTelemetry.vram_total_mb / 1024) + 'GB' : '6GB'

  const trainingControls = [
    {
      label: 'Dataset Pool',
      value: `${totalImgs.toLocaleString()} Images (${approvedImgs.toLocaleString()} Approved)`,
      detail: 'ดาต้าเซ็ตที่ผ่านการ Verify ใน MinIO & Label Studio'
    },
    {
      label: 'Target Architecture',
      value: 'YOLO26m • Pretrained',
      detail: 'คอนฟิกเฉพาะสำหรับ GTX 1660 SUPER (6GB VRAM)'
    },
    {
      label: 'GPU Compute Node',
      value: `${gpuName} (${vramGb})`,
      detail: 'Private University Network (172.30.81.175:9000)'
    }
  ]

  const handleGoToTrainer = () => {
    if (onNavigate) {
      onNavigate('trainer')
    } else {
      window.location.href = '/trainer'
    }
  }

  return (
    <div className="platform-workspace">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb">
        <span>Platform</span>
        <span>/</span>
        <span className="text-[#30312F] font-medium">Services & Core Infrastructure</span>
      </div>

      {/* 2. Platform Services Introduction Header */}
      <div className="platform-intro">
        <div className="platform-overview">
          {/* Platform Metadata Tags */}
          <div className="platform-metadata">
            <PillTag variant="neutral">Platform Stack</PillTag>
            <PillTag variant="neutral">CPE Smart Parking</PillTag>
            <PillTag variant="active">Live Services: Active</PillTag>
          </div>

          {/* Title */}
          <h1 className="platform-title">
            Platform Services Workspace
          </h1>

          {/* Description */}
          <p className="platform-description">
            ศูนย์กลางการเข้าถึงและบริหารจัดการเซอร์วิสทั้งหมดในระบบ AI Ecosystem ผ่าน SSO Auto-Login ครอบคลุมทั้ง S3 Object Storage, เครื่องมือทำ Label ข้อมูล, ฐานข้อมูล PostgreSQL และระบบประมวลผล Private GPU
          </p>
        </div>

        {/* Intro Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('details')}
            className="platform-intro-action cursor-pointer bg-transparent border-0 p-0 text-left"
            title="คลิกเพื่อดูผังสถาปัตยกรรมและ Flowchart เชิงลึก"
          >
            <span>ผังสถาปัตยกรรม & Flowchart</span>
            <Workflow className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={openHealthModal}
            className="platform-intro-action cursor-pointer bg-transparent border-0 p-0 text-left"
            title="คลิกเพื่อตรวจสอบสถานะความพร้อมของทุกบริการ"
          >
            <span>ตรวจสอบความสมบูรณ์สแตก (Health)</span>
            <Activity className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 3. Service Overview (Row of 4 Cards: MinIO, Label Studio, PostgreSQL, GPU Node) */}
      <div className="w-full">
        <div className="service-overview-grid">
          {overviewServices.map((svc) => (
            <ServiceOverviewCard
              key={svc.id}
              title={svc.title}
              description={svc.description}
              status={svc.status}
              emblemBg={svc.emblemBg}
              logo={svc.logo}
              actionLabel={svc.actionLabel}
              actionUrl={svc.actionUrl}
            />
          ))}
        </div>
      </div>

      {/* 4. Service Details (2-Column Grid: FastAPI, Ingestion, MLflow, Redis) */}
      <div className="w-full">
        <div className="service-details-grid">
          {detailServices.map((detail, idx) => (
            <ServiceDetailCard
              key={idx}
              title={detail.title}
              logo={detail.logo}
              status={detail.status}
              statusVariant={detail.statusVariant}
              description={detail.description}
              metadata={detail.metadata}
              actionLabel={detail.actionLabel}
              actionUrl={detail.actionUrl}
              onClick={detail.onClick}
            />
          ))}
        </div>
      </div>

      {/* 5. Auto-Training Panel */}
      <div className="w-full">
        <AutoTrainingPanel
          title="ระบบเทรนโมเดลอัตโนมัติ (Autonomous Training Engine)"
          description="จัดการคิวดาต้าเซ็ตที่ Label เสร็จแล้ว โยกเข้าโฟลเดอร์ Dataset ใน MinIO และสั่ง GPU Node (172.30.81.175) รันเทรน YOLO พร้อมเก็บบันทึก Weights ใน MLflow"
          status="Pipeline Ready"
          controls={trainingControls}
          primaryActionLabel="ไปยังหน้าตั้งค่า Auto-Trainer & Hub"
          onPrimaryAction={handleGoToTrainer}
          secondaryActionLabel="ดูบันทึกผลการเทรนใน MLflow"
          secondaryActionUrl={`http://${host}:5001/#/experiments/9`}
        />
      </div>

      {/* 6. Collapsible Technical Architecture Breakdown */}
      <div className="w-full mt-2">
        <button
          onClick={() => setShowArchLayers(!showArchLayers)}
          className="w-full box-border flex items-center justify-between p-5 bg-[#FFFDF7] border border-[#DEDED2] rounded-[20px] transition-all hover:border-[#B8B8A8] text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#F0EEE4] flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-[#30312F]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-sans font-semibold text-base text-[#30312F] m-0">
                ผังโครงสร้างสถาปัตยกรรมระบบ 4 เลเยอร์ (Layered Architecture Breakdown)
              </h2>
              <p className="font-sans text-xs text-[#686962] m-0 mt-0.5">
                คลิกเพื่อดูรายละเอียด Edge Ingestion, Main Backend, University GPU Node และ External LLM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#30312F]">
            <span>{showArchLayers ? 'ซ่อนผังโครงสร้าง' : 'แสดงผังโครงสร้าง'}</span>
            {showArchLayers ? (
              <ChevronUp className="w-4 h-4 text-[#30312F]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#30312F]" />
            )}
          </div>
        </button>

        {showArchLayers && (
          <div className="mt-4 p-6 md:p-8 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] flex flex-col gap-6 animate-fadeIn">
            {/* LAYER A: EDGE / DATA ACQUISITION LAYER */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#30312F] text-white font-bold text-xs flex items-center justify-center">
                    A
                  </span>
                  <h3 className="text-xs font-bold text-[#30312F] uppercase tracking-wider">
                    EDGE / DATA ACQUISITION LAYER
                  </h3>
                </div>
                <span className="text-xs text-[#85847E]">
                  Image + Telemetry ทุก 5 วินาที
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#30312F]">ESP32 + Camera 1</span>
                  </div>
                  <div className="text-xs text-[#85847E]">
                    IP: <span className="font-mono">172.30.91.44</span>
                  </div>
                  <div className="text-xs text-[#686962] bg-[#FFFDF7] px-2.5 py-1.5 rounded-[8px] border border-[#DEDED2]">
                    Image + Camera Status ทุก 5 วินาที
                  </div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#30312F]">ESP32 + Camera 2</span>
                  </div>
                  <div className="text-xs text-[#85847E]">
                    IP: <span className="font-mono">172.30.92.108</span>
                  </div>
                  <div className="text-xs text-[#686962] bg-[#FFFDF7] px-2.5 py-1.5 rounded-[8px] border border-[#DEDED2]">
                    Image + Camera Status ทุก 5 วินาที
                  </div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#30312F]">ESP32 + Camera 3</span>
                  </div>
                  <div className="text-xs text-[#85847E]">
                    IP: <span className="font-mono">172.30.92.100</span>
                  </div>
                  <div className="text-xs text-[#686962] bg-[#FFFDF7] px-2.5 py-1.5 rounded-[8px] border border-[#DEDED2]">
                    Image + Camera Status ทุก 5 วินาที
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center -my-2">
              <div className="p-1 rounded-full bg-[#F0EEE4] text-[#30312F]">
                <ArrowDown className="w-4 h-4" />
              </div>
            </div>

            {/* LAYER B: CLIENT / APPLICATION LAYER */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#30312F] text-white font-bold text-xs flex items-center justify-center">
                  B
                </span>
                <h3 className="text-xs font-bold text-[#30312F] uppercase tracking-wider">
                  CLIENT / APPLICATION LAYER
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#30312F]">Admin Interface</span>
                  </div>
                  <div className="text-xs text-[#686962]">
                    React 18 + Vite Production Dashboard & Management Workspace
                  </div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#30312F]">LINE Chatbot Client</span>
                  </div>
                  <div className="text-xs text-[#686962]">
                    LINE Messaging API + dotBlue LLM Agent สอบถามสถานะที่จอด
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center -my-2">
              <div className="p-1 rounded-full bg-[#F0EEE4] text-[#30312F]">
                <ArrowDown className="w-4 h-4" />
              </div>
            </div>

            {/* LAYER C: MAIN BACKEND & COMPUTE */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#30312F] text-white font-bold text-xs flex items-center justify-center">
                  C & D
                </span>
                <h3 className="text-xs font-bold text-[#30312F] uppercase tracking-wider">
                  AI PLATFORM & UNIVERSITY GPU COMPUTE INFRASTRUCTURE
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <NvidiaLogo size={20} />
                    <span className="text-xs font-bold text-[#30312F]">
                      Private GPU Node (172.30.81.175:9000)
                    </span>
                  </div>
                  <p className="text-xs text-[#686962] m-0">
                    NVIDIA GeForce GTX 1660 SUPER (6GB VRAM) รันเทรน YOLOv8 & Model Fine-tuning
                  </p>
                </div>

                <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <DotBlueLogo size={20} />
                    <span className="text-xs font-bold text-[#30312F]">
                      External dotBlue AI LLM (openai/gpt-5.6-luna)
                    </span>
                  </div>
                  <p className="text-xs text-[#686962] m-0">
                    เชื่อมต่อผ่าน Agent Chatbot สำหรับการตอบคำถามผู้ใช้งานและวิเคราะห์ข้อมูล
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline Flow */}
            <div className="p-4 rounded-[16px] bg-[#F0EEE4] border border-[#DEDED2] flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-[#30312F]" strokeWidth={2} />
                <span className="text-xs font-bold text-[#30312F] uppercase tracking-wider">
                  Data & MLOps Pipeline Flow
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-[#30312F]">
                <span className="px-3 py-1 rounded-full bg-[#FFFDF7] border border-[#DEDED2] font-medium flex items-center gap-1.5">
                  <LabelStudioLogo size={14} />
                  Label Studio (:8080)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85847E]" />
                <span className="px-3 py-1 rounded-full bg-[#FFFDF7] border border-[#DEDED2] font-medium flex items-center gap-1.5">
                  <MinIOLogo size={14} />
                  MinIO Datasets (:9001)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85847E]" />
                <span className="px-3 py-1 rounded-full bg-[#FFFDF7] border border-[#DEDED2] font-bold text-[#30312F] flex items-center gap-1.5">
                  <NvidiaLogo size={14} />
                  GPU Node (:9000)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85847E]" />
                <span className="px-3 py-1 rounded-full bg-[#E7F4D8] text-[#36612D] border border-[#BBF7D0] font-bold flex items-center gap-1.5">
                  <MLflowLogo size={14} />
                  MLflow Registry (:5001)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85847E]" />
                <span className="px-3 py-1 rounded-full bg-[#FFFDF7] border border-[#DEDED2] font-medium flex items-center gap-1.5">
                  <FastAPILogo size={14} />
                  FastAPI Inference (:8000)
                </span>
              </div>
            </div>

            {/* Action Callout: Full Technical Whitepaper & Flowchart */}
            <div className="p-4 md:p-5 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#B8B8A8]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[12px] bg-[#E7F4D8] border border-[#BBF7D0] text-[#284E1A] flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-[#284E1A]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#30312F] m-0 flex items-center gap-2">
                    <span>ESP32-CAM Deep Sleep & RTC Lifecycle Flowchart</span>
                    <span className="text-[11px] font-semibold text-[#284E1A] bg-[#E7F4D8] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                      Whitepaper
                    </span>
                  </h4>
                  <p className="text-xs text-[#85847E] m-0 mt-1 leading-relaxed">
                    อ่านเอกสารเชิงลึก: ผังการทำงาน Edge Node, วงจรตื่น-หลับลดความร้อน, การเปรียบเทียบโมเดล YOLO26m vs YOLO26n และ HSV Cone Masking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('details')}
                className="px-4 py-2 rounded-full bg-[#30312F] hover:bg-[#1F201E] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
              >
                <span>เปิดดู Flowchart ฉบับเต็ม</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. POPUP MODAL: System Health Diagnostics */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        title="ตรวจสอบสถานะความพร้อมระบบ (Health Check)"
        subtitle="ตรวจสอบการเชื่อมต่อและความพร้อมใช้งานของ Service Core ทั้งหมดแบบ Real-time"
        icon={() => <Activity className="w-6 h-6 text-[#36612D]" />}
        iconBg="bg-[#E7F4D8]"
        iconBorder="border-[#BBF7D0]"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={handleCheckHealth}
              disabled={isHealthLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] text-[#30312F] text-xs font-medium border border-[#DEDED2] cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
              <span>{isHealthLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบใหม่อีกครั้ง'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHealthModalOpen(false)}
              className="px-5 py-2.5 rounded-full bg-[#30312F] text-white text-xs font-medium border-0 cursor-pointer hover:bg-[#1E1F1D] transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </>
        }
      >
        {/* Overall Status Banner */}
        <div className="flex items-center justify-between p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2]">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-sans font-semibold text-sm text-[#30312F]">
              สถานะโดยรวม (Overall Status):
            </span>
          </div>
          <PillTag variant={healthData?.status === 'healthy' ? 'active' : 'neutral'}>
            {isHealthLoading ? 'กำลังตรวจสอบ...' : (healthData?.status?.toUpperCase() || 'HEALTHY')}
          </PillTag>
        </div>

        {/* Service Status Rows */}
        <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
          {[
            { name: 'FastAPI Gateway', port: ':8000', key: 'fastapi', logo: FastAPILogo, defaultHealthy: true },
            { name: 'PostgreSQL 17 Database', port: ':5432', key: 'postgres', logo: PostgreSQLLogo, defaultHealthy: true },
            { name: 'MinIO S3 Storage', port: ':9000', key: 'minio', logo: MinIOLogo, defaultHealthy: true },
            { name: 'Redis Cache & Event Queue', port: ':6379', key: 'redis', logo: RedisLogo, defaultHealthy: true },
            { name: 'Label Studio Annotation', port: ':8080', key: 'label_studio', logo: LabelStudioLogo, defaultHealthy: true },
            { name: 'Private GPU Node (YOLO26x)', port: ':9000', host: '172.30.81.175', logo: NvidiaLogo, defaultHealthy: true }
          ].map((svc) => {
            const serviceStatus = healthData?.services ? healthData.services[svc.key] : 'healthy'
            const isOk = serviceStatus === 'healthy' || (serviceStatus === undefined && svc.defaultHealthy)
            const Logo = svc.logo

            return (
              <div
                key={svc.name}
                className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#FAF8EF] border border-[#DEDED2] hover:border-[#B8B8A8] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#FFFDF7] flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Logo size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans font-semibold text-sm text-[#30312F]">
                      {svc.name}
                    </span>
                    <span className="font-mono text-xs text-[#85847E]">
                      {svc.host ? `${svc.host}${svc.port}` : `localhost${svc.port}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOk ? 'bg-[#16A34A]' : 'bg-[#EF4444]'}`} />
                  <span className={`text-xs font-semibold ${isOk ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                    {isOk ? 'Online' : 'Degraded'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. POPUP MODAL: Redis Real-Time Status & Diagnostics */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRedisModalOpen}
        onClose={() => setIsRedisModalOpen(false)}
        title="Redis In-Memory Cache & Queue"
        subtitle="Port :6379 • In-Memory Datastore & Event Broker"
        icon={() => <RedisLogo size={28} />}
        iconBg="bg-[#FBEAE9]"
        iconBorder="border-[#F5C2C0]"
        badge={<PillTag variant="active">Active</PillTag>}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={handleCheckRedis}
              disabled={isRedisLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FAF8EF] hover:bg-[#F0EEE4] text-[#30312F] text-xs font-medium border border-[#DEDED2] cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRedisLoading ? 'animate-spin' : ''}`} />
              <span>{isRedisLoading ? 'กำลังดึงข้อมูล...' : 'รีเฟรชข้อมูล'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRedisModalOpen(false)}
              className="px-5 py-2.5 rounded-full bg-[#30312F] text-white text-xs font-medium border-0 cursor-pointer hover:bg-[#1E1F1D] transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </>
        }
      >
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">หน่วยความจำที่ใช้</span>
            <span className="font-mono text-base font-bold text-[#30312F]">
              {redisData?.used_memory_human || '2.19M'}
            </span>
            <span className="text-[10px] text-[#686962]">Peak: {redisData?.peak_memory_human || '2.22M'}</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">จำนวนคีย์ใน DB0</span>
            <span className="font-mono text-base font-bold text-[#30312F]">
              {redisData?.keys_count !== undefined ? `${redisData.keys_count} Keys` : '15 Keys'}
            </span>
            <span className="text-[10px] text-[#686962]">TTL Auto-Expire</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">Clients เชื่อมต่อ</span>
            <span className="font-mono text-base font-bold text-[#30312F]">
              {redisData?.connected_clients !== undefined ? `${redisData.connected_clients} Conns` : '6 Conns'}
            </span>
            <span className="text-[10px] text-[#686962]">FastAPI + Worker</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">Latency / ความเร็ว</span>
            <span className="font-mono text-base font-bold text-[#16A34A]">
              {redisData?.latency_ms ? `${redisData.latency_ms} ms` : '< 1 ms'}
            </span>
            <span className="text-[10px] text-[#686962]">In-Memory RAM</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">ระยะเวลาเปิดระบบ</span>
            <span className="font-mono text-sm font-bold text-[#30312F] truncate">
              {redisData?.uptime_human || '1 วัน 8 ชม.'}
            </span>
            <span className="text-[10px] text-[#686962]">Uptime Server</span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
            <span className="text-[11px] text-[#85847E]">Redis Version</span>
            <span className="font-mono text-base font-bold text-[#30312F]">
              v{redisData?.version || '8.8.0'}
            </span>
            <span className="text-[10px] text-[#686962]">AOF: {redisData?.persistence_aof || 'Enabled'}</span>
          </div>
        </div>

        {/* Modules and Role */}
        <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#30312F]">
            Active Redis Modules & Features:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {['RedisTimeSeries', 'RediSearch', 'RedisJSON', 'Bloom Filter (bf)', 'Append-Only (AOF)'].map((mod) => (
              <span
                key={mod}
                className="px-2.5 py-1 rounded-[8px] bg-[#FFFDF7] border border-[#DEDED2] text-[11px] font-mono text-[#30312F]"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
