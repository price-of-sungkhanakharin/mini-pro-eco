import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Bot,
  ShieldCheck,
  Globe,
  Radio,
  CheckCircle2
} from 'lucide-react'

export default function LineChatbotSetup({ apiBase = '' }) {
  const [config, setConfig] = useState({
    bot_name: 'น้องจ๊อด หาที่จอดรถ',
    bot_id: '@422ubvyc',
    channel_id: '2011743452',
    channel_secret: 'bdcce14374f16fb022e82d702fc7c4f7',
    channel_access_token: 'J1r95NYuLNBu1Nts36NE8Sozb/EK3OfyTvBwHgJ01U8dSn/Mq5K/FBSyvYkOLtcQVfJsYNAVXixWJO8Y3hkXo0yvY55Bu3xr/hV8y/2C2UAX7t/yNU8yGYZzjtn/bb27eVUfQraqoMxkK7nduiF+iAdB04t89/1O/w1cDnyilFU=',
    public_base_url: 'https://rep-dangerous-tips-automation.trycloudflare.com',
    webhook_url: 'https://rep-dangerous-tips-automation.trycloudflare.com/api/v1/line/webhook',
    local_webhook_url: 'http://172.30.228.51:8000/api/v1/line/webhook',
    is_connected: true,
    mode: 'rule_based_quick_reply',
    rich_menu_active: true
  })

  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [showSecret, setShowSecret] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Simulation state
  const [simQuery, setSimQuery] = useState('หาที่จอดรถยนต์')
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [botStatus, setBotStatus] = useState(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/line/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
      const stRes = await fetch('/api/v1/line/status')
      if (stRes.ok) {
        const stData = await stRes.json()
        setBotStatus(stData)
      }
    } catch (err) {
      console.warn('Failed to load LINE config:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleTestQuery = async (customQuery = null) => {
    const q = customQuery || simQuery
    if (!q) return
    try {
      setSimLoading(true)
      const res = await fetch('/api/v1/line/test-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      })
      if (res.ok) {
        const data = await res.json()
        setSimResult(data)
      }
    } catch (err) {
      console.error('Test query failed:', err)
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header & Status Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[14px] bg-[#06C755]/15 border border-[#06C755]/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 text-[#06C755]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-base text-[#30312F] m-0">
                LINE Chatbot & Messaging API
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F4D8] text-[#284E1A] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                ONLINE (CONNECTED)
              </span>
            </div>
            <p className="font-sans text-xs text-[#85847E] mt-0.5 m-0">
              บอทตอบคำถามผู้ใช้งานอัจฉริยะ (Persona: น้องจ๊อด) พร้อม Quick Reply และภาพ Snapshot สด
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-xs font-semibold text-[#30312F] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="รีเฟรชข้อมูลสถานะ"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#686962] ${loading ? 'animate-spin' : ''}`} />
            <span>ตรวจสอบสถานะ</span>
          </button>
          <a
            href={config.add_friend_url || 'https://line.me/R/ti/p/@422ubvyc'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-[#06C755] hover:bg-[#05B34C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>เปิด LINE (@422ubvyc)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 4 Summary Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-[#30312F]" />
            Bot Identity
          </span>
          <span className="font-sans font-bold text-sm text-[#30312F]">
            {config.bot_name} ({config.bot_id})
          </span>
          <span className="text-[11px] text-[#686962]">LINE Official Account Verified</span>
        </div>

        <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#30312F]" />
            Response Mode
          </span>
          <span className="font-sans font-bold text-sm text-[#30312F]">
            Rule-Based + Overlays
          </span>
          <span className="text-[11px] text-[#686962]">5-Message Rich Payload with Images</span>
        </div>

        <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#30312F]" />
            Cloudflare Tunnel
          </span>
          <span className="font-mono font-bold text-xs text-[#284E1A] truncate" title={config.public_base_url}>
            Active HTTPS Tunnel
          </span>
          <span className="text-[11px] text-[#686962]">Public Gateway for Webhook & Images</span>
        </div>

        <div className="p-4 rounded-[16px] bg-[#FAF8EF] border border-[#DEDED2] flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#85847E] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#30312F]" />
            Rich Menu 5-Button
          </span>
          <span className="font-sans font-bold text-sm text-[#284E1A] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            Active on OA
          </span>
          <span className="text-[11px] text-[#686962]">ชัดเจนในเลนเรา with น้องจ๊อด</span>
        </div>
      </div>

      {/* Two-Column Section: Webhook & Secrets on Left, Interactive Test on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Webhook & API Key Settings */}
        <div className="flex flex-col gap-4 p-6 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2]">
          <div className="flex items-center gap-2 border-b border-[#DEDED2] pb-3">
            <ShieldCheck className="w-4 h-4 text-[#30312F]" />
            <h4 className="font-sans font-bold text-sm text-[#30312F] m-0">
              LINE Developers Console Settings
            </h4>
          </div>

          {/* Webhook URL Input with Copy Button */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#30312F]">
                FastAPI Webhook URL (Public HTTPS):
              </label>
              <span className="text-[11px] text-[#16A34A] font-medium">นำไปใส่ใน LINE Console</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={config.webhook_url}
                className="w-full font-mono text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2.5 text-[#30312F] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.webhook_url, 'webhook')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-xs font-semibold text-[#30312F] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                title="คัดลอก Webhook URL"
              >
                {copiedField === 'webhook' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#16A34A]">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#686962]" />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#85847E] m-0">
              * ต้องเปิดใช้งาน toggle <strong className="text-[#30312F]">"Use Webhook"</strong> ใน LINE Developers Console เพื่อให้บอทรับข้อความได้
            </p>
          </div>

          {/* Local Webhook URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#30312F]">
              Local Webhook URL (Internal Network):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={config.local_webhook_url}
                className="w-full font-mono text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2 text-[#85847E] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.local_webhook_url, 'local_webhook')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-xs font-semibold text-[#30312F] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedField === 'local_webhook' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#686962]" />}
              </button>
            </div>
          </div>

          {/* Channel ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#30312F]">
              Channel ID:
            </label>
            <input
              type="text"
              readOnly
              value={config.channel_id}
              className="w-full font-mono text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2 text-[#30312F] focus:outline-none"
            />
          </div>

          {/* Channel Secret */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#30312F]">
                Channel Secret:
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] text-[#36612D] font-medium flex items-center gap-1 cursor-pointer"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showSecret ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={config.channel_secret}
                className="w-full font-mono text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2.5 text-[#30312F] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.channel_secret, 'secret')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-xs font-semibold text-[#30312F] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedField === 'secret' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#686962]" />}
              </button>
            </div>
          </div>

          {/* Channel Access Token */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#30312F]">
                Channel Access Token (Long-Lived):
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-[#36612D] font-medium flex items-center gap-1 cursor-pointer"
              >
                {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showToken ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                readOnly
                value={config.channel_access_token}
                className="w-full font-mono text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2.5 text-[#30312F] focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.channel_access_token, 'token')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-xs font-semibold text-[#30312F] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#686962]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Bot Simulator */}
        <div className="flex flex-col gap-4 p-6 rounded-[20px] bg-[#FAF8EF] border border-[#DEDED2]">
          <div className="flex items-center justify-between border-b border-[#DEDED2] pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#30312F]" />
              <h4 className="font-sans font-bold text-sm text-[#30312F] m-0">
                จำลองการทดสอบแชทบอท (Live Test Simulator)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[#16A34A] bg-[#E7F4D8] px-2 py-0.5 rounded-md">
              REST API Ready
            </span>
          </div>

          <p className="text-xs text-[#85847E] m-0">
            คลิกปุ่ม Quick Reply หรือพิมพ์คำถามเพื่อทดสอบการตอบกลับและดูรูปภาพ Live Overlay ที่บอทจะส่งให้ผู้ใช้งานใน LINE ทันที
          </p>

          {/* Quick Click Question Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              'สรุปภาพรวม',
              'หาที่จอดรถยนต์',
              'หาที่จอดมอไซค์',
              'ลานหน้าภาค',
              'ลานข้างภาคคอม'
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setSimQuery(q)
                  handleTestQuery(q)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  simQuery === q
                    ? 'bg-[#30312F] text-white'
                    : 'bg-white hover:bg-[#F5F3E8] border border-[#DEDED2] text-[#30312F]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simQuery}
              onChange={(e) => setSimQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
              placeholder="พิมพ์คำถามทดสอบ เช่น รถยนต์ว่างกี่คัน..."
              className="w-full text-xs bg-white border border-[#DEDED2] rounded-xl px-3.5 py-2.5 text-[#30312F] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleTestQuery()}
              disabled={simLoading || !simQuery}
              className="px-4 py-2.5 rounded-xl bg-[#284E1A] hover:bg-[#1E3B13] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>ทดสอบ</span>
            </button>
          </div>

          {/* Simulator Reply Box */}
          {simResult && (
            <div className="flex flex-col gap-3 p-4 rounded-[16px] bg-white border border-[#DEDED2] animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#284E1A] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  คำตอบจากน้องจ๊อด (Mode: {simResult.handler})
                </span>
                <span className="text-[10px] font-mono text-[#85847E]">
                  กล้องที่ส่ง: {simResult.target_cams?.join(', ') || 'none'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F5F3E8] border border-[#EBE8DC] text-xs font-sans text-[#30312F] whitespace-pre-line leading-relaxed">
                {simResult.answer}
              </div>

              {/* Snapshot image attachments preview */}
              {simResult.image_urls && simResult.image_urls.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-[#85847E]">
                    ภาพ Live Snapshot Overlay ที่ส่งแนบ ({simResult.image_urls.length} รูป):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {simResult.image_urls.map((imgUrl, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-[#DEDED2] bg-neutral-900">
                        <img
                          src={`${imgUrl}&t=${Date.now()}`}
                          alt={`Bot snapshot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono text-[9px]">
                          CAM {simResult.target_cams?.[i]?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
