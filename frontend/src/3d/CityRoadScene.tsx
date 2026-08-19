import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface SimFrame {
  junction_id: number
  tick: number
  signal_state: 'RED' | 'GREEN' | 'YELLOW'
  time_in_state: number
  blockage_detected: boolean
  blockage_duration: number
  blockage_lane: number
  lanes: Array<{ id: number; lane_number: number; occupancy: number; vehicles: number }>
  vehicles: Array<{ lane_id?: number; movement_conflict?: boolean }>
}

function Vehicle({ lane, progress, conflict, color }: { lane: number, progress: number, conflict: boolean, color: string }) {
  const mesh = useRef<THREE.Mesh>(null!)
  // Simple mapping of lane to x position
  const laneX = (lane - 2.5) * 1.5
  const z = (progress - 0.5) * 30 // moving along Z
  
  return (
    <mesh ref={mesh} position={[laneX, 0.4, z]} castShadow receiveShadow>
      <boxGeometry args={[0.9, 0.8, 2.2]} />
      <meshStandardMaterial color={color} roughness={0.6} />
      {conflict && (
        <mesh position={[0, 0.41, 0]}>
          <boxGeometry args={[0.95, 0.1, 2.25]} />
          <meshBasicMaterial color="#F0475C" wireframe />
        </mesh>
      )}
    </mesh>
  )
}

function SignalPole({ state }: { state: string }) {
  return (
    <group position={[-4.5, 0, -4.5]}>
      {/* Pole */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#25324A" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 3.5, 0.2]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.4]} />
        <meshStandardMaterial color="#121B2E" />
      </mesh>
      {/* Lights */}
      {['#F0475C', '#F5A524', '#34D399'].map((c, i) => {
        const states = ['RED', 'YELLOW', 'GREEN']
        const active = state === states[i]
        return (
          <mesh key={c} position={[0, 3.8 - i * 0.3, 0.45]}>
            <circleGeometry args={[0.1, 16]} />
            <meshBasicMaterial color={active ? c : '#25324A'} />
          </mesh>
        )
      })}
    </group>
  )
}

function BlockageOverlay({ duration }: { duration: number }) {
  return (
    <Html position={[-2.2, 0.2, 2]} center>
      <div className="bg-bg-void/90 border border-signal-warn px-3 py-1.5 rounded flex flex-col items-center whitespace-nowrap pointer-events-none">
        <span className="text-[10px] font-bold text-signal-warn tracking-widest font-display">LEFT-TURN LANE BLOCKAGE DETECTED</span>
        <span className="text-signal-warn font-mono font-bold text-sm mt-0.5">{duration}s</span>
      </div>
    </Html>
  )
}

function SceneContent({ mode, frame }: { mode: 'compact' | 'full', frame: SimFrame | null }) {
  const group = useRef<THREE.Group>(null!)
  const [hoveredLane, setHoveredLane] = useState<number | null>(null)

  useFrame((state, delta) => {
    if (mode === 'compact' && group.current) {
      const matchMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (!matchMedia.matches) {
        group.current.rotation.y += delta * 0.1
      }
    }
  })

  // Derive scene state from frame, or fallback for demo in compact mode
  const isBlocked = mode === 'compact' ? true : !!frame?.blockage_detected
  const signalState = mode === 'compact' ? 'GREEN' : frame?.signal_state || 'RED'
  const blockDur = mode === 'compact' ? 21 : frame?.blockage_duration || 0

  return (
    <group ref={group}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} color="#fffcf5" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-10, 5, -10]} intensity={0.8} color="#4C8DFF" /> {/* Cool rim */}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0B1220" />
      </mesh>

      {/* Road cross */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[8, 40]} />
        <meshStandardMaterial color="#121B2E" />
      </mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 8]} />
        <meshStandardMaterial color="#121B2E" />
      </mesh>

      {/* Lanes */}
      {[1, 2, 3, 4].map((laneId) => {
        const laneX = (laneId - 2.5) * 1.5
        const blocked = isBlocked && laneId === 1
        const hovered = hoveredLane === laneId
        const active = hovered || blocked
        
        return (
          <group key={laneId}>
            <mesh 
              position={[laneX, 0.02, 0]} 
              rotation={[-Math.PI/2, 0, 0]}
              onPointerOver={(e) => { e.stopPropagation(); if(mode==='full') setHoveredLane(laneId) }}
              onPointerOut={() => setHoveredLane(null)}
            >
              <planeGeometry args={[1.4, 30]} />
              <meshBasicMaterial 
                color={blocked ? "#F5A524" : "#4C8DFF"} 
                transparent 
                opacity={active ? 0.15 : 0} 
                depthWrite={false}
              />
            </mesh>
            {/* Lane Dividers */}
            {laneId < 4 && (
              <mesh position={[laneX + 0.75, 0.03, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <planeGeometry args={[0.1, 30]} />
                <meshBasicMaterial color="#25324A" />
              </mesh>
            )}
            
            {/* Tooltip HTML */}
            {mode === 'full' && hovered && !blocked && (
              <Html position={[laneX, 0.1, 0]} center>
                <div className="bg-bg-panel border border-line-hairline text-text-primary px-2 py-1 rounded text-xs font-mono pointer-events-none whitespace-nowrap">
                  Lane {laneId}
                </div>
              </Html>
            )}
          </group>
        )
      })}

      <SignalPole state={signalState} />
      
      {isBlocked && <BlockageOverlay duration={blockDur} />}

      {/* Mock Vehicles */}
      <Vehicle lane={1} progress={0.4} conflict={isBlocked} color={isBlocked ? "#F0475C" : "#34D399"} />
      <Vehicle lane={1} progress={0.5} conflict={isBlocked} color={isBlocked ? "#F0475C" : "#34D399"} />
      <Vehicle lane={1} progress={0.6} conflict={false} color="#F5A524" />
      
      <Vehicle lane={2} progress={0.2} conflict={false} color="#34D399" />
      <Vehicle lane={2} progress={0.8} conflict={false} color="#34D399" />
      
      <Vehicle lane={3} progress={0.3} conflict={false} color="#34D399" />
      <Vehicle lane={4} progress={0.6} conflict={false} color="#34D399" />
      
      <gridHelper args={[100, 50, '#25324A', '#121B2E']} position={[0, 0.005, 0]} />
    </group>
  )
}

export default function JunctionScene3D({ mode = 'compact', frame = null, className = '' }: { mode?: 'compact' | 'full', frame?: any, className?: string }) {
  return (
    <Canvas
      className={className}
      camera={{ position: [12, 12, 12], fov: 35 }}
      shadows
    >
      <color attach="background" args={['#0B1220']} />
      <Suspense fallback={null}>
        <SceneContent mode={mode} frame={frame} />
        {mode === 'full' && (
          <OrbitControls 
            makeDefault 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2.5} 
            minPolarAngle={Math.PI / 6}
            minDistance={10}
            maxDistance={30}
            enableDamping
          />
        )}
      </Suspense>
    </Canvas>
  )
}
