import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, ContactShadows, Grid, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PART_MAP, type CategoryId, type PartId, type ScenarioId } from './data'
import { GRAND_PRIX_PART_VIEWS, GRAND_PRIX_SCENE_ENVELOPE, grandPrixFrontWingIncidence, grandPrixRearWingIncidence, MOBILE_SCENE_CAMERAS, rodTransform, SCENE_CAMERA_FOV, SCENE_CAMERA_MAX_DISTANCE, WHEEL_GEOMETRY } from './modelGeometry'
import { GRAND_PRIX_TEAMS, type GrandPrixTeamId } from './grandPrixTeams'
import type { VehicleId } from './vehicles'

type SceneState = {
  vehicleId: VehicleId
  selectedId: PartId | null
  onSelect: (id: PartId | null) => void
  explode: number
  xray: boolean
  visibleCategories: CategoryId[]
  scenario: ScenarioId
  grandPrixTeamId: GrandPrixTeamId
}

const SceneContext = createContext<SceneState | null>(null)

function useSceneState() {
  const value = useContext(SceneContext)
  if (!value) throw new Error('SceneContext is missing')
  return value
}

type PartGroupProps = {
  id: PartId
  category: CategoryId
  position?: [number, number, number]
  rotation?: [number, number, number]
  explodeVector?: [number, number, number]
  children: ReactNode
}

type StoredMaterialState = {
  emissive?: THREE.Color
  emissiveIntensity?: number
  highlightApplied?: boolean
  opacity?: number
  transparent?: boolean
  depthWrite?: boolean
}

const HIGHLIGHT_COLOR = new THREE.Color('#25c8ff')
const STUDENT_WHEEL_CENTER_Y = WHEEL_GEOMETRY.student.centerY
const GRAND_PRIX_WHEEL_CENTER_Y = WHEEL_GEOMETRY.grandPrixFront.centerY
const GRAND_PRIX_HALF_TRACK = WHEEL_GEOMETRY.grandPrixFront.halfTrack

function PartGroup({
  id,
  category,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  explodeVector = [0, 0, 0],
  children,
}: PartGroupProps) {
  const group = useRef<THREE.Group>(null)
  const { selectedId, onSelect, explode, xray, visibleCategories, scenario } = useSceneState()
  const [hovered, setHovered] = useState(false)
  const isSelected = selectedId === id
  const isDimmed = Boolean(selectedId && !isSelected)
  const isVisible = visibleCategories.includes(category)
  const target = useMemo(
    () => new THREE.Vector3(
      position[0] + explodeVector[0] * explode,
      position[1] + explodeVector[1] * explode,
      position[2] + explodeVector[2] * explode,
    ),
    [position, explodeVector, explode],
  )

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.position.lerp(target, 1 - Math.exp(-delta * 8))
    const desiredScale = isSelected || hovered ? 1.018 : 1
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, desiredScale, 12, delta))
  })

  useEffect(() => {
    if (!group.current) return
    const opacity = isSelected ? 1 : isDimmed ? 0.13 : xray ? 0.32 : 1
    group.current.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return
        const stored = (material.userData.racecarVisual ??= {}) as StoredMaterialState
        const highlightApplied = stored.highlightApplied === true
        const renderUpdatedWhileHighlighted = highlightApplied && !material.emissive.equals(HIGHLIGHT_COLOR)

        // React can update a scenario-specific glow while the part is highlighted.
        // Preserve that base state so selection never erases brake, sensor or energy effects.
        if (!highlightApplied || renderUpdatedWhileHighlighted) {
          stored.emissive = material.emissive.clone()
          stored.emissiveIntensity = material.emissiveIntensity
        }
        if (stored.opacity === undefined) {
          stored.opacity = material.opacity
          stored.transparent = material.transparent
          stored.depthWrite = material.depthWrite
        }

        if (opacity < 1) {
          material.transparent = true
          material.opacity = opacity
          material.depthWrite = opacity > 0.5
        } else {
          material.transparent = stored.transparent ?? false
          material.opacity = stored.opacity ?? 1
          material.depthWrite = stored.depthWrite ?? true
        }

        if (isSelected || hovered) {
          material.emissive.copy(HIGHLIGHT_COLOR)
          material.emissiveIntensity = isSelected ? 0.72 : 0.28
          stored.highlightApplied = true
        } else {
          if (stored.emissive) material.emissive.copy(stored.emissive)
          material.emissiveIntensity = stored.emissiveIntensity ?? 0
          stored.highlightApplied = false
        }
        material.needsUpdate = true
      })
    })
  }, [hovered, isDimmed, isSelected, scenario, xray])

  useEffect(() => () => { if (hovered) document.body.style.cursor = 'default' }, [hovered])

  if (!isVisible) return null

  return (
    <group
      ref={group}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      {children}
    </group>
  )
}

function CarbonMaterial({ color = '#171b20', roughness = 0.26, metalness = 0.52 }: { color?: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
}

function GrandPrixPaintMaterial({ color, roughness, metalness }: { color: string; roughness: number; metalness: number }) {
  return <meshPhysicalMaterial
    color={color}
    roughness={roughness}
    metalness={metalness}
    clearcoat={.72}
    clearcoatRoughness={Math.max(.035, roughness * .52)}
    reflectivity={.78}
  />
}

function useGrandPrixTeam() {
  const { grandPrixTeamId } = useSceneState()
  return GRAND_PRIX_TEAMS[grandPrixTeamId]
}

function LiveryPanel({
  name,
  points,
  position,
  rotation = [0, 0, 0],
  color,
  roughness,
  metalness,
  opacity = 1,
}: {
  name: string
  points: readonly [number, number][]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  roughness: number
  metalness: number
  opacity?: number
}) {
  const shape = useMemo(() => {
    const next = new THREE.Shape()
    points.forEach(([x, y], index) => index === 0 ? next.moveTo(x, y) : next.lineTo(x, y))
    next.closePath()
    return next
  }, [points])

  return <mesh name={name} position={position} rotation={rotation} renderOrder={4}>
    <shapeGeometry args={[shape]} />
    <meshPhysicalMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      clearcoat={.62}
      clearcoatRoughness={Math.max(.04, roughness * .55)}
      transparent={opacity < 1}
      opacity={opacity}
      side={THREE.DoubleSide}
      polygonOffset
      polygonOffsetFactor={-2}
      polygonOffsetUnits={-2}
    />
  </mesh>
}

function LiveryMark({
  number,
  model,
  color,
  accent,
  position,
  rotation,
}: {
  number: string
  model: string
  color: string
  accent: string
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 384
    const context = canvas.getContext('2d')
    if (!context) return null
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textBaseline = 'middle'
    context.fillStyle = color
    context.font = '900 250px Arial Black, Arial, sans-serif'
    context.fillText(number, 26, 205)
    context.fillStyle = accent
    context.fillRect(426, 82, 525, 22)
    context.font = '800 104px Arial, sans-serif'
    context.letterSpacing = '10px'
    context.fillText(model, 430, 220)
    context.fillRect(430, 286, 420, 12)
    const next = new THREE.CanvasTexture(canvas)
    next.colorSpace = THREE.SRGBColorSpace
    next.anisotropy = 8
    next.needsUpdate = true
    return next
  }, [accent, color, model, number])

  useEffect(() => () => texture?.dispose(), [texture])
  if (!texture) return null

  return <mesh name="livery-model-mark" position={position} rotation={rotation} renderOrder={7}>
    <planeGeometry args={[1.18, .44]} />
    <meshBasicMaterial map={texture} transparent alphaTest={.08} side={THREE.FrontSide} depthWrite={false} polygonOffset polygonOffsetFactor={-5} />
  </mesh>
}

function Rod({
  start,
  end,
  radius = 0.025,
  color = '#8b969e',
}: {
  start: [number, number, number]
  end: [number, number, number]
  radius?: number
  color?: string
}) {
  const { midpoint, quaternion, length } = useMemo(() => rodTransform(start, end), [start, end])

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.85} />
    </mesh>
  )
}

function Wheel({ x, z }: { x: number; z: number }) {
  const wheel = useRef<THREE.Group>(null)
  const { scenario } = useSceneState()
  useFrame((_, delta) => {
    if (!wheel.current) return
    const speed = scenario === 'acceleration' ? 8 : scenario === 'braking' ? 2.5 : 0
    // The car points along +Z. Positive rotation about the axle gives the
    // contact patch a -Z surface velocity, which is the correct rolling sense.
    wheel.current.rotation.x += delta * speed
    // Keep the rigid tyre tangent to the road. Load transfer is visualised by
    // force arrows; translating an undeformed wheel would make one tyre sink
    // through the road and the other float above it.
    wheel.current.position.y = STUDENT_WHEEL_CENTER_Y
  })

  return (
    <group ref={wheel} position={[x, STUDENT_WHEEL_CENTER_Y, z]}>
      <mesh rotation={[0, Math.PI / 2, 0]} scale={[1, 1, WHEEL_GEOMETRY.student.widthScale]} castShadow>
        <torusGeometry args={[WHEEL_GEOMETRY.student.majorRadius, WHEEL_GEOMETRY.student.tubeRadius, 18, 42]} />
        <meshStandardMaterial color="#090a0b" roughness={0.84} metalness={0.02} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.29, 0.29, WHEEL_GEOMETRY.student.rimWidth, 24]} />
        <meshStandardMaterial color="#29313a" roughness={0.22} metalness={0.92} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, WHEEL_GEOMETRY.student.hubWidth, 18]} />
        <meshStandardMaterial color="#43d5f5" emissive="#0c5364" emissiveIntensity={0.35} metalness={0.75} />
      </mesh>
    </group>
  )
}

