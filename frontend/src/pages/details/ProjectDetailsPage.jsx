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
  Layers
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
        desc="ถ่ายภาพและยิง Request ไปที่เซิร์ฟเวอร์ พร้อมแนบข้อมูล Telemetry (อุณหภูมิ, Wi-Fi RSSI, Free RAM) ไปใน Header ของ HTTP"
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
        desc="บันทึกค่า Framesize ใหม่ลง RTC Memory ปิดการทำงานของ CPU และ Wi-Fi เพื่อลดอุณหภูมิ และตั้งนาฬิกาปลุกตามจำนวนวินาทีที่เซิร์ฟเวอร์สั่ง (เช่น 30 วินาที) ก่อนวนกลับไป Step 1"
        icon={Cpu}
        isFinal={true}
      />
    </div>
  </div>
)

export default function ProjectDetailsPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('all')

  const tabs = [
    { id: 'all', label: 'ทั้งหมด (All Overview)', icon: Layers },
    { id: 'flowchart', label: 'ESP32 Deep Sleep Flowchart', icon: RefreshCw },
    { id: 'architecture', label: '1. สถาปัตยกรรมระบบ (Architecture)', icon: Server },
    { id: 'model', label: '2. ทำไมถึงเลือก YOLO (Model Benchmark)', icon: Activity },
    { id: 'optimization', label: '3. การปรับขนาดภาพ (Input Size 640x640)', icon: Sliders },
    { id: 'cone', label: '4. ตรวจจับกรวยจราจร (Hybrid HSV Masking)', icon: ShieldAlert },
  ]

  return (
    <div className="platform-workspace">
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
            เอกสารเชิงเทคนิค: สถาปัตยกรรมระบบ การตัดสินใจเลือกโมเดล และผังการทำงานของฮาร์ดแวร์ Edge Node (Whitepaper)
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

      {/* 3. Sub-Navigation Tabs Bar (เหมือนแท็บ Setup & Analytics) */}
      <div className="flex items-center gap-2 overflow-x-auto w-full p-1.5 bg-[#FAF8EF] border border-[#DEDED2] rounded-full scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer select-none ${
                active
                  ? 'bg-[#30312F] text-white shadow-xs'
                  : 'text-[#686962] hover:text-[#30312F]'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          )
        })}
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
                <Server className="w-5 h-5" strokeWidth={1.8} />
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
                  ทำหน้าที่เป็น IoT Node ไร้สาย ถ่ายภาพและส่งข้อมูล Telemetry (อุณหภูมิ, RSSI, RAM) ผ่าน HTTP POST โดยใช้ Deep Sleep Cycle เพื่อป้องกัน Thermal Throttling
                </p>
              </div>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#284E1A]" />
                  <span>Service Tier (FastAPI Gateway)</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  เกตเวย์หลักแบบ Asynchronous รันโมเดล YOLO บน CPU แบบประหยัดโหลด รองรับ REST API สำหรับ Web Dashboard, LINE Webhook และ 2-Way Edge Control
                </p>
              </div>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
                <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#284E1A]" />
                  <span>Storage Tier (MinIO + Postgres + Redis)</span>
                </div>
                <p className="text-xs text-[#85847E] leading-relaxed">
                  จัดเก็บข้อมูลดิบและผลตรวจจับลง MinIO (S3-compatible) ใช้ PostgreSQL 17 จัดเก็บ Time-Series Detection Logs และใช้ Redis ในการทำ In-Memory Cache
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Model Selection */}
        {(activeTab === 'all' || activeTab === 'model') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  2. ทำไมถึงเลือกใช้ YOLO (Model Selection)
                </h2>
                <p className="text-xs text-[#85847E]">Single-stage Object Detection บน CPU Architecture</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#30312F] leading-relaxed">
              <p>
                งานของเราเน้นการวิเคราะห์ภาพจากลานจอดรถที่มีรถหนาแน่นและมีการซ้อนทับกัน (Occlusion) <strong>YOLO (You Only Look Once)</strong> ซึ่งเป็นโมเดลแบบ Single-stage Detector ตอบโจทย์ที่สุดเพราะสามารถหาตำแหน่ง (Bounding Box) และแยกคลาสได้ในการ Forward pass เพียงครั้งเดียว แตกต่างจาก Two-stage Detector ที่ช้ากว่ามาก
              </p>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] my-4">
                <h3 className="font-bold text-xs uppercase text-[#85847E] tracking-wider mb-3">
                  ผลการเปรียบเทียบ YOLO26m vs YOLO26n บน CPU Server (Holdout Benchmark)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DEDED2] text-[#85847E]">
                        <th className="py-2.5 px-3">สถาปัตยกรรมโมเดล</th>
                        <th className="py-2.5 px-3">mAP@50</th>
                        <th className="py-2.5 px-3">CPU Latency (เฉลี่ย)</th>
                        <th className="py-2.5 px-3">RAM Footprint</th>
                        <th className="py-2.5 px-3">ขนาดไฟล์ Weight</th>
                        <th className="py-2.5 px-3">จุดเด่น / การใช้งาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DEDED2]">
                      <tr>
                        <td className="py-3 px-3 font-bold text-[#30312F]">YOLO26m (Medium)</td>
                        <td className="py-3 px-3 font-bold text-[#284E1A]">98.5%</td>
                        <td className="py-3 px-3 text-[#30312F]">1,136.6 ms / frame</td>
                        <td className="py-3 px-3 text-[#30312F]">344.0 MB</td>
                        <td className="py-3 px-3 text-[#85847E]">41.97 MB (21.78M params)</td>
                        <td className="py-3 px-3 text-[#85847E]">ความแม่นยำสูงในสภาพแสงซับซ้อน</td>
                      </tr>
                      <tr className="bg-[#E7F4D8]/30">
                        <td className="py-3 px-3 font-bold text-[#284E1A]">YOLO26n (Nano Base)</td>
                        <td className="py-3 px-3 font-bold text-[#284E1A]">98.0%</td>
                        <td className="py-3 px-3 font-bold text-[#284E1A]">327.8 ms / frame</td>
                        <td className="py-3 px-3 font-bold text-[#284E1A]">2.5 MB</td>
                        <td className="py-3 px-3 text-[#85847E]">5.29 MB (2.57M params)</td>
                        <td className="py-3 px-3 font-bold text-[#284E1A]">เร็วขึ้น 3.47x ประหยัด RAM 99.3%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 bg-[#E7F4D8]/40 border border-[#BBF7D0] rounded-[10px] text-xs text-[#284E1A] font-medium">
                  💡 <strong>บทสรุปเชิงวิศวกรรม:</strong> เราเลือกใช้โมเดลระดับ Nano เพราะเร็วกว่า 3.47 เท่า และลดการกิน RAM ลงมหาศาล โดยที่ความแม่นยำ (mAP@50) ลดลงเพียง 0.5% เท่านั้น
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Optimization */}
        {(activeTab === 'all' || activeTab === 'optimization') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Sliders className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  3. การประหยัดโหลด CPU (Input Size Optimization: 1600x1200 ➔ 640x640)
                </h2>
                <p className="text-xs text-[#85847E]">ลดความซับซ้อนเชิงคำนวณกำลังสอง O(W x H)</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#30312F] leading-relaxed">
              <p className="text-[#686962]">
                ภาพที่ส่งมาจากกล้องมีขนาดใหญ่ (เช่น 1600x1200 หรือ 800x600) การป้อนภาพขนาดใหญ่เข้าโมเดลโดยตรงจะทำให้เกิดการคำนวณ (FLOPs) มหาศาลแบบยกกำลังสอง:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
                <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px]">
                  <div className="font-bold text-[#30312F] text-sm mb-1">ภาพต้นฉบับ (1600 x 1200 UXGA)</div>
                  <div className="text-xs text-[#85847E]">พิกเซลทั้งหมด: <strong className="font-mono text-[#30312F]">1,920,000 พิกเซล</strong></div>
                  <div className="text-xs text-[#991B1B] mt-2 font-mono">CPU Inference Time: ~4,200 ms / frame</div>
                </div>

                <div className="p-5 bg-[#E7F4D8]/40 border border-[#BBF7D0] rounded-[18px]">
                  <div className="font-bold text-[#284E1A] text-sm mb-1">ภาพปรับสเกล (640 x 640 Sweet Spot)</div>
                  <div className="text-xs text-[#85847E]">พิกเซลทั้งหมด: <strong className="font-mono text-[#284E1A]">409,600 พิกเซล (ลดลง 78.7%)</strong></div>
                  <div className="text-xs text-[#284E1A] mt-2 font-mono font-bold">CPU Inference Time: ~327 - 1,136 ms / frame</div>
                </div>
              </div>

              <p className="text-xs text-[#85847E] leading-relaxed">
                เราทำการ <strong>Resize ภาพให้เหลือ 640x640 (imgsz=640)</strong> ก่อนโยนเข้า YOLO ซึ่งเป็นจุดสมดุลที่สุดในการรันบน CPU โดยใช้หลักการคูณ Scale (<code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">scale_x = 1600/640</code>, <code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">scale_y = 1200/640</code>) กลับไปที่พิกัด Bounding Box เพื่อให้สัดส่วนของ Polygon ลานจอดรถยังคงแม่นยำ 100% เหมือนเดิม
              </p>
            </div>
          </section>
        )}

        {/* Section 4: Cone Detection Strategy */}
        {(activeTab === 'all' || activeTab === 'cone') && (
          <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
                <Code2 className="w-5 h-5 text-[#284E1A]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#30312F]">
                  4. กลยุทธ์การตรวจจับกรวยจราจร (Hybrid HSV Color Masking)
                </h2>
                <p className="text-xs text-[#85847E]">แก้ไขปัญหา False Vacant จากสิ่งกีดขวางที่ไม่มีในโมเดล</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#30312F] leading-relaxed">
              <p className="text-[#85847E]">
                ในลานจอดรถจริง มักมีการนำ <strong>กรวยจราจรสีส้ม (Traffic Cones)</strong> หรือสิ่งกีดขวางมาวางกั้นช่องจอดเพื่อสำรองที่จอด ซึ่งโมเดลตรวจจับยานพาหนะทั่วไป (Class: Car, Motorcycle) จะระบุว่าช่องดังกล่าวเป็น "ว่าง" (Vacant) เนื่องจากไม่มีรถจอด
              </p>

              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px]">
                <h3 className="font-bold text-xs uppercase text-[#85847E] tracking-wider mb-3 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#30312F]" /> อัลกอริทึมการทำงานแบบไฮบริด (Hybrid Verification Pipeline)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs font-mono text-[#30312F]">
                  <li>แปลงภาพต้นฉบับจาก BGR สู่ <strong>HSV Color Space</strong> เพื่อแยกข้อมูลสี (Hue/Saturation) ออกจากระดับความสว่าง (Value)</li>
                  <li>สร้าง Binary Mask สีส้มด้วยช่วงพารามิเตอร์: <code className="bg-[#FFFDF7] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px]">Lower = (5, 150, 150)</code> และ <code className="bg-[#FFFDF7] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px]">Upper = (25, 255, 255)</code></li>
                  <li>ทำการตัดส่วน (Bitwise-AND) เฉพาะพื้นที่ภายใน Polygon ของแต่ละช่องจอด (<code className="bg-[#FFFDF7] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px]">active_slots</code>)</li>
                  <li>หากสัดส่วนพิกเซลสีส้มเทียบกับพื้นที่ช่องจอดเกิน <strong>15% (Threshold &gt; 0.15)</strong> ระบบจะสั่ง <strong>Override</strong> สถานะช่องนั้นเป็น <span className="font-bold text-[#991B1B]">"OCCUPIED (cone_detected)"</span> ทันที แม้โมเดล YOLO จะไม่พบรถยนต์</li>
                </ol>
              </div>

              <p className="text-xs text-[#85847E]">
                ผลลัพธ์: ระบบสามารถป้องกันข้อผิดพลาดในการนำทางผู้ขับขี่ไปยังช่องจอดที่ถูกตั้งกรวยกั้นได้อย่างสมบูรณ์แบบโดยไม่ต้องเทรนโมเดลใหม่
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
