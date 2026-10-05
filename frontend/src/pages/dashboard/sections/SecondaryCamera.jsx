import React from 'react'
import CameraCard from './CameraCard.jsx'

export default function SecondaryCamera({
  camera,
  onOpenModal,
  onNavigate
}) {
  return (
    <CameraCard
      camera={camera}
      showRoiToggle={false}
      onOpenModal={onOpenModal}
      onNavigate={onNavigate}
    />
  )
}