function BrakeDisc({ x, z, centerY = STUDENT_WHEEL_CENTER_Y }: { x: number; z: number; centerY?: number }) {
  const { scenario } = useSceneState()
  const hot = scenario === 'braking'
  return (
    <group position={[x, centerY, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.27, 0.27, 0.06, 30]} />
        <meshStandardMaterial
          color={hot ? '#ff6a38' : '#7f8990'}
          emissive={hot ? '#ff2600' : '#000000'}
          emissiveIntensity={hot ? 1.5 : 0}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>
      <mesh position={[x > 0 ? -0.04 : 0.04, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.18, 0.11, 0.2]} />
        <meshStandardMaterial color="#d5b15b" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

function FrontWing() {
  return (
    <PartGroup id="front-wing" category="aero" explodeVector={[0, 0.25, 2.2]}>
      <mesh position={[0, 0.42, 3.72]} castShadow>
        <boxGeometry args={[3.15, 0.08, 0.42]} />
        <CarbonMaterial color="#182027" />
      </mesh>
      <mesh position={[0, 0.55, 3.48]} rotation={[-0.13, 0, 0]} castShadow>
        <boxGeometry args={[2.72, 0.07, 0.34]} />
        <CarbonMaterial color="#26333b" />
      </mesh>
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 0.57, 3.62]} castShadow>
          <boxGeometry args={[0.07, 0.58, 0.65]} />
          <CarbonMaterial color="#11161b" />
        </mesh>
      ))}
      <mesh position={[0, 0.63, 3.64]}>
        <boxGeometry args={[0.82, 0.08, 0.52]} />
        <meshStandardMaterial color="#e5533f" roughness={0.28} metalness={0.55} />
      </mesh>
    </PartGroup>
  )
}

function RearWing() {
  return (
    <PartGroup id="rear-wing" category="aero" explodeVector={[0, 0.75, -1.8]}>
      <mesh position={[0, 1.65, -3.72]} rotation={[0.07, 0, 0]} castShadow>
        <boxGeometry args={[2.42, 0.12, 0.48]} />
        <CarbonMaterial color="#151c22" />
      </mesh>
      <mesh position={[0, 1.88, -3.62]} rotation={[0.17, 0, 0]} castShadow>
        <boxGeometry args={[2.3, 0.09, 0.34]} />
        <CarbonMaterial color="#24313a" />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.67, -3.66]} castShadow>
          <boxGeometry args={[0.08, 0.72, 0.78]} />
          <CarbonMaterial color="#0e1317" />
        </mesh>
      ))}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 1.15, -3.58]} rotation={[0.07, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 1.05, 0.1]} />
          <meshStandardMaterial color="#7a858c" metalness={0.86} roughness={0.25} />
        </mesh>
      ))}
    </PartGroup>
  )
}

function Floor() {
  return (
    <PartGroup id="floor" category="aero" explodeVector={[0, -1.0, 0]}>
      <mesh position={[0, 0.27, -0.28]} receiveShadow>
        <boxGeometry args={[2.05, 0.1, 5.65]} />
        <CarbonMaterial color="#0e1317" roughness={0.38} />
      </mesh>
      {[-0.92, 0.92].map((x) => (
        <mesh key={x} position={[x, 0.37, -0.3]}>
          <boxGeometry args={[0.08, 0.17, 5.45]} />
          <meshStandardMaterial color="#2c3a42" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {[-0.65, 0, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.44, -3.15]} rotation={[-0.24, 0, 0]}>
          <boxGeometry args={[0.06, 0.07, 1.25]} />
          <meshStandardMaterial color="#55d5ec" emissive="#0c4d5b" emissiveIntensity={0.4} metalness={0.65} />
        </mesh>
      ))}
    </PartGroup>
  )
}

function Nose() {
  return (
    <PartGroup id="nose" category="structure" explodeVector={[0, 0.18, 1.45]}>
      <mesh position={[0, 0.72, 2.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.47, 2.1, 8]} />
        <meshStandardMaterial color="#d94b3a" roughness={0.27} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 3.62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 0.28, 8]} />
        <meshStandardMaterial color="#f0f2f3" roughness={0.24} metalness={0.5} />
      </mesh>
    </PartGroup>
  )
}

function Monocoque() {
  return (
    <PartGroup id="monocoque" category="structure" explodeVector={[0, 0.48, 0]}>
      <RoundedBox args={[1.34, 0.95, 2.7]} radius={0.28} smoothness={4} position={[0, 0.86, 0.45]} castShadow>
        <CarbonMaterial color="#252d32" roughness={0.24} />
      </RoundedBox>
      <mesh position={[0, 1.15, 0.56]}>
        <boxGeometry args={[0.84, 0.5, 1.4]} />
        <meshStandardMaterial color="#07090b" roughness={0.76} />
      </mesh>
      <RoundedBox args={[0.7, 0.26, 0.98]} radius={0.12} smoothness={4} position={[0, 0.81, 0.55]}>
        <meshStandardMaterial color="#3c4449" roughness={0.82} metalness={0.08} />
      </RoundedBox>
      <mesh position={[0, 1.03, 1.0]} rotation={[0.33, 0, 0]}>
        <boxGeometry args={[0.38, 0.08, 0.52]} />
        <meshStandardMaterial color="#e7ecef" roughness={0.2} metalness={0.3} />
      </mesh>
    </PartGroup>
  )
}

function Halo() {
  return (
    <PartGroup id="halo" category="structure" explodeVector={[0, 1.25, 0]}>
      <Rod start={[0, 1.38, 0.9]} end={[0, 1.88, 0.52]} radius={0.055} color="#bbc3c8" />
      <Rod start={[0, 1.86, 0.5]} end={[-0.58, 1.55, -0.15]} radius={0.055} color="#bbc3c8" />
      <Rod start={[0, 1.86, 0.5]} end={[0.58, 1.55, -0.15]} radius={0.055} color="#bbc3c8" />
      <Rod start={[-0.58, 1.55, -0.15]} end={[0.58, 1.55, -0.15]} radius={0.055} color="#bbc3c8" />
    </PartGroup>
  )
}

function Tires() {
  return (
    <PartGroup id="tires" category="dynamics" explodeVector={[0, 0.8, 0]}>
      <Wheel x={-1.55} z={2.15} />
      <Wheel x={1.55} z={2.15} />
      <Wheel x={-1.55} z={-2.35} />
      <Wheel x={1.55} z={-2.35} />
    </PartGroup>
  )
}

function Brakes() {
  return (
    <PartGroup id="brakes" category="dynamics" explodeVector={[2.05, 0.35, 0]}>
      <BrakeDisc x={-1.55} z={2.15} />
      <BrakeDisc x={1.55} z={2.15} />
      <BrakeDisc x={-1.55} z={-2.35} />
      <BrakeDisc x={1.55} z={-2.35} />
    </PartGroup>
  )
}

function FrontSuspension() {
  return (
    <PartGroup id="front-suspension" category="dynamics" explodeVector={[1.55, 0.15, 0.5]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod start={[side * 0.52, 0.92, 1.68]} end={[side * 1.38, 0.78, 2.15]} />
          <Rod start={[side * 0.52, 0.92, 2.03]} end={[side * 1.38, 0.78, 2.15]} />
          <Rod start={[side * 0.54, 0.46, 1.66]} end={[side * 1.38, 0.42, 2.15]} />
          <Rod start={[side * 0.54, 0.46, 2.04]} end={[side * 1.38, 0.42, 2.15]} />
          <Rod start={[side * 1.36, 0.66, 2.15]} end={[side * 0.32, 1.22, 1.78]} radius={0.032} color="#d94f3d" />
          <mesh position={[side * 0.22, 1.18, 1.68]} rotation={[0, 0, side * 0.35]}>
            <boxGeometry args={[0.36, 0.07, 0.13]} />
            <meshStandardMaterial color="#879198" roughness={0.32} metalness={0.8} />
          </mesh>
          <Rod start={[side * 0.28, 1.15, 1.66]} end={[side * 0.03, 1.02, 1.28]} radius={0.03} color="#63d8ee" />
        </group>
      ))}
    </PartGroup>
  )
}

function RearSuspension() {
  return (
    <PartGroup id="rear-suspension" category="dynamics" explodeVector={[1.55, 0.15, -0.5]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod start={[side * 0.55, 0.95, -1.9]} end={[side * 1.38, 0.78, -2.35]} />
          <Rod start={[side * 0.55, 0.95, -2.35]} end={[side * 1.38, 0.78, -2.35]} />
          <Rod start={[side * 0.56, 0.46, -1.9]} end={[side * 1.38, 0.42, -2.35]} />
          <Rod start={[side * 0.56, 0.46, -2.38]} end={[side * 1.38, 0.42, -2.35]} />
          <Rod start={[side * 1.36, 0.66, -2.35]} end={[side * 0.36, 1.18, -2.03]} radius={0.032} color="#d94f3d" />
          <mesh position={[side * 0.24, 1.14, -1.98]} rotation={[0, 0, side * -0.35]}>
            <boxGeometry args={[0.34, 0.07, 0.13]} />
            <meshStandardMaterial color="#879198" roughness={0.32} metalness={0.8} />
          </mesh>
          <Rod start={[side * 0.3, 1.12, -1.98]} end={[side * 0.05, 1.0, -1.62]} radius={0.03} color="#63d8ee" />
        </group>
      ))}
    </PartGroup>
  )
}

