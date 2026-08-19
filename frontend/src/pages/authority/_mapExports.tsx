import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// react-leaflet expects window.L to exist globally at component time in some bundlers.
// Re-export leaflet + react-leaflet typesafe for vite build.
import leaflet from 'leaflet'
import * as ReactLeaflet from 'react-leaflet'

// Attach heatmap if missing — plugin is optional; we expose a fallback no-op layer.
function HeatmapFallback(_props: any) { return null }

function ensureHeat() {
  const L: any = (globalThis as any).L || leaflet
  if (L && !L.heatLayer) {
    L.heatLayer = () => ({
      addTo: () => ({/* mock */}),
      onAdd: () => {/* mock */},
    })
  }
  return L
}

ensureHeat()

const TileLayer = ReactLeaflet.TileLayer as any
const Marker = ReactLeaflet.Marker as any
const Popup = ReactLeaflet.Popup as any
const Circle = ReactLeaflet.Circle as any
const MapContainer = ReactLeaflet.MapContainer as any
const HeatmapLayer = (ReactLeaflet as any).HeatmapLayer || HeatmapFallback

export { MapContainer, TileLayer, Marker, Popup, HeatmapLayer, Circle }
