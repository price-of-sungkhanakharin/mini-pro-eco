"""
Assignment Report DOCX Generator for FastAPI AI Ecosystem Workspace.
Generates Assignment_Report_AIECO.docx with full technical documentation, architecture explanations,
component descriptions, API tables, OpenAPI snapshot tools, shell commands, and image callout placeholders.
"""

import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def set_cell_border(cell, **kwargs):
    """Set cell borders for docx table cells."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key in ["sz", "val", "color", "space", "shadow"]:
                if key in edge_data:
                    element.set(qn(f'w:{key}'), str(edge_data[key]))


def set_cell_shading(cell, color_hex):
    """Set cell background color."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)


def add_image_placeholder(doc, title, command, image_desc):
    """Add a visual placeholder callout box for screenshot capture."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    
    set_cell_border(
        cell,
        top={"sz": 12, "val": "single", "color": "003366"},
        bottom={"sz": 12, "val": "single", "color": "003366"},
        left={"sz": 24, "val": "single", "color": "003366"},
        right={"sz": 12, "val": "single", "color": "003366"},
    )
    set_cell_shading(cell, "F0F4F8")
    
    p1 = cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run1 = p1.add_run(f"[{title}]")
    run1.bold = True
    run1.font.size = Pt(11)
    run1.font.color.rgb = RGBColor(0, 51, 102)
    
    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run2 = p2.add_run(f"คำสั่งสำหรับเตรียมข้อมูล/รันระบบ:\n   {command}")
    run2.font.size = Pt(10)
    run2.font.color.rgb = RGBColor(34, 34, 34)
    
    p3 = cell.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run3 = p3.add_run(f"รายละเอียดภาพที่ต้องแคปใส่ตรงนี้: {image_desc}")
    run3.font.size = Pt(9.5)
    run3.font.italic = True
    run3.font.color.rgb = RGBColor(100, 100, 100)
    
    doc.add_paragraph()


def format_table(table, col_widths, headers, data):
    """Format and populate a styled table."""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, header_text in enumerate(headers):
        hdr_cells[i].text = header_text
        set_cell_shading(hdr_cells[i], "003366")
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(255, 255, 255)
            
    # Data Rows
    for row_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        bg_color = "F9FAFB" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, cell_value in enumerate(row_data):
            row_cells[col_idx].text = cell_value
            set_cell_shading(row_cells[col_idx], bg_color)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(34, 34, 34)
                
    # Borders & Widths
    for row in table.rows:
        for col_idx, cell in enumerate(row.cells):
            set_cell_border(
                cell,
                top={"sz": 4, "val": "single", "color": "D3D3D3"},
                bottom={"sz": 4, "val": "single", "color": "D3D3D3"},
                left={"sz": 4, "val": "single", "color": "D3D3D3"},
                right={"sz": 4, "val": "single", "color": "D3D3D3"},
            )
            cell.width = col_widths[col_idx]


def build_assignment_report():
    doc = Document()
    
    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("รายงานสถาปัตยกรรมและการพัฒนาระบบ\nFastAPI AI Ecosystem Backend Workspaces")
    run_title.bold = True
    run_title.font.size = Pt(18)
    run_title.font.color.rgb = RGBColor(0, 51, 102)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Assignment Technical Report & Architecture Documentation")
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 100, 100)

    doc.add_paragraph()

    # Meta Info Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_data = [
        ("ชื่อโครงการ (Project Name):", "FastAPI AI Ecosystem Workspace"),
        ("ระบบย่อย (Subsystem):", "API Gateway, Model Registry, Async Workers & Storage"),
        (" repository (GitHub):", "https://github.com/KIM2548TH/ai-ecosystem-workspace"),
        ("วันที่จัดทำเอกสาร (Date):", "14 สิงหาคม 2569 (2026-08-14)"),
    ]
    for idx, (label, val) in enumerate(meta_data):
        meta_table.cell(idx, 0).text = label
        meta_table.cell(idx, 1).text = val
        p0 = meta_table.cell(idx, 0).paragraphs[0]
        p0.runs[0].font.bold = True
        p0.runs[0].font.size = Pt(10)
        p1 = meta_table.cell(idx, 1).paragraphs[0]
        p1.runs[0].font.size = Pt(10)
        set_cell_shading(meta_table.cell(idx, 0), "EBF3FA")
        set_cell_shading(meta_table.cell(idx, 1), "FFFFFF")
        set_cell_border(meta_table.cell(idx, 0), top={"sz":4,"val":"single","color":"B0C4DE"}, bottom={"sz":4,"val":"single","color":"B0C4DE"}, left={"sz":4,"val":"single","color":"B0C4DE"}, right={"sz":4,"val":"single","color":"B0C4DE"})
        set_cell_border(meta_table.cell(idx, 1), top={"sz":4,"val":"single","color":"B0C4DE"}, bottom={"sz":4,"val":"single","color":"B0C4DE"}, left={"sz":4,"val":"single","color":"B0C4DE"}, right={"sz":4,"val":"single","color":"B0C4DE"})

    doc.add_paragraph()

    # ==================== SECTION 1 ====================
    h1 = doc.add_heading("ส่วนที่ 1: ภาพรวมสถาปัตยกรรมและโครงสร้างไดเรกทอรี (Architecture & Folder Structure)", level=1)
    h1.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        "ระบบ FastAPI AI Ecosystem ถูกออกแบบตามสถาปัตยกรรม Microservices และ Clean Architecture "
        "โดยแบ่งแยกบทบาทหน้าที่ (Separation of Concerns) ออกเป็นส่วนสตรีมมิ่ง API Gateway, การยืนยันตัวตนด้วย JWT, "
        "การจัดเก็บไฟล์ดิบและโมเดลใน MinIO Object Storage, การบันทึกข้อมูลเมทาเดทาใน PostgreSQL 17, "
        "และการประมวลผลงานฝึกโมเดลแบบ Asynchronous ผ่าน Redis Task Broker ร่วมกับ ARQ Worker Process"
    )

    doc.add_paragraph("หลักการออกแบบทางสถาปัตยกรรม (Architectural Principles):")
    p_pts = doc.add_paragraph()
    p_pts.add_run(
        "1. Separation of Concerns: แยกส่วน Router Controllers, Validation Schemas, ORM Models และ Service Handlers อย่างเด็ดขาด\n"
        "2. Dependency Injection: ใช้ FastAPI Depends() ในการบริหาร Database Sessions (get_db) และ User Auth Scope\n"
        "3. Immutability Pattern: ระบบ Model Registry ใช้วิธี Append-Only Log สำหรับเก็บประวัติโมเดลเวอร์ชันเก่าทั้งหมดอย่างปลอดภัย\n"
        "4. Asynchronous Task Execution: โยนงานหนัก (Model Training) ไปประมวลผลเบื้องหลัง ตอบกลับ HTTP 202 Accepted ทันที\n"
        "5. Structured JSON Logging: บันทึก Log ทุก Subsystem เป็น JSON มีโครงสร้างรองรับการทำ Centralized Monitoring"
    )

    doc.add_heading("โครงสร้างไดเรกทอรีของโปรเจกต์ (Project Directory Structure):", level=2)
    p_tree = doc.add_paragraph()
    p_tree.add_run(
        "ai-ecosystem-workspace/\n"
        "├── backend/                    # FastAPI Microservice Workspace & Configuration\n"
        "│   ├── main.py                 # Gateway Entrypoint, CORS Middleware & Router Registrations\n"
        "│   ├── compose.yml             # Container Configuration for Backend Stack\n"
        "│   ├── db/                     # PostgreSQL Engine, Session Maker & Base Model\n"
        "│   └── app/                    # Application Modules\n"
        "│       ├── core/               # Settings (Pydantic BaseSettings) & Security (Bcrypt/JWT)\n"
        "│       ├── models/             # SQLAlchemy DB Entities (User, Dataset, ModelRegistry)\n"
        "│       ├── routers/            # Endpoint Route Controllers (auth, datasets, models, train, minio, label_studio, health)\n"
        "│       ├── schemas/            # Pydantic Schemas & DTO Validation\n"
        "│       ├── services/           # MinIO Storage Client & ARQ Task Queue Services\n"
        "│       └── utils/              # Structured JSON Logger & Helper Utilities\n"
        "├── frontend/                   # React Web Application (Vite Server)\n"
        "├── scripts/                    # Automation Scripts (OpenAPI Exporter & DOCX Report Generator)\n"
        "├── tests/                      # Automated Integration & Unit Test Suite\n"
        "├── sandbox/                    # Experimental Playground & Spikes\n"
        "├── logs/                       # System Subsystem JSON Log Files\n"
        "├── assets/                     # Architectural Diagrams & Screenshot Inventories\n"
        "├── agent_folder/               # Documentation Specifications & Presentation Materials\n"
        "└── diagrams/                   # Draw.io Vector Source Diagrams\n"
    )
    p_tree.style = 'Intense Quote'

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 1: แผนผังสถาปัตยกรรมระบบรวม (High-Level Architecture Diagram)",
        "cat architecture.md หรือเปิดไฟล์ diagrams/overviews.drawio บน Draw.io",
        "ภาพ Diagram แสดงการเชื่อมต่อระหว่าง React UI -> FastAPI Gateway -> Postgres / MinIO / Redis / Label Studio"
    )

    # ==================== SECTION 2 ====================
    h2 = doc.add_heading("ส่วนที่ 2: ส่วนประกอบระบบและไลบรารีที่ติดตั้ง (System Components & Installed Libraries)", level=1)
    h2.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        "โครงสร้างพื้นฐานของระบบอาศัยการทำงานร่วมกันของเทคโนโลยีชั้นนำในสายงาน Data Engineering และ AI Infrastructure ดังรายการต่อไปนี้:"
    )

    comp_table = doc.add_table(rows=1, cols=4)
    comp_headers = ["ส่วนประกอบ (Component)", "เทคโนโลยี (Technology)", "พอร์ต (Port)", "หน้าที่ในระบบ (Role & Functionality)"]
    comp_widths = [Inches(1.5), Inches(1.5), Inches(1.0), Inches(2.5)]
    comp_data = [
        ["API Gateway", "FastAPI / Uvicorn", "8000", "ศูนย์กลางรับส่งข้อมูล HTTP REST API, Rate Limiting และ Authentication"],
        ["Relational Database", "PostgreSQL 17", "5432", "จัดเก็บข้อมูลผู้ใช้งาน Metadata ของ Dataset และประวัติ Model Registry"],
        ["Object Storage", "MinIO S3 Engine", "9000 / 9001", "จัดเก็บไฟล์ชุดข้อมูลดิบ (Raw Datasets) และไฟล์น้ำหนักโมเดล (.pt / .onnx)"],
        ["Async Task Queue", "Redis & ARQ", "6379", "คิวรับงานฝึกโมเดล Asynchronous และส่งให้ Worker ทำงานเบื้องหลัง"],
        ["Data Labeling", "Label Studio", "8080", "แพลตฟอร์มสำหรับการติดลาเบลข้อมูลภาพ ข้อมูลข้อความ และเสียง"],
        ["Frontend UI", "React (Vite)", "5173", "หน้าต่างส่วนประสานผู้ใช้สำหรับการลงทะเบียน เข้าระบบ และจัดการโมเดล"],
    ]
    format_table(comp_table, comp_widths, comp_headers, comp_data)

    doc.add_paragraph()
    doc.add_heading("รายการ Python Libraries สำคัญที่ติดตั้งในระบบ:", level=2)

    lib_table = doc.add_table(rows=1, cols=3)
    lib_headers = ["ชื่อ Package", "เวอร์ชัน / ประเภท", "วัตถุประสงค์การใช้งาน (Purpose)"]
    lib_widths = [Inches(1.8), Inches(1.2), Inches(3.5)]
    lib_data = [
        ["fastapi", "0.115.0+", "ASGI Web Framework หลักในการสร้าง REST API Endpoints"],
        ["uvicorn", "0.30.0+", "High-performance Lightning-fast ASGI Server"],
        ["sqlalchemy", "2.0.0+", "ORM Database Mapper สำหรับติดต่อจัดการ PostgreSQL 17"],
        ["pydantic & pydantic-settings", "2.0.0+", "Data Validation, Serialization และการอ่านค่า .env"],
        ["minio", "7.2.0+", "Python S3 SDK สำหรับจัดการ Object Storage Bucket & Presigned URLs"],
        ["label-studio-sdk", "0.0.34+", "Python Client สำหรับสั่งงานและดึงข้อมูล Project จาก Label Studio"],
        ["arq & redis", "0.26.0+", "Async Job Queue Dispatcher และ Redis Broker Connection"],
        ["pyjwt & passlib[bcrypt]", "2.9.0+", "การทำ Stateless Auth Token และการเข้ารหัส Password ด้วย Bcrypt"],
        ["python-docx", "1.1.0+", "ไลบรารีสร้างเอกสารรายงาน Microsoft Word (.docx) อัตโนมัติ"],
        ["pandas & openpyxl", "2.2.0+", "เครื่องมือประมวลผลข้อมูลและส่งออก OpenAPI Snapshot เป็น CSV/Excel"],
    ]
    format_table(lib_table, lib_widths, lib_headers, lib_data)

    doc.add_paragraph()

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 2: การตรวจสอบสถานะ Containers และการติดตั้ง Python Packages",
        "docker compose ps && .venv/bin/python -m pip list | grep -E 'fastapi|minio|sqlalchemy|label-studio|arq|docx'",
        "ภาพ Screenshot Terminal แสดงผลการรัน docker compose ps (Up 100%) และรายการ pip list ของไลบรารีสำคัญ"
    )

    # ==================== SECTION 3 ====================
    h3 = doc.add_heading("ส่วนที่ 3: คำอธิบาย API Gateway และ รายการ API Endpoints (Backend API Gateway)", level=1)
    h3.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        "ไฟล์ backend/main.py ทำหน้าที่เป็นจุดผ่านศูนย์กลาง (API Gateway Entrypoint) ของระบบ โดยมีการติดตั้ง CORS Middleware, "
        "Request/Response Logging Middleware ที่บันทึก IP, Method, Path, Status Code และ Latency (ms) "
        "รวมถึงมี Global Exception Handlers ในการดักจับข้อผิดพลาดที่ไม่คาดคิดและแปลงเป็น Structured JSON Response"
    )

    doc.add_heading("สรุปรายการ API Endpoints แยกตาม Router Module:", level=2)

    api_table = doc.add_table(rows=1, cols=4)
    api_headers = ["Router Module", "Method", "API Endpoint Path", "คำอธิบายหน้าที่การทำงาน (Functionality)"]
    api_widths = [Inches(1.5), Inches(0.8), Inches(2.2), Inches(2.0)]
    api_data = [
        ["auth.py", "POST", "/api/v1/auth/register", "สมัครสมาชิกใหม่ พร้อม Hashing Password ด้วย Bcrypt"],
        ["auth.py", "POST", "/api/v1/auth/login", "ตรวจสอบ Password และออก JWT Access Token"],
        ["auth.py", "GET", "/api/v1/auth/me", "ดึงโปรไฟล์ผู้ใช้งานปัจจุบัน (ต้องใส่ Bearer Token)"],
        ["datasets.py", "POST", "/api/v1/datasets/upload", "อัปโหลดไฟล์ดิบไป MinIO และบันทึก Metadata ลง Postgres"],
        ["datasets.py", "GET", "/api/v1/datasets", "ดึงรายการชุดข้อมูลทั้งหมด (รองรับ Pagination skip/limit)"],
        ["datasets.py", "GET", "/api/v1/datasets/{id}", "ดึงรายละเอียดข้อมูล Dataset รายตัวตาม ID"],
        ["models.py", "POST", "/api/v1/models/upload", "ลงทะเบียนโมเดลใหม่แบบ Append-Only Log"],
        ["models.py", "GET", "/api/v1/models", "ดึงประวัติเวอร์ชันโมเดลทั้งหมดในระบบ (Audit Trail)"],
        ["models.py", "GET", "/api/v1/models/latest", "ดึงไฟล์โมเดลเวอร์ชันล่าสุดที่เสถียร"],
        ["train.py", "POST", "/api/v1/training/start", "สั่งเริ่มฝึกโมเดล (คืนค่า 202 Accepted + job_id เข้าคิว Redis)"],
        ["train.py", "GET", "/api/v1/training/status/{job_id}", "ตรวจสอบสถานะและความคืบหน้าการฝึกโมเดล (Polling)"],
        ["inference.py", "POST", "/api/v1/predict", "ส่งข้อมูลเข้าประมวลผลทำนายผลความเร็วสูง (Low Latency)"],
        ["health.py", "GET", "/api/v1/system/health", "PING ตรวจสอบสุขภาพ Postgres, MinIO, Redis, Label Studio"],
        ["health.py", "GET", "/api/v1/system/logs", "เรียกดูประวัติ JSON Logs ของระบบแบบด่วน"],
        ["minio_router.py", "GET", "/api/v1/minio/buckets", "ดึงรายการ MinIO Storage Buckets ทั้งหมดในระบบ"],
        ["minio_router.py", "POST", "/api/v1/minio/upload", "อัปโหลดไฟล์ผ่าน MinIO Router API โดยตรง"],
        ["minio_router.py", "GET", "/api/v1/minio/presigned-url", "สร้าง Presigned Download URL สำหรับดาวน์โหลดไฟล์"],
        ["label_studio_router.py", "GET", "/api/v1/label-studio/health", "ตรวจสอบสถานะ Label Studio Service PING"],
        ["label_studio_router.py", "GET", "/api/v1/label-studio/projects", "ดึงรายการ Labeling Projects และสถิติความคืบหน้า"],
    ]
    format_table(api_table, api_widths, api_headers, api_data)

    doc.add_paragraph()

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 3: ผลการเปิดใช้งาน FastAPI Backend Server และ Uvicorn Logs",
        "./run.sh  (หรือ .venv/bin/uvicorn backend.main:app --reload --port 8000)",
        "ภาพ Screenshot Terminal แสดงผลการรัน uvicorn backend.main:app ขึ้นข้อความ Successful Started บนพอร์ต 8000"
    )

    # ==================== SECTION 4 ====================
    h4 = doc.add_heading("ส่วนที่ 4: FastAPI OpenAPI Metadata, Interactive Docs & Snapshot Converter", level=1)
    h4.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        " FastAPI มีความสามารถสร้าง OpenAPI Schema (JSON) ให้อัตโนมัติ โดยใน backend/main.py ได้มีการตกแต่ง Metadata "
        "อย่างครบถ้วน ทั้ง title, description, version, terms_of_service, contact, license_info และ tags_metadata "
        "รวมทั้งในทุก Router Endpoints มีการระบุ summary, description, tags, และ responses doc อย่างชัดเจน"
    )

    doc.add_heading("การใช้งาน Interactive Documentation บนเว็บเบราว์เซอร์:", level=2)
    doc.add_paragraph(
        "1. Swagger UI (/docs): ระบบนำเสนอ UI แบบโต้ตอบ สามารถกด Try it out ทดสอบส่ง Header/Payload และดู HTTP Response แบบ Real-time\n"
        "2. ReDoc (/redoc): ระบบนำเสนอเอกสารแบบสามคอลัมน์ สวยงาม อ่านง่าย เหมาะสำหรับนักพัฒนาภายนอก (Third-party Developers)\n"
        "3. OpenAPI Snapshot Exporter (scripts/export_openapi_snapshot.py): สคริปต์อัตโนมัติในการแปลงสเปก openapi.json "
        "ไปเป็นไฟล์ openapi_snapshot.csv และ openapi_snapshot.xlsx เพื่อทำ Snapshot Auditing"
    )

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 4a: หน้าจอ Swagger UI Interactive API Documentation (/docs)",
        "เข้าใช้งานเว็บเบราว์เซอร์ที่ URL: http://localhost:8000/docs",
        "ภาพ Screenshot หน้าจอ Swagger UI แสดงรายการ API Endpoints แยกตาม Tags พร้อมปุ่ม Try it out"
    )

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 4b: หน้าจอ ReDoc Documentation (/redoc)",
        "เข้าใช้งานเว็บเบราว์เซอร์ที่ URL: http://localhost:8000/redoc",
        "ภาพ Screenshot หน้าจอ ReDoc แสดงสเปก API แบบ 3 คอลัมน์"
    )

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 4c: ผลการรันสคริปต์ OpenAPI Snapshot Exporter",
        ".venv/bin/python scripts/export_openapi_snapshot.py",
        "ภาพ Screenshot Terminal แสดงผลการรันสคริปต์ export_openapi_snapshot.py สร้างไฟล์ CSV และ XLSX สำเร็จ"
    )

    # ==================== SECTION 5 ====================
    h5 = doc.add_heading("ส่วนที่ 5: คำสั่ง Shell สำหรับเริ่มต้นบริการและการสร้างไฟล์ (Shell Commands Guide)", level=1)
    h5.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        "คู่มือคำสั่งสำหรับการเริ่มต้นระบบ การทดสอบ และการประมวลผลไฟล์รายงานทั้งหมดในโปรเจกต์:"
    )

    cmd_p = doc.add_paragraph()
    cmd_p.add_run(
        "# 1. คัดลอกไฟล์ Environment Config\n"
        "cp .env.sample .env\n\n"
        "# 2. เริ่มต้นระบบ Backing Services (PostgreSQL 17, MinIO, Redis, Label Studio)\n"
        "docker compose up -d\n\n"
        "# 3. เริ่มต้น FastAPI Backend API Gateway\n"
        "./run.sh\n\n"
        "# 4. รันชุดทดสอบระบบอัตโนมัติ (Automated Pytest Suite)\n"
        ".venv/bin/pytest tests/ -v\n\n"
        "# 5. ส่งออกไฟล์ OpenAPI Spec Snapshot (CSV & Excel)\n"
        ".venv/bin/python scripts/export_openapi_snapshot.py\n\n"
        "# 6. สร้างไฟล์รายงาน Microsoft Word (Assignment_Report_AIECO.docx)\n"
        ".venv/bin/python scripts/generate_assignment_report_docx.py\n"
    )
    cmd_p.style = 'Intense Quote'

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 5: ผลการรันชุดทดสอบ Pytest Automated Test Suite",
        ".venv/bin/pytest tests/ -v",
        "ภาพ Screenshot Terminal แสดงผลการรัน Pytest ผ่านครบทุกเคส (PASSED 100%)"
    )

    # ==================== SECTION 6 ====================
    h6 = doc.add_heading("ส่วนที่ 6: สรุปเอกสาร README ในแต่ละโฟลเดอร์ย่อย (Subdirectory READMES Summary)", level=1)
    h6.runs[0].font.color.rgb = RGBColor(0, 51, 102)

    doc.add_paragraph(
        "เพื่อให้โครงสร้างซอร์สโค้ดมีการจัดเก็บเอกสารอย่างยั่งยืน ระบบได้สร้างไฟล์ README.md ประจำทุกไดเรกทอรีสำคัญ "
        "รวม 13 โฟลเดอร์ พร้อมเพิ่ม Table of Contents (สารบัญ) ที่ด้านบนสุดของ Root README.md ดังรายละเอียดสรุป:"
    )

    readme_table = doc.add_table(rows=1, cols=3)
    readme_headers = ["ไดเรกทอรี (Directory Path)", "ไฟล์เอกสาร (Document)", "เนื้อหาที่ออธิบาย (Scope & Description)"]
    readme_widths = [Inches(2.2), Inches(1.3), Inches(3.0)]
    readme_data = [
        ["backend/", "README.md", "ภาพรวม FastAPI Microservice Workspace และคำสั่งการเริ่มต้นระบบ"],
        ["backend/app/", "README.md", "ผังโครงสร้าง Submodules (core, models, routers, schemas, services)"],
        ["backend/app/routers/", "README.md", "แคตตาล็อก API Endpoints ทั้งหมดในระบบ"],
        ["backend/app/services/", "README.md", "การเชื่อมต่อ MinIO S3 SDK และ ARQ Redis Worker Services"],
        ["backend/app/models/", "README.md", "ตาราง ORM Schema (Users, Datasets, ModelRegistry)"],
        ["backend/app/core/", "README.md", "การจัดการ Pydantic BaseSettings และการทำ Auth JWT/Bcrypt"],
        ["backend/db/", "README.md", "วงจร session lifecycle และการเชื่อมต่อ PostgreSQL 17"],
        ["tests/", "README.md", "โครงสร้างชุดทดสอบ Integration & Unit Tests และคำสั่ง pytest"],
        ["sandbox/", "README.md", "แนวทางและขอบเขตพื้นที่ทดลองเขียนสคริปต์ (PoC Playground)"],
        ["logs/", "README.md", "โครงสร้างและรูปแบบ Structured JSON System Logging"],
        ["assets/", "README.md", "คลังเก็บไฟล์รูปภาพ Diagram และ Screenshots สำหรับรายงาน"],
        ["agent_folder/", "README.md", "พื้นที่เก็บข้อกำหนด สไลด์ presentation และสคริปต์สร้างรายงาน"],
        ["diagrams/", "README.md", "แหล่งเก็บไฟล์ภาพและ Draw.io vector architecture diagrams"],
    ]
    format_table(readme_table, readme_widths, readme_headers, readme_data)

    doc.add_paragraph()

    add_image_placeholder(
        doc,
        "ภาพประกอบที่ 6: หน้าจอ Root README.md ที่มี Table of Contents (สารบัญ)",
        "เปิดดูไฟล์ README.md หน้าแรกใน Text Editor หรือบน GitHub Web UI",
        "ภาพ Screenshot ส่วนบนสุดของไฟล์ README.md แสดงส่วนสารบัญ (Table of Contents) และรายละเอียดระบบ"
    )

    # Save output
    output_path = "/home/kimbiaw/ai-eco/Assignment_Report_AIECO.docx"
    doc.save(output_path)
    print(f"Successfully generated docx report: {output_path}")


if __name__ == "__main__":
    build_assignment_report()