function Steering() {
  const { scenario } = useSceneState()
  const angle = scenario === 'cornering' ? -0.12 : 0
  return (
    <PartGroup id="steering" category="dynamics" explodeVector={[0, 1.05, 0.65]}>
      <Rod start={[0, 1.04, 0.85]} end={[0, 0.74, 1.55]} radius={0.035} color="#c6cdd1" />
      <Rod start={[-0.72, 0.7, 1.85]} end={[0.72, 0.7, 1.85]} radius={0.055} color="#7f8990" />
      <Rod start={[-0.68, 0.7, 1.85]} end={[-1.36, 0.64, 2.12]} radius={0.025} color="#b8c1c7" />
      <Rod start={[0.68, 0.7, 1.85]} end={[1.36, 0.64, 2.12]} radius={0.025} color="#b8c1c7" />
      <group position={[0, 1.08, 0.85]} rotation={[Math.PI / 2, angle, 0]}>
        <mesh>
          <torusGeometry args={[0.2, 0.035, 12, 28]} />
          <meshStandardMaterial color="#1c252b" roughness={0.55} metalness={0.45} />
        </mesh>
      </group>
    </PartGroup>
  )
}

function SidePodsAndCooling() {
  return (
    <PartGroup id="cooling" category="power" explodeVector={[1.35, 0.15, 0]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.94, 0.75, -0.48]}>
          <RoundedBox args={[0.52, 0.72, 1.55]} radius={0.18} smoothness={4} castShadow>
            <meshStandardMaterial color="#be3e31" roughness={0.3} metalness={0.5} />
          </RoundedBox>
          <mesh position={[-side * 0.03, 0.04, 0.58]} rotation={[0, side * 0.12, 0]}>
            <boxGeometry args={[0.42, 0.44, 0.08]} />
            <meshStandardMaterial color="#5a6870" roughness={0.65} metalness={0.6} />
          </mesh>
          {[-0.14, -0.07, 0, 0.07, 0.14].map((x) => (
            <mesh key={x} position={[x, 0.04, 0.63]}>
              <boxGeometry args={[0.018, 0.39, 0.05]} />
              <meshStandardMaterial color="#9aa5aa" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </PartGroup>
  )
}

function Battery() {
  return (
    <PartGroup id="battery" category="power" explodeVector={[0, -1.05, -0.3]}>
      <RoundedBox args={[1.05, 0.38, 1.48]} radius={0.08} smoothness={3} position={[0, 0.52, -0.75]} castShadow>
        <meshStandardMaterial color="#2e363d" roughness={0.45} metalness={0.66} />
      </RoundedBox>
      {[-0.28, 0, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.72, -0.75]}>
          <boxGeometry args={[0.1, 0.03, 1.25]} />
          <meshStandardMaterial color="#f3b743" emissive="#704411" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </PartGroup>
  )
}

function Inverter() {
  return (
    <PartGroup id="inverter" category="power" explodeVector={[-1.25, 0.55, -0.5]}>
      <RoundedBox args={[0.72, 0.36, 0.65]} radius={0.07} smoothness={3} position={[0.46, 0.83, -1.62]}>
        <meshStandardMaterial color="#3f4a50" roughness={0.28} metalness={0.82} />
      </RoundedBox>
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
        <mesh key={x} position={[0.46 + x, 1.025, -1.62]}>
          <boxGeometry args={[0.035, 0.05, 0.52]} />
          <meshStandardMaterial color="#9ca7ac" metalness={0.9} roughness={0.22} />
        </mesh>
      ))}
    </PartGroup>
  )
}

function Motor() {
  return (
    <PartGroup id="motor" category="power" explodeVector={[0, 0.65, -1.3]}>
      <mesh position={[0, 0.7, -2.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.72, 24]} />
        <meshStandardMaterial color="#d9e0e3" roughness={0.22} metalness={0.88} />
      </mesh>
      <mesh position={[0, 0.7, -2.3]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.035, 12, 30]} />
        <meshStandardMaterial color="#43d8f6" emissive="#14758a" emissiveIntensity={0.55} />
      </mesh>
    </PartGroup>
  )
}

function Differential() {
  return (
    <PartGroup id="differential" category="power" explodeVector={[0, 0.25, -1.6]}>
      <mesh position={[0, 0.65, -2.82]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.56, 18]} />
        <meshStandardMaterial color="#353f45" roughness={0.32} metalness={0.83} />
      </mesh>
      <Rod start={[-1.36, 0.62, -2.35]} end={[-0.25, 0.65, -2.8]} radius={0.045} color="#b7c0c4" />
      <Rod start={[1.36, 0.62, -2.35]} end={[0.25, 0.65, -2.8]} radius={0.045} color="#b7c0c4" />
    </PartGroup>
  )
}

function Electronics() {
  return (
    <>
      <PartGroup id="ecu" category="electronics" explodeVector={[-1.2, 1.05, 0]}>
        <RoundedBox args={[0.54, 0.22, 0.62]} radius={0.05} smoothness={3} position={[-0.43, 0.93, 0.05]}>
          <meshStandardMaterial color="#6b51ba" roughness={0.36} metalness={0.55} />
        </RoundedBox>
        <mesh position={[-0.43, 1.06, 0.05]}>
          <boxGeometry args={[0.32, 0.035, 0.38]} />
          <meshStandardMaterial color="#bbabff" emissive="#6249c2" emissiveIntensity={0.65} />
        </mesh>
      </PartGroup>
      <PartGroup id="sensors" category="electronics" explodeVector={[1.3, 1.2, 0.4]}>
        {[
          [-1.45, 0.9, 2.15], [1.45, 0.9, 2.15], [-1.45, 0.9, -2.35], [1.45, 0.9, -2.35],
          [0, 1.28, -1.2], [0, 1.36, 1.2],
        ].map((position, index) => (
          <mesh key={index} position={position as [number, number, number]}>
            <sphereGeometry args={[0.065, 14, 14]} />
            <meshStandardMaterial color="#b492ff" emissive="#6f44dd" emissiveIntensity={1.1} />
          </mesh>
        ))}
      </PartGroup>
    </>
  )
}

function SideBodywork() {
  return (
    <PartGroup id="monocoque" category="structure" explodeVector={[0, 0.48, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.68, 0.52, -1.6]} rotation={[0.06, 0, side * 0.18]} castShadow>
          <boxGeometry args={[0.42, 0.28, 1.65]} />
          <meshStandardMaterial color="#171d22" roughness={0.3} metalness={0.58} />
        </mesh>
      ))}
    </PartGroup>
  )
}

function ForceArrow({
  origin,
  direction,
  length,
  color,
  delay = 0,
}: {
  origin: [number, number, number]
  direction: [number, number, number]
  length: number
  color: string
  delay?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const arrow = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize()
    return new THREE.ArrowHelper(dir, new THREE.Vector3(...origin), length, color, 0.22, 0.13)
  }, [origin, direction, length, color])

  useEffect(() => () => {
    // ArrowHelper is mounted through <primitive>, so R3F does not own these
    // allocations. Dispose them whenever a scenario replaces the helper.
    arrow.line.geometry.dispose()
    arrow.cone.geometry.dispose()
    const lineMaterials = Array.isArray(arrow.line.material) ? arrow.line.material : [arrow.line.material]
    const coneMaterials = Array.isArray(arrow.cone.material) ? arrow.cone.material : [arrow.cone.material]
    ;[...lineMaterials, ...coneMaterials].forEach((material) => material.dispose())
  }, [arrow])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 0.92 + Math.sin(clock.elapsedTime * 4 + delay) * 0.08
    ref.current.scale.setScalar(pulse)
  })

  return <group ref={ref}><primitive object={arrow} /></group>
}

