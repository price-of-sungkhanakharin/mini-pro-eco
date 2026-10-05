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

export default function ProjectDetailsPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#212529] p-4 md:p-8 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div className="max-w-5xl mx-auto border-b-2 border-[#212529] pb-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#2F6BFF] text-white font-mono text-xs font-bold uppercase rounded-sm border border-[#212529] shadow-[2px_2px_0px_#212529]">
            TECHNICAL WHITEPAPER
          </span>
          <span className="text-xs font-mono text-neutral-500 font-semibold">
            VERSION 2.4 · CPE SMART PARKING AI
          </span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3 text-[#212529]">
          เอกสารเชิงเทคนิค: สถาปัตยกรรมและหลักการออกแบบระบบตรวจจับที่จอดรถอัจฉริยะ
        </h1>
        <p className="text-sm md:text-base text-neutral-600 mt-2 leading-relaxed">
          รายละเอียดทางวิศวกรรมคอมพิวเตอร์ การเลือกใช้โมเดลโครงข่ายประสาทเทียม การปรับปรุงประสิทธิภาพการประมวลผลบน Edge CPU และกลยุทธ์การตรวจจับสิ่งกีดขวางแบบไฮบริด
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-10">

        {/* Section 1: System Architecture */}
        <section className="bg-white p-6 md:p-8 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529]">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
            <Server className="w-6 h-6 text-[#2F6BFF]" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">
              1. สถาปัตยกรรมระบบ (System Architecture)
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-neutral-700 mb-6">
            ระบบบริหารจัดการที่จอดรถอัจฉริยะภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE Smart Parking AI) ถูกออกแบบตามแนวคิด <strong>Distributed IoT Edge & Centralized Microservices</strong> เพื่อความยืดหยุ่นในการขยายตัว (Scalability) และความเสถียรสูงสุด (Fault Tolerance):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-6">
            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded shadow-[2px_2px_0px_#212529]">
              <div className="font-bold text-[#2F6BFF] text-sm mb-1 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> ESP32-CAM Nodes (Edge Tier)
              </div>
              <p className="text-neutral-600 leading-normal">
                โหนดกล้องไร้สายกระจาย 3 จุดรอบอาคาร ใช้เซนเซอร์ OV2640 ทำงานร่วมกับ FreeRTOS Deep Sleep (~15s interval) ส่งภาพ 1600x1200 JPEG พร้อม Sidecar JSON Telemetry (RSSI, Temp, Free Heap) ผ่าน HTTP POST
              </p>
            </div>

            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded shadow-[2px_2px_0px_#212529]">
              <div className="font-bold text-emerald-600 text-sm mb-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> FastAPI API Gateway
              </div>
              <p className="text-neutral-600 leading-normal">
                เกตเวย์หลักแบบ Asynchronous รองรับ REST API สำหรับ Web Dashboard, ระบบ Authentication JWT, Webhook สำหรับ LINE Chatbot และส่งต่อภาพเข้าสู่คิวการประมวลผล
              </p>
            </div>

            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded shadow-[2px_2px_0px_#212529]">
              <div className="font-bold text-amber-600 text-sm mb-1 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" /> MinIO Object Storage (S3-Compatible)
              </div>
              <p className="text-neutral-600 leading-normal">
                จัดเก็บ Dataset ภาพถ่ายต้นฉบับและผลการตรวจจับแบบ Partition รายวัน/รายชั่วโมง (<code className="bg-amber-100 px-1">raw-datasets</code>) รองรับการดึงข้อมูลไปเทรนโมเดลต่อเนื่องบน Roboflow / Label Studio
              </p>
            </div>

            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded shadow-[2px_2px_0px_#212529]">
              <div className="font-bold text-indigo-600 text-sm mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4" /> PostgreSQL 17 & Redis Cache
              </div>
              <p className="text-neutral-600 leading-normal">
                PostgreSQL จัดเก็บ Time-Series Detection Logs, Slot Polygon ROI และ Telemetry ข้อมูลระยะยาว ส่วน Redis รับผิดชอบ In-Memory Fast Cache สำหรับ Real-time Dashboard & Pub/Sub
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Model Selection */}
        <section className="bg-white p-6 md:p-8 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529]">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
            <Zap className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">
              2. การเลือกใช้โมเดล YOLO และการเปรียบเทียบประสิทธิภาพ
            </h2>
          </div>

          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <p>
              <strong>ทำไมถึงเลือกใช้ YOLO (You Only Look Once)?</strong>
              <br />
              YOLO เป็นสถาปัตยกรรม Single-stage Object Detector ที่ทำการพยากรณ์ Bounding Box และ Class Probabilities ในการส่งผ่านโครงข่ายประสาทเทียมเพียงรอบเดียว (Single Forward Pass) แตกต่างจากตระกูล Two-stage (เช่น Faster R-CNN) ที่มีขั้นตอน Region Proposal แยกต่างหาก ทำให้ YOLO มีความเร็วสูงและใช้หน่วยประมวลผลน้อย เหมาะสำหรับการประมวลผล 24/7 บนเซิร์ฟเวอร์ CPU ของสถาบัน
            </p>

            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded my-4">
              <h3 className="font-black text-sm uppercase text-[#212529] mb-3">
                ผลการทดสอบเชิงประจักษ์ (Empirical Benchmark on 50 Holdout Images):
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#212529] bg-neutral-100">
                      <th className="py-2 px-3">สถาปัตยกรรมโมเดล</th>
                      <th className="py-2 px-3">mAP@50</th>
                      <th className="py-2 px-3">CPU Latency (เฉลี่ย)</th>
                      <th className="py-2 px-3">RAM Footprint</th>
                      <th className="py-2 px-3">ขนาดไฟล์ Weight</th>
                      <th className="py-2 px-3">จุดเด่น / การใช้งาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="py-2 px-3 font-bold text-[#2F6BFF]">YOLO26m (Fine-Tuned)</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">98.5%</td>
                      <td className="py-2 px-3">1,136.6 ms / frame</td>
                      <td className="py-2 px-3">344.0 MB</td>
                      <td className="py-2 px-3">41.97 MB (21.78M params)</td>
                      <td className="py-2 px-3">ความแม่นยำสูงสุดในสภาพแสงซับซ้อน</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="py-2 px-3 font-bold text-emerald-700">YOLO26n (Nano Base)</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">98.0%</td>
                      <td className="py-2 px-3 font-bold text-emerald-700">327.8 ms / frame</td>
                      <td className="py-2 px-3 font-bold text-emerald-700">2.5 MB</td>
                      <td className="py-2 px-3">5.29 MB (2.57M params)</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">เร็วขึ้น 3.47x ประหยัด RAM 99.3%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-neutral-600">
              * ข้อสังเกต: โมเดล <strong>YOLO26n</strong> ให้ประสิทธิภาพความเร็วสูงกว่า 3.47 เท่า โดยสูญเสียความแม่นยำ (mAP@50) เพียง 0.5% เมื่อเทียบกับรุ่น Medium ทำให้เป็นตัวเลือกที่ยอดเยี่ยมสำหรับการประมวลผลแบบ Real-time High Throughput
            </p>
          </div>
        </section>

        {/* Section 3: Alternative Models Evaluation */}
        <section className="bg-white p-6 md:p-8 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529]">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
            <Boxes className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">
              3. การประเมินและเปรียบเทียบกับโมเดลทางเลือก (Alternative Models)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50/60 border border-rose-300 rounded">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                SSD (Single Shot MultiBox)
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">
                แม้จะมีความเร็วสูง แต่ SSD มีข้อจำกัดอย่างมากในการตรวจจับวัตถุขนาดเล็กและวัตถุที่มีการบดบัง (Occlusion) สูง เช่น รถจักรยานยนต์ที่จอดเรียงซ้อนกันอย่างหนาแน่นบริเวณข้างภาควิชา
              </p>
            </div>

            <div className="p-4 bg-rose-50/60 border border-rose-300 rounded">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                RT-DETR (Transformer-Based)
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">
                โมเดลตระกูล Transformer ให้ความแม่นยำสูง แต่มี Overhead ทางการคำนวณของ Self-Attention Mechanism สูงมาก ต้องการ GPU โดยเฉพาะ ไม่สามารถรันบน CPU เซิร์ฟเวอร์ทั่วไปได้อย่างมีประสิทธิภาพ
              </p>
            </div>

            <div className="p-4 bg-rose-50/60 border border-rose-300 rounded">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                Background Subtraction (MOG2)
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">
                วิธีการลบพื้นหลังแบบดั้งเดิมล้มเหลวทันทีเมื่อยานพาหนะจอดนิ่งเป็นเวลานาน (วัตถุจะถูกกลืนกลายเป็นพื้นหลัง) และอ่อนไหวอย่างยิ่งต่อการเปลี่ยนแปลงของมุมแสงแดดและเงาต้นไม้ในเวลากลางวัน
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Input Size Optimization */}
        <section className="bg-white p-6 md:p-8 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529]">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
            <Sliders className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">
              4. การปรับขนาดภาพนำเข้า (Input Resolution Optimization: 1600x1200 ➔ 640x640)
            </h2>
          </div>

          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <p>
              ในการคำนวณของ Convolutional Neural Network (CNN) ปริมาณการคำนวณเชิงคณิตศาสตร์ (FLOPs) และการจัดสรรหน่วยความจำแปรผันตามขนาดของภาพแบบ <strong>กำลังสอง (Quadratic Complexity: $\mathcal{O}(W \times H)$)</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono my-3">
              <div className="p-3.5 bg-neutral-100 rounded border border-neutral-300">
                <div className="font-bold text-neutral-800 mb-1">ภาพต้นฉบับ (1600 x 1200 UXGA):</div>
                <div>พิกเซลทั้งหมด: <strong>1,920,000 พิกเซล</strong></div>
                <div className="text-rose-600 mt-1">CPU Inference Time: ~4,200 ms / frame</div>
              </div>

              <div className="p-3.5 bg-teal-50 rounded border border-teal-300">
                <div className="font-bold text-teal-800 mb-1">ภาพปรับสเกล (640 x 640 Squarified):</div>
                <div>พิกเซลทั้งหมด: <strong>409,600 พิกเซล (ลดลง 78.7%)</strong></div>
                <div className="text-teal-700 mt-1">CPU Inference Time: ~327 - 1,136 ms / frame</div>
              </div>
            </div>

            <p>
              <strong>การแก้ปัญหา Coordinate Mismatch:</strong> เมื่อทำการปรับขนาดภาพเป็น 640x640 ก่อนส่งเข้า <code className="bg-neutral-100 px-1">model.predict()</code> ตัวระบบ <code className="bg-neutral-100 px-1">detect_worker.py</code> จะคำนวณอัตราส่วนมาตราส่วนย้อนกลับ (<code className="bg-neutral-100 px-1">scale_x = 1600/640</code>, <code className="bg-neutral-100 px-1">scale_y = 1200/640</code>) เพื่อแปลงพิกัด Bounding Box กลับสู่มิติภาพ 1600x1200 ดั้งเดิม ทำให้การทดสอบความสอดคล้องกับพิกัดช่องจอด (Polygon ROI Point-in-Polygon Test) มีความแม่นยำ 100% โดยไม่ต้องปรับแก้มิติพิกัดในฐานข้อมูล
            </p>
          </div>
        </section>

        {/* Section 5: Cone Detection Strategy */}
        <section className="bg-white p-6 md:p-8 border-2 border-[#212529] rounded-lg shadow-[4px_4px_0px_#212529]">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-200">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">
              5. กลยุทธ์การตรวจจับกรวยจราจร (Hybrid HSV Color Masking)
            </h2>
          </div>

          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <p>
              ในลานจอดรถจริง มักมีการนำ <strong>กรวยจราจรสีส้ม (Traffic Cones)</strong> หรือสิ่งกีดขวางมาวางกั้นช่องจอดเพื่อสำรองที่จอด ซึ่งโมเดลตรวจจับยานพาหนะทั่วไป (Class: Car, Motorcycle) จะระบุว่าช่องดังกล่าวเป็น "ว่าง" (Vacant) เนื่องจากไม่มีรถจอด
            </p>

            <div className="p-4 bg-[#FDFBF7] border-2 border-[#212529] rounded">
              <h3 className="font-black text-sm uppercase text-[#212529] mb-2 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#2F6BFF]" /> อัลกอริทึมการทำงานแบบไฮบริด (Hybrid Verification Pipeline):
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs font-mono text-neutral-700">
                <li>แปลงภาพต้นฉบับจาก BGR สู่ <strong>HSV Color Space</strong> เพื่อแยกข้อมูลสี (Hue/Saturation) ออกจากระดับความสว่าง (Value)</li>
                <li>สร้าง Binary Mask สีส้มด้วยช่วงพารามิเตอร์: <code className="bg-neutral-200 px-1">Lower = (5, 150, 150)</code> และ <code className="bg-neutral-200 px-1">Upper = (25, 255, 255)</code></li>
                <li>ทำการตัดส่วน (Bitwise-AND) เฉพาะพื้นที่ภายใน Polygon ของแต่ละช่องจอด (<code className="bg-neutral-200 px-1">active_slots</code>)</li>
                <li>หากสัดส่วนพิกเซลสีส้มเทียบกับพื้นที่ช่องจอดเกิน <strong>15% (Threshold &gt; 0.15)</strong> ระบบจะสั่ง <strong>Override</strong> สถานะช่องนั้นเป็น <span className="font-bold text-rose-600">"OCCUPIED (cone_detected)"</span> ทันที แม้โมเดล YOLO จะไม่พบรถยนต์</li>
              </ol>
            </div>

            <p className="text-xs text-neutral-600">
              ผลลัพธ์: ระบบสามารถป้องกันข้อผิดพลาดในการนำทางผู้ขับขี่ไปยังช่องจอดที่ถูกตั้งกรวยกั้นได้อย่างสมบูรณ์แบบโดยไม่ต้องเทรนโมเดลใหม่
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
