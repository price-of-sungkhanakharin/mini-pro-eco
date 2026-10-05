import React from 'react'
import CameraCard from './CameraCard.jsx'

export default function HeroCamera({
  cam1,
  showRoiOverlay,
  onToggleRoi,
  onOpenModal,
  onNavigate
}) {
  return (
    <CameraCard
      camera={cam1}
      showRoiToggle={true}
      showRoiOverlay={showRoiOverlay}
      onToggleRoi={onToggleRoi}
      onOpenModal={onOpenModal}
      onNavigate={onNavigate}
    />
  )
}