function EnergyFlow({ vehicleId, reverse = false }: { vehicleId: VehicleId; reverse?: boolean }) {
  const dots = useRef<THREE.Group>(null)
  const path = useMemo(() => new THREE.CatmullRomCurve3(vehicleId === 'grand-prix-2026' ? [
    new THREE.Vector3(0, .72, -1.25),
    new THREE.Vector3(.55, 1.0, -1.85),
    new THREE.Vector3(0, .72, -2.35),
    new THREE.Vector3(0, .68, -3.25),
  ] : [
    new THREE.Vector3(0, 0.85, -0.65),
    new THREE.Vector3(0.45, 1.1, -1.55),
    new THREE.Vector3(0, 0.95, -2.3),
    new THREE.Vector3(0, 0.85, -2.8),
  ]), [vehicleId])
  useFrame(({ clock }) => {
    if (!dots.current) return
    dots.current.children.forEach((child, index) => {
      const phase = (clock.elapsedTime * 0.28 + index / 7) % 1
      const point = path.getPoint(reverse ? 1 - phase : phase)
      child.position.copy(point)
    })
  })
  return (
    <group ref={dots}>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshBasicMaterial color={reverse ? '#5cebc9' : '#39d9ff'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Airflow() {
  const particles = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: 28 }, (_, index) => ({
    x: -2.6 + (index % 7) * 0.86,
    y: 0.28 + (Math.floor(index / 7) % 4) * 0.48,
    z: 5.4 - (index % 4) * 2.7,
  })), [])
  useFrame((_, delta) => {
    if (!particles.current) return
    particles.current.children.forEach((child) => {
      child.position.z -= delta * 4.2
      child.position.x += Math.sin(child.position.z * 0.7) * delta * 0.08
      if (child.position.z < -5.2) child.position.z = 5.4
    })
  })
  return (
    <group ref={particles}>
      {seeds.map((seed, index) => (
        <mesh key={index} position={[seed.x, seed.y, seed.z]} scale={[1, 1, 4]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#5cebc9" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function ScenarioVisuals() {
  const { scenario, vehicleId } = useSceneState()
  const grandPrix = vehicleId === 'grand-prix-2026'
  const wheelX = grandPrix ? GRAND_PRIX_HALF_TRACK : WHEEL_GEOMETRY.student.halfTrack
  const frontZ = grandPrix ? 2.93 : 2.15
  const rearZ = grandPrix ? -3.25 : -2.35
  if (scenario === 'acceleration') {
    return (
      <group>
        <EnergyFlow vehicleId={vehicleId} />
        <ForceArrow origin={[0, grandPrix ? .82 : .75, grandPrix ? -3.65 : -3.1]} direction={[0, 0, 1]} length={grandPrix ? 2.7 : 2.2} color="#39d9ff" />
        <ForceArrow origin={[-wheelX, 0.12, rearZ]} direction={[0, 0, 1]} length={grandPrix ? 1.5 : 1.2} color="#39d9ff" delay={1} />
        <ForceArrow origin={[wheelX, 0.12, rearZ]} direction={[0, 0, 1]} length={grandPrix ? 1.5 : 1.2} color="#39d9ff" delay={2} />
      </group>
    )
  }
  if (scenario === 'braking') {
    return (
      <group>
        {grandPrix && <EnergyFlow vehicleId={vehicleId} reverse />}
        {[-wheelX, wheelX].map((x) => <ForceArrow key={`f-${x}`} origin={[x, 0.15, frontZ]} direction={[0, 0, -1]} length={grandPrix ? 2.05 : 1.7} color="#ff543f" />)}
        {[-wheelX, wheelX].map((x) => <ForceArrow key={`r-${x}`} origin={[x, 0.15, rearZ]} direction={[0, 0, -1]} length={grandPrix ? 1.1 : .85} color="#ff8a4d" />)}
        <ForceArrow origin={[0, grandPrix ? 1.35 : 1.15, 0.2]} direction={[0, 0, 1]} length={grandPrix ? 2 : 1.6} color="#ffcc5c" />
      </group>
    )
  }
  if (scenario === 'cornering') {
    return (
      <group>
        {([[-wheelX, frontZ], [wheelX, frontZ], [-wheelX, rearZ], [wheelX, rearZ]] as [number, number][]).map(([x, z], index) => (
          <ForceArrow key={index} origin={[x, 0.15, z]} direction={[-1, 0, 0]} length={x > 0 ? 1.55 : 0.85} color="#ffb34d" delay={index} />
        ))}
        <ForceArrow origin={[0, grandPrix ? 1.3 : 1.1, 0]} direction={[1, 0, 0]} length={grandPrix ? 2.2 : 1.8} color="#ff7255" />
      </group>
    )
  }
  if (scenario === 'aero') return <Airflow />
  return null
}

function FormulaCar({ intro, paused, resetSignal }: { intro: boolean; paused: boolean; resetSignal: number }) {
  const car = useRef<THREE.Group>(null)
  useEffect(() => {
    if (car.current) car.current.rotation.y = 0
  }, [resetSignal])
  useFrame((_, delta) => {
    if (!car.current) return
    if (intro) {
      if (!paused) car.current.rotation.y += delta * 0.16
      return
    }
    car.current.rotation.y = THREE.MathUtils.lerp(car.current.rotation.y, 0, 1 - Math.exp(-delta * 2.45))
  })
  return (
    <group ref={car}>
      <Floor />
      <FrontWing />
      <RearWing />
      <Nose />
      <Monocoque />
      <Halo />
      <SideBodywork />
      <Tires />
      <Brakes />
      <FrontSuspension />
      <RearSuspension />
      <Steering />
      <SidePodsAndCooling />
      <Battery />
      <Inverter />
      <Motor />
      <Differential />
      <Electronics />
      <ScenarioVisuals />
    </group>
  )
}

function GrandPrixWheel({ x, z, rear = false }: { x: number; z: number; rear?: boolean }) {
  const wheel = useRef<THREE.Group>(null)
  const { scenario } = useSceneState()
  const { palette } = useGrandPrixTeam()
  useFrame((_, delta) => {
    if (!wheel.current) return
    const speed = scenario === 'acceleration' ? 9 : scenario === 'braking' ? 3 : 0
    wheel.current.rotation.x += delta * speed
    wheel.current.position.y = GRAND_PRIX_WHEEL_CENTER_Y
  })
  const geometry = rear ? WHEEL_GEOMETRY.grandPrixRear : WHEEL_GEOMETRY.grandPrixFront
  const width = geometry.rimWidth
  const rimFaceX = x > 0 ? width * 0.58 : -width * 0.58
  return <group ref={wheel} position={[x, GRAND_PRIX_WHEEL_CENTER_Y, z]}>
    <mesh rotation={[0, Math.PI / 2, 0]} scale={[1, 1, geometry.widthScale]} castShadow><torusGeometry args={[geometry.majorRadius, geometry.tubeRadius, 20, 52]} /><meshStandardMaterial color="#070809" roughness={.9} /></mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.31, .31, width, 36]} /><meshStandardMaterial color="#171d21" roughness={.24} metalness={.82} /></mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.11, .11, geometry.hubWidth, 24]} /><meshStandardMaterial color={palette.wheelAccent} emissive={palette.wheelAccent} emissiveIntensity={.18} metalness={.82} /></mesh>
    {/* 2026 wheels require an annular outboard disc; structural spokes sit behind it. */}
    <mesh position={[rimFaceX, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[.325, .325, .045, 48]} />
      <meshStandardMaterial color="#20292e" roughness={.3} metalness={.72} />
    </mesh>
    <mesh position={[rimFaceX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[.105, .105, .06, 6]} />
      <meshStandardMaterial color="#d7dee1" roughness={.24} metalness={.9} />
    </mesh>
  </group>
}

function GPFrontWing() {
  const { scenario } = useSceneState()
  const { palette, paint, geometry } = useGrandPrixTeam()
  const active = scenario === 'acceleration'
  return <PartGroup id="front-wing" category="aero" explodeVector={[0, .25, 2.5]}>
    {[0, 1, 2].map((layer) => {
      // The forwardmost primary profile remains fixed; only downstream flaps
      // reduce incidence in the straight-line state.
      const incidence = grandPrixFrontWingIncidence(layer as 0 | 1 | 2, active)
      const width = GRAND_PRIX_SCENE_ENVELOPE.frontWingWidthSceneUnits - layer * .25
      const color = layer < 2 ? paint.frontWing : paint.frontWingAccent
      return <group key={layer}>
        {[-1, 1].map(side => <mesh
          key={side}
          position={[side * width * .245, .3 + layer * .11, 4.36 - layer * .15 - Math.abs(geometry.frontWingSweep) * .08]}
          rotation={[incidence, side * geometry.frontWingSweep, 0]}
          castShadow
        ><boxGeometry args={[width * .505, .055, .46]} />{layer < 2 ? <CarbonMaterial color={color} roughness={.22} metalness={.5} /> : <GrandPrixPaintMaterial color={color} roughness={palette.roughness} metalness={palette.metalness} />}</mesh>)}
      </group>
    })}
    {[-GRAND_PRIX_SCENE_ENVELOPE.frontWingEndplateHalfSpanSceneUnits, GRAND_PRIX_SCENE_ENVELOPE.frontWingEndplateHalfSpanSceneUnits].map(x => <group key={x}><mesh position={[x, .57, 4.28]}><boxGeometry args={[.055, .72, .84]} /><CarbonMaterial color={paint.frontWing} /></mesh><mesh position={[x * .98, .34, 3.95]} rotation={[0, 0, x > 0 ? -.16 : .16]}><boxGeometry args={[.32, .045, .72]} /><CarbonMaterial color={paint.frontWingAccent} /></mesh></group>)}
    <mesh position={[0, .45, 4.18]}><boxGeometry args={[.72, .18, .62]} /><GrandPrixPaintMaterial color={paint.nose} roughness={palette.roughness} metalness={palette.metalness} /></mesh>
    <mesh position={[0, .493, 4.06]}><boxGeometry args={[2.32, .018, .055]} /><meshStandardMaterial color={palette.pinstripe} roughness={.22} metalness={.32} /></mesh>
  </PartGroup>
}

function GPRearWing() {
  const { scenario } = useSceneState()
  const { palette, paint, geometry } = useGrandPrixTeam()
  const active = scenario === 'acceleration'
  const wingWidth = 2.55 * geometry.rearWingWidthScale
  return <PartGroup id="rear-wing" category="aero" explodeVector={[0, .9, -2.1]}>
    {/* The main profile is fixed; the trailing flap alone switches state. */}
    <mesh position={[0, 2.05, -4.15]} rotation={[grandPrixRearWingIncidence('mainplane', active), 0, 0]} castShadow><boxGeometry args={[wingWidth, .1, .55]} /><CarbonMaterial color={paint.rearWing} /></mesh>
    <mesh position={[0, 2.31, -4.08]} rotation={[grandPrixRearWingIncidence('flap', active), 0, 0]} castShadow><boxGeometry args={[wingWidth * .95, .075, .38]} /><GrandPrixPaintMaterial color={paint.rearWingAccent} roughness={palette.roughness} metalness={palette.metalness} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * wingWidth * .5, 2.08, -4.12]}><boxGeometry args={[.06, .83, .9]} /><CarbonMaterial color={paint.rearWing} /></mesh>)}
    <mesh position={[0, 2.365, -4.08]} rotation={[grandPrixRearWingIncidence('flap', active), 0, 0]}><boxGeometry args={[wingWidth * .855, .015, .055]} /><meshStandardMaterial color={palette.pinstripe} roughness={.2} /></mesh>
    {[-.44, .44].map(x => <Rod key={x} start={[x, 1.18, -3.78]} end={[x, 1.85, -4.04]} radius={.045} color="#89969c" />)}
  </PartGroup>
}

