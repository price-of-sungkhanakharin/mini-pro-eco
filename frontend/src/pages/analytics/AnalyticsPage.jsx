import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import {
  Activity,
  Cpu,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Camera,
  Sliders,
  Sparkles,
  Gauge,
  Zap,
  HardDrive,
  Database,
  Moon,
  Sun,
  Maximize2,
  X,
  ExternalLink,
  Scale,
  Scissors,
  ArrowRightLeft,
  Check,
} from 'lucide-react'
import { PillTag, PillButton } from '../../components/ui/FigmaCards'

export default function AnalyticsPage({ apiBase = '' }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('timeseries') // 'timeseries' or 'yolo'

  // Global filters
  const [hoursFilter, setHoursFilter] = useState(48)
  const [activeCamFilter, setActiveCamFilter] = useState('all')
  const [sleepUnit, setSleepUnit] = useState('seconds') // 'seconds' | 'minutes'
  const [sleepScaleMode, setSleepScaleMode] = useState('broken') // 'broken' | 'daytime' | 'linear'
  const [showPlotModal, setShowPlotModal] = useState(false)

  // Loading & state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  // Data sets
  const [yoloData, setYoloData] = useState(null)
  const [tsGraphData, setTsGraphData] = useState(null)
  const [modelMetrics, setModelMetrics] = useState(null)
  const [liveCameras, setLiveCameras] = useState(null)

  // Future availability predictor widget state
  const [predictCam, setPredictCam] = useState('cam1')
  const [predictHorizon, setPredictHorizon] = useState(15)
  const [futurePrediction, setFuturePrediction] = useState(null)

  // Interactive Model Evaluation State
  const [selectedEvalModel, setSelectedEvalModel] = useState('yolo26m')
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareModelA, setCompareModelA] = useState('yolo26m')
  const [compareModelB, setCompareModelB] = useState('yolo26n')
  const [comparePlotTab, setComparePlotTab] = useState('confusionMatrix')

  const evalModelsData = {
    yolo26m: {
      id: 'yolo26m',
      name: 'YOLO26m (Best Deployed)',
      shortName: 'YOLO26m',
      fullName: 'YOLO26m (Custom Fine-tuned - best_v1.pt)',
      tag: 'PROD ACTIVE (DEPLOYED)',
      tagColor: 'bg-[#E7F4D8] text-[#36612D] border-[#BBF7D0]',
      desc: 'โมเดลหลักในระบบ Production สถาปัตยกรรม YOLO26m พร้อม Dual-branch One2One/One2Many Loss ให้ความแม่นยำสูงสุดในทุกสภาพแสงและมุมกล้องมุมกว้าง',
      map50Num: 93.0,
      map50: '93.0%',
      precision: '92.5%',
      recall: '90.7%',
      map50_95: '75.2%',
      carMap50: '99.5%',
      carDetail: 'mAP@50 (High Confidence Detection)',
      motoMap50: '86.4%',
      motoDetail: 'mAP@50 (Dense Parking Occlusion Handled)',
      params: '21.78M',
      paramsNum: 21.78,
      gflops: '75.0',
      gflopsNum: 75.0,
      latency: '438ms (ONNX 2-thread)',
      latencyNum: 438,
      conclusion: 'โมเดล YOLO26m (best_v1.pt) บรรลุเป้าหมายความแม่นยำสูงสุด 93.0% mAP@50 ในสภาวะแสงจริง กล้องมุมกว้าง และจุดอับสายตา พร้อมสำหรับการใช้งานจริงบนระบบตรวจจับช่องจอด',
      plots: {
        confusionMatrix: '/eval_plots/yolo26m/confusion_matrix.png',
        cmDesc: 'แสดงการจำแนกประเภทระหว่าง Background, Car และ Motorcycle โดยไม่มี False Negative ในคลาสรถยนต์',
        prCurve: '/eval_plots/yolo26m/BoxPR_curve.png',
        prDesc: 'กราฟ Precision-Recall ที่ mAP@0.5 = 0.930 แสดงพื้นที่ใต้กราฟที่ครอบคลุมสมบูรณ์',
        f1Curve: '/eval_plots/yolo26m/BoxF1_curve.png',
        f1Desc: 'คะแนน F1 สูงสุดที่ Confidence Threshold ~0.53 ให้จุดสมดุลที่ดีที่สุดระหว่าง False Positive และ False Negative',
        valPred: '/eval_plots/yolo26m/val_batch0_pred.jpg',
        valDesc: 'ตัวอย่างการทำนายจริงบนเฟรมทดสอบ พร้อม Bounding Box และ Confidence Score ของ Car และ Motorcycle',
        layerProfiling: '/eval_plots/yolo26m/layer_profiling.png',
        layerDesc: 'Dual-Axis RAM vs CPU Profiling: RAM สูงช่วง Backbone (26.2 MB) และ CPU สูงสุดที่ Head (12.8M params)',
      },
    },
    yolo26m_base: {
      id: 'yolo26m_base',
      name: 'YOLO26m (Pretrained Base)',
      shortName: 'YOLO26m Base',
      fullName: 'YOLO26m (Pretrained Base - ก่อนรีเทรน)',
      tag: 'PRETRAINED BASE',
      tagColor: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECDD3]',
      desc: 'โมเดล YOLO26m ดั้งเดิมก่อนการ Fine-tuning มี 80 คลาส COCO มาตรฐาน ยังไม่ถูกปรับจูนเฉพาะทางสำหรับสภาพแสงและมุมกล้องของลานจอดรถ',
      map50Num: 64.8,
      map50: '64.8%',
      precision: '66.2%',
      recall: '59.4%',
      map50_95: '48.1%',
      carMap50: '74.2%',
      carDetail: 'mAP@50 (มี False Negative สูงในจุดเงามืด)',
      motoMap50: '55.4%',
      motoDetail: 'mAP@50 (ตรวจจับมอเตอร์ไซค์ที่จอดซ้อนคันได้ต่ำ)',
      params: '21.78M',
      paramsNum: 21.78,
      gflops: '75.0',
      gflopsNum: 75.0,
      latency: '438ms (ONNX 2-thread)',
      latencyNum: 438,
      conclusion: 'ก่อนการรีเทรน โมเดล YOLO26m Pretrained มี mAP@50 เพียง 64.8% โดยเฉพาะมอเตอร์ไซค์ที่จอดซ้อนคัน (55.4%) เมื่อผ่านการ Fine-tune ด้วยดาต้าเซ็ต CCTV ลานจอด (best_v1.pt) ความแม่นยำพุ่งขึ้นเป็น 93.0% (+28.2%)',
      plots: {
        confusionMatrix: '/eval_plots/yolo26m_base/confusion_matrix.png',
        cmDesc: 'แสดง Confusion Matrix ก่อนการรีเทรน มีอัตราความผิดพลาดและหลุดรอด (False Negative) ในจุดอับแสงสูง',
        prCurve: '/eval_plots/yolo26m_base/BoxPR_curve.png',
        prDesc: 'กราฟ Precision-Recall ก่อนรีเทรน มีพื้นที่ใต้กราฟต่ำกว่ารุ่น Fine-tuned อย่างเห็นได้ชัด (mAP 0.648)',
        f1Curve: '/eval_plots/yolo26m_base/BoxF1_curve.png',
        f1Desc: 'คะแนน F1 สูงสุดอยู่ที่ระดับเพียง ~0.61 ที่ Confidence ต่ำ 0.35',
        valPred: '/eval_plots/yolo26m_base/val_batch0_pred.jpg',
        valDesc: 'ผลการทำนายก่อนรีเทรน พบปัญหากล่องสั่นคลอนและมองไม่เห็นรถจักรยานยนต์ระยะไกล',
        layerProfiling: '/eval_plots/yolo26m_base/layer_profiling.png',
        layerDesc: 'Dual-Axis RAM vs CPU Profiling: โครงสร้างเลเยอร์เหมือนรุ่น Retrained แต่ชุดน้ำหนักยังไม่ได้ปรับจูนเฉพาะทาง',
      },
    },
    yolo26s: {
      id: 'yolo26s',
      name: 'YOLO26s (Small Balanced)',
      shortName: 'YOLO26s',
      fullName: 'YOLO26s (Small Balanced)',
      tag: 'BALANCED',
      tagColor: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
      desc: 'โมเดลขนาดกลาง ให้ความสมดุลที่ดีเลิศระหว่าง Throughput และ Accuracy เหมาะสำหรับการขยายสเกลกล้องหลายตัวพร้อมกันบนเซิร์ฟเวอร์เดียว',
      map50Num: 91.8,
      map50: '91.8%',
      precision: '91.2%',
      recall: '89.1%',
      map50_95: '73.4%',
      carMap50: '98.6%',
      carDetail: 'mAP@50 (Robust Feature Extraction)',
      motoMap50: '85.0%',
      motoDetail: 'mAP@50 (High Small Object Sensitivity)',
      params: '9.41M',
      paramsNum: 9.41,
      gflops: '21.5',
      gflopsNum: 21.5,
      latency: '245ms (Balanced)',
      latencyNum: 245,
      conclusion: 'โมเดล YOLO26s ให้ประสิทธิภาพที่ลงตัวระหว่างความเร็ว 245ms และความแม่นยำ 91.8% mAP50',
      plots: {
        confusionMatrix: '/eval_plots/yolo26s/confusion_matrix.png',
        cmDesc: 'แสดงสัดส่วนการจำแนกที่แม่นยำขึ้นจากรุ่น Nano โดยเฉพาะในคลาสรถจักรยานยนต์',
        prCurve: '/eval_plots/yolo26s/BoxPR_curve.png',
        prDesc: 'กราฟ PR Curve ชันขึ้น แสดงถึงความสามารถในการตรวจจับที่เชื่อถือได้สูง',
        f1Curve: '/eval_plots/yolo26s/BoxF1_curve.png',
        f1Desc: 'กราฟ F1-Confidence Curve กว้างและเสถียรที่ Threshold 0.50',
        valPred: '/eval_plots/yolo26s/val_batch0_pred.jpg',
        valDesc: 'ตัวอย่างการตรวจจับตำแหน่งรถที่แม่นยำและ Bounding Box แนบชิดกับตัวรถ',
        layerProfiling: '/eval_plots/yolo26s/layer_profiling.png',
        layerDesc: 'Dual-Axis RAM vs CPU Profiling: สมดุลการประมวลผล 9.41M Parameters และ 21.5 GFLOPs',
      },
    },
    yolo26n: {
      id: 'yolo26n',
      name: 'YOLO26n (Edge Nano)',
      shortName: 'YOLO26n',
      fullName: 'YOLO26n (Edge Nano)',
      tag: 'EDGE NANO',
      tagColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
      desc: 'สถาปัตยกรรมขนาดกะทัดรัด (Nano) เหมาะสำหรับรันบนอุปกรณ์ประหยัดพลังงานหรือ Edge Device โดยตรง ให้ความเร็วสูงขึ้น 3.5 เท่าโดยสูญเสีย mAP เพียงเล็กน้อย',
      map50Num: 89.4,
      map50: '89.4%',
      precision: '88.9%',
      recall: '86.5%',
      map50_95: '70.1%',
      carMap50: '97.2%',
      carDetail: 'mAP@50 (Fast Vehicle Localization)',
      motoMap50: '81.6%',
      motoDetail: 'mAP@50 (Good Dense Detection)',
      params: '2.62M',
      paramsNum: 2.62,
      gflops: '6.8',
      gflopsNum: 6.8,
      latency: '126ms (3.5x Faster)',
      latencyNum: 126,
      conclusion: 'โมเดล YOLO26n มีขนาดเล็กเพียง 2.62M พารามิเตอร์ และ 6.8 GFLOPs เหมาะสำหรับการประมวลผลบน Edge Device ที่มีทรัพยากรจำกัด',
      plots: {
        confusionMatrix: '/eval_plots/yolo26n/confusion_matrix.png',
        cmDesc: 'แสดง Confusion Matrix ของ YOLO26n ที่ยังคงความแม่นยำสูงในคลาส Car และแยกแยะฉากหลังได้ดี',
        prCurve: '/eval_plots/yolo26n/BoxPR_curve.png',
        prDesc: 'กราฟ Precision-Recall รักษาพื้นที่ใต้กราฟได้ที่ mAP@0.5 = 0.894',
        f1Curve: '/eval_plots/yolo26n/BoxF1_curve.png',
        f1Desc: 'คะแนน F1 สูงสุดที่ Confidence Threshold ~0.48 ตอบสนองเร็วต่อวัตถุขนาดเล็ก',
        valPred: '/eval_plots/yolo26n/val_batch0_pred.jpg',
        valDesc: 'ผลการทำนายจริงบนเฟรมทดสอบด้วย YOLO26n รวดเร็วและแม่นยำ',
        layerProfiling: '/eval_plots/yolo26n/layer_profiling.png',
        layerDesc: 'Dual-Axis RAM vs CPU Profiling: โครงสร้างขนาดเบา 2.62M Params ลดภาระ CPU ได้ถึง 71%',
      },
    },
    yolo11n: {
      id: 'yolo11n',
      name: 'YOLO11n (Baseline)',
      shortName: 'YOLO11n',
      fullName: 'YOLO11n (Baseline Comparison)',
      tag: 'BASELINE',
      tagColor: 'bg-[#F0EEE4] text-[#686962] border-[#DEDED2]',
      desc: 'โมเดลรุ่นก่อนหน้าสำหรับเปรียบเทียบ Baseline แสดงให้เห็นว่า YOLO26m มีการพัฒนาความแม่นยำในจุดอับสายตาและมอเตอร์ไซค์ที่จอดซ้อนคันได้ดีขึ้นอย่างชัดเจน',
      map50Num: 86.2,
      map50: '86.2%',
      precision: '85.4%',
      recall: '83.1%',
      map50_95: '65.8%',
      carMap50: '94.1%',
      carDetail: 'mAP@50 (Predecessor Standard)',
      motoMap50: '78.3%',
      motoDetail: 'mAP@50 (Higher False Negatives in Shadows)',
      params: '2.58M',
      paramsNum: 2.58,
      gflops: '6.5',
      gflopsNum: 6.5,
      latency: '134ms (Baseline)',
      latencyNum: 134,
      conclusion: 'YOLO11n แสดงให้เห็นวิวัฒนาการว่าสถาปัตยกรรม YOLO26 สามารถเพิ่ม mAP@50 ของคลาสมอเตอร์ไซค์ได้มากกว่า +8.1% ในสภาพแสงจริง',
      plots: {
        confusionMatrix: '/eval_plots/yolo11n/confusion_matrix.png',
        cmDesc: 'แสดงผล Baseline เปรียบเทียบ มีอัตราความคลาดเคลื่อนในบริเวณเงาและจุดอับมากกว่า',
        prCurve: '/eval_plots/yolo11n/BoxPR_curve.png',
        prDesc: 'กราฟ PR Curve ของ Baseline สำหรับใช้เทียบเคียงประสิทธิภาพ',
        f1Curve: '/eval_plots/yolo11n/BoxF1_curve.png',
        f1Desc: 'กราฟ F1 Score ของ Baseline',
        valPred: '/eval_plots/yolo11n/val_batch0_pred.jpg',
        valDesc: 'การเปรียบเทียบ Bounding Box บนเฟรมทดสอบชุดเดียวกัน',
        layerProfiling: '/eval_plots/yolo11n/layer_profiling.png',
        layerDesc: 'Dual-Axis RAM vs CPU Profiling: สถาปัตยกรรมรุ่นก่อนหน้าแบบ Single-branch Standard',
      },
    },
  }

  const effectiveApiBase =
    apiBase ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000')

  // Fetch all analytics data
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [yoloRes, tsRes, metricsRes, statusRes] = await Promise.all([
        fetch(`${effectiveApiBase}/api/v1/analytics/data?hours=${hoursFilter}`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/graph-data?hours=${hoursFilter}&camera_id=${activeCamFilter}`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/model-metrics`),
        fetch(`${effectiveApiBase}/api/v1/timeseries/cameras/status`),
      ])

      if (yoloRes.ok) {
        const yoloJson = await yoloRes.json()
        setYoloData(yoloJson)
      }
      if (tsRes.ok) {
        const tsJson = await tsRes.json()
        setTsGraphData(tsJson)
      }
      if (metricsRes.ok) {
        const metricsJson = await metricsRes.json()
        setModelMetrics(metricsJson.metadata || null)
      }
      if (statusRes.ok) {
        const statusJson = await statusRes.json()
        setLiveCameras(statusJson.cameras || null)
      }

      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err.message || 'Error connecting to analytics backend')
    } finally {
      setLoading(false)
    }
  }

  // Fetch future occupancy prediction
  const fetchFuturePrediction = async (camId = predictCam, horizon = predictHorizon) => {
    try {
      const res = await fetch(`${effectiveApiBase}/api/v1/timeseries/future-occupancy?camera_id=${camId}&minutes=${horizon}`)
      if (res.ok) {
        const json = await res.json()
        setFuturePrediction(json.data || null)
      }
    } catch (err) {
      console.error('Future prediction fetch error:', err)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [hoursFilter, activeCamFilter])

  useEffect(() => {
    fetchFuturePrediction(predictCam, predictHorizon)
  }, [predictCam, predictHorizon])

  const timeSeriesList = tsGraphData?.series || []

  // Transform sleep value for Broken Axis representation
  // 0s - 100s -> mapped to 0 - 65 (takes 65% of vertical space so daytime fluctuations 10s-60s are prominent)
  // 100s - 1700s -> gap zone mapped to 65 - 75 (10% transition space)
  // 1700s - 1850s+ -> mapped to 75 - 100 (25% top space for Night Standby)
  const transformSleepValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return null
    const num = Number(val)
    if (num <= 100) {
      return (num / 100) * 65
    }
    if (num < 1700) {
      return 65 + ((num - 100) / 1600) * 10
    }
    return 75 + Math.min(25, ((num - 1700) / 150) * 25)
  }

  // Preprocessed telemetry list supporting Broken Axis / Daytime Zoom / Full Linear modes
  const sleepChartData = useMemo(() => {
    return timeSeriesList.map((item) => {
      const isSec = sleepUnit === 'seconds'
      const rawC1 = isSec ? item.cam1_sleep_sec : item.cam1_sleep_min
      const rawC2 = isSec ? item.cam2_sleep_sec : item.cam2_sleep_min
      const rawC3 = isSec ? item.cam3_sleep_sec : item.cam3_sleep_min
      const rawRec = isSec ? item.recommended_sleep_sec : item.recommended_sleep_min

      let plotC1 = rawC1
      let plotC2 = rawC2
      let plotC3 = rawC3
      let plotRec = rawRec

      if (sleepScaleMode === 'broken') {
        plotC1 = transformSleepValue(item.cam1_sleep_sec)
        plotC2 = transformSleepValue(item.cam2_sleep_sec)
        plotC3 = transformSleepValue(item.cam3_sleep_sec)
        plotRec = transformSleepValue(item.recommended_sleep_sec)
      } else if (sleepScaleMode === 'daytime') {
        const maxLimit = isSec ? 120 : 2.0
        plotC1 = (rawC1 !== null && rawC1 <= maxLimit) ? rawC1 : null
        plotC2 = (rawC2 !== null && rawC2 <= maxLimit) ? rawC2 : null
        plotC3 = (rawC3 !== null && rawC3 <= maxLimit) ? rawC3 : null
        plotRec = (rawRec !== null && rawRec <= maxLimit) ? rawRec : null
      }

      return {
        ...item,
        raw_cam1: rawC1,
        raw_cam2: rawC2,
        raw_cam3: rawC3,
        raw_rec: rawRec,
        plot_cam1: plotC1,
        plot_cam2: plotC2,
        plot_cam3: plotC3,
        plot_rec: plotRec,
      }
    })
  }, [timeSeriesList, sleepUnit, sleepScaleMode])

  const renderBrokenYAxisTick = ({ x, y, payload }) => {
    const val = payload.value
    let label = ''
    let isBreak = false
    let isNight = false

    if (Math.abs(val - 0) < 0.5) label = sleepUnit === 'seconds' ? '0s' : '0m'
    else if (Math.abs(val - 13) < 0.5) label = sleepUnit === 'seconds' ? '20s' : '0.3m'
    else if (Math.abs(val - 26) < 0.5) label = sleepUnit === 'seconds' ? '40s' : '0.7m'
    else if (Math.abs(val - 39) < 0.5) label = sleepUnit === 'seconds' ? '60s' : '1.0m'
    else if (Math.abs(val - 52) < 0.5) label = sleepUnit === 'seconds' ? '80s' : '1.3m'
    else if (Math.abs(val - 65) < 0.5) label = sleepUnit === 'seconds' ? '100s' : '1.7m'
    else if (Math.abs(val - 70) < 0.5) {
      label = '〰️ // 〰️'
      isBreak = true
    } else if (Math.abs(val - 88.33) < 1.0) {
      label = sleepUnit === 'seconds' ? '1,780s' : '29.6m'
      isNight = true
    } else if (Math.abs(val - 91.67) < 1.0) {
      label = sleepUnit === 'seconds' ? '1,800s' : '30m'
      isNight = true
    } else {
      return null
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-8}
          y={4}
          textAnchor="end"
          fill={isBreak ? '#D97706' : isNight ? '#7C3AED' : '#475569'}
          fontSize={isBreak ? 10 : 11}
          fontWeight={isBreak ? '700' : isNight ? '600' : '500'}
        >
          {label}
        </text>
      </g>
    )
  }

  const renderSleepTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0]?.payload
    if (!item) return null

    const isNight = item.is_night || (item.cam1_sleep_sec > 100)
    const isSec = sleepUnit === 'seconds'

    const formatVal = (secVal, minVal) => {
      if (secVal === null || secVal === undefined) return '-'
      return isSec ? `${Number(secVal).toFixed(1)} s` : `${Number(minVal).toFixed(2)} m`
    }

    return (
      <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[16px] p-3.5 shadow-lg text-xs font-sans max-w-[290px]">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#F0EEE4]">
          <span className="font-bold text-[#30312F]">{label}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isNight
                ? 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]'
                : 'bg-[#E7F4D8] text-[#36612D] border border-[#BBF7D0]'
            }`}
          >
            {isNight ? '🌙 Night Standby' : '☀️ Daytime Dynamic'}
          </span>
        </div>
        {item.campus_phase_name && (
          <div className="text-[11px] text-[#85847E] py-1 border-b border-[#F0EEE4]">
            {item.campus_phase_name}
          </div>
        )}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center justify-between text-[#10B981]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0 inline-block" />
              <span className="font-medium text-[#30312F]">CAM-01 (หน้าภาค 1):</span>
            </span>
            <span className="font-mono font-bold text-[#10B981]">
              {formatVal(item.cam1_sleep_sec, item.cam1_sleep_min)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#2563EB]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0 inline-block" />
              <span className="font-medium text-[#30312F]">CAM-02 (หน้าภาค 2):</span>
            </span>
            <span className="font-mono font-bold text-[#2563EB]">
              {formatVal(item.cam2_sleep_sec, item.cam2_sleep_min)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#F59E0B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0 inline-block" />
              <span className="font-medium text-[#30312F]">CAM-03 (ข้างภาคคอม):</span>
            </span>
            <span className="font-mono font-bold text-[#F59E0B]">
              {formatVal(item.cam3_sleep_sec, item.cam3_sleep_min)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#64748B] pt-1 border-t border-dashed border-[#E2E8F0]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#64748B] shrink-0 inline-block" />
              <span className="font-medium text-[#64748B]">AI Policy Baseline:</span>
            </span>
            <span className="font-mono font-semibold text-[#64748B]">
              {formatVal(item.recommended_sleep_sec, item.recommended_sleep_min)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const summary = yoloData?.summary || {}

  const featureImportances = modelMetrics?.top_features || [
    { feature: 'delta_vehicles', importance: 0.4808 },
    { feature: 'chip_temp_c', importance: 0.1337 },
    { feature: 'is_weekend', importance: 0.0984 },
    { feature: 'day_of_week', importance: 0.0953 },
    { feature: 'campus_phase', importance: 0.0911 },
    { feature: 'day_type', importance: 0.0691 },
    { feature: 'is_class_transition', importance: 0.0197 },
    { feature: 'is_lecture_time', importance: 0.0108 },
  ]

  const modelComparison = yoloData?.model_comparison || []

  const resolutionBenchmark = (yoloData?.resolution_benchmark && yoloData.resolution_benchmark.length > 0
    ? yoloData.resolution_benchmark
    : [
        { resolution: '640x640', median_latency_ms: 319.6, map50: 98.5, fps: 3.13 },
        { resolution: '960x960', median_latency_ms: 737.1, map50: 99.1, fps: 1.35 },
        { resolution: '1280x1280', median_latency_ms: 1358.6, map50: 99.4, fps: 0.74 },
      ]
  ).map((item) => ({
    ...item,
    resolution: item.resolution || '640x640',
    map50: item.map50 ?? (item.resolution === '640x640' ? 98.5 : item.resolution === '960x960' ? 99.1 : 99.4),
    fps: item.fps ?? Number((1000 / (item.median_latency_ms || item.latency_ms || 320)).toFixed(2)),
    latency_ms: item.median_latency_ms || item.latency_ms || 320,
  }))

  const quantizationBenchmark = (yoloData?.quantization_benchmark && yoloData.quantization_benchmark.length > 0
    ? yoloData.quantization_benchmark
    : [
        { runtime: 'PyTorch FP32', format: 'PyTorch FP32', latency_ms: 595.9, size_mb: 42.2, fps: 1.68 },
        { runtime: 'OpenVINO FP32', format: 'OpenVINO FP32', latency_ms: 660.1, size_mb: 78.3, fps: 1.51 },
        { runtime: 'OpenVINO INT8', format: 'OpenVINO INT8', latency_ms: 320.5, size_mb: 22.4, fps: 3.12 },
      ]
  ).map((item) => ({
    ...item,
    runtime: item.runtime || item.format || 'Unknown',
    format: item.format || item.runtime || 'Unknown',
    latency_ms: item.latency_ms || 320,
    size_mb: item.size_mb || 22.4,
  }))

  // Clean Bento Light Tooltip Style
  const tooltipStyle = {
    backgroundColor: '#FFFDF7',
    border: '1px solid #DEDED2',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '12px',
    color: '#30312F',
    padding: '10px 14px',
  }

  return (
    <div className="platform-workspace">
      {/* 1. Breadcrumb */}
      <div className="platform-breadcrumb">
        <span>Platform</span>
        <span>/</span>
        <span className="text-[#30312F] font-medium">Campus Analytics & Predictive Intelligence</span>
      </div>

      {/* 2. Platform Intro Header */}
      <div className="platform-intro">
        <div className="platform-overview">
          <div className="platform-metadata">
            <PillTag variant="neutral">Time-Series Intelligence</PillTag>
            <PillTag variant="neutral">{summary.total_telemetry_records?.toLocaleString() || '120,000+'} Frames</PillTag>
            <PillTag variant="active">Adaptive Deep-Sleep Active</PillTag>
          </div>

          <h1 className="platform-title">
            Campus Analytics & Predictive Intelligence
          </h1>

          <p className="platform-description">
            ประมวลผลข้อมูลอนุกรมเวลา (Time-Series) เพื่อควบคุมรอบ Deep-Sleep อัจฉริยะ ป้องกันความร้อนชิป ESP32 และทำนายความว่างของที่จอดรถล่วงหน้า (+15m & +30m) ตามกิจกรรมมหาวิทยาลัย
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#FAF8EF] border border-[#DEDED2] rounded-full px-4 h-12 text-xs font-medium text-[#30312F]">
            <Clock className="w-3.5 h-3.5 text-[#85847E]" />
            <select
              value={hoursFilter}
              onChange={(e) => setHoursFilter(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-medium text-[#30312F]"
            >
              <option value={12}>12 ชั่วโมงล่าสุด</option>
              <option value={24}>24 ชั่วโมงล่าสุด</option>
              <option value={48}>48 ชั่วโมงล่าสุด</option>
              <option value={72}>72 ชั่วโมงล่าสุด</option>
              <option value={168}>7 วันย้อนหลัง</option>
            </select>
          </div>

          <PillButton
            variant="primary"
            icon={RefreshCw}
            onClick={fetchAllData}
            className="h-12"
          >
            {loading ? 'กำลังซิงค์...' : 'อัปเดตข้อมูล'}
          </PillButton>
        </div>
      </div>

      {/* 3. Segmented Tab Switcher */}
      <div className="flex items-center justify-between w-full flex-wrap gap-3">
        <div className="inline-flex p-1.5 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab('timeseries')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'timeseries'
                ? 'bg-[#30312F] text-white shadow-xs'
                : 'text-[#686962] hover:text-[#30312F]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Time-Series & Campus Adaptive System</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('yolo')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'yolo'
                ? 'bg-[#30312F] text-white shadow-xs'
                : 'text-[#686962] hover:text-[#30312F]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Computer Vision & YOLO Benchmarks</span>
          </button>
        </div>

        {lastRefreshed && (
          <span className="text-xs text-[#85847E]">
            ซิงค์ล่าสุดเมื่อ: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="w-full p-4 bg-rose-50 border border-rose-200 rounded-[20px] text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-xs">ไม่สามารถเชื่อมต่อข้อมูลวิเคราะห์ได้</p>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TIME-SERIES & CAMPUS ADAPTIVE SYSTEM                               */}
      {/* ========================================================================= */}
      {activeTab === 'timeseries' && (
        <div className="flex flex-col gap-6 w-full">
          {/* --------------------------------------------------------------------- */}
          {/* SECTION A: FUTURE PARKING AVAILABILITY PREDICTOR (+15m & +30m)        */}
          {/* --------------------------------------------------------------------- */}
          <div className="box-border flex flex-col p-6 lg:p-8 gap-6 w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#F0EEE4] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
                  <h2 className="font-sans font-semibold text-[19px] text-[#30312F] m-0">
                    ระบบพยากรณ์ความว่างของที่จอดรถล่วงหน้า (Predictive Parking: +15m & +30m)
                  </h2>
                </div>
                <p className="font-sans text-xs text-[#85847E] mt-1 m-0">
                  วิเคราะห์แนวโน้มล่วงหน้าตามตารางกิจกรรมมหาวิทยาลัย (Academic Campus Phases) และประวัติการจอดจริง
                </p>
              </div>

              {/* Selector Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Camera Toggle */}
                <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                  {[
                    { id: 'cam1', label: 'CAM-01' },
                    { id: 'cam2', label: 'CAM-02' },
                    { id: 'cam3', label: 'CAM-03' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPredictCam(c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        predictCam === c.id
                          ? 'bg-[#30312F] text-white shadow-xs'
                          : 'text-[#686962] hover:text-[#30312F]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Horizon Toggle */}
                <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                  {[15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setPredictHorizon(mins)}
                      className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        predictHorizon === mins
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-[#686962] hover:text-[#30312F]'
                      }`}
                    >
                      +{mins} นาที
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction Cards Display */}
            {futurePrediction ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Target Forecast Time */}
                <div className="p-5 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-2.5">
                  <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
                    เวลาเป้าหมายพยากรณ์
                  </span>
                  <div>
                    <div className="text-3xl font-mono font-bold tracking-tight text-[#30312F]">
                      {futurePrediction.target_time} น.
                    </div>
                    <div className="text-xs text-[#85847E] font-medium mt-1">
                      (อีก +{futurePrediction.horizon_minutes} นาทีข้างหน้า)
                    </div>
                  </div>
                  <div className="text-xs bg-[#FFFDF7] text-[#30312F] p-2.5 rounded-[12px] border border-[#DEDED2]">
                    {futurePrediction.campus_phase_name}
                  </div>
                </div>

                {/* Card 2: Predicted Free Slots */}
                <div className="p-5 rounded-[18px] bg-[#E7F4D8] border border-[#BBF7D0] flex flex-col justify-between gap-2.5">
                  <span className="text-[11px] font-semibold text-[#36612D] uppercase tracking-wider">
                    คาดว่าจะมีที่ว่าง (Free Slots)
                  </span>
                  <div>
                    <div className="text-3xl font-mono font-bold tracking-tight text-[#36612D]">
                      ~{futurePrediction.predicted_free_slots} ช่อง
                    </div>
                    <div className="text-xs text-[#36612D] mt-1">
                      จากความจุทั้งหมด {futurePrediction.capacity} ช่องจอด
                    </div>
                  </div>
                  <div className="text-xs bg-[#FFFDF7] text-[#36612D] p-2.5 rounded-[12px] border border-[#BBF7D0] font-medium">
                    ความหนาแน่น: {futurePrediction.predicted_occupancy_pct}% ({futurePrediction.predicted_vehicles} คัน)
                  </div>
                </div>

                {/* Card 3: Availability Level */}
                <div className="p-5 rounded-[18px] bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between gap-2.5">
                  <span className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wider">
                    โอกาสที่จอดว่าง (Availability)
                  </span>
                  <div>
                    <div className="text-lg font-bold text-[#92400E]">
                      {futurePrediction.availability_chance === 'HIGH_CHANCE' && 'ว่างสะดวก (High)'}
                      {futurePrediction.availability_chance === 'MODERATE' && 'พอมีที่ว่าง (Moderate)'}
                      {futurePrediction.availability_chance === 'FULL_RISK' && 'เสี่ยงเต็ม (Full Risk)'}
                    </div>
                    <div className="text-xs text-[#92400E] mt-1 font-medium leading-relaxed">
                      {futurePrediction.availability_desc}
                    </div>
                  </div>
                  <div className="text-xs text-[#85847E]">
                    สถิติปัจจุบัน: จอดอยู่ {futurePrediction.current_vehicles} คัน
                  </div>
                </div>

                {/* Card 4: Behavioral Trend */}
                <div className="p-5 rounded-[18px] bg-[#F0EEE4] border border-[#DEDED2] flex flex-col justify-between gap-2.5">
                  <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider">
                    แนวโน้มพฤติกรรม (Campus Trend)
                  </span>
                  <p className="text-xs text-[#30312F] leading-relaxed font-normal m-0">
                    {futurePrediction.campus_trend_desc}
                  </p>
                  <div className="text-[11px] text-[#85847E] bg-[#FFFDF7] p-2 rounded-[10px] border border-[#DEDED2]">
                    โมเดล: <span className="font-mono text-[#30312F]">{futurePrediction.model_used}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#85847E]">
                กำลังคำนวณการทำนายล่วงหน้า...
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION B: MULTI-AXIS CORRELATION TIME-SERIES GRAPH                   */}
          {/* --------------------------------------------------------------------- */}
          <div className="box-border flex flex-col p-6 lg:p-8 gap-5 w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#F0EEE4] gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#30312F]" strokeWidth={1.8} />
                  <h3 className="font-sans font-semibold text-[18px] text-[#30312F] m-0">
                    Time-Series Correlation: ความสัมพันธ์อุณหภูมิชิป VS จำนวนรถ VS การปรับ Deep-Sleep
                  </h3>
                </div>
                <p className="text-xs text-[#85847E] mt-1 m-0">
                  แกนซ้าย: อุณหภูมิชิป (°C) & จำนวนรถ (คัน) | แกนขวา: ระยะเวลา Deep-Sleep ที่ AI สั่งการ (วินาที)
                </p>
              </div>

              {/* Camera Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#85847E]">กล้อง:</span>
                <select
                  value={activeCamFilter}
                  onChange={(e) => setActiveCamFilter(e.target.value)}
                  className="text-xs font-medium bg-[#FAF8EF] border border-[#DEDED2] rounded-full px-3.5 py-1.5 text-[#30312F] outline-none cursor-pointer"
                >
                  <option value="all">ทุกกล้องรวมกัน (All Cameras)</option>
                  <option value="cam1">CAM-01: หน้าภาค 1 (รถยนต์)</option>
                  <option value="cam2">CAM-02: หน้าภาค 2 (รถยนต์)</option>
                  <option value="cam3">CAM-03: ข้างภาคคอม (มอเตอร์ไซค์)</option>
                </select>
              </div>
            </div>

            {/* Time-Series LineChart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesList} margin={{ top: 15, right: 25, left: 0, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                  <XAxis
                    dataKey="display_time"
                    stroke="#85847E"
                    tick={{ fontSize: 11, fill: '#85847E' }}
                    dy={5}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#85847E"
                    tick={{ fontSize: 11, fill: '#85847E' }}
                    domain={[0, 85]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10B981"
                    tick={{ fontSize: 11, fill: '#10B981' }}
                    domain={[0, 70]}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chip_temp_c"
                    name="ESP32 Chip Temp (°C)"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_vehicles"
                    name="Total Vehicles (คัน)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="stepAfter"
                    dataKey="recommended_sleep_sec"
                    name="AI Deep-Sleep (sec)"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Correlation Strategy Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-[#F0EEE4]">
              <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs">
                <span className="font-semibold text-rose-700">ป้องกันความร้อนสะสม: </span>
                <span className="text-[#686962]">
                  เมื่อชิปสะสมความร้อนเกิน 62°C–68°C ในช่วงเที่ยง ระบบจะขยายเวลาหลับเป็น 45–60 วินาที ช่วยให้อุปกรณ์เย็นลง ไม่เกิด Brownout
                </span>
              </div>
              <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs">
                <span className="font-semibold text-blue-700">ตอบสนองช่วงรถเยอะ: </span>
                <span className="text-[#686962]">
                  ช่วงเร่งด่วนเช้า/เย็น และช่วงเปลี่ยนคาบเรียน ระบบจะลดเวลาหลับเหลือ 10–15 วินาที เพื่อบันทึกการเข้า-ออกของรถได้ครบถ้วน
                </span>
              </div>
              <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs">
                <span className="font-semibold text-emerald-700">ประหยัดพลังงานในคาบเรียน: </span>
                <span className="text-[#686962]">
                  ระหว่างคาบเรียน (09:30–11:30 และ 14:00–16:30) รถจอดนิ่ง ระบบปรับเวลาหลับ 30 วินาที ยืดอายุการใช้งานฮาร์ดแวร์
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION B2: 3-CAMERA ADAPTIVE DEEP-SLEEP TREND (LINE CHART & LOGS)    */}
          {/* --------------------------------------------------------------------- */}
          <div className="box-border flex flex-col p-6 lg:p-8 gap-5 w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#F0EEE4] gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#30312F]" strokeWidth={1.8} />
                  <h3 className="font-sans font-semibold text-[18px] text-[#30312F] m-0">
                    กราฟเปรียบเทียบระยะเวลา Deep-Sleep ทั้ง 3 กล้อง (Multi-Camera Measured Telemetry Logs)
                  </h3>
                </div>
                <p className="text-xs text-[#85847E] mt-1 m-0">
                  คำนวณจากบันทึก Telemetry จริง (Real Hardware Logs) ของกล้อง ESP32 ทั้ง 3 ตัว: กลางวันแสดงการผันแปรจริง (10s–60s) | กลางคืน Standby (~1,780s / ~30 นาที)
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPlotModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FAF8EF] hover:bg-[#F0EEE4] text-[#30312F] border border-[#DEDED2] transition-all cursor-pointer shadow-xs"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#686962]" />
                  <span>ดูรายงาน 4-Panel Verification Plot</span>
                </button>

                {/* Scale Mode Switcher */}
                <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                  <button
                    type="button"
                    onClick={() => setSleepScaleMode('broken')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      sleepScaleMode === 'broken'
                        ? 'bg-[#30312F] text-white shadow-xs'
                        : 'text-[#686962] hover:text-[#30312F]'
                    }`}
                  >
                    <Scissors className="w-3 h-3" />
                    <span>ย่นระยะ Broken Axis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSleepScaleMode('daytime')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      sleepScaleMode === 'daytime'
                        ? 'bg-[#30312F] text-white shadow-xs'
                        : 'text-[#686962] hover:text-[#30312F]'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>เฉพาะกลางวัน (0–100s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSleepScaleMode('linear')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      sleepScaleMode === 'linear'
                        ? 'bg-[#30312F] text-white shadow-xs'
                        : 'text-[#686962] hover:text-[#30312F]'
                    }`}
                  >
                    <Scale className="w-3 h-3" />
                    <span>สเกลตรง (0–2k)</span>
                  </button>
                </div>

                {/* Unit Toggle */}
                <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                  <button
                    type="button"
                    onClick={() => setSleepUnit('seconds')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      sleepUnit === 'seconds'
                        ? 'bg-[#30312F] text-white shadow-xs'
                        : 'text-[#686962] hover:text-[#30312F]'
                    }`}
                  >
                    วินาที (Seconds)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSleepUnit('minutes')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      sleepUnit === 'minutes'
                        ? 'bg-[#30312F] text-white shadow-xs'
                        : 'text-[#686962] hover:text-[#30312F]'
                    }`}
                  >
                    นาที (Minutes)
                  </button>
                </div>
              </div>
            </div>

            {/* Broken Axis Informational Banner */}
            {sleepScaleMode === 'broken' && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-[16px] bg-[#FAF8EF] border border-[#E2E0D4] text-xs text-[#52524C]">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E7F4D8] text-[#284E1A] font-bold text-[11px] shrink-0">
                  ✓
                </span>
                <div className="flex-1 leading-snug">
                  <strong>โหมดแกนย่นระยะ (Broken Axis View):</strong> ขยายช่วงกลางวัน 0–100 วินาที ให้กินพื้นที่ 65% ของกราฟ เพื่อให้เห็นระลอกคลื่น 10s–60s ชัดเจนด้วยตาเปล่า พร้อมคั่นช่วงว่าง 100s–1,700s ด้วยเส้นประ <code>〰️ // 〰️</code> และคงระดับ Night Standby ~1,780s ไว้ด้านบน
                </div>
              </div>
            )}

            {/* Line Chart */}
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepChartData} margin={{ top: 15, right: 25, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                  <XAxis
                    dataKey="display_time"
                    stroke="#85847E"
                    tick={{ fontSize: 11, fill: '#85847E' }}
                    dy={5}
                  />

                  {sleepScaleMode === 'broken' ? (
                    <YAxis
                      stroke="#85847E"
                      domain={[0, 100]}
                      ticks={[0, 13, 26, 39, 52, 65, 70, 88.33, 91.67]}
                      tick={renderBrokenYAxisTick}
                    />
                  ) : sleepScaleMode === 'daytime' ? (
                    <YAxis
                      stroke="#85847E"
                      tick={{ fontSize: 11, fill: '#85847E' }}
                      unit={sleepUnit === 'seconds' ? ' s' : ' m'}
                      domain={[0, sleepUnit === 'seconds' ? 100 : 2]}
                    />
                  ) : (
                    <YAxis
                      stroke="#85847E"
                      tick={{ fontSize: 11, fill: '#85847E' }}
                      unit={sleepUnit === 'seconds' ? ' s' : ' m'}
                      domain={[0, sleepUnit === 'seconds' ? 2000 : 35]}
                    />
                  )}

                  <Tooltip content={renderSleepTooltip} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />

                  {/* Reference Area & Lines for Broken Axis */}
                  {sleepScaleMode === 'broken' && (
                    <>
                      <ReferenceArea
                        y1={65}
                        y2={75}
                        fill="#F1EFE3"
                        fillOpacity={0.7}
                        stroke="#D4D1C3"
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine
                        y={70}
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        label={{
                          value: '✂️ แกนย่นระยะ (ข้ามช่วงว่าง 100s - 1,700s)',
                          fill: '#64748B',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                      <ReferenceLine
                        y={91.67}
                        stroke="#8B5CF6"
                        strokeDasharray="5 3"
                        label={{
                          value: sleepUnit === 'seconds' ? 'Night Standby (1,800s)' : 'Night Standby (30 นาที)',
                          fill: '#8B5CF6',
                          fontSize: 11,
                          position: 'top',
                        }}
                      />
                    </>
                  )}

                  {sleepScaleMode === 'linear' && (
                    <ReferenceLine
                      y={sleepUnit === 'seconds' ? 1800 : 30}
                      stroke="#8B5CF6"
                      strokeDasharray="6 3"
                      label={{
                        value: sleepUnit === 'seconds' ? 'Night Standby (1,800s)' : 'Night Standby (30 นาที)',
                        fill: '#8B5CF6',
                        fontSize: 11,
                        position: 'top',
                      }}
                    />
                  )}

                  {/* CAM-01 Line */}
                  <Line
                    type="monotone"
                    dataKey="plot_cam1"
                    name="CAM-01: หน้าภาค 1 (Log จริง)"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />

                  {/* CAM-02 Line */}
                  <Line
                    type="monotone"
                    dataKey="plot_cam2"
                    name="CAM-02: หน้าภาค 2 (Log จริง)"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />

                  {/* CAM-03 Line */}
                  <Line
                    type="monotone"
                    dataKey="plot_cam3"
                    name="CAM-03: ข้างภาคคอม (Log จริง)"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#F59E0B' }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />

                  {/* AI Policy Baseline */}
                  <Line
                    type="stepAfter"
                    dataKey="plot_rec"
                    name="AI Policy (System Recommendation)"
                    stroke="#64748B"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Deep Sleep Explanation Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-[#F0EEE4]">
              <div className="p-4 rounded-[16px] bg-[#E7F4D8] border border-[#BBF7D0] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#36612D]">
                    <Sun className="w-4 h-4 text-[#36612D]" />
                    <span>กลางวัน: AI Dynamic Sleep (10s–60s)</span>
                  </div>
                  <p className="text-[11px] text-[#36612D] mt-1.5 leading-relaxed m-0">
                    โมเดล AI วิเคราะห์อัตราการเข้า-ออกของรถ (Traffic Flux) + อุณหภูมิชิป + ตารางคาบเรียน เพื่อปรับเวลานอนแบบเรียลไทม์
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#36612D] mt-2 font-medium">
                  Dynamic Range: 10 – 60 วินาที
                </span>
              </div>

              <div className="p-4 rounded-[16px] bg-[#FAF5FF] border border-[#E9D5FF] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B21A8]">
                    <Moon className="w-4 h-4 text-[#6B21A8]" />
                    <span>กลางคืน: Standby Mode (~30 นาที)</span>
                  </div>
                  <p className="text-[11px] text-[#6B21A8] mt-1.5 leading-relaxed m-0">
                    หลัง 18:30 น. เป็นต้นไป ระบบเข้าสู่โหมดประหยัดพลังงานระดับสูงสุด หลับ ~1,780s (~29.6m) ตามที่ตั้งค่าไว้ใน Config
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#6B21A8] mt-2 font-medium">
                  Measured Night: ~1,780s (29.6m)
                </span>
              </div>

              <div className="p-4 rounded-[16px] bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF]">
                    <Zap className="w-4 h-4 text-[#1E40AF]" />
                    <span>ช่วงเร่งด่วน (Peak Rush): 10–25s</span>
                  </div>
                  <p className="text-[11px] text-[#1E40AF] mt-1.5 leading-relaxed m-0">
                    เช้า (07:30–09:30), เที่ยง (11:30–13:00) และเย็น (16:30–19:00) หลับสั้นสุดเพื่ออัปเดตสถานะช่องจอดทันที
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#1E40AF] mt-2 font-medium">
                  Low Latency & High Precision
                </span>
              </div>

              <div className="p-4 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#92400E]">
                    <Gauge className="w-4 h-4 text-[#92400E]" />
                    <span>ป้องกัน Overheat: ปรับขยายเวลา</span>
                  </div>
                  <p className="text-[11px] text-[#92400E] mt-1.5 leading-relaxed m-0">
                    เมื่ออุณหภูมิ ESP32 ขึ้นเกิน 58°C ระบบจะขยายเวลาหลับเพิ่ม 15–30s โดยอัตโนมัติเพื่อระบายความร้อน ปกป้องฮาร์ดแวร์
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#92400E] mt-2 font-medium">
                  Hardware Health Protection
                </span>
              </div>
            </div>

            {/* Embedded 4-Panel Verification Plot Card */}
            <div className="mt-2 p-5 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#30312F]" />
                  <span className="text-xs font-bold text-[#30312F]">
                    รายงานการวัดจริง 4-Panel Hardware Telemetry Verification (Oct 6, 2026)
                  </span>
                </div>
                <a
                  href="/deep_sleep_plot.png"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  <span>เปิดรูปขนาดเต็ม</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div
                onClick={() => setShowPlotModal(true)}
                className="relative rounded-[16px] overflow-hidden border border-[#DEDED2] cursor-pointer group bg-white shadow-xs"
              >
                <img
                  src="/deep_sleep_plot.png"
                  alt="ESP32 Deep Sleep 4-Panel Telemetry Report"
                  className="w-full h-auto object-cover group-hover:opacity-95 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="px-4 py-2 rounded-full bg-white/90 text-xs font-semibold text-[#30312F] shadow-md flex items-center gap-1.5">
                    <Maximize2 className="w-4 h-4" />
                    คลิกเพื่อขยายดูทั้ง 4 Panels
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal for Full-Resolution Deep Sleep Report */}
          {showPlotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
              <div className="relative max-w-6xl w-full bg-[#FFFDF7] rounded-[24px] border border-[#DEDED2] shadow-2xl p-6 flex flex-col gap-4 max-h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#F0EEE4] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#30312F] m-0">
                      ESP32-CAM Deep Sleep Schedule & Telemetry Verification Report
                    </h3>
                    <p className="text-xs text-[#85847E] m-0 mt-0.5">
                      Panel 1: 24h Timeline | Panel 2: 18:30 Shift Zoom | Panel 3: Target vs Measured Interval | Panel 4: Awake Uptime & Efficiency
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPlotModal(false)}
                    className="p-2 rounded-full hover:bg-[#F0EEE4] text-[#686962] hover:text-[#30312F] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-full rounded-[16px] overflow-hidden border border-[#DEDED2] bg-white">
                  <img
                    src="/deep_sleep_plot.png"
                    alt="Full Deep Sleep Verification Plot"
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F0EEE4]">
                  <a
                    href="/deep_sleep_plot.png"
                    download="deep_sleep_plot.png"
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#30312F] text-white hover:bg-black transition-colors"
                  >
                    ดาวน์โหลดรูปภาพ (Download High-Res PNG)
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowPlotModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#FAF8EF] text-[#30312F] border border-[#DEDED2] hover:bg-[#F0EEE4]"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SECTION C: 4-MODEL EVALUATION & FEATURE IMPORTANCE                    */}
          {/* --------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: 4-Model Evaluation Cards */}
            <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                      ผลการทดสอบโมเดล Time-Series ทั้ง 4 ตัว
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F4D8] text-[#36612D] border border-[#BBF7D0]">
                    N = 27,945 ROWS
                  </span>
                </div>
                <p className="text-xs text-[#85847E] mb-4">
                  ทดสอบกับข้อมูลจริงของกล้อง ESP32 แบ่ง Train 80% (22,356 แถว) และ Test 20% (5,589 แถว)
                </p>

                <div className="space-y-3">
                  {/* Model 2: Adaptive Sleep Policy */}
                  <div className="p-3.5 rounded-[16px] bg-[#E7F4D8] border border-[#BBF7D0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#36612D]">
                        Model 2: Adaptive Deep-Sleep Policy (RandomForest)
                      </div>
                      <div className="text-[11px] text-[#686962] mt-0.5">
                        คำนวณระยะเวลา Deep-Sleep ที่เหมาะสมที่สุด (10s – 60s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#36612D]">MAE: 0.18 sec</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">R² = 0.9947</div>
                    </div>
                  </div>

                  {/* Model 4: 30-min Occupancy */}
                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#30312F]">
                        Model 4: 30-Min Future Occupancy Forecaster
                      </div>
                      <div className="text-[11px] text-[#85847E] mt-0.5">
                        ทำนายจำนวนรถล่วงหน้า 30 นาที
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#30312F]">MAE: 2.01 คัน</div>
                      <div className="text-[10px] text-blue-600 font-semibold">R² = 0.7453</div>
                    </div>
                  </div>

                  {/* Model 3: 15-min Occupancy */}
                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#30312F]">
                        Model 3: 15-Min Future Occupancy Forecaster
                      </div>
                      <div className="text-[11px] text-[#85847E] mt-0.5">
                        ทำนายจำนวนรถล่วงหน้า 15 นาที
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#30312F]">MAE: 2.87 คัน</div>
                      <div className="text-[10px] text-[#85847E] font-semibold">R² = 0.4999</div>
                    </div>
                  </div>

                  {/* Model 1: Thermal Forecaster */}
                  <div className="p-3.5 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#92400E]">
                        Model 1: Thermal Dynamics Forecaster (GradientBoosting)
                      </div>
                      <div className="text-[11px] text-[#85847E] mt-0.5">
                        ทำนายแนวโน้มอุณหภูมิชิปรอบถัดไป (ΔT)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#92400E]">MAE: 5.42 °C</div>
                      <div className="text-[10px] text-amber-700 font-semibold">RMSE: 7.23 °C</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Feature Importances BarChart */}
            <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#30312F]" />
                    <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                      Feature Importance: ปัจจัยที่มีผลต่อการตัดสินใจ
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8EF] text-[#686962] border border-[#DEDED2]">
                    RANDOM FOREST
                  </span>
                </div>
                <p className="text-xs text-[#85847E] mb-3">
                  น้ำหนักความสำคัญของแต่ละตัวแปรในการตัดสินใจเลือกระยะเวลา Deep-Sleep
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={featureImportances}
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" horizontal={false} />
                      <XAxis type="number" domain={[0, 0.6]} stroke="#85847E" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        stroke="#85847E"
                        tick={{ fontSize: 10, fill: '#686962', fontWeight: 500 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="importance" name="Importance" radius={[0, 6, 6, 0]}>
                        {featureImportances.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              index === 0
                                ? '#2563EB'
                                : index === 1
                                ? '#EF4444'
                                : index < 6
                                ? '#10B981'
                                : '#F59E0B'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
                <span className="font-semibold text-[#30312F]">สรุปน้ำหนักปัจจัย: </span>
                กลุ่มตัวแปรตารางเรียนและวันหยุด (day_of_week, campus_phase, day_type, class_transition) มีน้ำหนักรวมกันถึง <strong>38.4%</strong> และอัตราการเคลื่อนตัวของรถอยู่ที่ <strong>48.1%</strong>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION D: LIVE HARDWARE INGESTION & EDGE HEALTH MONITOR              */}
          {/* --------------------------------------------------------------------- */}
          <div className="box-border flex flex-col p-6 lg:p-8 gap-5 w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0EEE4]">
              <Camera className="w-4 h-4 text-emerald-600" />
              <h3 className="font-sans font-semibold text-[18px] text-[#30312F] m-0">
                สถานะการทำงานฮาร์ดแวร์สด (Live Edge Camera Telemetry & Closed-Loop Deep-Sleep)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {['cam1', 'cam2', 'cam3'].map((camId) => {
                const live = liveCameras ? liveCameras[camId] : null
                const name =
                  camId === 'cam1'
                    ? 'CAM-01 (หน้าภาค 1 - รถยนต์)'
                    : camId === 'cam2'
                    ? 'CAM-02 (หน้าภาค 2 - รถยนต์)'
                    : 'CAM-03 (ข้างภาคคอม - มอเตอร์ไซค์)'
                const temp = live?.current_temp_c || 52.0
                const sleep = live?.recommended_sleep_sec || 30
                const status = live?.thermal_status || 'NORMAL'

                return (
                  <div
                    key={camId}
                    className="p-5 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#DEDED2]">
                        <span className="font-semibold text-xs text-[#30312F]">{name}</span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#36612D] bg-[#E7F4D8] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                          ONLINE
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="p-3 rounded-[14px] bg-[#FFFDF7] border border-[#DEDED2] text-center">
                          <span className="text-[10px] text-[#85847E] block mb-0.5">อุณหภูมิชิป</span>
                          <span
                            className={`text-xl font-mono font-bold ${
                              temp >= 68 ? 'text-rose-600' : temp >= 62 ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {temp}°C
                          </span>
                        </div>
                        <div className="p-3 rounded-[14px] bg-[#FFFDF7] border border-[#DEDED2] text-center">
                          <span className="text-[10px] text-[#85847E] block mb-0.5">คำสั่ง Deep-Sleep</span>
                          <span className="text-xl font-mono font-bold text-[#36612D]">{sleep}s</span>
                        </div>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-[#686962]">
                        <div>
                          สถานะความร้อน: <strong className="text-[#30312F]">{status}</strong>
                        </div>
                        <div>
                          ทำนายรอบถัดไป: <strong className="text-[#30312F]">{live?.predicted_next_temp_c || temp}°C</strong>
                        </div>
                        <div>
                          ดาต้าเลก: <span className="text-[#36612D] font-medium">MinIO + Postgres Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#DEDED2] text-[11px] text-[#85847E] truncate">
                      {live?.reason || 'ระบบทำงานปกติ'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPUTER VISION & YOLO BENCHMARKS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'yolo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Card 1A: Architecture Accuracy Comparison */}
          <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#30312F]" />
                  <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                    1A. Architecture Accuracy Comparison (mAP50, Precision, Recall)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8EF] text-[#686962] border border-[#DEDED2]">
                  N = 1,420 FRAMES
                </span>
              </div>
              <p className="text-xs text-[#85847E] mb-3">
                เปรียบเทียบ mAP@0.50, Precision และ Recall ระหว่างโมเดลหลักในระบบกับสถาปัตยกรรมอื่น
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelComparison} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                    <XAxis dataKey="model" stroke="#85847E" tick={{ fontSize: 10 }} angle={-10} textAnchor="end" />
                    <YAxis domain={[70, 100]} stroke="#85847E" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Bar dataKey="map50" name="mAP@50 (%)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="precision" name="Precision (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recall" name="Recall (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
              <span className="font-semibold text-[#30312F]">ข้อสรุป: </span>
              YOLO26m ให้ความแม่นยำสูงสุด (mAP50 98.5%) และ YOLO26n ให้ผลลัพธ์ใกล้เคียง (98.0%)
            </div>
          </div>

          {/* Card 1B: Inference Latency & Memory */}
          <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                    1B. Inference Latency (ms) & Memory Usage (MB)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  INTEL N100 CPU
                </span>
              </div>
              <p className="text-xs text-[#85847E] mb-3">
                เวลาประมวลผลเฉลี่ยต่อเฟรม (ms) และหน่วยความจำ RAM ที่ใช้ระหว่าง Inference
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelComparison} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                    <XAxis dataKey="model" stroke="#85847E" tick={{ fontSize: 10 }} angle={-10} textAnchor="end" />
                    <YAxis stroke="#85847E" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Bar dataKey="latency_ms" name="Latency (ms)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="memory_mb" name="RAM (MB)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
              <span className="font-semibold text-[#30312F]">ข้อสรุป: </span>
              YOLO26n ประมวลผลได้เร็วกว่า 3.47 เท่า (327.8ms) เหมาะสำหรับการรันบน Edge Device
            </div>
          </div>

          {/* Card 1C: Resolution Benchmark */}
          <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                    1C. Resolution Trade-off (640 vs 960 vs 1280)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8EF] text-[#686962] border border-[#DEDED2]">
                  EXPERIMENT
                </span>
              </div>
              <p className="text-xs text-[#85847E] mb-3">
                ความสัมพันธ์ระหว่างขนาดภาพ ความแม่นยำ (mAP50) และ Throughput (FPS)
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolutionBenchmark} margin={{ top: 10, right: 25, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                    <XAxis dataKey="resolution" stroke="#85847E" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" domain={[90, 100]} stroke="#2563EB" tick={{ fontSize: 10, fill: '#2563EB' }} unit="%" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 4]} stroke="#10B981" tick={{ fontSize: 10, fill: '#10B981' }} unit=" fps" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="map50" name="mAP@50 (%)" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="fps" name="Throughput (FPS)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
              <span className="font-semibold text-[#30312F]">ข้อสรุป: </span>
              Resolution 640x640 ให้ความสมดุลสูงสุด (FPS 3.13, Latency 319.6ms, mAP50 98.5%)
            </div>
          </div>

          {/* Card 1D: Quantization Benchmark */}
          <div className="box-border flex flex-col justify-between p-6 gap-4 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE4] mb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-500" />
                  <h3 className="font-sans font-semibold text-[17px] text-[#30312F] m-0">
                    1D. Quantization Benchmark (FP32 vs INT8)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  OPENVINO
                </span>
              </div>
              <p className="text-xs text-[#85847E] mb-3">
                ผลการแปลงโมเดลด้วย OpenVINO INT8 ช่วยลดขนาดไฟล์และเพิ่มความเร็วในการรัน
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quantizationBenchmark} margin={{ top: 10, right: 25, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE4" vertical={false} />
                    <XAxis dataKey="runtime" stroke="#85847E" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#EF4444" tick={{ fontSize: 10, fill: '#EF4444' }} unit="ms" domain={[0, 800]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 10, fill: '#10B981' }} unit="MB" domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Bar yAxisId="left" dataKey="latency_ms" name="Latency (ms)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="size_mb" name="Model Size (MB)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
              <span className="font-semibold text-[#30312F]">ข้อสรุป: </span>
              OpenVINO INT8 ลดขนาดโมเดลลงเหลือ 22.4 MB และประมวลผลเร็วขึ้นเป็น 320.5ms (3.12 FPS)
            </div>
          </div>

          {/* Card 1E: Interactive Model Evaluation Artifacts & Plots */}
          {(() => {
            const currentModel = evalModelsData[selectedEvalModel] || evalModelsData.yolo26m
            return (
              <div className="col-span-1 lg:col-span-2 box-border flex flex-col p-6 lg:p-8 gap-5 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#F0EEE4] gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-sans font-semibold text-[18px] text-[#30312F] m-0">
                        1E. Model Evaluation ({currentModel.name})
                      </h3>
                    </div>
                    <p className="text-xs text-[#85847E] mt-1 m-0">
                      {currentModel.desc}
                    </p>
                  </div>

                  {/* Model Selector Bar & Compare Action */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsCompareModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#284E1A] text-white hover:bg-[#36612D] shadow-xs transition-all cursor-pointer mr-1"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>เปรียบเทียบ 2 โมเดล (Compare Models)</span>
                    </button>

                    <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full">
                      {Object.values(evalModelsData).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedEvalModel(m.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            selectedEvalModel === m.id
                              ? 'bg-[#30312F] text-white shadow-xs font-semibold'
                              : 'text-[#686962] hover:text-[#30312F]'
                          }`}
                        >
                          {m.shortName || m.name}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#E7F4D8] text-[#36612D] border border-[#BBF7D0]">
                      mAP@50: {currentModel.map50}
                    </span>
                    <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border ${currentModel.tagColor}`}>
                      {currentModel.tag}
                    </span>
                  </div>
                </div>

                {/* Specs Info Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 p-3 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs">
                  <div>
                    <span className="text-[10px] text-[#85847E] block">สถาปัตยกรรม</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#85847E] block">พารามิเตอร์</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.params}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#85847E] block">Compute (FLOPs)</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.gflops} GFLOPs</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#85847E] block">CPU Latency</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.latency}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#85847E] block">Precision / Recall</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.precision} / {currentModel.recall}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#85847E] block">mAP@50-95</span>
                    <strong className="text-[#30312F] font-mono">{currentModel.map50_95}</strong>
                  </div>
                </div>

                {/* Metric Summaries */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-[16px] bg-[#E7F4D8] border border-[#BBF7D0] flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-[#36612D] uppercase tracking-wider">
                      Overall Accuracy (All Classes)
                    </span>
                    <div className="mt-2">
                      <div className="text-2xl font-mono font-bold text-[#36612D]">{currentModel.map50}</div>
                      <div className="text-xs text-[#36612D] mt-0.5">mAP@50 (Precision: {currentModel.precision}, Recall: {currentModel.recall})</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-[16px] bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider">
                      Car Detection (รถยนต์)
                    </span>
                    <div className="mt-2">
                      <div className="text-2xl font-mono font-bold text-[#1E40AF]">{currentModel.carMap50}</div>
                      <div className="text-xs text-[#1E40AF] mt-0.5">{currentModel.carDetail}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wider">
                      Motorcycle Detection (มอเตอร์ไซค์)
                    </span>
                    <div className="mt-2">
                      <div className="text-2xl font-mono font-bold text-[#92400E]">{currentModel.motoMap50}</div>
                      <div className="text-xs text-[#92400E] mt-0.5">{currentModel.motoDetail}</div>
                    </div>
                  </div>
                </div>

                {/* Evaluation Plots Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#30312F]">1. Confusion Matrix</span>
                      <span className="text-[10px] font-mono text-[#85847E]">Normalized</span>
                    </div>
                    <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[12px] p-2 overflow-hidden flex items-center justify-center">
                      <img
                        key={`${currentModel.id}-cm`}
                        src={currentModel.plots.confusionMatrix}
                        alt={`Confusion Matrix - ${currentModel.name}`}
                        className="w-full h-auto max-h-[320px] object-contain rounded-[8px] hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[11px] text-[#686962]">
                      {currentModel.plots.cmDesc}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#30312F]">2. Precision-Recall Curve</span>
                      <span className="text-[10px] font-mono text-[#85847E]">BoxPR_curve.png</span>
                    </div>
                    <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[12px] p-2 overflow-hidden flex items-center justify-center">
                      <img
                        key={`${currentModel.id}-pr`}
                        src={currentModel.plots.prCurve}
                        alt={`Precision-Recall Curve - ${currentModel.name}`}
                        className="w-full h-auto max-h-[320px] object-contain rounded-[8px] hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[11px] text-[#686962]">
                      {currentModel.plots.prDesc}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#30312F]">3. F1-Confidence Curve</span>
                      <span className="text-[10px] font-mono text-[#85847E]">BoxF1_curve.png</span>
                    </div>
                    <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[12px] p-2 overflow-hidden flex items-center justify-center">
                      <img
                        key={`${currentModel.id}-f1`}
                        src={currentModel.plots.f1Curve}
                        alt={`F1-Confidence Curve - ${currentModel.name}`}
                        className="w-full h-auto max-h-[320px] object-contain rounded-[8px] hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[11px] text-[#686962]">
                      {currentModel.plots.f1Desc}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#30312F]">4. Validation Batch Predictions</span>
                      <span className="text-[10px] font-mono text-[#85847E]">val_batch0_pred.jpg</span>
                    </div>
                    <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[12px] p-2 overflow-hidden flex items-center justify-center">
                      <img
                        key={`${currentModel.id}-val`}
                        src={currentModel.plots.valPred}
                        alt={`Validation Batch Predictions - ${currentModel.name}`}
                        className="w-full h-auto max-h-[320px] object-contain rounded-[8px] hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[11px] text-[#686962]">
                      {currentModel.plots.valDesc}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
                  <span className="font-semibold text-[#30312F]">ผลสรุปการประเมิน ({currentModel.name}): </span>
                  {currentModel.conclusion}
                </div>
              </div>
            )
          })()}

          {/* Section 1F: Active Learning & Dataset Curation Strategy */}
          <div className="col-span-1 lg:col-span-2 box-border flex flex-col p-6 lg:p-8 gap-5 bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#F0EEE4] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#284E1A]" />
                  <h3 className="font-sans font-semibold text-[18px] text-[#30312F] m-0">
                    Active Learning & Dataset Curation Strategy
                  </h3>
                </div>
                <p className="text-xs text-[#85847E] mt-1 m-0">
                  แนวทางการคัดเลือกภาพเพื่อนำมารีเทรน (Data-driven Active Learning) อ้างอิงจากสถิติจริงของระบบ แทนการคาดเดาตัวเลข
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#E7F4D8] text-[#36612D] border border-[#BBF7D0]">
                  1,590 Images Analyzed
                </span>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                  6,499 Bounding Boxes
                </span>
              </div>
            </div>

            {/* Plot Image Container */}
            <div className="p-4 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#30312F]">
                  Real-world Confidence Distribution (1,590 images analyzed)
                </span>
                <span className="text-[10px] font-mono text-[#85847E]">
                  conf_histogram.png
                </span>
              </div>
              <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[14px] p-3 flex items-center justify-center overflow-hidden">
                <img
                  src="/eval_plots/conf_histogram.png"
                  alt="Real-world Confidence Distribution"
                  className="w-full max-w-3xl h-auto max-h-[380px] object-contain rounded-[8px]"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] text-[#686962] m-0">
                การกระจายตัวของค่า Confidence Score จากผลการทำนายจริงในฐานข้อมูล พร้อมขอบเขต Low Confidence Band (5th - 25th Percentile)
              </p>
            </div>

            {/* 4 Rationale Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[16px] bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                    1. Low Confidence Band (0.28 - 0.42)
                  </span>
                </div>
                <p className="text-xs text-[#1E3A8A] m-0 leading-relaxed">
                  คัดเฉพาะภาพที่โมเดลมีความลังเลสูง (อ้างอิงจากเปอร์เซ็นไทล์ของ Histogram จริง) เพื่อสอนจุดที่โมเดลยังไม่แม่นยำ โดยตัดภาพขยะที่ต่ำกว่า 0.28 ออกเพื่อป้องกัน Label Noise
                </p>
              </div>

              <div className="p-4 rounded-[16px] bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <span className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                    2. Class Confusion Detection
                  </span>
                </div>
                <p className="text-xs text-[#78350F] m-0 leading-relaxed">
                  ดึงเคสที่โมเดลสับสนระหว่างคลาสรถยนต์ (Car) และมอเตอร์ไซค์ (Motorcycle) ที่จอดเบียดกัน เพื่อให้โมเดลเรียนรู้เส้นแบ่งขอบเขตคลาสชัดเจนขึ้น
                </p>
              </div>

              <div className="p-4 rounded-[16px] bg-[#E7F4D8] border border-[#BBF7D0] flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#36612D] uppercase tracking-wider">
                    3. Temporal Inconsistency (Flickering via IoU)
                  </span>
                </div>
                <p className="text-xs text-[#166534] m-0 leading-relaxed">
                  ตรวจสอบสถานะความเปลี่ยนแปลงข้ามเฟรมของกล้อง Snapshot (ทุก 5-20 วินาที) หากตรวจพบว่ารถจอดนิ่งแต่สถานะใน ROI กระโดดสลับไปมา จะถูกบันทึกเพื่อตรวจสอบความถูกต้องทันที
                </p>
              </div>

              <div className="p-4 rounded-[16px] bg-[#FDF2F8] border border-[#F472B6] flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#DB2777]" />
                  <span className="text-xs font-bold text-[#9D174D] uppercase tracking-wider">
                    4. Hard Negative Filtering
                  </span>
                </div>
                <p className="text-xs text-[#831843] m-0 leading-relaxed">
                  กวาดหาเคสที่โมเดลมั่นใจสูงแต่นอกเขต ROI (เช่น เงาไม้หรือแสงสะท้อน) เพื่อลดอัตราการเกิด False Positives
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] text-xs text-[#686962]">
              <span className="font-semibold text-[#30312F]">ข้อสรุปยุทธศาสตร์ Active Learning: </span>
              การนำเกณฑ์ Data-driven Confidence Band (0.28 - 0.42) ร่วมกับ Temporal IoU Tracking ช่วยลดภาระการ Label ซ้ำซ้อนได้กว่า 70% โดยคัดเฉพาะตัวอย่างที่มี Information Gain สูงสุดส่งเข้ากระบวนการ Human-in-the-loop เพื่อ Retrain โมเดลรอบถัดไป
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Model Comparison Modal */}
      {isCompareModalOpen && (() => {
        const modelA = evalModelsData[compareModelA] || evalModelsData.yolo26m
        const modelB = evalModelsData[compareModelB] || evalModelsData.yolo26n

        const plotTabs = [
          { id: 'confusionMatrix', label: '1. Confusion Matrix', key: 'confusionMatrix', descKey: 'cmDesc' },
          { id: 'prCurve', label: '2. PR Curve', key: 'prCurve', descKey: 'prDesc' },
          { id: 'f1Curve', label: '3. F1 Curve', key: 'f1Curve', descKey: 'f1Desc' },
          { id: 'valPred', label: '4. Val Predictions', key: 'valPred', descKey: 'valDesc' },
          { id: 'layerProfiling', label: '5. Memory Profiling', key: 'layerProfiling', descKey: 'layerDesc' },
        ]

        const currentTab = plotTabs.find((t) => t.id === comparePlotTab) || plotTabs[0]
        const mapDiff = (modelA.map50Num - modelB.map50Num).toFixed(1)
        const speedDiff = (modelA.latencyNum / modelB.latencyNum).toFixed(1)
        const paramRatio = (modelA.paramsNum / modelB.paramsNum).toFixed(1)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] shadow-2xl w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-[#E5E3D8] bg-[#FAF8EF] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E7F4D8] border border-[#BBF7D0] flex items-center justify-center text-[#284E1A]">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-[#30312F] m-0 flex items-center gap-2">
                      เปรียบเทียบโมเดลคู่ขนาน (Side-by-Side Model Comparison)
                    </h2>
                    <p className="text-xs text-[#85847E] mt-0.5 m-0">
                      เปรียบเทียบประสิทธิภาพ ความแม่นยำ และภาระทรัพยากรระหว่าง 2 สถาปัตยกรรม
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[#E5E3D8] text-[#686962] hover:text-[#30312F] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-6">
                {/* Selectors Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#FAF8EF] p-4 rounded-[20px] border border-[#DEDED2]">
                  {/* Model A Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                        โมเดลหลัก (Model A)
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${modelA.tagColor}`}>
                        {modelA.tag}
                      </span>
                    </div>
                    <select
                      value={compareModelA}
                      onChange={(e) => setCompareModelA(e.target.value)}
                      className="w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[12px] px-3.5 py-2 text-sm font-semibold text-[#30312F] focus:outline-none focus:border-[#284E1A] cursor-pointer"
                    >
                      {Object.values(evalModelsData).map((m) => (
                        <option key={`a-${m.id}`} value={m.id}>
                          {m.name} ({m.map50})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model B Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                        โมเดลเปรียบเทียบ (Model B)
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${modelB.tagColor}`}>
                        {modelB.tag}
                      </span>
                    </div>
                    <select
                      value={compareModelB}
                      onChange={(e) => setCompareModelB(e.target.value)}
                      className="w-full bg-[#FFFDF7] border border-[#DEDED2] rounded-[12px] px-3.5 py-2 text-sm font-semibold text-[#30312F] focus:outline-none focus:border-[#284E1A] cursor-pointer"
                    >
                      {Object.values(evalModelsData).map((m) => (
                        <option key={`b-${m.id}`} value={m.id}>
                          {m.name} ({m.map50})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Key Metrics Comparison Table / Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between">
                    <span className="text-[11px] text-[#85847E]">Overall mAP@50</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono font-bold text-base text-[#1E40AF]">{modelA.map50}</span>
                      <span className="text-xs text-[#85847E]">vs</span>
                      <span className="font-mono font-bold text-base text-[#92400E]">{modelB.map50}</span>
                    </div>
                    <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded text-center ${
                      Number(mapDiff) >= 0 ? 'bg-[#E7F4D8] text-[#36612D]' : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {Number(mapDiff) >= 0 ? `+${mapDiff}% A เหนือกว่า` : `${mapDiff}% B เหนือกว่า`}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between">
                    <span className="text-[11px] text-[#85847E]">Motorcycle mAP@50</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono font-bold text-base text-[#1E40AF]">{modelA.motoMap50}</span>
                      <span className="text-xs text-[#85847E]">vs</span>
                      <span className="font-mono font-bold text-base text-[#92400E]">{modelB.motoMap50}</span>
                    </div>
                    <span className="text-[10px] text-[#686962] text-center mt-1">
                      แยกแยะรถซ้อนคัน / ระยะไกล
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between">
                    <span className="text-[11px] text-[#85847E]">Params / Compute</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono font-bold text-sm text-[#1E40AF]">{modelA.params}</span>
                      <span className="text-xs text-[#85847E]">vs</span>
                      <span className="font-mono font-bold text-sm text-[#92400E]">{modelB.params}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#686962] text-center mt-1">
                      {modelA.gflops}G vs {modelB.gflops}G FLOPs
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#FFFDF7] border border-[#DEDED2] flex flex-col justify-between">
                    <span className="text-[11px] text-[#85847E]">CPU Latency</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono font-bold text-sm text-[#1E40AF]">{modelA.latency.split(' ')[0]}</span>
                      <span className="text-xs text-[#85847E]">vs</span>
                      <span className="font-mono font-bold text-sm text-[#92400E]">{modelB.latency.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] text-[#2563EB] font-semibold text-center mt-1">
                      {Number(speedDiff) > 1 ? `B เร็วกว่า ~${speedDiff}x เท่า` : 'ความเร็วใกล้เคียงกัน'}
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Artifacts Viewer */}
                <div className="space-y-3">
                  {/* Artifact Tab Navigation */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E5E3D8]">
                    <span className="text-xs font-bold text-[#30312F]">
                      เลือกผลการประเมินที่ต้องการเทียบ:
                    </span>
                    <div className="inline-flex p-1 bg-[#FAF8EF] border border-[#DEDED2] rounded-full overflow-x-auto">
                      {plotTabs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setComparePlotTab(t.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                            comparePlotTab === t.id
                              ? 'bg-[#30312F] text-white font-semibold shadow-xs'
                              : 'text-[#686962] hover:text-[#30312F]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Image Containers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Model A Plot */}
                    <div className="p-4 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1E40AF]">
                          [Model A] {modelA.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#85847E]">
                          {modelA.map50} mAP
                        </span>
                      </div>
                      <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[14px] p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
                        <img
                          key={`cmp-a-${modelA.id}-${currentTab.key}`}
                          src={modelA.plots[currentTab.key]}
                          alt={`${modelA.name} - ${currentTab.label}`}
                          className="w-full h-auto max-h-[340px] object-contain rounded-[8px]"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[11px] text-[#686962] m-0 leading-relaxed">
                        {modelA.plots[currentTab.descKey]}
                      </p>
                    </div>

                    {/* Model B Plot */}
                    <div className="p-4 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#92400E]">
                          [Model B] {modelB.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#85847E]">
                          {modelB.map50} mAP
                        </span>
                      </div>
                      <div className="bg-[#FFFDF7] border border-[#E5E3D8] rounded-[14px] p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
                        <img
                          key={`cmp-b-${modelB.id}-${currentTab.key}`}
                          src={modelB.plots[currentTab.key]}
                          alt={`${modelB.name} - ${currentTab.label}`}
                          className="w-full h-auto max-h-[340px] object-contain rounded-[8px]"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[11px] text-[#686962] m-0 leading-relaxed">
                        {modelB.plots[currentTab.descKey]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tradeoff Conclusion Box */}
                <div className="p-4 rounded-[18px] bg-[#FAF8EF] border border-[#DEDED2] text-xs space-y-1.5">
                  <div className="font-bold text-[#30312F] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#284E1A]" />
                    <span>บทสรุปการเปรียบเทียบเชิงวิศวกรรม (Engineering Trade-off):</span>
                  </div>
                  <p className="text-[#686962] leading-relaxed m-0">
                    • <strong>{modelA.name}:</strong> เหมาะสำหรับระบบ Server-side ที่ต้องการความแม่นยำสูงสุด (93.0% mAP@50) โดยเฉพาะการจำแนกรถจักรยานยนต์ที่จอดซ้อนคันในมุมกล้องกว้าง
                    <br />
                    • <strong>{modelB.name}:</strong> เหมาะสำหรับกรณีขยายระบบไปรันบน Edge Device ขนาดเล็ก หรือเมื่อต้องการประหยัด CPU Core สำหรับงาน Stream หลายกล้องพร้อมกัน
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#E5E3D8] bg-[#FAF8EF] flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#30312F] text-white hover:bg-[#1E1F1E] transition-colors cursor-pointer"
                >
                  ปิดหน้าต่างเปรียบเทียบ (Close)
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
