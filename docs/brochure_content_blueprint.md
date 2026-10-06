# 🏛️ MASTER BROCHURE & INFOGRAPHIC BLUEPRINT
## ระบบวิเคราะห์และพยากรณ์ที่จอดรถอัจฉริยะ (AI-Powered Smart Campus Parking & Edge Ecosystem)

> **คู่มือเนื้อหาฉบับสมบูรณ์ (Ready-to-Design & Ready-to-Prompt):**  
> เอกสารนี้ออกแบบสำหรับทำ **แผ่นพับ 3 ตอน (Tri-Fold Brochure)** หรือ **อินโฟกราฟิก 3 คอลัมน์ขนาดใหญ่** เชื่อมโยงขอบเขตงานของอาจารย์ทั้ง 3 ท่านเข้าด้วยกันเป็นระบบเดียวอย่างแนบแน่น พร้อมข้อมูลทางเทคนิคและสถิติการวัดผลจริง 100%

---

# 🔄 THE SYNERGISTIC TRIANGLE (การเชื่อมโยงของทั้ง 3 คนเป็นหนึ่งเดียว)

```text
                                  ┌────────────────────────────────────────┐
                                  │           [1] อาจารย์โอ๊ต               │
                                  │    ECOSYSTEM & DATA INFRASTRUCTURE     │
                                  │  • กล้องริมกระจก (Indoor Window Node)  │
                                  │  • Ingestion Server (:5005)            │
                                  │  • Dual-Storage (Disk + MinIO S3)      │
                                  │  • Main Server: FastAPI, Redis, Postgres│
                                  │  • Orchestration ไปยัง Modal GPU Node  │
                                  └──────────────────┬─────────────────────┘
                                                     │
                                 ส่งภาพ Snapshot     │   ส่งผล Real-time + คาดการณ์
                                 + Telemetry         │   ไปแสดง Dashboard & LINE Bot
                                 (ความร้อน/แสงแดด)   │   + สั่ง OTA Sleep กลับสู่กล้อง
                                                     ▼
                  ┌──────────────────────────────────┴──────────────────────────────────┐
                  │                                                                     │
                  ▼                                                                     ▼
┌────────────────────────────────────────┐                            ┌────────────────────────────────────────┐
│             [3] อาจารย์เฟิร์น          │                            │              [2] อาจารย์ซัม            │
│       YOLO VISION & SLOT DETECTION     │ ── ส่ง Delta Vehicles ───> │      TIME-SERIES & EDGE INTELLIGENCE   │
│  • รับภาพจาก MinIO / Ingestion         │    (ประวัติเข้า-ออกสะสม)   │  • รับยอดรถจาก อ.เฟิร์น                │
│  • ตัดแสงสะท้อนกระจก + คัดแยกรถ/มอไซค์ │                            │  • รับค่าความร้อนชิป/แสงแดดจาก อ.โอ๊ต  │
│  • คำนวณ Polygon ROI Intersection     │ <── Active Retrain Trigger ┤  • พยากรณ์ที่ว่างล่วงหน้า 15m/30m      │
│  • ถ้า Confidence < 40% (ภาพเงากระจก)  │     (แปรผันตามช่วงเวลา     │  • พยากรณ์ความร้อนสะสมริมกระจก         │
│    ส่งกลับ อ.โอ๊ต ขึ้น Modal GPU Node │      Campus Phases)        │  • คำนวณ Adaptive Sleep (10-60s)       │
└────────────────────────────────────────┘                            └────────────────────────────────────────┘
```

### คำอธิบายการเชื่อมต่อ (Narrative for Presentation):
1. **อ.โอ๊ต คือ กระดูกสันหลัง (Infrastructure & Pipeline Spine):**
   - ติดตั้งกล้อง ESP32-CAM อยู่ในร่มแต่อยู่ **ชิดกระจกหน้าต่าง** ซึ่งโดนแดดส่องผ่านกระจกจนเกิด **Greenhouse Effect**
   - รวบรวมภาพถ่ายพร้อม Header `X-Telemetry` (อุณหภูมิชิป, แสง AEC, ค่า Wi-Fi RSSI) เข้าสู่ **เซิร์ฟเวอร์หลัก (Main Server)**
   - จัดเก็บภาพแบบ Dual-Storage ลง Local Disk คู่กับ **MinIO S3 Data Lake** และบริหารจัดการท่อส่งข้อมูล