function GPFloor() {
  const { geometry, palette } = useGrandPrixTeam()
  const floorBoardOffsets = Array.from({ length: geometry.floorBoardCount }, (_, index) => .77 + index * .18)
  return <PartGroup id="floor" category="aero" explodeVector={[0, -1.15, 0]}>
    <mesh position={[0, .23, -.2]} castShadow><boxGeometry args={[2.72, .105, 6.75]} /><CarbonMaterial color="#0b1115" roughness={.34} /></mesh>
    {[-1, 1].flatMap(side => [1.06 + geometry.floorEdgeCut * .35, 1.30 - geometry.floorEdgeCut * .18].map(offset => <mesh key={`${side}-${offset}`} position={[side * offset, .31, .1]}><boxGeometry args={[.055, .18, 5.7]} /><meshStandardMaterial color="#273940" roughness={.34} metalness={.58} /></mesh>))}
    {[-.82, -.28, .28, .82].map(x => <mesh key={x} position={[x, .49, -3.3]} rotation={[-.26, 0, 0]}><boxGeometry args={[.065, .07, 1.45]} /><meshStandardMaterial color="#61d9ee" emissive="#0b4552" emissiveIntensity={.42} /></mesh>)}
    <mesh position={[0, .26, 2.85]}><boxGeometry args={[3.25, .055, .55]} /><CarbonMaterial color="#1d2b31" /></mesh>
    {[-1, 1].flatMap(side => floorBoardOffsets.map((offset, index) => <mesh key={`board-${side}-${index}`} position={[side * offset, .49 + index * .035, 1.82 - index * .08]} rotation={[0, side * geometry.floorBoardSweep, side * -.04]}><boxGeometry args={[.055, .52 - index * .05, .82]} /><meshStandardMaterial color={index === 0 ? palette.secondary : palette.carbon} roughness={.3} metalness={.58} /></mesh>))}
    {[-1, 1].map(side => <group key={`diffuser-slot-${side}`}>
      <mesh position={[side * (.66 + geometry.diffuserSlotWidth * .22), .48, -3.38]} rotation={[-.2, 0, side * .09]}><boxGeometry args={[geometry.diffuserSlotWidth, .035, 1.28]} /><meshStandardMaterial color="#06090b" roughness={.7} /></mesh>
      <mesh position={[side * (.67 + geometry.diffuserSlotWidth * .22), .505, -3.37]} rotation={[-.2, 0, side * .09]}><boxGeometry args={[.025, .02, 1.16]} /><meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={.22} /></mesh>
    </group>)}
  </PartGroup>
}

function GPNose() {
  const { palette, paint, geometry } = useGrandPrixTeam()
  const noseFront = 4.48
  const noseCenter = noseFront - geometry.noseLength / 2
  return <PartGroup id="nose" category="structure" explodeVector={[0, .2, 1.75]}>
    <mesh position={[0, geometry.noseHeight, noseCenter]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[geometry.noseTipRadius, geometry.noseRearRadius, geometry.noseLength, 24]} /><GrandPrixPaintMaterial color={paint.nose} roughness={palette.roughness} metalness={palette.metalness} /></mesh>
    <mesh position={[0, geometry.noseTipHeight, noseFront - .16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[geometry.noseTipRadius * .62, geometry.noseTipRadius, .34, 14]} /><meshStandardMaterial color={palette.secondary} roughness={palette.roughness} metalness={palette.metalness} /></mesh>
    <mesh position={[0, geometry.noseHeight + .195, noseCenter]} rotation={[-.018, 0, 0]}><boxGeometry args={[.105, .025, geometry.noseLength * .76]} /><meshStandardMaterial color={palette.pinstripe} roughness={.18} /></mesh>
    <mesh position={[0, geometry.noseHeight - .23, noseCenter - .05]} rotation={[-.08, 0, 0]}><boxGeometry args={[Math.max(.18, geometry.noseRearRadius * 1.35), .035, geometry.noseLength * .58]} /><meshStandardMaterial color={palette.carbon} roughness={.36} metalness={.44} /></mesh>
    <Rod start={[-geometry.noseRearRadius * .45, geometry.noseHeight, noseFront - geometry.noseLength + .18]} end={[-.82, .55, 3.9]} radius={.038} /><Rod start={[geometry.noseRearRadius * .45, geometry.noseHeight, noseFront - geometry.noseLength + .18]} end={[.82, .55, 3.9]} radius={.038} />
  </PartGroup>
}

function GPMonocoque() {
  const { palette, paint, geometry } = useGrandPrixTeam()
  const z = .75 + geometry.cockpitOffset
  return <PartGroup id="monocoque" category="structure" explodeVector={[0, .58, 0]}>
    <RoundedBox args={[geometry.monocoqueWidth, 1.05, geometry.monocoqueLength]} radius={.32} smoothness={7} position={[0, .92, z]} castShadow><GrandPrixPaintMaterial color={paint.monocoque} roughness={palette.roughness} metalness={palette.metalness} /></RoundedBox>
    <mesh position={[0, 1.36, .52 + geometry.cockpitOffset]} rotation={[-.1, 0, 0]}><boxGeometry args={[.92, .68, 1.48]} /><meshStandardMaterial color="#050708" roughness={.83} /></mesh>
    <RoundedBox args={[.66, .22, 1.12]} radius={.1} smoothness={4} position={[0, .91, .28 + geometry.cockpitOffset]} rotation={[-.2, 0, 0]}><meshStandardMaterial color="#363f44" roughness={.86} /></RoundedBox>
    <mesh position={[0, 1.42, .35 + geometry.cockpitOffset]} scale={[.38, .48, .38]}><sphereGeometry args={[.5, 32, 20]} /><meshStandardMaterial color="#e9eef0" roughness={.24} metalness={.4} /></mesh>
    <mesh position={[0, 1.45, .16 + geometry.cockpitOffset]} rotation={[-.08, 0, 0]}><boxGeometry args={[.42, .15, .32]} /><meshStandardMaterial color="#182a33" roughness={.18} metalness={.52} /></mesh>
    {[-.21, .21].map(x => <mesh key={x} position={[x, 1.12, .17 + geometry.cockpitOffset]} rotation={[-.2, x > 0 ? -.28 : .28, 0]}><boxGeometry args={[.08, .06, .82]} /><meshStandardMaterial color={palette.pinstripe} roughness={.38} /></mesh>)}
    {[-1, 1].map(side => <mesh key={`side-${side}`} position={[side * geometry.monocoqueWidth * .505, 1.06, .54 + geometry.cockpitOffset]}><boxGeometry args={[.025, .17, 1.65]} /><meshStandardMaterial color={palette.secondary} roughness={palette.roughness} metalness={palette.metalness} /></mesh>)}
  </PartGroup>
}

function GPHalo() {
  const { paint, geometry } = useGrandPrixTeam()
  const z = geometry.cockpitOffset
  return <PartGroup id="halo" category="structure" explodeVector={[0, 1.4, 0]}>
    <Rod start={[0, 1.48, 1.04 + z]} end={[0, 1.98, .62 + z]} radius={.06} color={paint.halo} />
    {/* The hoop branches around the cockpit and terminates at two rear mounts;
        it is not a transverse bar across the driver opening. */}
    <Rod start={[0, 1.98, .62 + z]} end={[-.55, 1.82, .15 + z]} radius={.06} color={paint.halo} /><Rod start={[0, 1.98, .62 + z]} end={[.55, 1.82, .15 + z]} radius={.06} color={paint.halo} />
    <Rod start={[-.55, 1.82, .15 + z]} end={[-.48, 1.67, -.72 + z]} radius={.06} color={paint.halo} /><Rod start={[.55, 1.82, .15 + z]} end={[.48, 1.67, -.72 + z]} radius={.06} color={paint.halo} />
    <mesh position={[-.48, 1.64, -.72 + z]}><cylinderGeometry args={[.09, .09, .1, 18]} /><meshStandardMaterial color="#818d92" roughness={.28} metalness={.84} /></mesh>
    <mesh position={[.48, 1.64, -.72 + z]}><cylinderGeometry args={[.09, .09, .1, 18]} /><meshStandardMaterial color="#818d92" roughness={.28} metalness={.84} /></mesh>
  </PartGroup>
}

function GPTires() {
  return <PartGroup id="tires" category="dynamics" explodeVector={[0, .85, 0]}><GrandPrixWheel x={-GRAND_PRIX_HALF_TRACK} z={2.93} /><GrandPrixWheel x={GRAND_PRIX_HALF_TRACK} z={2.93} /><GrandPrixWheel x={-GRAND_PRIX_HALF_TRACK} z={-3.25} rear /><GrandPrixWheel x={GRAND_PRIX_HALF_TRACK} z={-3.25} rear /></PartGroup>
}

function GPBrakes() {
  const corners: [number, number][] = [[-GRAND_PRIX_HALF_TRACK, 2.93], [GRAND_PRIX_HALF_TRACK, 2.93], [-GRAND_PRIX_HALF_TRACK, -3.25], [GRAND_PRIX_HALF_TRACK, -3.25]]
  return (
    <PartGroup id="brakes" category="dynamics" explodeVector={[0, .58, 0]}>
      {corners.map(([x, z], index) => (
        <group key={index} scale={1.12}>
          <BrakeDisc x={x / 1.12} z={z / 1.12} centerY={GRAND_PRIX_WHEEL_CENTER_Y / 1.12} />
        </group>
      ))}
      {corners.map(([x, z], index) => (
        <group key={`duct-${index}`} position={[x * .82, .76, z + (z > 0 ? -.32 : .32)]}>
          <mesh rotation={[0, x > 0 ? -.22 : .22, 0]}>
            <boxGeometry args={[.18, .22, .42]} />
            <meshStandardMaterial color="#151f25" roughness={.35} metalness={.6} />
          </mesh>
          <Rod start={[x > 0 ? -.12 : .12, .03, z > 0 ? .16 : -.16]} end={[0, -.08, z > 0 ? -.18 : .18]} radius={.018} color="#6bd7ec" />
        </group>
      ))}
      {[-.42, .42].map(x => <mesh key={x} position={[x, .58, 1.52]}><boxGeometry args={[.18, .28, .4]} /><meshStandardMaterial color="#a8b1b6" metalness={.8} roughness={.25} /></mesh>)}
    </PartGroup>
  )
}

function GPFrontSuspension() {
  const { geometry, palette } = useGrandPrixTeam()
  return (
    <PartGroup id="front-suspension" category="dynamics" explodeVector={[0, .72, .75]}>
      {[-1, 1].map(side => (
        <group key={side}>
          <Rod start={[side * (.48 + geometry.frontPickupOffset), .7, 2.25]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .6, 2.83]} radius={.035} />
          <Rod start={[side * (.48 + geometry.frontPickupOffset), .7, 2.25]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .6, 3.04]} radius={.035} />
          <Rod start={[side * (.42 + geometry.frontPickupOffset), 1.05, 2.38]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .77, 2.9]} radius={.032} color={palette.secondary} />
          <Rod start={[side * (.38 + geometry.frontPickupOffset), .78, 2.52]} end={[side * (GRAND_PRIX_HALF_TRACK - .12), .88, 2.95]} radius={.03} color={palette.accent} />
          <mesh position={[side * (.24 + geometry.frontPickupOffset), 1.08, 2.27]} rotation={[0, 0, side * .38]}>
            <boxGeometry args={[.34, .065, .12]} />
            <meshStandardMaterial color="#8c979d" roughness={.3} metalness={.82} />
          </mesh>
          <Rod start={[side * (.24 + geometry.frontPickupOffset), 1.06, 2.26]} end={[side * .04, .96, 1.78]} radius={.028} color={palette.pinstripe} />
        </group>
      ))}
    </PartGroup>
  )
}

