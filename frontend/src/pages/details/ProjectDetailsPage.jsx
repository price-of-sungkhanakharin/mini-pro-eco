import React from 'react'
import {
  BookOpen,
  Cpu,
  Database,
  Layers,
  Zap,
  HardDrive,
  ShieldCheck,
  Server,
  ArrowRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  FileText,
  Boxes,
  Code2,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'

export default function ProjectDetailsPage({ onNavigate }) {
  return (
    <div className="platform-workspace">
      {/* Top Banner / Breadcrumb */}
      <div className="platform-breadcrumb flex items-center gap-2 text-xs text-[#85847E]">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="hover:text-[#30312F] transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate?.('ecosystem')}
          className="hover:text-[#30312F] transition-colors"
        >
          Ecosystem
        </button>
        <span>/</span>
        <span className="text-[#30312F] font-semibold">Technical Whitepaper</span>
      </div>

      {/* Header */}
      <div className="platform-intro flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#DEDED2]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PillTag variant="active">VERSION 2.4</PillTag>
            <PillTag variant="neutral">CPE SMART PARKING AI</PillTag>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#30312F]">
            เอกสารเชิงเทคนิค: สถาปัตยกรรมและหลักการออกแบบ
          </h1>
          <p className="text-sm text-[#85847E] mt-2 max-w-3xl leading-relaxed">
            รายละเอียดทางวิศวกรรมคอมพิวเตอร์ การเลือกใช้โมเดลโครงข่ายประสาทเทียม การปรับปรุงประสิทธิภาพการประมวลผลบน Edge CPU และกลยุทธ์การตรวจจับสิ่งกีดขวางแบบไฮบริด
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PillButton variant="neutral" onClick={() => onNavigate?.('ecosystem')}>
            ดูแผนภาพสถาปัตยกรรม
          </PillButton>
          <PillButton variant="active" onClick={() => onNavigate?.('dashboard')}>
            กลับหน้า Dashboard
          </PillButton>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: System Architecture */}
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
            ระบบบริหารจัดการที่จอดรถอัจฉริยะภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE Smart Parking AI) ถูกออกแบบตามแนวคิด <strong>Distributed IoT Edge & Centralized Microservices</strong> เพื่อความยืดหยุ่นในการขยายตัว (Scalability) และความเสถียรสูงสุด (Fault Tolerance):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
              <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#284E1A]" />
                <span>ESP32-CAM Nodes (Edge Tier)</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                โหนดกล้องไร้สายกระจาย 3 จุดรอบอาคาร ใช้เซนเซอร์ OV2640 ทำงานร่วมกับ FreeRTOS Deep Sleep (~15s interval) ส่งภาพ 1600x1200 JPEG พร้อม Sidecar JSON Telemetry (RSSI, Temp, Free Heap) ผ่าน HTTP POST
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
              <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#284E1A]" />
                <span>FastAPI API Gateway</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                เกตเวย์หลักแบบ Asynchronous รองรับ REST API สำหรับ Web Dashboard, ระบบ Authentication JWT, Webhook สำหรับ LINE Chatbot และส่งต่อภาพเข้าสู่คิวการประมวลผล
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
              <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#284E1A]" />
                <span>MinIO Object Storage (S3-Compatible)</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                จัดเก็บ Dataset ภาพถ่ายต้นฉบับและผลการตรวจจับแบบ Partition รายวัน/รายชั่วโมง (<code className="bg-[#E7F4D8] text-[#284E1A] px-1.5 py-0.5 rounded text-[11px] font-mono">raw-datasets</code>) รองรับการดึงข้อมูลไปเทรนโมเดลต่อเนื่องบน Roboflow / Label Studio
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2 transition-all hover:border-[#B8B8A8]">
              <div className="font-bold text-[#30312F] text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-[#284E1A]" />
                <span>PostgreSQL 17 & Redis Cache</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                PostgreSQL จัดเก็บ Time-Series Detection Logs, Slot Polygon ROI และ Telemetry ข้อมูลระยะยาว ส่วน Redis รับผิดชอบ In-Memory Fast Cache สำหรับ Real-time Dashboard & Pub/Sub
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Model Selection */}
        <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
              <Zap className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#30312F]">
                2. การเลือกใช้โมเดล YOLO และการเปรียบเทียบประสิทธิภาพ
              </h2>
              <p className="text-xs text-[#85847E]">Single-stage Object Detection บน CPU Architecture</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-[#30312F] leading-relaxed">
            <p>
              <strong>ทำไมถึงเลือกใช้ YOLO (You Only Look Once)?</strong>
              <br />
              <span className="text-[#85847E]">
                YOLO เป็นสถาปัตยกรรม Single-stage Object Detector ที่ทำการพยากรณ์ Bounding Box และ Class Probabilities ในการส่งผ่านโครงข่ายประสาทเทียมเพียงรอบเดียว (Single Forward Pass) แตกต่างจากตระกูล Two-stage (เช่น Faster R-CNN) ที่มีขั้นตอน Region Proposal แยกต่างหาก ทำให้ YOLO มีความเร็วสูงและใช้หน่วยประมวลผลน้อย เหมาะสำหรับการประมวลผล 24/7 บนเซิร์ฟเวอร์ CPU ของสถาบัน
              </span>
            </p>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] my-4">
              <h3 className="font-bold text-xs uppercase text-[#85847E] tracking-wider mb-3">
                ผลการทดสอบเชิงประจักษ์ (Empirical Benchmark on 50 Holdout Images)
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
                      <td className="py-3 px-3 font-bold text-[#30312F]">YOLO26m (Fine-Tuned)</td>
                      <td className="py-3 px-3 font-bold text-[#284E1A]">98.5%</td>
                      <td className="py-3 px-3 text-[#30312F]">1,136.6 ms / frame</td>
                      <td className="py-3 px-3 text-[#30312F]">344.0 MB</td>
                      <td className="py-3 px-3 text-[#85847E]">41.97 MB (21.78M params)</td>
                      <td className="py-3 px-3 text-[#85847E]">ความแม่นยำสูงสุดในสภาพแสงซับซ้อน</td>
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
            </div>

            <p className="text-xs text-[#85847E]">
              * ข้อสังเกต: โมเดล <strong>YOLO26n</strong> ให้ประสิทธิภาพความเร็วสูงกว่า 3.47 เท่า โดยสูญเสียความแม่นยำ (mAP@50) เพียง 0.5% เมื่อเทียบกับรุ่น Medium ทำให้เป็นตัวเลือกที่ยอดเยี่ยมสำหรับการประมวลผลแบบ Real-time High Throughput
            </p>
          </div>
        </section>

        {/* Section 3: Alternative Models Evaluation */}
        <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
              <Boxes className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#30312F]">
                3. การประเมินและเปรียบเทียบกับโมเดลทางเลือก (Alternative Models)
              </h2>
              <p className="text-xs text-[#85847E]">เหตุผลทางวิศวกรรมที่ไม่เลือกใช้สถาปัตยกรรมอื่น</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#991B1B] font-bold text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>SSD (Single Shot MultiBox)</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                แม้จะมีความเร็วสูง แต่ SSD มีข้อจำกัดอย่างมากในการตรวจจับวัตถุขนาดเล็กและวัตถุที่มีการบดบัง (Occlusion) สูง เช่น รถจักรยานยนต์ที่จอดเรียงซ้อนกันอย่างหนาแน่นบริเวณข้างภาควิชา
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#991B1B] font-bold text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>RT-DETR (Transformer-Based)</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                โมเดลตระกูล Transformer ให้ความแม่นยำสูง แต่มี Overhead ทางการคำนวณของ Self-Attention Mechanism สูงมาก ต้องการ GPU โดยเฉพาะ ไม่สามารถรันบน CPU เซิร์ฟเวอร์ทั่วไปได้อย่างมีประสิทธิภาพ
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#991B1B] font-bold text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>Background Subtraction (MOG2)</span>
              </div>
              <p className="text-xs text-[#85847E] leading-relaxed">
                วิธีการลบพื้นหลังแบบดั้งเดิมล้มเหลวทันทีเมื่อยานพาหนะจอดนิ่งเป็นเวลานาน (วัตถุจะถูกกลืนกลายเป็นพื้นหลัง) และอ่อนไหวอย่างยิ่งต่อการเปลี่ยนแปลงของมุมแสงแดดและเงาต้นไม้ในเวลากลางวัน
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Input Size Optimization */}
        <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
              <Sliders className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#30312F]">
                4. การปรับขนาดภาพนำเข้า (Input Resolution Optimization: 1600x1200 ➔ 640x640)
              </h2>
              <p className="text-xs text-[#85847E]">ลดความซับซ้อนเชิงคำนวณกำลังสอง $\mathcal{O}(W \times H)$</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-[#30312F] leading-relaxed">
            <p className="text-[#85847E]">
              ในการคำนวณของ Convolutional Neural Network (CNN) ปริมาณการคำนวณเชิงคณิตศาสตร์ (FLOPs) และการจัดสรรหน่วยความจำแปรผันตามขนาดของภาพแบบ <strong>กำลังสอง (Quadratic Complexity: $\mathcal{O}(W \times H)$)</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-5 bg-[#FAF8EF] border border-[#DEDED2] rounded-[18px]">
                <div className="font-bold text-[#30312F] text-sm mb-1">ภาพต้นฉบับ (1600 x 1200 UXGA)</div>
                <div className="text-xs text-[#85847E]">พิกเซลทั้งหมด: <strong className="font-mono text-[#30312F]">1,920,000 พิกเซล</strong></div>
                <div className="text-xs text-[#991B1B] mt-2 font-mono">CPU Inference Time: ~4,200 ms / frame</div>
              </div>

              <div className="p-5 bg-[#E7F4D8]/40 border border-[#DEDED2] rounded-[18px]">
                <div className="font-bold text-[#284E1A] text-sm mb-1">ภาพปรับสเกล (640 x 640 Squarified)</div>
                <div className="text-xs text-[#85847E]">พิกเซลทั้งหมด: <strong className="font-mono text-[#284E1A]">409,600 พิกเซล (ลดลง 78.7%)</strong></div>
                <div className="text-xs text-[#284E1A] mt-2 font-mono font-bold">CPU Inference Time: ~327 - 1,136 ms / frame</div>
              </div>
            </div>

            <p className="text-xs text-[#85847E] leading-relaxed">
              <strong className="text-[#30312F]">การแก้ปัญหา Coordinate Mismatch:</strong> เมื่อทำการปรับขนาดภาพเป็น 640x640 ก่อนส่งเข้า <code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">model.predict()</code> ตัวระบบ <code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">detect_worker.py</code> จะคำนวณอัตราส่วนมาตราส่วนย้อนกลับ (<code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">scale_x = 1600/640</code>, <code className="bg-[#FAF8EF] border border-[#DEDED2] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312F]">scale_y = 1200/640</code>) เพื่อแปลงพิกัด Bounding Box กลับสู่มิติภาพ 1600x1200 ดั้งเดิม ทำให้การทดสอบความสอดคล้องกับพิกัดช่องจอด (Polygon ROI Point-in-Polygon Test) มีความแม่นยำ 100% โดยไม่ต้องปรับแก้มิติพิกัดในฐานข้อมูล
            </p>
          </div>
        </section>

        {/* Section 5: Cone Detection Strategy */}
        <section className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] p-6 lg:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#DEDED2]">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAF8EF] border border-[#DEDED2] text-[#30312F] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#30312F]">
                5. กลยุทธ์การตรวจจับกรวยจราจร (Hybrid HSV Color Masking)
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
      </div>
    </div>
  )
}