2. **อ.เฟิร์น คือ ดวงตาปัญญาประดิษฐ์ (Vision & Spatial Perception):**
   - ดึงภาพจากระบบ Ingestion ของ อ.โอ๊ต มาทำ Inference แบบ Real-time บน CPU ของ Main Server
   - ใช้โมเดล Fine-tuned YOLO (`best.pt`) ตรวจจับทั้งรถยนต์และมอเตอร์ไซค์ที่จอดซ้อนกัน
   - นำผล Bounding Box ไปทาบกับพิกัดช่องจอด **ROI Polygons (`roi.json`)** เพื่อบอกว่าช่องไหนว่าง/เต็ม และส่งสถิติการเคลื่อนไหว (`delta_vehicles`) ไปให้ **อ.ซัม**
   - หากเจอภาพยาก (เช่น แสงสะท้อนกระจกช่วงบ่าย, ฝนตก) จน Confidence ต่ำกว่า 40% จะส่งภาพนั้นกลับไปให้ Pipeline ของ **อ.โอ๊ต** เพื่อส่งขึ้น **Modal GPU Node** เทรนใหม่
3. **อ.ซัม คือ สมองคาดการณ์และการรักษาสมดุล (Forecasting & Thermal Protection):**
   - ดึงประวัติการจอดจาก อ.เฟิร์น รวมกับบริบทช่วงเวลาของมหาวิทยาลัย (8 Campus Phases) เพื่อ **พยากรณ์ที่จอดว่างล่วงหน้า 15–30 นาที** แล้วส่งกลับไปให้ระบบของ อ.โอ๊ต นำไปแสดงบน Dashboard และ LINE Bot
   - ดึงข้อมูล Telemetry ความร้อนชิปและแสงสะท้อนริมกระจกจาก อ.โอ๊ต มาเข้าโมเดล **Thermal Forecaster** และคำนวณ **Adaptive Sleep Policy** สั่งกล้องให้ปรับรอบการหลับ (10–60 วินาที) ย้อนกลับผ่าน Ingestion ของ อ.โอ๊ต เพื่อลดความร้อนสะสมริมกระจก ไม่ให้บอร์ดน็อค!

---

# 📑 PANEL 1: ส่วนอาจารย์โอ๊ต
## ECOSYSTEM ARCHITECTURE, MINIO S3 DATA LAKE & CLOUD GPU MLOPS

> **Theme:** Tech Blue & Infrastructure (`#0D47A1`, `#1565C0`)  
> **Concept:** "End-to-End Edge-to-Cloud Pipeline & Data Observability"

### 1. ทำไมต้องทำแบบนี้? (Why / Challenge & Architectural Decision)
* **บริบทจริงหน้างาน (Indoor-Window Placement):**
  - กล้อง ESP32-CAM ติดตั้ง **"ในร่ม แต่อยู่ชิดริมกระจกหน้าต่าง"** อาคาร เพื่อมองลงไปยังลานจอดรถ
  - ทำให้เจอปัญหา **ความร้อนสะสมจากแสงแดดที่ทะลุกระจก (Solar Heat Trapping)** และการสะท้อนของแสงแดดบนกระจก
  - กล้องมีทรัพยากรจำกัด (RAM เพียงไม่กี่ร้อย KB) เสี่ยงระบบค้างหากส่งข้อมูลหนักเกินไป
* **ความต้องการด้าน Enterprise Architecture:**
  - **Decoupled Architecture:** แยกส่วนรับภาพ (Ingestion) ออกจากส่วนวิเคราะห์ (Inference) เพื่อไม่ให้ระบบค้างเวลามีการประมวลผลหนัก
  - **Data Lake ที่ได้มาตรฐาน S3:** เก็บภาพดิบและภาพเหตุการณ์เพื่อใช้ Re-train โมเดลในอนาคต โดยไม่กินพื้นที่ Local Disk จนเต็ม
  - **Hybrid Compute:** เซิร์ฟเวอร์หลักหน้างานรัน Inference แบบประหยัดพลังงานบน CPU แต่เมื่อต้องเทรนโมเดลใหม่ จะใช้ **Modal Serverless Cloud GPU** เพื่อประหยัดต้นทุนฮาร์ดแวร์

### 2. เราทำอะไร? (What / The Comprehensive Architecture)
1. **IoT Edge Node (กล้องริมกระจก 3 จุด):**
   - `CAM1` (หน้าภาค 1), `CAM2` (หน้าภาค 2), `CAM3` (ข้างภาคคอม)
   - ถ่ายภาพความละเอียด SVGA/XGA และแนบ Header `X-Telemetry` ส่งค่า: `chip_temp_c`, `light_aec_value`, `wifi_rssi`, `uptime_sec`