function GPRearSuspension() {
  const { geometry, palette } = useGrandPrixTeam()
  return (
    <PartGroup id="rear-suspension" category="dynamics" explodeVector={[0, .75, -.78]}>
      {[-1, 1].map(side => (
        <group key={side}>
          <Rod start={[side * .54, .66, -2.55]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .59, -3.15]} radius={.035} />
          <Rod start={[side * .54, .66, -2.55]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .59, -3.36]} radius={.035} />
          <Rod start={[side * .48, geometry.rearPickupHeight, -2.58]} end={[side * (GRAND_PRIX_HALF_TRACK - .08), .78, -3.24]} radius={.032} color={palette.secondary} />
          <Rod start={[side * .45, geometry.rearPickupHeight - .24, -2.73]} end={[side * (GRAND_PRIX_HALF_TRACK - .12), .9, -3.24]} radius={.03} color={palette.accent} />
          <mesh position={[side * .27, geometry.rearPickupHeight + .02, -2.46]} rotation={[0, 0, side * -.38]}>
            <boxGeometry args={[.36, .065, .12]} />
            <meshStandardMaterial color="#8c979d" roughness={.3} metalness={.82} />
          </mesh>
          <Rod start={[side * .27, geometry.rearPickupHeight, -2.47]} end={[side * .05, .92, -2.0]} radius={.028} color={palette.pinstripe} />
        </group>
      ))}
    </PartGroup>
  )
}

function GPSteering() {
  return <PartGroup id="steering" category="dynamics" explodeVector={[0,.9,.55]}>
    <Rod start={[0,1.2,.58]} end={[0,.92,1.65]} radius={.045} color="#aab4b9" />
    <mesh position={[0,1.25,.54]} rotation={[.22,0,0]}><boxGeometry args={[.55,.34,.08]} /><meshStandardMaterial color="#202a30" roughness={.28} metalness={.65} /></mesh>
    <Rod start={[-(GRAND_PRIX_HALF_TRACK - .12),.68,2.95]} end={[GRAND_PRIX_HALF_TRACK - .12,.68,2.95]} radius={.032} color="#8e9ba1" />
    {[-.19,.19].map(x => <mesh key={x} position={[x,.67,1.72]} rotation={[.23,0,0]}><boxGeometry args={[.12,.25,.08]} /><meshStandardMaterial color="#aab1b4" metalness={.78} roughness={.3} /></mesh>)}
  </PartGroup>
}

