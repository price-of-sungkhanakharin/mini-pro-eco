import React from 'react'
import {
  Server,
  ExternalLink,
  Camera,
  Cpu,
  Layers,
  Database,
  Bot,
  ArrowDown,
  ArrowRight,
  Workflow,
  Sparkles,
  Monitor,
  MessageSquare,
  CheckCircle2,
  GitBranch,
  Boxes,
  Network
} from 'lucide-react'

export default function EcosystemPage() {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  const tools = [
    {
      title: 'FastAPI Interactive Swagger Docs',
      subtitle: 'REST API Specifications & Interactive Testing',
      port: ':8000',
      url: `http://${host}:8000/docs`,
      desc: 'ทดสอบยิง API ทุกเส้น เช่น /parking/summary, /predict',
      status: 'Active'
    },
    {
      title: 'Ingestion Server & Live Telemetry',
      subtitle: 'Edge IoT Camera Ingestion & Telemetry API',
      port: ':5005',
      url: `http://${host}:5005/api/telemetry`,
      desc: 'รับภาพและข้อมูลสตรีมสดจากกล้อง ESP32-CAM พร้อมสั่งการ Deep Sleep',
      status: 'Active'
    },
    {
      title: 'MinIO Object Storage Console',
      subtitle: 'S3 Storage Console (SSO Auto-Login)',
      port: ':9001',
      url: `http://${host}:8000/sso/minio`,
      desc: 'เข้าดู Bucket รูปภาพ Snapshot กล้องวงจรปิด และไฟล์ Weights เข้าใช้งานได้ทันที (Auto-Login)',
      status: 'Active'
    },
    {
      title: 'Label Studio Annotation Platform',
      subtitle: 'Self-hosted Data Annotation Platform (Auto-Login)',
      port: ':8080',
      url: `http://${host}:8000/sso/label-studio`,
      desc: 'ระบบ Label ภาพและสร้าง Annotation สำหรับ Dataset ภายในเครื่อง (เข้าสู่ระบบอัตโนมัติ Auto-Login)',
      status: 'Active'
    },
    {
      title: 'PostgreSQL Database UI (Adminer)',
      subtitle: 'Relational Database Management (Auto-Login)',
      port: ':8088',
      url: `http://${host}:8000/sso/postgres`,
      desc: 'ฐานข้อมูลเก็บ User, Model Registry, Audit Logs และ parking_occupancy_logs (เข้าดูตารางได้ทันที)',
      status: 'Active'
    },
    {
      title: 'MLflow Tracking & Experiment Registry',
      subtitle: 'Model Lifecycle, Metrics & Evaluation Tracking',
      port: ':5001',
      url: `http://${host}:5001/#/experiments/9`,
      desc: 'ระบบติดตามและเปรียบเทียบโมเดล AI, Reliability Curve และผลการทดลอง Out-of-Sample',
      status: 'Active'
    },
    {
      title: 'Redis Cache & Queue',
      subtitle: 'In-Memory Cache & Asynchronous Task Queue',
      port: ':6379',
      url: `${host}:6379`,
      desc: 'ระบบแคชข้อมูลความเร็วสูงและคิวงานประมวลผลพื้นหลัง',
      status: 'Active'
    }
  ]

  return (
    <div className="setup-view-container">
      {/* Top Header Banner */}
      <div className="setup-header-banner">
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="setup-icon-box">
            <Network className="w-6 h-6 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="setup-title-main">AI Ecosystem Central Dashboards & Architecture</h1>
              <span className="status-tag active">Docker Compose Stack Live</span>
            </div>
            <p className="setup-subtitle-text">
              โครงสร้างสถาปัตยกรรมระบบ AI Ecosystem ตามเลเยอร์หน้าที่การทำงาน
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: SYSTEM ARCHITECTURE HIERARCHY */}
      <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--color-border)]">
          <div>
            <span className="text-xs font-bold text-[var(--color-accent-strong)] uppercase tracking-wider block mb-1">
              System Architecture & Responsibilities
            </span>
            <h2 className="text-base font-bold text-[var(--color-ink)]">
              โครงสร้างสถาปัตยกรรมระบบ (AI Ecosystem Architecture)
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)] border border-[var(--color-border)] text-xs">
            <Server className="w-3.5 h-3.5" strokeWidth={1.7} />
            <span>Central Server: <span className="font-mono">172.30.228.51</span></span>
          </span>
        </div>

        {/* LAYER A: EDGE / DATA ACQUISITION LAYER */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-[var(--radius-pill)] bg-[var(--color-accent-tint)] text-[var(--color-accent-text)] font-bold text-xs flex items-center justify-center border border-[var(--color-accent-border)]">
                A
              </span>
              <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                EDGE / DATA ACQUISITION LAYER
              </h3>
            </div>
            <span className="text-xs text-[var(--color-ink-secondary)]">
              Image + Camera Status ทุก 5 วินาที
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Camera 1 */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                <span className="text-xs font-bold text-[var(--color-ink)]">ESP32 + Camera 1</span>
              </div>
              <div className="text-xs text-[var(--color-ink-secondary)]">
                IP: <span className="font-mono">172.30.91.44</span>
              </div>
              <div className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface)] px-2.5 py-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)]">
                Image + Camera Status ทุก 5 วินาที
              </div>
            </div>

            {/* Camera 2 */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                <span className="text-xs font-bold text-[var(--color-ink)]">ESP32 + Camera 2</span>
              </div>
              <div className="text-xs text-[var(--color-ink-secondary)]">
                IP: <span className="font-mono">172.30.92.108</span>
              </div>
              <div className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface)] px-2.5 py-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)]">
                Image + Camera Status ทุก 5 วินาที
              </div>
            </div>

            {/* Camera 3 */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                <span className="text-xs font-bold text-[var(--color-ink)]">ESP32 + Camera 3</span>
              </div>
              <div className="text-xs text-[var(--color-ink-secondary)]">
                IP: <span className="font-mono">172.30.92.100</span>
              </div>
              <div className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface)] px-2.5 py-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)]">
                Image + Camera Status ทุก 5 วินาที
              </div>
            </div>
          </div>
        </div>

        {/* FLOW CONNECTOR A -> B */}
        <div className="flex items-center justify-center -my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)]">
            <ArrowDown className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
          </div>
        </div>

        {/* LAYER B: CLIENT / APPLICATION LAYER */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[var(--radius-pill)] bg-[var(--color-accent-tint)] text-[var(--color-accent-text)] font-bold text-xs flex items-center justify-center border border-[var(--color-accent-border)]">
              B
            </span>
            <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              CLIENT / APPLICATION LAYER
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Admin Client */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                <span className="text-xs font-bold text-[var(--color-ink)]">Admin</span>
              </div>
              <ul className="text-xs text-[var(--color-ink-secondary)] space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                  <span>React Admin Interface</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                  <span>React Dashboard</span>
                </li>
              </ul>
            </div>

            {/* General User / LINE */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                <span className="text-xs font-bold text-[var(--color-ink)]">General User / LINE</span>
              </div>
              <ul className="text-xs text-[var(--color-ink-secondary)] space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-free-text)]" strokeWidth={1.7} />
                  <span>LINE Chatbot</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FLOW CONNECTOR B -> C */}
        <div className="flex items-center justify-center -my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)]">
            <ArrowDown className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
          </div>
        </div>

        {/* LAYER C: MAIN BACKEND / AI PLATFORM */}
        <div className="p-5 rounded-[var(--radius-panel-lg)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-[var(--radius-pill)] bg-[var(--color-accent-strong)] text-[var(--color-ink-inverse)] font-bold text-xs flex items-center justify-center">
                C
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-ink)]">
                  MAIN BACKEND / AI PLATFORM
                </h3>
                <span className="text-xs text-[var(--color-accent-text)] font-semibold">
                  Docker Compose • Central Server <span className="font-mono">172.30.228.51</span>
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] text-xs font-mono">
              172.30.228.51
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* C1) APPLICATION / API */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Server className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                  <span>C1) Application / API</span>
                </span>
              </div>
              <div className="text-xs text-[var(--color-ink-secondary)] space-y-1.5">
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)]">FastAPI & Ingestion</span>
                </div>
              </div>
            </div>

            {/* C2) DATA & ANNOTATION */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                  <span>C2) Data & Annotation</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-ink)]">Label Studio <span className="font-mono">:8080</span></div>
                  <div className="text-xs text-[var(--color-ink-secondary)] mt-1">
                    Local Data Annotation Tool
                  </div>
                  <ul className="text-xs text-[var(--color-ink-secondary)] mt-1 list-disc list-inside">
                    <li>Bounding Box Annotation</li>
                    <li>Export YOLO Labeled Pool</li>
                  </ul>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-ink)]">MinIO Object Storage <span className="font-mono">:9001</span></div>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-ink)]">PostgreSQL 17 DB <span className="font-mono">:5432</span></div>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-ink)]">Redis Cache & Pub/Sub</div>
                </div>
              </div>
            </div>

            {/* C3) MLOps */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5 uppercase tracking-wider">
                  <GitBranch className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                  <span>C3) MLOps</span>
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] text-[var(--color-ink-secondary)]">
                  Inside Main Backend
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs">
                <div className="font-semibold text-[var(--color-ink)]">MLflow <span className="font-mono">:5001</span></div>
                <ul className="text-xs text-[var(--color-ink-secondary)] mt-1.5 space-y-1 list-disc list-inside">
                  <li>Model Registry</li>
                  <li>Experiment Tracking</li>
                  <li>Metrics</li>
                </ul>
              </div>
            </div>

            {/* C4) AI MODEL SERVICES */}
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                  <span>C4) AI Model Services</span>
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)]">Model 1: YOLO Detection</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)]">Model 2: SARIMAX Forecaster</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)]">Model 3: Chatbot Agent</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FLOW CONNECTOR C -> D */}
        <div className="flex items-center justify-center -my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs text-[var(--color-ink-secondary)]">
            <ArrowDown className="w-3.5 h-3.5 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
          </div>
        </div>

        {/* LAYER D: AI COMPUTE INFRASTRUCTURE & EXTERNAL AI SERVICE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* AI COMPUTE INFRASTRUCTURE - 2 Cols */}
          <div className="lg:col-span-2 p-5 rounded-[var(--radius-panel-lg)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-ink-inverse)] font-bold text-xs flex items-center justify-center">
                  D
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                    AI COMPUTE INFRASTRUCTURE
                  </h3>
                  <span className="text-xs text-[var(--color-ink-secondary)]">
                    (University On-Premise)
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] text-xs font-mono">
                172.30.81.175:9000
              </span>
            </div>

            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-ink)]">Private GPU Compute Node</h4>
                  <div className="text-xs text-[var(--color-ink-secondary)]">
                    University GPU Server: <span className="font-mono">172.30.81.175:9000</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-green-tint)] text-[var(--color-green-text)] border border-[var(--color-green-border)] text-xs font-semibold">
                  NVIDIA GeForce GTX 1660 SUPER (6GB)
                </span>
              </div>

              <div className="text-xs text-[var(--color-ink-secondary)]">
                On-Premise • University LAN
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)] block">Training</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)] block">Fine-tuning</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                  <span className="font-semibold text-[var(--color-ink)] block">Model Compute</span>
                </div>
              </div>
            </div>
          </div>

          {/* EXTERNAL AI SERVICE - 1 Col */}
          <div className="p-5 rounded-[var(--radius-panel-lg)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-[var(--radius-pill)] bg-[var(--color-accent-strong)] text-[var(--color-ink-inverse)] font-bold text-xs flex items-center justify-center">
                  Ext
                </span>
                <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                  External AI Service
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3 h-full justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-ink)]">dotBlue AI LLM</h4>
                    <span className="text-xs text-[var(--color-accent-text)] font-semibold font-mono">openai/gpt-5.6-luna API</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                  เชื่อมกับ Chatbot Agent
                </p>
              </div>

              <div className="p-2.5 rounded-[var(--radius-option)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs">
                <span className="font-semibold text-[var(--color-ink)] block">ใช้สำหรับ:</span>
                <span className="text-xs text-[var(--color-ink-secondary)]">
                  Chat Completion / Prompt
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DATA & MLOPS PIPELINE FLOW BANNER */}
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-[var(--color-accent-strong)]" strokeWidth={1.7} />
            <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Data & MLOps Pipeline Flow
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-ink)]">
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold">
              Label Studio
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-strong)] shrink-0" strokeWidth={1.7} />
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold">
              YOLO Labeled Pool
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-strong)] shrink-0" strokeWidth={1.7} />
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-accent-border)] text-[var(--color-accent-text)] font-bold">
              Private GPU Compute Node
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-strong)] shrink-0" strokeWidth={1.7} />
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold">
              trained model
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-strong)] shrink-0" strokeWidth={1.7} />
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-green-tint)] text-[var(--color-green-text)] border border-[var(--color-green-border)] font-bold">
              MLflow Model Registry
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-strong)] shrink-0" strokeWidth={1.7} />
            <span className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold">
              YOLO Model Service
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: CENTRAL SERVICES DIRECT ACCESS (7 ORIGINAL CARDS) */}
      <div className="eco-grid">
        {tools.map((t, idx) => (
          <div key={idx} className="eco-card">
            <div className="eco-card-body">
              <div className="eco-card-header">
                <span className="eco-port-badge">
                  {t.port}
                </span>
                <span className="eco-status-tag">
                  <span className="eco-status-dot"></span>
                  <span>{t.status}</span>
                </span>
              </div>

              <h3 className="eco-card-title">{t.title}</h3>
              <p className="eco-card-subtitle">{t.subtitle}</p>
              <p className="eco-card-desc">{t.desc}</p>
            </div>

            <div className="eco-card-footer">
              {t.url.startsWith('http') ? (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-eco-action"
                >
                  <span>เปิดแดชบอร์ด ({t.port})</span>
                  <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
                </a>
              ) : (
                <div className="eco-address-pill">
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