2. **Ingestion Server (`:5005`):**
   - ตรวจสอบความถูกต้อง หมุนภาพ 180° ปรับแก้ความต่างของแสงแดดริมกระจกแบบ Dynamic
   - แยกภาพออกเป็น 2 ท่อ (Dual-Storage Strategy):
     - **Local Disk (Time-Partitioned):** บันทึกโครงสร้าง `data/dataset/camX/YYYY-MM-DD/HH/` สำหรับ Local Cache
     - **MinIO S3 Object Storage (`:9000` / Console `:9001`):** บันทึกลง Bucket `raw-datasets` พร้อม Metadata JSON Companion เพื่อเป็น Data Lake ถาวร
3. **Core Backend & Data Layer (Main Server):**
   - **FastAPI Gateway (`:8000`):** เชื่อมโยง Microservices ทั้งหมดด้วย Asynchronous REST API
   - **Redis 8.8 In-Memory Cache (`:6379`):** แคชสถานะช่องจอดสด (`parking:status:summary`) ให้ผลลัพธ์ตอบสนองเร็วพิเศษ **`< 0.5 ms`**
   - **PostgreSQL 17 Database (`:5432`):** บันทึกประวัติ Transaction การตรวจจับย้อนหลัง ตารางช่องจอด และ Logs
   - **Docker Compose Orchestration:** คุมทั้ง 7 Microservices พร้อม Healthchecks และ Auto-Restart
4. **Modal Cloud GPU Training Pipeline (MLOps Node):**
   - เชื่อมต่อ Cloud GPU ผ่าน Modal Python Client / Webhook
   - ดึงชุดข้อมูลที่ผ่านการคัดแยกจาก MinIO S3 / Roboflow ขึ้นไปเทรนบน **NVIDIA A10G / T4 GPU**
   - สตรีม Terminal CLI Logs แสดงกระบวนการเทรนสดลงบนหน้า Admin Dashboard
   - เมื่อเทรนเสร็จและผ่านเกณฑ์ ($mAP_{50} \ge 85\%$) จะส่ง `best.pt` กลับมาลง **MLflow Model Registry** เพื่อทำ Zero-Downtime Hot-Reload บน Main Server ทันที
5. **Observability & Presentation Layer:**
   - **Grafana (`:3000`) & Prometheus (`:9090`):** มอนิเตอร์สุขภาพเซิร์ฟเวอร์, ความร้อนกล้อง, และอัตราการรับส่งภาพ
   - **LINE Chatbot ("น้องจ๊อด หาที่จอดรถ"):** เชื่อมต่อ LLM (dotBlue) ให้บริการตอบคำถามและส่ง Flex Card สด
   - **Cyber Dashboard (React Vite `:5173`):** แผงควบคุมระบบแบบเรียลไทม์

### 3. ตัวชี้วัดและการวัดผล (How / System Evaluation)
* **Ingestion Reliability:** รับภาพและ Telemetry สำเร็จ **99.9%** ไม่มีภาพสูญหายด้วยระบบสำรอง Dual-Storage
* **Redis Latency:** ความเร็วการอ่านสถานะช่องจอดสดเฉลี่ย **0.35 - 0.48 ms**
* **Watchdog Response:** ระบบตรวจจับกล้อง Offline และยิงแจ้งเตือนแอดมินอัตโนมัติภายใน **15 นาที**
* **MLOps Turnaround:** สั่งเทรนโมเดลบน Modal GPU จบกระบวนการและ Deploy โมเดลใหม่ได้ภายใน **18 นาที** (จากเดิมที่ต้องใช้เวลาเซ็ตเครื่องเป็นวัน)

---

# 📈 PANEL 2: ส่วนอาจารย์ซัม
## SPATIO-TEMPORAL FORECASTING & EDGE THERMAL INTELLIGENCE

> **Theme:** Data Orange & Predictive Intelligence (`#E65100`, `#EF6C00`)  
> **Concept:** "Predictive Occupancy (15m/30m) & Physics-Informed Edge Hardware Protection"

### 1. ทำไมต้องทำแบบนี้? (Why / Core Motivation)
* **ปัญหาข้อมูลล่าช้า (The Late Information Trap):**
  - การบอกแค่ "ตอนนี้ว่าง 2 ช่อง" ไร้ประโยชน์หากคนขับต้องใช้เวลาเดินทางอีก 15–20 นาทีกว่าจะถึงลานจอด เพราะเมื่อมาถึงที่จอดก็เต็มไปแล้ว
  - จึงจำเป็นต้องมีโมเดล **"ทำนายล่วงหน้า (Lead Time Forecast)"**