function GPTeamSurfaceDetails({
  sidepodX,
  sidepodY,
  sidepodZ,
}: {
  sidepodX: number
  sidepodY: number
  sidepodZ: number
}) {
  const { grandPrixTeamId } = useSceneState()
  const { palette, paint, geometry } = GRAND_PRIX_TEAMS[grandPrixTeamId]
  const sidepodSurfaceX = sidepodX + geometry.sidepodWidth * .505
  const engineY = 1.22 + (geometry.engineCoverHeight - .78) * .35
  const engineSideX = geometry.engineCoverWidth * .505
  const engineTopY = engineY + geometry.engineCoverHeight * .505
  const sideRotation = (side: number): [number, number, number] => [0, side * (Math.PI / 2 + geometry.sidepodYaw), side * -.025]
  const marks: Record<GrandPrixTeamId, { number: string; color: string; accent: string }> = {
    ferrari: { number: '16', color: '#fffaf2', accent: '#fffaf2' },
    mclaren: { number: '4', color: '#ff8a12', accent: '#32d7d3' },
    mercedes: { number: '63', color: '#d7dde0', accent: '#16c9bd' },
    'red-bull': { number: '3', color: '#f5ce33', accent: '#f1eee7' },
  }
  const mark = marks[grandPrixTeamId]
  const modelMarks = [-1, 1].map(side => <LiveryMark
    key={side}
    number={mark.number}
    model={GRAND_PRIX_TEAMS[grandPrixTeamId].modelName}
    color={mark.color}
    accent={mark.accent}
    position={[side * (engineSideX + .026), engineY + .02, geometry.engineCoverOffset + .08]}
    rotation={[0, side * Math.PI / 2, 0]}
  />)

  if (grandPrixTeamId === 'ferrari') return <group name="livery-ferrari">
    <LiveryPanel
      name="livery-ferrari-engine-spine"
      points={[[-.22, -.92], [.22, -.92], [.34, .72], [0, 1.18], [-.34, .72]]}
      position={[0, engineTopY + .012, geometry.engineCoverOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.secondary}
      roughness={.12}
      metalness={.25}
    />
    <LiveryPanel
      name="livery-ferrari-cockpit-chevron"
      points={[[-.62, -.42], [.62, -.42], [.37, .44], [0, .67], [-.37, .44]]}
      position={[0, 1.458, .08 + geometry.cockpitOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.secondary}
      roughness={.12}
      metalness={.25}
    />
    {[-1, 1].map(side => <group key={side} name={`livery-ferrari-side-${side}`}>
      <LiveryPanel
        name="livery-ferrari-sidepod-sweep"
        points={[[-geometry.sidepodLength * .42, -.24], [geometry.sidepodLength * .44, -.16], [geometry.sidepodLength * .18, .19], [-geometry.sidepodLength * .3, .25]]}
        position={[side * sidepodSurfaceX, sidepodY + .03, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.secondary}
        roughness={.13}
        metalness={.24}
      />
      <LiveryPanel
        name="livery-ferrari-sidepod-red-cut"
        points={[[.02, -.15], [geometry.sidepodLength * .43, -.09], [geometry.sidepodLength * .31, .09], [.17, .15]]}
        position={[side * (sidepodSurfaceX + .008), sidepodY + .03, sidepodZ]}
        rotation={sideRotation(side)}
        color={paint.sidepod}
        roughness={.12}
        metalness={.26}
      />
    </group>)}
    {modelMarks}
  </group>

  if (grandPrixTeamId === 'mclaren') return <group name="livery-mclaren">
    <LiveryPanel
      name="livery-mclaren-engine-blade"
      points={[[-.38, -.94], [.38, -.94], [.22, .18], [.08, 1.08], [-.24, .56]]}
      position={[0, engineTopY + .012, geometry.engineCoverOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.body}
      roughness={.17}
      metalness={.28}
    />
    {[-1, 1].map(side => <group key={side} name={`livery-mclaren-side-${side}`}>
      <LiveryPanel
        name="livery-mclaren-papaya-diagonal"
        points={[[-geometry.sidepodLength * .46, -.28], [geometry.sidepodLength * .04, -.22], [geometry.sidepodLength * .45, .28], [-geometry.sidepodLength * .11, .16]]}
        position={[side * sidepodSurfaceX, sidepodY + .02, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.body}
        roughness={.17}
        metalness={.28}
      />
      <LiveryPanel
        name="livery-mclaren-teal-flowline"
        points={[[-geometry.sidepodLength * .43, -.3], [geometry.sidepodLength * .36, .18], [geometry.sidepodLength * .43, .22], [-geometry.sidepodLength * .4, -.24]]}
        position={[side * (sidepodSurfaceX + .01), sidepodY - .04, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.accent}
        roughness={.14}
        metalness={.36}
      />
      <LiveryPanel
        name="livery-mclaren-engine-chevron"
        points={[[-geometry.engineCoverLength * .44, -.3], [.18, -.2], [geometry.engineCoverLength * .42, .32], [-.18, .2]]}
        position={[side * (engineSideX + .01), engineY, geometry.engineCoverOffset]}
        rotation={[0, side * Math.PI / 2, 0]}
        color={palette.body}
        roughness={.17}
        metalness={.28}
      />
    </group>)}
    {modelMarks}
  </group>

  if (grandPrixTeamId === 'mercedes') return <group name="livery-mercedes">
    <LiveryPanel
      name="livery-mercedes-silver-engine-shoulder"
      points={[[-.5, -.98], [.5, -.98], [.32, .18], [.12, 1.12], [-.32, .5]]}
      position={[0, engineTopY + .012, geometry.engineCoverOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.body}
      roughness={.15}
      metalness={.7}
    />
    {[-1, 1].map(side => <group key={side} name={`livery-mercedes-side-${side}`}>
      <LiveryPanel
        name="livery-mercedes-silver-sidepod"
        points={[[-geometry.sidepodLength * .46, -.1], [-geometry.sidepodLength * .19, .3], [geometry.sidepodLength * .44, .23], [geometry.sidepodLength * .25, -.18]]}
        position={[side * sidepodSurfaceX, sidepodY + .03, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.body}
        roughness={.15}
        metalness={.7}
      />
      <LiveryPanel
        name="livery-mercedes-petronas-flowline"
        points={[[-geometry.sidepodLength * .46, -.31], [geometry.sidepodLength * .39, -.06], [geometry.sidepodLength * .45, .02], [-geometry.sidepodLength * .42, -.23]]}
        position={[side * (sidepodSurfaceX + .011), sidepodY - .02, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.accent}
        roughness={.12}
        metalness={.5}
      />
    </group>)}
    {[-.52, -.17, .18, .53].flatMap((z, row) => [-.2, .2].map((x, column) => <mesh
      key={`${row}-${column}`}
      name="livery-mercedes-diamond"
      position={[x + (row % 2 ? .1 : -.1), engineTopY + .022, geometry.engineCoverOffset + z]}
      rotation={[0, Math.PI / 4, 0]}
    ><boxGeometry args={[.13, .018, .13]} /><meshStandardMaterial color={row < 2 ? palette.secondary : palette.accent} roughness={.15} metalness={.66} /></mesh>))}
    {modelMarks}
  </group>

  return <group name="livery-red-bull">
    <LiveryPanel
      name="livery-red-bull-engine-flare"
      points={[[-.58, -.98], [.58, -.98], [.44, -.08], [.2, 1.08], [-.24, .54]]}
      position={[0, engineTopY + .012, geometry.engineCoverOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.accent}
      roughness={.11}
      metalness={.34}
    />
    <LiveryPanel
      name="livery-red-bull-yellow-spine"
      points={[[-.13, -.94], [.13, -.94], [.21, .54], [0, 1.14], [-.21, .54]]}
      position={[0, engineTopY + .022, geometry.engineCoverOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
      color={palette.pinstripe}
      roughness={.1}
      metalness={.32}
    />
    {[-1, 1].map(side => <group key={side} name={`livery-red-bull-side-${side}`}>
      <LiveryPanel
        name="livery-red-bull-red-sweep"
        points={[[-geometry.sidepodLength * .45, -.28], [geometry.sidepodLength * .18, -.2], [geometry.sidepodLength * .45, .24], [-geometry.sidepodLength * .14, .12]]}
        position={[side * sidepodSurfaceX, sidepodY + .01, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.accent}
        roughness={.11}
        metalness={.34}
      />
      <mesh
        name="livery-red-bull-yellow-disc"
        position={[side * (sidepodSurfaceX + .012), sidepodY + .1, sidepodZ - geometry.sidepodLength * .1]}
        rotation={[0, side * Math.PI / 2, 0]}
        renderOrder={5}
      ><circleGeometry args={[.3, 32]} /><meshStandardMaterial color={palette.pinstripe} roughness={.1} metalness={.3} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} /></mesh>
      <LiveryPanel
        name="livery-red-bull-white-speedmark"
        points={[[-geometry.sidepodLength * .35, -.05], [geometry.sidepodLength * .38, .21], [geometry.sidepodLength * .18, .3], [-geometry.sidepodLength * .25, .11]]}
        position={[side * (sidepodSurfaceX + .02), sidepodY + .08, sidepodZ]}
        rotation={sideRotation(side)}
        color={palette.secondary}
        roughness={.1}
        metalness={.26}
      />
    </group>)}
    {modelMarks}
  </group>
}

function GPCooling() {
  const { palette, paint, geometry } = useGrandPrixTeam()
  const sidepodX = .73 + geometry.sidepodWidth * .52
  const sidepodY = .86 + geometry.sidepodDrop * .25
  const sidepodZ = geometry.sidepodOffset
  return <PartGroup id="cooling" category="power" explodeVector={[0,.6,1.1]}>
    {[-1,1].map(side => <group key={side}>
      <RoundedBox args={[geometry.sidepodWidth, geometry.sidepodHeight, geometry.sidepodLength]} radius={Math.min(.22, geometry.sidepodHeight * .32)} smoothness={7} position={[side * sidepodX, sidepodY, sidepodZ]} rotation={[-geometry.sidepodDrop, side * geometry.sidepodYaw, side * -.025]} castShadow><GrandPrixPaintMaterial color={paint.sidepod} roughness={palette.roughness} metalness={palette.metalness} /></RoundedBox>
      <mesh position={[side * (sidepodX - geometry.sidepodWidth * .43), sidepodY + .02, geometry.inletOffset]} rotation={[0, side * (.2 + geometry.sidepodYaw), 0]}><boxGeometry args={[geometry.inletWidth, geometry.inletHeight, .78]} /><meshStandardMaterial color="#26343a" roughness={.62} metalness={.44} /></mesh>
      <mesh position={[side * (sidepodX - geometry.sidepodWidth * .47), sidepodY + .02, geometry.inletOffset + .06]} rotation={[0, side * (.2 + geometry.sidepodYaw), 0]}><boxGeometry args={[geometry.inletWidth * .35, geometry.inletHeight * .72, .63]} /><meshStandardMaterial color="#05090b" roughness={.76} /></mesh>
      <mesh position={[side * sidepodX, sidepodY - geometry.sidepodHeight * .34, sidepodZ - geometry.sidepodLength * .2]} rotation={[-geometry.sidepodDrop, side * geometry.sidepodYaw, 0]}><boxGeometry args={[geometry.sidepodWidth * .72, .055, geometry.sidepodLength * .72]} /><CarbonMaterial color={palette.carbon} roughness={.32} /></mesh>
      <Rod start={[side * (sidepodX - .24), .62, .2]} end={[side * .5,.65,-1.9]} radius={.035} color={palette.accent} />
    </group>)}
    <RoundedBox args={[geometry.engineCoverWidth, geometry.engineCoverHeight, geometry.engineCoverLength]} radius={.25} smoothness={7} position={[0, 1.22 + (geometry.engineCoverHeight - .78) * .35, geometry.engineCoverOffset]} castShadow><GrandPrixPaintMaterial color={paint.engineCover} roughness={palette.roughness} metalness={palette.metalness} /></RoundedBox>
    <mesh position={[0, 1.72 + (geometry.airboxHeight - .72) * .25, -.12 + geometry.cockpitOffset]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[geometry.airboxWidth * .7, geometry.airboxWidth, geometry.airboxHeight, 24]} /><GrandPrixPaintMaterial color={paint.airbox} roughness={palette.roughness} metalness={palette.metalness} /></mesh>
    <mesh position={[0, 1.73, .18]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.19, .045, 12, 30]} /><CarbonMaterial color={palette.carbon} /></mesh>
    <GPTeamSurfaceDetails sidepodX={sidepodX} sidepodY={sidepodY} sidepodZ={sidepodZ} />
  </PartGroup>
}

function GPEnergyStore() {
  return <PartGroup id="battery" category="power" explodeVector={[-1.3,.7,0]}><RoundedBox args={[.86,.52,1.35]} radius={.12} smoothness={4} position={[0,.67,-1.25]}><meshStandardMaterial color="#34383f" roughness={.25} metalness={.68} /></RoundedBox>{[-.25,0,.25].map(x=><mesh key={x} position={[x,.96,-1.25]}><boxGeometry args={[.12,.035,1.08]} /><meshStandardMaterial color="#f0b64e" emissive="#5e3607" emissiveIntensity={.25} /></mesh>)}</PartGroup>
}

function GPPowerElectronics() {
  return <PartGroup id="inverter" category="power" explodeVector={[1.3,.8,-.1]}><RoundedBox args={[.86,.45,.86]} radius={.1} smoothness={4} position={[.72,.92,-1.86]}><meshStandardMaterial color="#27333a" roughness={.22} metalness={.72} /></RoundedBox>{[0,1,2,3].map(i=><mesh key={i} position={[.72,.93+i*.07,-1.4]}><boxGeometry args={[.62,.025,.28]} /><meshStandardMaterial color="#7ddcf0" metalness={.75} roughness={.22} /></mesh>)}</PartGroup>
}

function GPHybridPowerUnit() {
  const { geometry, palette, id } = useGrandPrixTeam()
  return <PartGroup id="motor" category="power" explodeVector={[0,.85,-1.2]}>
    <mesh position={[0,.72,-2.22]} rotation={[0,0,Math.PI/2]} scale={[1, geometry.powerUnitLength, geometry.powerUnitWidth]}><cylinderGeometry args={[.52,.52,1.05,24]} /><meshStandardMaterial color={palette.metal} roughness={.3} metalness={.78} /></mesh>
    {[-.32,.32].map(x=><group key={x}><mesh position={[x * geometry.powerUnitWidth,.96,-2.08]}><boxGeometry args={[.42,.45,.72 * geometry.powerUnitLength]} /><meshStandardMaterial color={id === 'red-bull' ? '#313a43' : '#727c80'} roughness={.34} metalness={.72} /></mesh>{[0,1,2].map(i=><Rod key={i} start={[x * geometry.powerUnitWidth,.98,-1.9-i*.16]} end={[x*.75,1.28,-1.72-i*.2]} radius={.025} color={palette.powerUnitAccent}/>)}</group>)}
    <mesh position={[geometry.turboOffset,1.1,-2.62]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.24,.08,12,30]} /><meshStandardMaterial color={palette.powerUnitAccent} metalness={.88} roughness={.2} /></mesh>
    <mesh position={[0,.72,-1.58]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.27,.27,.72,22]} /><meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={.28} metalness={.8} /></mesh>
    <mesh position={[0,1.35,-2.12]}><boxGeometry args={[.64,.08,.3]} /><meshStandardMaterial color={palette.secondary} roughness={.24} metalness={.7} /></mesh>
  </PartGroup>
}

function GPTransmission() {
  return <PartGroup id="differential" category="power" explodeVector={[0,.65,-1.6]}><mesh position={[0,.68,-3.03]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.4,.56,1.15,18]} /><meshStandardMaterial color="#555f64" roughness={.32} metalness={.82} /></mesh><mesh position={[0,.68,-3.52]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.31,.31,.98,24]} /><meshStandardMaterial color="#272f34" metalness={.82} roughness={.3} /></mesh><Rod start={[-1.45,.62,-3.25]} end={[1.45,.62,-3.25]} radius={.055} color="#879398" /></PartGroup>
}

function GPElectronics() {
  return <>
    <PartGroup id="ecu" category="electronics" explodeVector={[1.2,1.05,0]}><RoundedBox args={[.66,.25,.92]} radius={.08} smoothness={4} position={[-.55,.54,-.82]}><meshStandardMaterial color="#17232b" roughness={.28} metalness={.7} /></RoundedBox>{[-.18,0,.18].map(x=><Rod key={x} start={[-.55+x,.57,-.35]} end={[x,.72,-1.52]} radius={.015} color="#9b7bff" />)}</PartGroup>
    <PartGroup id="sensors" category="electronics" explodeVector={[-1.2,1.25,0]}>{([[-GRAND_PRIX_HALF_TRACK,.82,2.93],[GRAND_PRIX_HALF_TRACK,.82,2.93],[-GRAND_PRIX_HALF_TRACK,.82,-3.25],[GRAND_PRIX_HALF_TRACK,.82,-3.25],[0,1.9,.6],[0,.42,-3.6]] as [number,number,number][]).map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.075,16,12]} /><meshStandardMaterial color="#b697ff" emissive="#563a9d" emissiveIntensity={.6} /></mesh>)}</PartGroup>
  </>
}

function GrandPrixCar({ intro, paused, resetSignal }: { intro: boolean; paused: boolean; resetSignal: number }) {
  const car = useRef<THREE.Group>(null)
  useEffect(() => { if (car.current) car.current.rotation.y = 0 }, [resetSignal])
  useFrame((_, delta) => {
    if (!car.current) return
    if (intro) { if (!paused) car.current.rotation.y += delta * .13 }
    else car.current.rotation.y = THREE.MathUtils.lerp(car.current.rotation.y, 0, 1 - Math.exp(-delta * 2.45))
  })
  return <group ref={car}>
    <GPFloor /><GPFrontWing /><GPRearWing /><GPNose /><GPMonocoque /><GPHalo /><GPTires /><GPBrakes />
    <GPFrontSuspension /><GPRearSuspension /><GPSteering /><GPCooling /><GPEnergyStore /><GPPowerElectronics />
    <GPHybridPowerUnit /><GPTransmission /><GPElectronics /><ScenarioVisuals />
  </group>
}

function CameraRig({ vehicleId, intro, selectedId, resetSignal }: { vehicleId: VehicleId; intro: boolean; selectedId: PartId | null; resetSignal: number }) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null)
  const { camera, size } = useThree()
  useEffect(() => {
    if (!controls.current) return
    const mobilePortrait = size.width <= 680 && size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = mobilePortrait ? SCENE_CAMERA_FOV.mobilePortrait : SCENE_CAMERA_FOV.desktop
      camera.updateProjectionMatrix()
    }
    if (intro) {
      const cameraPosition: [number, number, number] = mobilePortrait
        ? vehicleId === 'grand-prix-2026' ? MOBILE_SCENE_CAMERAS.grandPrixIntro : MOBILE_SCENE_CAMERAS.studentIntro
        : vehicleId === 'grand-prix-2026' ? [9.4, 5.1, 11.1] : [7.8, 4.1, 9.2]
      controls.current.setLookAt(
        ...cameraPosition,
        0,
        mobilePortrait ? 0.24 : 0.7,
        0,
        true,
      )
      return
    }
    if (!selectedId) {
      const cameraPosition: [number, number, number] = mobilePortrait
        ? vehicleId === 'grand-prix-2026' ? MOBILE_SCENE_CAMERAS.grandPrixOverview : MOBILE_SCENE_CAMERAS.studentOverview
        : vehicleId === 'grand-prix-2026' ? [9.1, 5.3, 10.2] : [7.4, 4.6, 8.4]
      controls.current.setLookAt(...cameraPosition, 0, 0.72, 0.05, true)
      return
    }
    const part = PART_MAP[selectedId]
    const view = vehicleId === 'grand-prix-2026' ? GRAND_PRIX_PART_VIEWS[selectedId] : part
    if (view && controls.current) controls.current.setLookAt(...view.camera, ...view.target, true)
  }, [camera, vehicleId, intro, selectedId, resetSignal, size.width, size.height])

  return (
    <CameraControls
      ref={controls}
      minDistance={3.3}
      maxDistance={SCENE_CAMERA_MAX_DISTANCE}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.12}
      smoothTime={0.45}
      dollySpeed={0.45}
      truckSpeed={0.8}
    />
  )
}

