import React from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'

/**
 * Reusable Figma-spec Cards & Components
 * Source: Figma CSS export for "Platform services workspace"
 * Card surface: #FFFDF7 | Card border: 1px solid #DEDED2 | Radius: 24px / 18px / 100px
 */

export function PillTag({ children, variant = 'neutral', className = '' }) {
  const isGreen = variant === 'active' || variant === 'green'
  return (
    <div
      className={`inline-flex items-center px-[11px] py-[6px] h-[27px] rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        isGreen
          ? 'bg-[#E7F4D8] text-[#36612D]'
          : 'bg-[#F0EEE4] text-[#686962]'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function PillButton({
  children,
  variant = 'primary',
  icon: Icon = ArrowRight,
  href,
  onClick,
  className = '',
  target = '_blank'
}) {
  const isPrimary = variant === 'primary'
  const baseClasses = `box-border inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer text-center no-underline select-none ${
    isPrimary
      ? 'bg-[#30312F] text-white border border-[#30312F] hover:bg-[#1E1F1D] hover:border-[#1E1F1D] active:translate-y-0 hover:-translate-y-0.5'
      : 'bg-[#FAF8EF] text-[#30312F] border border-[#DEDED2] hover:bg-[#F0EEE4] hover:border-[#CFCFBF] active:translate-y-0 hover:-translate-y-0.5'
  } ${className}`

  const content = (
    <>
      <span className="truncate">{children}</span>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={baseClasses}
        onClick={onClick}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClasses}>
      {content}
    </button>
  )
}

/**
 * Service Overview Card (Top Row 4-Cards)
 * Figma: width 295px, height ~288-309px, #FFFDF7, 24px radius, 1px solid #DEDED2
 */
export function ServiceOverviewCard({
  title,
  description,
  status,
  emblemBg = 'green',
  logo: LogoComponent,
  actionLabel = 'เปิดบริการ',
  actionUrl,
  onClick
}) {
  const emblemBgMap = {
    green: 'bg-[#E7F4D8]',
    purple: 'bg-[#EBE5F6]',
    yellow: 'bg-[#F5EDCD]',
    aqua: 'bg-[#E1F2E9]'
  }

  const resolvedEmblemBg = emblemBgMap[emblemBg] || (emblemBg.startsWith('#') ? '' : 'bg-[#E7F4D8]')
  const customStyle = emblemBg.startsWith('#') ? { backgroundColor: emblemBg } : {}

  return (
    <div className="box-border flex flex-col justify-between p-6 gap-4 min-h-[300px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Service emblem 48x48 rounded 14px */}
        <div
          className={`w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 ${resolvedEmblemBg}`}
          style={customStyle}
        >
          {LogoComponent ? (
            <LogoComponent size={28} />
          ) : (
            <div className="w-6 h-6 rounded-md bg-[#30312F]/10" />
          )}
        </div>

        {/* Title (19px Inter semi-bold #30312F) */}
        <h3 className="font-sans font-semibold text-[19px] leading-[23px] text-[#30312F] m-0">
          {title}
        </h3>

        {/* Description (14px Inter #686962) */}
        <p className="font-sans font-normal text-sm leading-[150%] text-[#686962] m-0">
          {description}
        </p>

        {/* Status (12px Inter #85847E) */}
        {status && (
          <div className="font-sans font-normal text-xs leading-[15px] text-[#85847E]">
            {status}
          </div>
        )}
      </div>

      {/* Action button 48px #30312F radius 100px */}
      <PillButton
        variant="primary"
        href={actionUrl}
        onClick={onClick}
        className="w-full h-12"
      >
        {actionLabel}
      </PillButton>
    </div>
  )
}

/**
 * Service Detail Card (Middle 2x2 Grid)
 * Figma: width 600px, height 251px, #FFFDF7, 24px radius, 1px solid #DEDED2
 */
export function ServiceDetailCard({
  title,
  logo: LogoComponent,
  status = 'Active',
  statusVariant = 'active',
  description,
  metadata = [],
  actionLabel = 'ดูรายละเอียด',
  actionUrl,
  onClick
}) {
  return (
    <div className="box-border flex flex-col justify-between p-6 gap-4 min-h-[250px] bg-[#FFFDF7] border border-[#DEDED2] rounded-[24px] transition-all duration-200 hover:-translate-y-1 hover:border-[#B8B8A8] hover:shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Heading: Title + Status Pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            {LogoComponent && (
              <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                <LogoComponent size={24} />
              </div>
            )}
            <h3 className="font-sans font-semibold text-[21px] leading-[25px] text-[#30312F] m-0">
              {title}
            </h3>
          </div>
          <PillTag variant={statusVariant}>{status}</PillTag>
        </div>

        {/* Description (14px Inter 160% #686962) */}
        <p className="font-sans font-normal text-sm leading-[160%] text-[#686962] m-0">
          {description}
        </p>

        {/* Metadata grid */}
        {metadata.length > 0 && (
          <div className="flex items-center gap-4 pt-1">
            {metadata.map((meta, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 flex-1">
                <span className="font-sans text-xs text-[#85847E]">
                  {meta.label}
                </span>
                <span className="font-mono text-sm font-medium text-[#30312F]">
                  {meta.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      <PillButton
        variant="primary"
        href={actionUrl}
        onClick={onClick}
        className="w-full h-12"
      >
        {actionLabel}
      </PillButton>
    </div>
  )
}

/**
 * Auto-Training Panel (Bottom Section)
 * Figma: container #F0EEE4, 24px radius, 3 control cards #FFFDF7 18px radius, 2 action buttons
 */
export function AutoTrainingPanel({
  title = 'ระบบเทรนโมเดลอัตโนมัติ (Autonomous Training)',
  description = 'จัดการคิวดาต้าเซ็ต ส่งงานเทรนไปยัง Private GPU Node (172.30.81.175) และบันทึก Weights ลง MLflow',
  status = 'Pipeline Ready',
  controls = [],
  primaryActionLabel = 'สั่งรันเทรนโมเดล GPU ทันที',
  onPrimaryAction,
  secondaryActionLabel = 'ตรวจสอบ Logs ใน MLflow',
  secondaryActionUrl
}) {
  return (
    <div className="box-border flex flex-col p-6 lg:p-8 gap-5 w-full bg-[#F0EEE4] rounded-[24px]">
      {/* Heading */}
      <div className="flex items-start md:items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 max-w-[950px]">
          <h3 className="font-sans font-semibold text-[21px] leading-[25px] text-[#30312F] m-0">
            {title}
          </h3>
          <p className="font-sans font-normal text-sm leading-[160%] text-[#686962] m-0">
            {description}
          </p>
        </div>
        <PillTag variant="active">{status}</PillTag>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {controls.map((ctrl, idx) => (
          <div
            key={idx}
            className="box-border flex flex-col justify-between p-5 gap-1.5 bg-[#FFFDF7] border border-[#DEDED2] rounded-[18px]"
          >
            <span className="font-sans text-xs text-[#85847E]">
              {ctrl.label}
            </span>
            <span className="font-sans font-semibold text-[18px] leading-[22px] text-[#30312F]">
              {ctrl.value}
            </span>
            <span className="font-sans text-[13px] leading-[150%] text-[#686962]">
              {ctrl.detail}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-1">
        <PillButton
          variant="primary"
          onClick={onPrimaryAction}
          className="w-full h-12"
        >
          {primaryActionLabel}
        </PillButton>
        <PillButton
          variant="secondary"
          href={secondaryActionUrl}
          className="w-full h-12"
        >
          {secondaryActionLabel}
        </PillButton>
      </div>
    </div>
  )
}