* **ปัญหาความร้อนสะสมริมกระจก (Greenhouse Overheating Risk):**
  - กล้องตั้งอยู่ในห้องปิดริมกระจก แดดส่องสะสมจนอุณหภูมิชิป ESP32 พุ่งแตะ **60°C - 68°C+**
  - หากให้กล้องทำงานเต็มกำลังตลอดเวลา บอร์ดจะค้าง (Freeze) หรือเสื่อมสภาพอย่างรวดเร็ว
  - จึงต้องใช้ AI มาสร้าง **นโยบายการหลับแบบปรับตัว (Adaptive Sleep Policy)** เพื่อระบายความร้อนโดยไม่สูญเสียความแม่นยำในการตรวจจับ

### 2. เราทำอะไร? (What / Models & Mathematical Engines)
ชุดข้อมูลทดสอบและเทรนจริง: **27,945 บันทึก (Train 22,356 / Test 5,589 บันทึก)** พร้อมตัวแปร 21 มิติ

#### โมเดลที่ 1: Campus-Aware Occupancy Forecaster (+15 นาที และ +30 นาที)
* **การออกแบบฟีเจอร์ตามพฤติกรรมมหาวิทยาลัย (8 Campus Phases):**
  - `Phase 0`: กลางคืน/วันหยุด (Idle)
  - `Phase 1`: เช้าเริ่มเข้างาน (07:00–08:30)
  - `Phase 2`: ช่วงชั่วโมงเร่งด่วนเข้าเรียนคาบเช้า (08:30–09:30)
  - `Phase 3`: ช่วงเรียนคาบเช้า นิ่งสนิท (09:30–11:30)
  - `Phase 4`: ช่วงพักเที่ยง รถเข้า-ออกพลุกพล่าน (11:30–13:00)
  - `Phase 5`: เข้าเรียนคาบบ่าย (13:00–14:00)
  - `Phase 6`: เรียนคาบบ่าย (14:00–16:30)
  - `Phase 7`: เลิกเรียน/เดินทางกลับ (16:30–19:00)
* **Feature Importance Ranking (ปัจจัยขับเคลื่อนสูงสุด):**
  1. `delta_vehicles` (อัตราการเพิ่ม-ลดของรถจากโมเดล อ.เฟิร์น): **48.08%**
  2. `chip_temp_c` (อุณหภูมิชิปสัมพันธ์กับความเข้มแสงแดดช่วงวัน): **13.37%**
  3. `is_weekend` / `day_of_week` (วันธรรมดา vs วันเสาร์อาทิตย์): **19.37%**
  4. `campus_phase` (ช่วงกิจกรรมคาบเรียน): **9.11%**
* **Operational SARIMAX Pipeline:**
  - รันอัตโนมัติทุก 15 นาทีช่วง 08:00–18:00 ด้วยคำสั่ง Cron
  - คำนวณช่วงความเชื่อมั่น 95% (95% Confidence Interval) พร้อม Vacancy Chance (%)

#### โมเดลที่ 2: Edge Thermal & Adaptive Sleep Policy Controller
* **Thermal Forecaster (`thermal_forecaster.joblib`):**
  - พยากรณ์อุณหภูมิชิปของกล้องริมกระจก โดยมีเกณฑ์ควบคุม: Safe Threshold = **60°C**, Critical Threshold = **68°C**
* **Adaptive Sleep Model (`adaptive_sleep_model.joblib`):**
  - ปรับช่วงเวลานอน (Sleep Interval) ของ ESP32 แบบไดนามิกระหว่าง **10 วินาที ถึง 60 วินาที**
  - *หลักการทำงาน:* ถ้ารถนิ่ง (Delta ต่ำ) และแดดส่องชิปร้อน ให้ขยายเวลานอนเป็น 45–60 วินาที เพื่อให้บอร์ดเย็นลง แต่ถ้าเป็นช่วง Rush Hour ให้ลดเวลานอนเหลือ 10–15 วินาที เพื่อเก็บภาพถี่ขึ้น