export type CarSceneProps = SceneState & {
  vehicleId: VehicleId
  intro: boolean
  introPaused: boolean
  resetSignal: number
  ariaLabel: string
  partOptions: { id: PartId; label: string; category: CategoryId }[]
}

export default function CarScene(props: CarSceneProps) {
  return (
    <div
      className="scene-canvas"
      data-scene-vehicle={props.vehicleId}
      data-grand-prix-team={props.vehicleId === 'grand-prix-2026' ? props.grandPrixTeamId : undefined}
      data-gp-power-unit={props.vehicleId === 'grand-prix-2026' ? GRAND_PRIX_TEAMS[props.grandPrixTeamId].facts[0]!.value.en : undefined}
      data-gp-nose-profile={props.vehicleId === 'grand-prix-2026' ? GRAND_PRIX_TEAMS[props.grandPrixTeamId].geometry.noseRearRadius : undefined}
      data-gp-sidepod-width={props.vehicleId === 'grand-prix-2026' ? GRAND_PRIX_TEAMS[props.grandPrixTeamId].geometry.sidepodWidth : undefined}
      data-gp-paint-signature={props.vehicleId === 'grand-prix-2026' ? Object.values(GRAND_PRIX_TEAMS[props.grandPrixTeamId].paint).join('|') : undefined}
      aria-label={props.ariaLabel}
    >
      <Canvas
        dpr={[1, 1.65]}
        camera={{ position: [7.4, 4.6, 8.4], fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <color attach="background" args={['#141d24']} />
        <fog attach="fog" args={['#141d24', 14, 29]} />
        <ambientLight intensity={0.72} />
        <hemisphereLight args={['#a9e7ff', '#273038', 1.55]} />
        <directionalLight position={[6, 8, 7]} intensity={3.8} color="#edfaff" castShadow />
        <directionalLight position={[-5, 3, -4]} intensity={.92} color="#ffd6cc" />
        <spotLight position={[0, 8, -4]} intensity={32} angle={0.5} penumbra={0.9} color="#d9f7ff" />
        <SceneContext.Provider value={props}>
          {props.vehicleId === 'grand-prix-2026'
            ? <GrandPrixCar intro={props.intro} paused={props.introPaused} resetSignal={props.resetSignal} />
            : <FormulaCar intro={props.intro} paused={props.introPaused} resetSignal={props.resetSignal} />}
        </SceneContext.Provider>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={14} blur={2.4} far={5} color="#000000" />
        <Grid
          position={[0, 0, 0]}
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.45}
          cellColor="#1a333b"
          sectionSize={2.5}
          sectionThickness={0.7}
          sectionColor="#244c57"
          fadeDistance={13}
          fadeStrength={1.2}
          infiniteGrid
        />
        <CameraRig vehicleId={props.vehicleId} intro={props.intro} selectedId={props.selectedId} resetSignal={props.resetSignal} />
      </Canvas>
      <div className="scene-vignette" />
      <div className="scene-grain" />
      <div className="scene-accessibility" aria-label={props.ariaLabel}>
        {props.partOptions.filter((part) => props.visibleCategories.includes(part.category)).map((part) => (
          <button key={part.id} data-part-id={part.id} aria-pressed={props.selectedId === part.id} onClick={() => props.onSelect(part.id)}>{part.label}</button>
        ))}
      </div>
    </div>
  )
}
