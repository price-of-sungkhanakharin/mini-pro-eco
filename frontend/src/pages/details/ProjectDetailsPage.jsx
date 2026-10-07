import React, { useState } from 'react'
import {
  FileText,
  Cpu,
  Server,
  Wifi,
  Activity,
  Database,
  RefreshCw,
  Zap,
  ShieldAlert,
  HardDrive,
  Sliders,
  CheckCircle2,
  XCircle,
  Code2,
  Boxes,
  ArrowRight,
  Layers,
  Wrench,
  Target,
  TrendingUp,
  BarChart
} from 'lucide-react'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'

const StepCard = ({ number, title, desc, icon: Icon, isFinal = false }) => (
  <div className="flex items-start gap-4 z-10 relative group">
    {/* Step Number & Icon Badge */}
    <div
      className={`w-12 h-12 shrink-0 rounded-[14px] border flex items-center justify-center font-bold text-base transition-all shadow-xs ${
        isFinal
          ? 'bg-[#E7F4D8] border-[#36612D]/30 text-[#284E1A]'
          : 'bg-[#FAF8EF] border-[#DEDED2] text-[#30312F]'
      }`}
    >
      {Icon ? <Icon className="w-5 h-5" strokeWidth={2} /> : number}
    </div>

    {/* Card Content */}
    <div
      className={`p-4 lg:p-5 rounded-[18px] border flex-1 transition-all ${
        isFinal
          ? 'bg-[#E7F4D8]/20 border-[#BBF7D0]'
          : 'bg-[#FAF8EF] border-[#DEDED2] hover:border-[#B8B8A8]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h4 className="font-bold text-sm lg:text-base text-[#30312F] flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-[6px] bg-[#E5E5DF] text-[#686962]">
            STEP {number}
          </span>
          {title}
        </h4>
        {isFinal && (
          <span className="text-[11px] font-medium text-[#284E1A] bg-[#E7F4D8] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
            LOOP CYCLE
          </span>
        )}
      </div>
      <p className="text-xs lg:text-sm text-[#686962] leading-relaxed">{desc}</p>
    </div>
  </div>
)

const CameraFlowchart = () => (
  <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#DEDED2]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#284E1A] flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-[#284E1A]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#30312F]">
            ESP32-CAM Deep Sleep & RTC Lifecycle Flowchart
          </h2>
          <p className="text-xs text-[#85847E]">
            Flow การทำงานของ Edge Node เพื่อป้องกันความร้อนสะสมและรับคำสั่งแบบ Real-time (2-Way Control)
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PillTag variant="active">HARDWARE EDGE LIFECYCLE</PillTag>
      </div>
    </div>

    <div className="flex flex-col relative max-w-3xl mx-auto pl-2 py-2">
      {/* Track Line */}
      <div className="absolute left-[34px] top-[30px] bottom-[30px] w-[2px] bg-[#DEDED2] z-0 border-dashed border-l-2"></div>

      <StepCard
        number="1"
        title="Wake Up & Read RTC Memory"
        desc="กล้องตื่นจากโหมด Deep Sleep และดึงค่า Framesize / Quality ที่จดจำไว้จากรอบที่แล้วใน RTC Slow Memory มาใช้ (มี Sanity Check ดักค่าขยะตอนเปิดเครื่องครั้งแรก)"
        icon={Zap}
      />
      <div className="h-5"></div>

      <StepCard
        number="2"
        title="Connect Wi-Fi & Init Camera"
        desc="พยายามเชื่อมต่อ 802.1x Enterprise ภายใน 20 วินาที หากเชื่อมต่อไม่สำเร็จ หรือเซ็ตกล้องไม่ผ่าน ระบบจะสั่งตัวเองให้กลับไปหลับทันที (Fail-safe ป้องกัน Bootloop)"
        icon={Wifi}
      />
      <div className="h-5"></div>

      <StepCard
        number="3"
        title="Capture & HTTP POST"
        desc="ถ่ายภาพและยิง Request ไปที่เซิร์ฟเวอร์ พร้อมแนบข้อมูล Telemetry (อุณหภูมิ, Wi-Fi RSSI, Free RAM) ไปใน Header หรือ Form-data ของ HTTP"
        icon={Server}
      />
      <div className="h-5"></div>

      <StepCard
        number="4"
        title="Receive 2-Way Control JSON"
        desc="เซิร์ฟเวอร์ตอบกลับเป็น JSON พร้อมแนบคำสั่งใหม่ เช่น {'deep_sleep_sec': 30, 'framesize': 9} กล้องจะดึงค่าเหล่านี้มาประมวลผลทันที"
        icon={Database}
      />
      <div className="h-5"></div>

      <StepCard
        number="5"
        title="Save State & Enter Deep Sleep"
        desc="บันทึกค่า Framesize ใหม่ลง RTC Memory ปิดการทำงานของ CPU และ Wi-Fi เพื่อลดอุณหภูมิ และตั้งนาฬิกาปลุกตามจำนวนวินาทีที่เซิร์ฟเวอร์สั่ง (เช่น 20 หรือ 1800 วินาที) ก่อนวนกลับไป Step 1"
        icon={Cpu}
        isFinal={true}
      />
    </div>
  </div>
)

export default function ProjectDetailsPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('all')
  const [profilingModel, setProfilingModel] = useState('yolo26m')

  const profilingModels = {
    yolo26m: {
      id: 'yolo26m',
      name: 'YOLO26m (Best Deployed)',
      fullName: 'YOLO26m (Best Deployed Checkpoint - best_v1.pt)',
      tag: 'PROD ACTIVE (DEPLOYED)',
      tagColor: 'bg-[#E7F4D8] text-[#36612D] border-[#BBF7D0]',
      params: '21.78M',
      gflops: '75.0',
      peakRam: '26.2 MB/frame',
      latency: '438 ms',
      layers: 24,
      plot: '/eval_plots/yolo26m/layer_profiling.png',
      backboneDesc: 'สกัดฟีเจอร์ระดับสูง 64 แชนแนลที่ภาพ 640x640 มี Activation Memory สูงสุด 26.2 MB/frame',
      headDesc: 'มวลพารามิเตอร์ 12.8M (58%) กระจุกตัวที่ Head L23 เพื่อทำนาย Bounding Box 2 คลาส',
    },
    yolo26m_base: {
      id: 'yolo26m_base',
      name: 'YOLO26m (Pretrained Base)',
      fullName: 'YOLO26m (Pretrained Base - ก่อนรีเทรน)',
      tag: 'PRETRAINED BASE',
      tagColor: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECDD3]',
      params: '21.78M',
      gflops: '75.0',
      peakRam: '26.2 MB/frame',
      latency: '438 ms',
      layers: 24,
      plot: '/eval_plots/yolo26m_base/layer_profiling.png',
      backboneDesc: 'สถาปัตยกรรมตั้งต้นก่อนการ Fine-tuning มีเลเยอร์และภาระ RAM เหมือนรุ่น Retrained',
      headDesc: 'น้ำหนักในส่วน Head ยังเป็น COCO 80 คลาสทั่วไป ก่อนถูก Transfer Learning มาเป็น 2 คลาสลานจอด',
    },
    yolo26s: {
      id: 'yolo26s',
      name: 'YOLO26s',
      fullName: 'YOLO26s (Small Balanced)',
      tag: 'BALANCED',
      tagColor: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
      params: '9.41M',
      gflops: '21.5',
      peakRam: '19.6 MB/frame',
      latency: '245 ms',
      layers: 24,
      plot: '/eval_plots/yolo26s/layer_profiling.png',
      backboneDesc: 'สเกลแชนแนลลง 25% ลดภาระ Activation RAM ลงเหลือ ~19.6 MB/frame',
      headDesc: 'พารามิเตอร์ส่วน Head ลดลงเหลือ ~5.5M ช่วยเร่งความเร็วบน CPU ขึ้น 1.8 เท่า',
    },
    yolo26n: {
      id: 'yolo26n',
      name: 'YOLO26n',
      fullName: 'YOLO26n (Edge Nano)',
      tag: 'EDGE NANO',
      tagColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
      params: '2.62M',
      gflops: '6.8',
      peakRam: '12.4 MB/frame',
      latency: '126 ms',
      layers: 24,
      plot: '/eval_plots/yolo26n/layer_profiling.png',
      backboneDesc: 'สเกลความกว้างและลึกระดับ Nano กิน RAM เพียง 12.4 MB เหมาะกับอุปกรณ์ขอบเครือข่าย',
      headDesc: 'พารามิเตอร์ทั้งโมเดลเพียง 2.62M รันบน CPU ด้วยความเร็วสูงถึง 3.5 เท่า',
    },
    yolo11n: {
      id: 'yolo11n',
      name: 'YOLO11n',
      fullName: 'YOLO11n (Baseline Comparison)',
      tag: 'BASELINE',
      tagColor: 'bg-[#F0EEE4] text-[#686962] border-[#DEDED2]',
      params: '2.58M',
      gflops: '6.5',
      peakRam: '12.1 MB/frame',
      latency: '134 ms',
      layers: 24,
      plot: '/eval_plots/yolo11n/layer_profiling.png',
      backboneDesc: 'สถาปัตยกรรมรุ่นก่อนหน้า ใช้ C3k แทน C3k2 มีโครงสร้าง Activation คล้ายกัน',
      headDesc: 'ใช้ Head แบบมาตรฐานเดี่ยว ประสิทธิภาพในการแยกแยะคลาสมอเตอร์ไซค์ต่ำกว่า YOLO26',
    },
  }

  const tabs = [
    { id: 'all', label: 'ทั้งหมด (All Overview)', icon: Layers },
    { id: 'flowchart', label: 'ESP32 Deep Sleep Flowchart', icon: RefreshCw },
    { id: 'architecture', label: '1. สถาปัตยกรรมระบบ (Architecture)', icon: Server },
    { id: 'optimization', label: '2. การประหยัดโหลด CPU (Input Size 640x640)', icon: Sliders },
    { id: 'customization', label: '3. การปรับแต่งโมเดลเชิงลึก (Model Customization)', icon: Wrench },
    { id: 'profiling', label: '4. Layer-wise Memory Profiling', icon: HardDrive },
  ]

  return (
    <div className="platform-workspace space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="platform-breadcrumb flex items-center gap-2 text-xs text-[#85847E]">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="hover:text-[#30312F] transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate?.('ecosystem')}
          className="hover:text-[#30312F] transition-colors cursor-pointer"
        >
          Ecosystem
        </button>
        <span>/</span>
        <span className="text-[#30312F] font-semibold">Technical Whitepaper</span>
      </div>

      {/* Header Intro */}
      <div className="platform-intro flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#DEDED2] w-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PillTag variant="active">VERSION 2.4</PillTag>
            <PillTag variant="neutral">CPE SMART PARKING AI</PillTag>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#30312F]">
            Project Architecture & Details
          </h1>
          <p className="text-sm text-[#85847E] mt-2 max-w-3xl leading-relaxed">
            เอกสารอธิบายสถาปัตยกรรมเชิงลึกและการปรับแต่งโมเดล AI (Technical Whitepaper)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PillButton variant="neutral" onClick={() => onNavigate?.('ecosystem')}>
            ดูแผนภาพสถาปัตยกรรม
          </PillButton>
          <PillButton variant="primary" onClick={() => onNavigate?.('dashboard')}>
            กลับหน้า Dashboard
          </PillButton>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar (Fixed Overlap Issue with smooth horizontal scroll) */}
      <div className="w-full overflow-x-auto pb-1.5 scrollbar-thin">
        <div className="inline-flex items-center gap-2 p-1.5 bg-[#FAF8EF] border border-[#DEDED2] rounded-full min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
                  active
                    ? 'bg-[#30312F] text-white shadow-xs font-semibold'
                    : 'text-[#686962] hover:text-[#30312F] hover:bg-[#F0EEE4]'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Flowchart Component */}
      {(activeTab === 'all' || activeTab === 'flowchart') && (
        <div className="w-full">
          <CameraFlowchart />
        </div>
      )}

      {/* Technical Detail Sections */}
      <div className="space-y-6 w-full">
        {/* Section 1: System Architecture */}
        {(activeTab === 'all' || activeTab === 'architecture') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Server className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  1. สถาปัตยกรรมระบบ (System Architecture)
                </h2>
                <p className="text-xs text-[#85847E]">Distributed IoT Edge & Centralized Microservices</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[#30312F] mb-6">
              ระบบถูกออกแบบมาในลักษณะ <strong>Edge-to-Cloud Distributed Architecture</strong> โดยแบ่งหน้าที่ชัดเจน:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#284E1A]" />
                  <span>Edge Tier (ESP32-CAM)</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  ทำหน้าที่เป็น IoT Node ส่งภาพและ Telemetry โดยใช้ Deep Sleep Cycle เพื่อลด Thermal Throttling และบริหารพลังงาน
                </p>
              </div>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#284E1A]" />
                  <span>Service Tier (FastAPI & ONNX)</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  ใช้ FastAPI และ 24/7 Inference Worker รันโมเดล YOLO บนเซิร์ฟเวอร์ด้วย ONNX Runtime Engine ที่เร่งความเร็ว CPU สูงสุด
                </p>
              </div>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#284E1A]" />
                  <span>Storage Tier (MinIO & PostgreSQL)</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  MinIO จัดเก็บชุดข้อมูลภาพ/JSON และ PostgreSQL จัดเก็บประวัติ Metadata, Parking Templates และ Time-Series Analytics
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Input Size Optimization */}
        {(activeTab === 'all' || activeTab === 'optimization') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Sliders className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  2. การประหยัดโหลด CPU (Input Size Optimization)
                </h2>
                <p className="text-xs text-[#85847E]">Quadratic Complexity Reduction & Coordinate Scaling</p>
              </div>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] text-sm text-[#30312F] leading-relaxed">
              ภาพต้นฉบับจากกล้องมีขนาดใหญ่ การป้อนเข้าโมเดลโดยตรงจะเกิด Quadratic Complexity 𝒪(W × H) เราจึง Resize ภาพเป็น{' '}
              <strong>640x640</strong> ก่อนส่งเข้าประมวลผลใน YOLO ซึ่งเป็น Sweet spot สำหรับรันบน CPU จากนั้นใช้สัดส่วน{' '}
              <code className="px-2 py-0.5 rounded bg-[#E5E5DF] text-xs font-mono font-semibold">Scale_X, Scale_Y</code>{' '}
              คืนค่าพิกัดให้ Bounding Box แม่นยำเท่าเดิม 100%
            </div>
          </section>
        )}

        {/* Section 3: Custom Model Optimization */}
        {(activeTab === 'all' || activeTab === 'customization') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  3. การปรับแต่งโมเดลเชิงลึก (Model Customization)
                </h2>
                <p className="text-xs text-[#85847E]">Transfer Learning, ONNX Runtime, Training Strategy & Metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transfer Learning */}
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                    <Target className="w-4 h-4" />
                  </div>
                  <span>Transfer Learning & Fine-tuning</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  ใช้ Pretrained Weights จาก COCO Dataset มาเป็นฐานความรู้ เพื่อให้สกัดฟีเจอร์ได้ดีตั้งแต่เริ่ม และ Fine-tune ด้วยชุดข้อมูลลานจอดรถจริงของ ม.อ. เพื่อให้ชินกับมุมกล้องจริง
                </p>
              </div>

              {/* ONNX Acceleration */}
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <span>ONNX Quantization & Acceleration</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  แปลงโมเดล PyTorch (.pt) เป็น ONNX Format เพื่อรีดความเร็วบน CPU ให้ออกมาสูงสุด พร้อมจำกัด Thread (torch.set_num_threads) ป้องกัน CPU Starvation
                </p>
              </div>

              {/* Advanced Training Strategy */}
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Advanced Training Strategy</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  ใช้ <strong>AdamW Optimizer</strong> ร่วมกับ <strong>Cosine Annealing LR</strong> เพื่อลดค่า Learning Rate อย่างราบรื่น และใช้ Early Stopping (Patience=25) เพื่อป้องกันโมเดลจำข้อสอบ (Overfitting)
                </p>
              </div>

              {/* Model Evaluation Metrics */}
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#FFFDF7] border border-[#DEDED2] flex items-center justify-center text-[#284E1A]">
                    <BarChart className="w-4 h-4" />
                  </div>
                  <span>Model Evaluation Metrics</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  จากการประเมินบน Validation Set ล่าสุด โมเดลมีความแม่นยำรวม{' '}
                  <span className="font-bold text-[#284E1A] bg-[#E7F4D8] px-1.5 py-0.5 rounded text-xs">mAP@50 = 93.0%</span>{' '}
                  (รถยนต์ 99.5%, มอเตอร์ไซค์ 86.4%) พร้อมสกัด Confusion Matrix สำหรับวิเคราะห์ Error Analysis
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Layer-wise Memory Profiling */}
        {(activeTab === 'all' || activeTab === 'profiling') && (() => {
          const currentProf = profilingModels[profilingModel] || profilingModels.yolo26m
          return (
            <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs space-y-6">
              {/* Header with Title and Model Switcher */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#DEDED2] gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#284E1A] flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#30312F]">
                      4. Layer-wise Memory Profiling ({currentProf.name})
                    </h2>
                    <p className="text-xs text-[#85847E]">
                      วิเคราะห์พฤติกรรมคอขวดหน่วยความจำ (RAM) เทียบกับพลังงานประมวลผล (CPU) ตลอดทุก Layer
                    </p>
                  </div>
                </div>

                {/* Model Selector Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                    {Object.values(profilingModels).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setProfilingModel(m.id)}
                        className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          profilingModel === m.id
                            ? 'bg-[#30312F] text-white shadow-xs font-semibold'
                            : 'text-[#686962] hover:text-[#30312F]'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border ${currentProf.tagColor}`}>
                    {currentProf.tag}
                  </span>
                </div>
              </div>

              {/* Model Quick Specs Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] text-xs">
                <div>
                  <span className="text-[10px] text-[#85847E] block">Total Layers</span>
                  <strong className="text-[#30312F] font-mono">{currentProf.layers} Blocks (280 Modules)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#85847E] block">Total Parameters</span>
                  <strong className="text-[#30312F] font-mono text-rose-600">{currentProf.params}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#85847E] block">Compute Load</span>
                  <strong className="text-[#30312F] font-mono text-rose-600">{currentProf.gflops} GFLOPs</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#85847E] block">Peak Activation RAM</span>
                  <strong className="text-[#30312F] font-mono text-blue-600">{currentProf.peakRam}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#85847E] block">CPU Latency</span>
                  <strong className="text-[#30312F] font-mono text-[#284E1A]">{currentProf.latency}</strong>
                </div>
              </div>

              {/* Core Bottleneck Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Backbone Card */}
                <div className="p-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#93C5FD]">
                  <div className="font-bold text-[#1E40AF] text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-white border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                        <Database className="w-4 h-4" />
                      </div>
                      <span>ช่วงต้นโมเดล (Backbone L0–L9) - ตัวสูบ RAM</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-[#1E40AF] border border-[#BFDBFE]">
                      RAM HEAVY
                    </span>
                  </div>
                  <p className="text-xs text-[#1E3A8A] leading-relaxed m-0">
                    เลเยอร์แรกๆ ทำหน้าที่สกัด Feature Maps จำนวนมาก ทำให้กินหน่วยความจำ (Activation Memory) มหาศาล เราจึงแก้ปัญหาโดยการรันโมเดลที่ <strong>imgsz=640</strong> เพื่อป้องกันไม่ให้ RAM ของเซิร์ฟเวอร์เต็ม (OOM)
                  </p>
                  <div className="text-[11px] text-[#1D4ED8] bg-white/70 p-2.5 rounded-[10px] border border-[#BFDBFE]/60">
                    <strong>พฤติกรรม:</strong> {currentProf.backboneDesc}
                  </div>
                </div>

                {/* Head Card */}
                <div className="p-5 bg-[#FFF1F2] border border-[#FECDD3] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#FDA4AF]">
                  <div className="font-bold text-[#BE123C] text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[8px] bg-white border border-[#FECDD3] flex items-center justify-center text-[#BE123C]">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <span>ช่วงปลายโมเดล (Head L23) - ตัวเผา CPU</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-[#BE123C] border border-[#FECDD3]">
                      CPU HEAVY
                    </span>
                  </div>
                  <p className="text-xs text-[#881337] leading-relaxed m-0">
                    เมื่อภาพถูกย่อเล็กลง การกิน RAM จะลดลง แต่มวลพารามิเตอร์จะกระจุกตัวหนาแน่นที่สุด (กว่า 21 ล้านตัว) ทำให้กินพลังงานประมวลผลสูงถึง <strong>75.0 GFLOPs</strong> เราจึงแก้ปัญหาด้วยการแปลงโมเดลเป็น <strong>ONNX</strong> และจำกัด Thread เพื่อรีดความเร็วคูณเมทริกซ์
                  </p>
                  <div className="text-[11px] text-[#BE123C] bg-white/70 p-2.5 rounded-[10px] border border-[#FECDD3]/60">
                    <strong>พฤติกรรม:</strong> {currentProf.headDesc}
                  </div>
                </div>
              </div>

              {/* Visual Dual-Axis Graph for Selected Model */}
              <div className="p-4 bg-[#FAF8EF] border border-[#DEDED2] rounded-[20px] flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#30312F] m-0">
                      Layer-wise Profile: Parameters (CPU Load) VS Activations (RAM Load) — {currentProf.name}
                    </h3>
                    <p className="text-[11px] text-[#85847E] m-0 mt-0.5">
                      กราฟ Dual-Axis แสดงความสัมพันธ์ระหว่างปริมาณพารามิเตอร์ (เส้นแดง) กับขนาด Activation Memory (เส้นน้ำเงิน) ตลอดลำดับเลเยอร์
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white text-[#686962] border border-[#DEDED2] shrink-0">
                    DUAL-AXIS PROFILER
                  </span>
                </div>

                <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[14px] p-2.5 flex items-center justify-center overflow-hidden">
                  <img
                    key={`${currentProf.id}-plot`}
                    src={currentProf.plot}
                    alt={`Layer-wise Memory Profiling - ${currentProf.name}`}
                    className="w-full h-auto max-h-[460px] object-contain rounded-[10px] hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* In-Depth Why Breakdown Section */}
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[20px] space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#DEDED2]">
                  <Wrench className="w-4 h-4 text-[#284E1A]" />
                  <h3 className="text-sm font-bold text-[#30312F] m-0">
                    ทำไมแต่ละเลเยอร์ถึงทำงานหนัก / ทำงานเบา? (Layer-by-Layer Architectural Deep-Dive)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Zone 1: Backbone */}
                  <div className="p-4 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-700">1. โซน Backbone (L0 – L9)</span>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          RAM PEAK
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-[#686962]">
                        <p className="m-0 leading-relaxed">
                          <strong>ทำไม RAM ทำงานหนัก:</strong> เลเยอร์แรก (L0-L1) รับภาพเต็ม 640x640x3 แล้วขยายเป็น 64 Feature Maps ทำให้ขนาด Tensors ที่ต้องเก็บใน RAM สูงถึง <strong>26.2 MB ต่อเฟรม</strong>
                        </p>
                        <p className="m-0 leading-relaxed">
                          <strong>ทำไม CPU ทำงานเบา:</strong> เลเยอร์ช่วงนี้มีพารามิเตอร์น้อยมาก (เพียง 1,728 ตัวใน L0) จึงคำนวณเสร็จอย่างรวดเร็ว
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#F0EEE4] text-[11px] text-blue-800">
                      <strong>การจูน:</strong> ล็อคขนาดภาพที่ 640x640 เพื่อคุม Activation Memory
                    </div>
                  </div>

                  {/* Zone 2: Neck */}
                  <div className="p-4 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-700">2. โซน Neck / Fusion (L10 – L22)</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          BALANCED
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-[#686962]">
                        <p className="m-0 leading-relaxed">
                          <strong>ทำไมทำงานเบาทั้งคู่:</strong> เลเยอร์ Upsample และ Concat ใช้ <strong>0 Parameters</strong> เพียงแค่ขยายมิติและนำฟีเจอร์จาก Backbone มารวมกัน
                        </p>
                        <p className="m-0 leading-relaxed">
                          <strong>บทบาทสำคัญ:</strong> ผสานฟีเจอร์ Multi-scale เพื่อส่งข้อมูลย้อนกลับไปช่วยตรวจจับมอเตอร์ไซค์และรถคันที่อยู่ไกล
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#F0EEE4] text-[11px] text-emerald-800">
                      <strong>การจูน:</strong> ใช้ C3k2 Blocks เพื่อให้ Throughput ไหลลื่น
                    </div>
                  </div>

                  {/* Zone 3: Head */}
                  <div className="p-4 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-rose-700">3. โซน Head (L23 Detect)</span>
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          CPU PEAK
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-[#686962]">
                        <p className="m-0 leading-relaxed">
                          <strong>ทำไม CPU ทำงานหนัก:</strong> มวลพารามิเตอร์กว่า <strong>12.8 ล้านตัว (เกิน 58% ของทั้งโมเดล)</strong> ไปกองอยู่ที่เลเยอร์ 23 เพื่อคำนวณพิกัด Bounding Box 2 คลาสบน 3 สเกล
                        </p>
                        <p className="m-0 leading-relaxed">
                          <strong>ทำไม RAM ทำงานเบา:</strong> ภาพถูกย่อเล็กลงเหลือ 80x80, 40x40, 20x20 ทำให้ Activation Tensors เหลือไม่ถึง 2 MB
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#F0EEE4] text-[11px] text-rose-800">
                      <strong>การจูน:</strong> แปลงเป็น ONNX Runtime + คุม Thread
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        })()}
      </div>
    </div>
  )
}