### 3. ตัวชี้วัดและการวัดผล (How / Empirical Validation)
| ชื่องาน / โมเดล | ตัวชี้วัดหลัก (Metric) | ค่าที่ทำได้จริง | ผลลัพธ์เชิงประจักษ์ |
| :--- | :---: | :---: | :--- |
| **Occupancy Forecaster (30-min Lead)** | **$R^2$ Score** | **0.7453** | อธิบายพฤติกรรมการจอดล่วงหน้าครึ่งชั่วโมงได้แม่นยำสูงมาก |
| **Occupancy Forecaster (30-min Lead)** | **MAE** | **2.01 คัน** | คลาดเคลื่อนเฉลี่ยเพียง ~2 คัน จากความจุเต็มลาน |
| **Occupancy Forecaster (15-min Lead)** | **MAE / $R^2$** | **2.87 คัน / 0.50** | เหมาะสำหรับแนะนำผู้ใช้ที่กำลังเลี้ยวเข้าประตูมหาวิทยาลัย |
| **Adaptive Sleep Model** | **$R^2$ Score** | **0.9947** | แม่นยำสมบูรณ์แบบ ($MAE = 0.18$ วินาที, $RMSE = 0.70$ วินาที) |
| **Hardware Safety Control** | **Peak Chip Temp** | **คุมให้อยู่ < 60°C** | ลดความร้อนสะสมริมกระจก ป้องกันกล้องน็อคได้ 100% |

---

# 👁️ PANEL 3: ส่วนอาจารย์เฟิร์น
## FINE-TUNED EDGE YOLO & GEOMETRIC SLOT OCCUPANCY

> **Theme:** Vision Green & Deep Learning (`#1B5E20`, `#2E7D32`)  
> **Concept:** "Domain-Specific Transfer Learning, Slanted Polygon Mapping & Active Learning"

### 1. ทำไมต้องทำแบบนี้? (Why / Real-World Vision Bottlenecks)
* **ข้อจำกัดของภาพถ่ายริมกระจก:**
  - ติดตั้งในร่มส่องผ่านกระจก มีปัญหา **แสงสะท้อนบนผิวกระจก (Glass Glare & Specular Reflection)** และมุมมองกดแบบเอียง (Steep Slanted Angle)
* **ความล้มเหลวของ Pretrained Model (COCO / YOLO26m):**
  - โมเดลพื้นฐานไม่เคยถูกเทรนกับลานจอดรถของมหาวิทยาลัยไทย ที่มี **รถมอเตอร์ไซค์จอดเรียงชิดติดกันเป็นตับ**
  - Pretrained Model มองเห็นมอเตอร์ไซค์เป็นก้อนเดียว ตรวจจับหลุดไปกว่า 80% (Missed Detection มหาศาล)
* **ข้อจำกัดของ Bounding Box แกนตรง (Axis-Aligned Boxes):**
  - ช่องจอดของจริงมีลักษณะเฉียงตามแนวถนน หากใช้สี่เหลี่ยม Bounding Box ทั่วไป กรอบรถจะเหลื่อมข้ามไปทับช่องข้างๆ ทำให้ระบบนับช่องจอดผิด

### 2. เราทำอะไร? (What / Computer Vision & Geometry Pipeline)
1. **Preprocessing & Image Normalization:**
   - หมุนภาพ 180° แก้ไขการติดตั้งกล้องแบบคว่ำลงริมกระจก
   - ปรับ Brightness และ Contrast ตามค่าแสง `light_aec_value` เพื่อลดผลกระทบจากแสงแดดสะท้อนกระจก
2. **Transfer Learning & Fine-Tuning บน Modal GPU:**
   - นำชุดข้อมูลภาพจริงของมหาวิทยาลัยมาทำ Labeling ทั้งรถยนต์ (`car`) และมอเตอร์ไซค์ (`motorcycle`)
   - Fine-tune โมเดลออกมาเป็น Checkpoint `best.pt` โดยเน้น Feature Extraction ของแฮนด์รถ ล้อ และโครงสร้างมอเตอร์ไซค์ในมุมก้ม
3. **Geometric ROI Slot Polygon Mapping (`roi.json`):**
   - ตีพิกัดช่องจอดแบบ **Arbitrary Polygons (พิกัดจุด 4 มุมขึ้นไป)** ตามแนวเส้นซองจอดจริง
   - **Polygon Intersection & Wheelbase Point-in-Polygon:** คำนวณจุดศูนย์กลางด้านล่างของรถ (ฐานล้อ) ว่าตกอยู่ใน Polygon ของช่องใดอย่างแท้จริง
   - **Zone Pixel Occupancy Density (%):** วิเคราะห์ความหนาแน่นเชิงพื้นที่สำหรับลานจอดมอเตอร์ไซค์แบบ Free-flow
