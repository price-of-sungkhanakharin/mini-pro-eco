import React from 'react'

/**
 * Official Brand Logos for AI Ecosystem Services
 * All logos load authentic official vector images from /logos/
 */

export function PostgreSQLLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/postgresql.svg"
      alt="PostgreSQL"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function MinIOLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/minio.svg"
      alt="MinIO Storage"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function LabelStudioLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/label-studio.svg"
      alt="Label Studio"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function NvidiaLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/nvidia.svg"
      alt="NVIDIA GPU"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function FastAPILogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/fastapi.svg"
      alt="FastAPI"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function RedisLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/redis.svg"
      alt="Redis"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function MLflowLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/mlflow.svg"
      alt="MLflow"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function ESP32Logo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/esp32.svg"
      alt="ESP32 Ingestion"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function AdminerLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/adminer.svg"
      alt="Adminer Database"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function RoboflowLogo({ size = 28, className = '' }) {
  return (
    <img
      src="/logos/roboflow.svg"
      alt="Roboflow"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  )
}

export function DotBlueLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="dotBlue AI LLM Logo"
    >
      <circle cx="16" cy="16" r="13" fill="#1E40AF" />
      <circle cx="16" cy="16" r="5" fill="#60A5FA" />
      <circle cx="16" cy="8" r="2" fill="#93C5FD" />
      <circle cx="24" cy="16" r="2" fill="#93C5FD" />
      <circle cx="16" cy="24" r="2" fill="#93C5FD" />
      <circle cx="8" cy="16" r="2" fill="#93C5FD" />
    </svg>
  )
}