4. **Active Learning Feedback Loop:**
   - ดักจับภาพที่มีค่า Confidence ต่ำกว่า **40%** (เช่น ช่วงฝนตก หรือมุมแสงสะท้อนจัด)
   - ส่งภาพเข้าคิว Re-labeling สู่ MinIO และยิงไป Roboflow อัตโนมัติ เพื่อนำไปเทรนรอบใหม่

### 3. ตัวชี้วัดและการวัดผล (How / Benchmark Results: Pretrained vs Fine-Tuned)
*(ข้อมูลจริงจากการทดสอบเปรียบเทียบในระบบ `benchmark_comparison_results.json`)*

```text
+----------------------------------------------------------------------------------------------------+
|  เปรียบเทียบผลลัพธ์: Pretrained COCO (yolo26m.pt) VS Custom Fine-Tuned (best.pt) บน CPU หน้างาน     |
+--------------------------+-----------------------+-----------------------+-------------------------+
| จุดตรวจจับและประเภทรถ    | Pretrained (yolo26m)  | Fine-Tuned (best.pt)  | อัตราการพัฒนา (Gain)     |
+--------------------------+-----------------------+-----------------------+-------------------------+
| CAM1: ตรวจจับมอเตอร์ไซค์ | 4 คัน (หลุดบาน)       | 22 คัน (ตรวจจับครบ)   | 🚀 เพิ่มขึ้น +450%       |
| CAM1: ระบุช่อง Occupied  | 3 ช่อง                | 5 ช่อง (ตรงความจริง)  | 🎯 แม่นยำขึ้นชัดเจน     |
| CAM1: Inference Latency  | 2,376.7 ms (~2.4 วิ)  | 588.5 ms (~0.6 วิ)    | ⚡ เร็วขึ้นกว่า 4 เท่า   |
+--------------------------+-----------------------+-----------------------+-------------------------+
| CAM2: ตรวจจับมอเตอร์ไซค์ | 13 คัน                | 24 คัน                | 🚀 เพิ่มขึ้น +84.6%     |
| CAM2: ระบุช่อง Occupied  | 4 ช่อง                | 7 ช่อง                | 🎯 เก็บรถมุมอับได้หมด   |
| CAM2: Inference Latency  | 376.9 ms              | 378.4 ms              | ⚡ คงที่เสถียร (~2.6 FPS)|
+--------------------------+-----------------------+-----------------------+-------------------------+
```

---

# 🎨 DESIGN & PROMPT DECK (คู่มือสำหรับนำไปสั่ง AI หรือจัดหน้ากราฟิก)

### Prompt ตัวอย่างสำหรับนำไปใส่ใน Midjourney / Canva Magic / DALL-E / Designer:
> *"A modern, futuristic, high-tech enterprise tri-fold brochure layout about Smart Campus Parking AI System. Clean 3-column infographics. Deep navy blue, vibrant technical orange, and emerald green accents. Professional data dashboards, IoT camera nodes near glass window with heatwaves, neural network YOLO bounding boxes detecting motorcycles, SARIMAX forecasting curves, MinIO S3 and Modal Cloud GPU icons. Highly detailed, clean typography, executive presentation style."*

### เช็กลิสต์ภาพประกอบที่ควรใส่ในโบรชัวร์:
1. **รูปจุดติดตั้งกล้อง (Physical Context):** กล้อง ESP32-CAM ติดริมกระจกหน้าต่าง มองลงไปที่ลานจอด (อธิบายเรื่องความร้อนจากกระจก)
2. **รูปภาพก่อน-หลัง (Before vs After):** 
   - ฝั่งซ้าย: รูป `cam1_..._yolo26m.jpg` (กรอบสีแดง มอเตอร์ไซค์ตรวจจับได้แค่ 4 คัน)
   - ฝั่งขวา: รูป `cam1_..._best.jpg` (กรอบสีเขียว มอเตอร์ไซค์ตีกรอบพรึ่บ 22 คัน พร้อมเส้นช่องจอดสีฟ้า)
3. **รูปกราฟ Time-Series:** เส้นกราฟพยากรณ์ล่วงหน้า 30 นาที พร้อมแถบความเชื่อมั่นสีส้ม 95% CI และเส้นวัดอุณหภูมิปลอดภัย `< 60°C`
4. **แผนภาพสถาปัตยกรรมระบบ (Cloud & Server Stack):** ไอคอน Docker, FastAPI, MinIO S3, Redis `<0.5ms`, และ Modal Cloud GPU
