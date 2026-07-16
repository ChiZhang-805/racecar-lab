import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import { DoubleSide, Group, Vector3 } from 'three'
import { Box, CircleDot, Cog, Layers3, Lightbulb, MapPin, Pause, Play, RotateCcw, Wrench } from 'lucide-react'
import type { Locale } from './i18n'
import { localise, type EngineeringLesson } from './engineeringData'
import { COMPONENT_FACTS } from './componentWorkshopData'
import type { PartId } from './data'
import { rodTransform, workshopScaleForExplode, WORKSHOP_EXPLODE_VECTORS, type V3 } from './modelGeometry'
import type { VehicleId } from './vehicles'
import { grandPrixWorkshopFacts } from './grandPrixWorkshopFacts'

type AssemblyProps = { selected: number | null; explode: number; onSelect: (index: number) => void }
const ActiveContext = createContext(false)
const PALETTE = { carbon: '#26353b', carbon2: '#16252b', red: '#c8493d', metal: '#9aa9ae', dark: '#101a1f', cyan: '#52d9f3', amber: '#e9a84c', purple: '#8e72e8', green: '#66d8b9', copper: '#c57843', cell: '#776e63' }

function Material({ color, opacity = 1, metalness = .35, roughness = .4 }: { color: string; opacity?: number; metalness?: number; roughness?: number }) {
  const active = useContext(ActiveContext)
  const activeOpacity = opacity < .5 ? Math.min(.34, opacity * 1.5) : Math.max(opacity, .9)
  return <meshStandardMaterial color={active ? '#6fe7ff' : color} emissive={active ? '#168eaa' : '#000'} emissiveIntensity={active ? .65 : 0} metalness={metalness} roughness={roughness} transparent={opacity < 1} opacity={active ? activeOpacity : opacity} depthWrite={(active ? activeOpacity : opacity) > .5} side={DoubleSide} />
}

function G({ i, selected, explode, onSelect, vector, children }: { i: number; selected: number | null; explode: number; onSelect: (index: number) => void; vector?: V3; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const target = useMemo(() => new Vector3(), [])
  const offset = vector ?? WORKSHOP_EXPLODE_VECTORS[i] ?? WORKSHOP_EXPLODE_VECTORS[0]!
  useFrame((_, delta) => {
    target.set(offset[0] * explode, offset[1] * explode, offset[2] * explode)
    ref.current?.position.lerp(target, 1 - Math.exp(-8 * delta))
  })
  useEffect(() => () => { if (hovered) document.body.style.cursor = 'default' }, [hovered])
  return <group ref={ref} onClick={(event) => { event.stopPropagation(); onSelect(i) }} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}><ActiveContext.Provider value={selected === i || hovered}>{children}</ActiveContext.Provider></group>
}

function B({ p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], c = PALETTE.carbon, opacity = 1, rounded = 0 }: { p?: V3; s?: V3; r?: V3; c?: string; opacity?: number; rounded?: number }) {
  if (rounded) return <RoundedBox args={s} position={p} rotation={r} radius={rounded} smoothness={3}><Material color={c} opacity={opacity} /></RoundedBox>
  return <mesh position={p} rotation={r}><boxGeometry args={s} /><Material color={c} opacity={opacity} /></mesh>
}

function C({ p = [0, 0, 0], r = [0, 0, 0], radius = .4, radius2 = radius, h = 1, c = PALETTE.metal, opacity = 1, segments = 28 }: { p?: V3; r?: V3; radius?: number; radius2?: number; h?: number; c?: string; opacity?: number; segments?: number }) {
  return <mesh position={p} rotation={r}><cylinderGeometry args={[radius, radius2, h, segments]} /><Material color={c} opacity={opacity} /></mesh>
}

function S({ p = [0, 0, 0], scale = 1, c = PALETTE.cyan, opacity = 1 }: { p?: V3; scale?: number; c?: string; opacity?: number }) {
  return <mesh position={p} scale={scale}><sphereGeometry args={[.22, 20, 14]} /><Material color={c} opacity={opacity} /></mesh>
}

function T({ p = [0, 0, 0], r = [0, 0, 0], scale = [1, 1, 1], radius = 1, tube = .18, c = PALETTE.dark, opacity = 1 }: { p?: V3; r?: V3; scale?: V3; radius?: number; tube?: number; c?: string; opacity?: number }) {
  return <mesh position={p} rotation={r} scale={scale}><torusGeometry args={[radius, tube, 16, 48]} /><Material color={c} opacity={opacity} /></mesh>
}

function Rod({ a, b, radius = .055, c = PALETTE.metal }: { a: V3; b: V3; radius?: number; c?: string }) {
  const { midpoint, length, quaternion } = useMemo(() => rodTransform(a, b), [a, b])
  return <mesh position={midpoint} quaternion={quaternion}><cylinderGeometry args={[radius, radius, length, 12]} /><Material color={c} metalness={.65} roughness={.28} /></mesh>
}

function Gear({ p = [0, 0, 0], r = [Math.PI / 2, 0, 0], radius = .7, width = .2, teeth = 18, c = PALETTE.metal }: { p?: V3; r?: V3; radius?: number; width?: number; teeth?: number; c?: string }) {
  return <group position={p} rotation={r}><C radius={radius * .78} h={width} c={c} />{Array.from({ length: teeth }, (_, index) => { const angle = index / teeth * Math.PI * 2; return <B key={index} p={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} s={[radius * .22, width, radius * .12]} r={[0, -angle, 0]} c={c} /> })}</group>
}

function Cells({ rows = 3, cols = 5, p = [0, 0, 0] as V3 }: { rows?: number; cols?: number; p?: V3 }) {
  return <group position={p}>{Array.from({ length: rows * cols }, (_, index) => { const x = (index % cols - (cols - 1) / 2) * .38; const z = (Math.floor(index / cols) - (rows - 1) / 2) * .38; return <C key={index} p={[x, 0, z]} radius={.14} h={.72} c={index % 2 ? '#6e665e' : '#81786e'} /> })}</group>
}

function Fins({ count = 11, p = [0, 0, 0] as V3, span = 2.4 }: { count?: number; p?: V3; span?: number }) {
  const divisor = Math.max(1, count - 1)
  return <group position={p}>{Array.from({ length: Math.max(1, count) }, (_, index) => <B key={index} p={[(index / divisor - .5) * span, 0, 0]} s={[.035, 1.25, .22]} c={PALETTE.metal} />)}</group>
}

function FrontWing(props: AssemblyProps) { return <>
  <G i={0} {...props}><B s={[3.4, .16, .72]} p={[0, 0, .15]} r={[-.08, 0, 0]} c={PALETTE.red} rounded={.08} /><B s={[1.2, .1, .32]} p={[0, .04, -.35]} c={PALETTE.red} /></G>
  <G i={1} {...props}><B s={[3.0, .13, .38]} p={[0, .38, -.4]} r={[-.22, 0, 0]} c='#d75a49' rounded={.06} /></G>
  <G i={2} {...props}><B s={[.12, 1.0, 1.25]} p={[-1.72, .18, -.05]} c={PALETTE.dark} /><B s={[.12, 1.0, 1.25]} p={[1.72, .18, -.05]} c={PALETTE.dark} /></G>
  <G i={3} {...props}>{[-1.2, -.6, 0, .6, 1.2].map(x => <B key={x} s={[.05, .22, .48]} p={[x, .22, -.22]} c={PALETTE.cyan} opacity={.65} />)}</G>
  <G i={4} {...props}><Rod a={[-.55, .08, .05]} b={[-.35, .92, .9]} c={PALETTE.metal} /><Rod a={[.55, .08, .05]} b={[.35, .92, .9]} c={PALETTE.metal} /><B s={[.85, .18, .3]} p={[0, .9, .93]} c={PALETTE.carbon} /></G>
  <G i={5} {...props}>{[-1.25, -.75, -.25, .25, .75, 1.25].map((x, n) => <S key={x} p={[x, .2 + n % 2 * .22, -.05 - n % 2 * .45]} scale={.32} c={PALETTE.purple} />)}</G>
  </> }

function RearWing(props: AssemblyProps) { return <>
  <G i={0} {...props}><B s={[3.15, .2, .75]} p={[0, .15, 0]} r={[-.12, 0, 0]} c={PALETTE.red} rounded={.08} /></G>
  <G i={1} {...props}><B s={[2.9, .14, .42]} p={[0, .58, -.42]} r={[-.28, 0, 0]} c='#dd6652' rounded={.06} /></G>
  <G i={2} {...props}><B s={[.14, 1.2, 1.15]} p={[-1.62, .3, -.05]} c={PALETTE.dark} /><B s={[.14, 1.2, 1.15]} p={[1.62, .3, -.05]} c={PALETTE.dark} /></G>
  <G i={3} {...props}><T p={[-1.78, .45, -.1]} r={[Math.PI / 2, 0, 0]} radius={.45} tube={.035} c={PALETTE.cyan} opacity={.45} /><T p={[1.78, .45, -.1]} r={[Math.PI / 2, 0, 0]} radius={.45} tube={.035} c={PALETTE.cyan} opacity={.45} /></G>
  <G i={4} {...props}><Rod a={[-.65, .05, .05]} b={[-.65, -1.2, .4]} radius={.09} c={PALETTE.metal} /><Rod a={[.65, .05, .05]} b={[.65, -1.2, .4]} radius={.09} c={PALETTE.metal} /><B p={[0, -1.22, .42]} s={[1.7, .16, .32]} c={PALETTE.carbon} /></G>
  <G i={5} {...props}>{[-1.5, 1.5].flatMap(x => [-.15, .08, .31].map(y => <C key={`${x}-${y}`} p={[x, y, -.48]} r={[Math.PI / 2, 0, 0]} radius={.055} h={.18} c={PALETTE.amber} />))}</G>
  </> }

function FloorModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0, 0, 1.55]} s={[3.1, .14, .75]} c={PALETTE.carbon} /><B p={[0, .12, 1.92]} s={[3.3, .12, .12]} c={PALETTE.cyan} /></G>
  <G i={1} {...props}><B p={[-.76, -.05, .15]} s={[1.18, .13, 2.65]} c='#263a40' rounded={.06} /><B p={[.76, -.05, .15]} s={[1.18, .13, 2.65]} c='#263a40' rounded={.06} /></G>
  <G i={2} {...props}><B p={[-1.58, .12, .15]} s={[.14, .35, 3.35]} c={PALETTE.cyan} opacity={.72} /><B p={[1.58, .12, .15]} s={[.14, .35, 3.35]} c={PALETTE.cyan} opacity={.72} /></G>
  <G i={3} {...props}><B p={[-.77, .45, -1.65]} s={[1.24, .12, 1.45]} r={[.38, 0, 0]} c={PALETTE.red} /><B p={[.77, .45, -1.65]} s={[1.24, .12, 1.45]} r={[.38, 0, 0]} c={PALETTE.red} /></G>
  <G i={4} {...props}>{[-1.3, -.8, -.28, .28, .8, 1.3].map(x => <B key={x} p={[x, .3, -1.45]} s={[.055, .65, 1.35]} r={[.2, 0, 0]} c={PALETTE.metal} />)}</G>
  <G i={5} {...props}><B p={[0, .75, -2.2]} s={[3.2, .12, .7]} r={[.48, 0, 0]} c={PALETTE.carbon2} /><B p={[0, .82, -2.48]} s={[3.35, .1, .15]} c={PALETTE.cyan} /></G>
  </> }

function NoseModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><C p={[0, .1, 1.2]} r={[Math.PI / 2, 0, 0]} radius={.42} radius2={.95} h={2.2} c={PALETTE.red} opacity={.68} segments={6} /></G>
  <G i={1} {...props}><B p={[0, .05, 1.2]} s={[1.15, .72, 1.45]} c={PALETTE.amber} rounded={.08} />{[-.4, 0, .4].map(z => <B key={z} p={[0, .05, 1.2 + z]} s={[1.25, .78, .045]} c='#f0c16b' />)}</G>
  <G i={2} {...props}><B p={[0, .05, .42]} s={[1.48, 1.08, .12]} c={PALETTE.metal} /></G>
  <G i={3} {...props}><B p={[0, .05, .18]} s={[1.75, 1.35, .18]} c={PALETTE.carbon} />{[-.72, .72].flatMap(x => [-.5, .5].map(y => <S key={`${x}-${y}`} p={[x, y, .02]} scale={.28} c={PALETTE.metal} />))}</G>
  <G i={4} {...props}><Rod a={[-.55, -.2, .35]} b={[-1.45, -.55, -.05]} c={PALETTE.metal} /><Rod a={[.55, -.2, .35]} b={[1.45, -.55, -.05]} c={PALETTE.metal} /><B p={[0, -.55, -.08]} s={[3.1, .14, .25]} c={PALETTE.red} /></G>
  <G i={5} {...props}>{[.72, 1.08, 1.44, 1.8].map(z => <B key={z} p={[0, .05, z]} s={[1.22 - z * .18, .78 - z * .08, .055]} c={PALETTE.cyan} />)}</G>
  </> }

function MonocoqueModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[-.95, .25, 0]} s={[.12, 1.65, 3.35]} c={PALETTE.carbon} /><B p={[.95, .25, 0]} s={[.12, 1.65, 3.35]} c={PALETTE.carbon} /><B p={[0, -.58, 0]} s={[1.9, .12, 3.35]} c={PALETTE.carbon} /></G>
  <G i={1} {...props}><B p={[-.82, .25, 0]} s={[.12, 1.38, 3.0]} c={PALETTE.amber} opacity={.7} /><B p={[.82, .25, 0]} s={[.12, 1.38, 3.0]} c={PALETTE.amber} opacity={.7} /></G>
  <G i={2} {...props}><B p={[0, .15, 1.55]} s={[1.82, 1.55, .15]} c={PALETTE.metal} /><B p={[0, .15, -1.55]} s={[1.82, 1.55, .15]} c={PALETTE.metal} /></G>
  <G i={3} {...props}>{[-1.0, 1.0].flatMap(x => [-1.05, .9].flatMap(z => [-.2, .62].map(y => <C key={`${x}-${z}-${y}`} p={[x, y, z]} r={[0, 0, Math.PI / 2]} radius={.12} h={.28} c={PALETTE.cyan} />)))}</G>
  <G i={4} {...props}><B p={[-1.08, .18, 0]} s={[.18, 1.25, 2.25]} c={PALETTE.red} /><B p={[1.08, .18, 0]} s={[.18, 1.25, 2.25]} c={PALETTE.red} /></G>
  <G i={5} {...props}>{[-1.35, -1.0, -.65, -.3, .05, .4, .75, 1.1, 1.45].map(z => <S key={z} p={[.96, -.42, z]} scale={.24} c={PALETTE.purple} />)}</G>
  </> }

function HaloModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><Rod a={[-1.15, -.4, -.7]} b={[-.92, 1.35, -.7]} radius={.1} /><Rod a={[1.15, -.4, -.7]} b={[.92, 1.35, -.7]} radius={.1} /><Rod a={[-.92, 1.35, -.7]} b={[.92, 1.35, -.7]} radius={.1} /></G>
  <G i={1} {...props}><Rod a={[-.78, -.35, 1.05]} b={[-.62, .78, 1.05]} radius={.075} /><Rod a={[.78, -.35, 1.05]} b={[.62, .78, 1.05]} radius={.075} /><Rod a={[-.62, .78, 1.05]} b={[.62, .78, 1.05]} radius={.075} /></G>
  <G i={2} {...props}><Rod a={[-1.03, .85, -.7]} b={[-1.45, -.45, -1.7]} radius={.07} c={PALETTE.red} /><Rod a={[1.03, .85, -.7]} b={[1.45, -.45, -1.7]} radius={.07} c={PALETTE.red} /></G>
  <G i={3} {...props}><S p={[0, .55, .05]} scale={3.3} c={PALETTE.cyan} opacity={.12} /></G>
  <G i={4} {...props}><B p={[0, -.25, -.05]} s={[1.1, 1.25, 1.55]} r={[-.18, 0, 0]} c={PALETTE.carbon} rounded={.22} /><B p={[0, .35, -.55]} s={[.82, .52, .28]} c={PALETTE.dark} rounded={.12} /></G>
  <G i={5} {...props}><Rod a={[-.65, .35, -.35]} b={[0, -.65, .35]} radius={.045} c={PALETTE.red} /><Rod a={[.65, .35, -.35]} b={[0, -.65, .35]} radius={.045} c={PALETTE.red} /><Rod a={[-.55, -.25, .25]} b={[.55, -.25, .25]} radius={.045} c={PALETTE.red} /></G>
  </> }

function TireModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><T r={[0, Math.PI / 2, 0]} scale={[1, 1, 1.65]} radius={1.28} tube={.42} c={PALETTE.dark} /></G>
  <G i={1} {...props}><T r={[0, Math.PI / 2, 0]} scale={[1, 1, 1.55]} radius={1.12} tube={.24} c={PALETTE.amber} opacity={.62} /></G>
  <G i={2} {...props}><T p={[-.34, 0, 0]} r={[0, Math.PI / 2, 0]} radius={.78} tube={.085} c={PALETTE.metal} /><T p={[.34, 0, 0]} r={[0, Math.PI / 2, 0]} radius={.78} tube={.085} c={PALETTE.metal} /></G>
  <G i={3} {...props}><T r={[0, Math.PI / 2, 0]} radius={1.0} tube={.48} c={PALETTE.cyan} opacity={.13} /></G>
  <G i={4} {...props}><C r={[0, 0, Math.PI / 2]} radius={.82} h={1.05} c='#5d6870' /><C r={[0, 0, Math.PI / 2]} radius={.3} h={1.15} c={PALETTE.dark} /></G>
  <G i={5} {...props}><S p={[.42, .95, .62]} scale={.32} c={PALETTE.purple} /><Rod a={[-.42, .78, .76]} b={[-.42, 1.3, .98]} radius={.035} c={PALETTE.cyan} /></G>
  </> }

function BrakeModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[-1.5, -.35, .4]} s={[.38, 1.2, .18]} r={[0, 0, -.25]} c={PALETTE.metal} rounded={.08} /><Rod a={[-1.5, .15, .4]} b={[-.55, .05, .3]} radius={.06} c={PALETTE.amber} /></G>
  <G i={1} {...props}><C p={[-.3, .18, .25]} r={[0, 0, Math.PI / 2]} radius={.22} h={.85} c={PALETTE.metal} /><C p={[-.3, -.38, .25]} r={[0, 0, Math.PI / 2]} radius={.22} h={.85} c={PALETTE.metal} /></G>
  <G i={2} {...props}><Rod a={[-.1, .18, .25]} b={[1.05, .65, .15]} radius={.04} c={PALETTE.red} /><Rod a={[-.1, -.38, .25]} b={[1.05, -.65, .15]} radius={.04} c={PALETTE.red} /></G>
  <G i={3} {...props}><B p={[1.2, 0, .05]} s={[.72, 1.18, .55]} c={PALETTE.red} rounded={.16} />{[-.28, .28].map(y => <C key={y} p={[.81, y, .05]} r={[0, 0, Math.PI / 2]} radius={.16} h={.18} c={PALETTE.metal} />)}</G>
  <G i={4} {...props}><C p={[1.7, 0, .05]} r={[0, 0, Math.PI / 2]} radius={1.15} h={.15} c='#70787a' /><C p={[1.7, 0, .05]} r={[0, 0, Math.PI / 2]} radius={.45} h={.22} c={PALETTE.dark} /></G>
  <G i={5} {...props}><B p={[1.12, 0, .45]} s={[.12, .9, .32]} c={PALETTE.amber} /><B p={[.15, -1.0, .05]} s={[1.25, .42, .65]} r={[0, .25, 0]} c={PALETTE.cyan} opacity={.35} /></G>
  </> }

function FrontSuspension(props: AssemblyProps) { return <>
  <G i={0} {...props}><Rod a={[-1.65, .55, .55]} b={[-.45, .78, .35]} /><Rod a={[-1.65, .55, .55]} b={[-.45, .78, -.35]} /><Rod a={[-1.65, -.55, .55]} b={[-.35, -.38, .48]} /><Rod a={[-1.65, -.55, .55]} b={[-.35, -.38, -.48]} /></G>
  <G i={1} {...props}><B p={[-1.72, 0, .52]} s={[.3, 1.05, .48]} c={PALETTE.metal} rounded={.12} /><C p={[-1.9, 0, .52]} r={[0, 0, Math.PI / 2]} radius={.34} h={.38} c={PALETTE.dark} /></G>
  <G i={2} {...props}><Rod a={[-1.62, -.25, .48]} b={[-.15, 1.02, .05]} radius={.06} c={PALETTE.red} /></G>
  <G i={3} {...props}><B p={[-.05, 1.0, .05]} s={[.68, .16, .34]} r={[0, 0, .3]} c={PALETTE.amber} /><C p={[.65, .9, .05]} r={[0, 0, Math.PI / 2]} radius={.18} h={1.25} c={PALETTE.metal} /><C p={[.65, .9, .05]} r={[0, 0, Math.PI / 2]} radius={.26} h={.55} c={PALETTE.red} /></G>
  <G i={4} {...props}><Rod a={[-.5, .85, -.75]} b={[1.2, .85, -.75]} radius={.075} c={PALETTE.purple} /><Rod a={[-.15, 1.05, .05]} b={[-.5, .85, -.75]} radius={.045} c={PALETTE.purple} /></G>
  <G i={5} {...props}>{[[-1.65,.55,.55],[-1.65,-.55,.55],[-.45,.78,.35],[-.35,-.38,.48],[-.15,1.02,.05]].map((p, i) => <S key={i} p={p as V3} scale={.38} c={PALETTE.cyan} />)}</G>
  </> }

function RearSuspension(props: AssemblyProps) { return <>
  <G i={0} {...props}><Rod a={[1.62, .55, -.4]} b={[.35, .72, .45]} /><Rod a={[1.62, .55, -.4]} b={[.35, .72, -.55]} /><Rod a={[1.62, -.55, -.4]} b={[.35, -.42, .48]} /><Rod a={[1.62, -.55, -.4]} b={[.35, -.42, -.52]} /></G>
  <G i={1} {...props}><B p={[1.68, 0, -.4]} s={[.32, 1.08, .5]} c={PALETTE.metal} rounded={.12} /><C p={[1.87, 0, -.4]} r={[0, 0, Math.PI / 2]} radius={.35} h={.38} c={PALETTE.dark} /></G>
  <G i={2} {...props}><Rod a={[1.58, -.25, -.4]} b={[.12, 1.04, 0]} radius={.06} c={PALETTE.red} /><B p={[.05, 1.05, 0]} s={[.7, .17, .34]} r={[0, 0, -.28]} c={PALETTE.amber} /></G>
  <G i={3} {...props}><C p={[-.68, .9, 0]} r={[0, 0, Math.PI / 2]} radius={.18} h={1.3} c={PALETTE.metal} /><C p={[-.68, .9, 0]} r={[0, 0, Math.PI / 2]} radius={.27} h={.58} c={PALETTE.red} /></G>
  <G i={4} {...props}><Rod a={[-1.15, .8, -.72]} b={[.45, .8, -.72]} radius={.075} c={PALETTE.purple} /><Rod a={[.12, 1.04, 0]} b={[.45, .8, -.72]} radius={.045} c={PALETTE.purple} /></G>
  <G i={5} {...props}><Rod a={[1.82, 0, -.4]} b={[-1.2, 0, -.4]} radius={.11} c={PALETTE.copper} /><C p={[1.15, 0, -.4]} r={[0, 0, Math.PI / 2]} radius={.22} h={.35} c={PALETTE.metal} /><C p={[-.65, 0, -.4]} r={[0, 0, Math.PI / 2]} radius={.22} h={.35} c={PALETTE.metal} /></G>
  </> }

function SteeringModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><T p={[0, .7, 1.45]} r={[Math.PI / 2, 0, 0]} radius={.72} tube={.11} c={PALETTE.dark} />{[0, 2.1, 4.2].map(a => <Rod key={a} a={[0,.7,1.45]} b={[Math.cos(a)*.62,.7+Math.sin(a)*.62,1.45]} radius={.045} c={PALETTE.metal} />)}<C p={[0,.7,1.45]} r={[Math.PI/2,0,0]} radius={.2} h={.25} c={PALETTE.cyan} /></G>
  <G i={1} {...props}><Rod a={[0, .7, 1.32]} b={[0, .35, .42]} radius={.075} c={PALETTE.metal} /><Rod a={[0, .35, .42]} b={[0, .08, -.25]} radius={.075} c={PALETTE.metal} /><S p={[0,.35,.42]} scale={.45} c={PALETTE.amber} /></G>
  <G i={2} {...props}><B p={[0, 0, -.45]} s={[2.25, .28, .28]} c={PALETTE.carbon} rounded={.08} /><Gear p={[0,.23,-.22]} r={[0,0,0]} radius={.32} width={.18} teeth={12} c={PALETTE.metal} /></G>
  <G i={3} {...props}><Rod a={[-1.05,0,-.45]} b={[-2.0,-.2,-.55]} radius={.055} c={PALETTE.red} /><Rod a={[1.05,0,-.45]} b={[2.0,-.2,-.55]} radius={.055} c={PALETTE.red} /></G>
  <G i={4} {...props}><Rod a={[-2,-.2,-.55]} b={[-2.0,.5,-.65]} radius={.085} c={PALETTE.metal} /><Rod a={[2,-.2,-.55]} b={[2.0,.5,-.65]} radius={.085} c={PALETTE.metal} /></G>
  <G i={5} {...props}><C p={[0,.52,.86]} r={[Math.PI/2,0,0]} radius={.16} h={.2} c={PALETTE.purple} /><C p={[-.98,0,-.45]} r={[0,0,Math.PI/2]} radius={.13} h={.18} c={PALETTE.purple} /><C p={[.98,0,-.45]} r={[0,0,Math.PI/2]} radius={.13} h={.18} c={PALETTE.purple} /></G>
  </> }

function BatteryModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><Cells p={[-.25,0,0]} rows={4} cols={6} /></G>
  <G i={1} {...props}>{[-.58,-.2,.18,.56].map(z => <B key={z} p={[-.25,.43,z]} s={[2.1,.06,.12]} c={PALETTE.copper} />)}<B p={[1.1,.42,-.7]} s={[.28,.22,.55]} c={PALETTE.red} /></G>
  <G i={2} {...props}><C p={[1.15,.15,.25]} radius={.28} h={.55} c={PALETTE.dark} /><C p={[1.15,.15,-.35]} radius={.28} h={.55} c={PALETTE.dark} /><B p={[.72,.15,.75]} s={[.7,.32,.3]} c={PALETTE.amber} rounded={.08} /></G>
  <G i={3} {...props}><B p={[0,.72,0]} s={[2.25,.1,1.45]} c='#276b62' /><B p={[-.6,.82,0]} s={[.55,.08,.65]} c={PALETTE.dark} /></G>
  <G i={4} {...props}><B p={[1.1,.75,.62]} s={[.5,.32,.42]} c={PALETTE.purple} rounded={.06} /><Rod a={[.9,.72,.62]} b={[.55,.5,.25]} radius={.035} c={PALETTE.cyan} /></G>
  <G i={5} {...props}><B p={[0,-.5,0]} s={[3.05,.15,2.05]} c={PALETTE.cyan} opacity={.55} /><B p={[-1.52,.1,0]} s={[.12,1.25,2.05]} c={PALETTE.carbon} /><B p={[1.52,.1,0]} s={[.12,1.25,2.05]} c={PALETTE.carbon} /></G>
  </> }

function InverterModel(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-.72,0,.72].map(x => <B key={x} p={[x,.2,0]} s={[.58,.32,1.15]} c={PALETTE.dark} rounded={.07} />)}</G>
  <G i={1} {...props}>{[-.72,0,.72].map(x => <B key={x} p={[x,.52,0]} s={[.52,.08,.9]} c='#326b62' />)}</G>
  <G i={2} {...props}>{[-.5,0,.5].map(x => <C key={x} p={[x,.25,1.05]} radius={.23} h={.75} c={PALETTE.copper} />)}</G>
  <G i={3} {...props}><T p={[-1.18,.28,0]} r={[Math.PI/2,0,0]} radius={.32} tube={.08} c={PALETTE.purple} /><T p={[1.18,.28,0]} r={[Math.PI/2,0,0]} radius={.32} tube={.08} c={PALETTE.purple} /></G>
  <G i={4} {...props}><B p={[0,.85,-.35]} s={[2.3,.11,.95]} c='#267162' /><B p={[0,.98,-.35]} s={[.5,.08,.45]} c={PALETTE.dark} /></G>
  <G i={5} {...props}><B p={[0,-.25,0]} s={[2.95,.25,2.25]} c={PALETTE.cyan} opacity={.55} />{[-.75,-.25,.25,.75].map(x => <B key={x} p={[x,-.12,0]} s={[.12,.08,1.8]} c='#1d8ba3' />)}</G>
  </> }

function MotorModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><T r={[0,Math.PI/2,0]} radius={1.05} tube={.35} c={PALETTE.metal} />{Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return <T key={i} p={[0,Math.cos(a)*.95,Math.sin(a)*.95]} r={[0,Math.PI/2,0]} radius={.14} tube={.055} c={PALETTE.copper} />})}</G>
  <G i={1} {...props}><C r={[0,0,Math.PI/2]} radius={.68} h={1.25} c={PALETTE.dark} />{Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return <B key={i} p={[0,Math.cos(a)*.67,Math.sin(a)*.67]} s={[1.28,.18,.34]} r={[a,0,0]} c={PALETTE.red} />})}</G>
  <G i={2} {...props}><C r={[0,0,Math.PI/2]} radius={.16} h={3.35} c={PALETTE.metal} /><C p={[-1.2,0,0]} r={[0,0,Math.PI/2]} radius={.34} h={.22} c={PALETTE.purple} /><C p={[1.2,0,0]} r={[0,0,Math.PI/2]} radius={.34} h={.22} c={PALETTE.purple} /></G>
  <G i={3} {...props}><C p={[1.55,0,0]} r={[0,0,Math.PI/2]} radius={.45} h={.22} c={PALETTE.cyan} /><T p={[1.68,0,0]} r={[0,Math.PI/2,0]} radius={.27} tube={.05} c={PALETTE.amber} /></G>
  <G i={4} {...props}><T r={[0,Math.PI/2,0]} radius={1.38} tube={.14} c={PALETTE.carbon} opacity={.7} /><T p={[-.55,0,0]} r={[0,Math.PI/2,0]} radius={1.2} tube={.08} c={PALETTE.cyan} opacity={.55} /></G>
  <G i={5} {...props}>{[-.28,0,.28].map((z,i)=><C key={z} p={[-1.42,.85,z]} r={[0,0,Math.PI/2]} radius={.11} h={.55} c={[PALETTE.red,PALETTE.amber,PALETTE.cyan][i]} />)}</G>
  </> }

function DifferentialModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><Gear p={[0,0,0]} radius={1.35} width={.22} teeth={24} c={PALETTE.metal} /><Gear p={[0,1.22,.9]} r={[0,0,0]} radius={.42} width={.28} teeth={12} c={PALETTE.copper} /></G>
  <G i={1} {...props}><Gear p={[-.38,0,0]} radius={.48} width={.18} teeth={12} c={PALETTE.amber} /><Gear p={[.38,0,0]} radius={.48} width={.18} teeth={12} c={PALETTE.amber} /><Gear p={[0,.38,0]} r={[0,0,Math.PI/2]} radius={.35} width={.15} teeth={10} c={PALETTE.cyan} /></G>
  <G i={2} {...props}>{[-.35,-.22,-.09,.09,.22,.35].map(x=><C key={x} p={[x,0,0]} r={[0,0,Math.PI/2]} radius={.72} h={.045} c={x>0?PALETTE.red:PALETTE.dark} />)}</G>
  <G i={3} {...props}><C p={[-1.7,0,0]} r={[0,0,Math.PI/2]} radius={.42} h={.65} c={PALETTE.metal} /><C p={[1.7,0,0]} r={[0,0,Math.PI/2]} radius={.42} h={.65} c={PALETTE.metal} /></G>
  <G i={4} {...props}><T p={[-1.05,0,0]} r={[0,Math.PI/2,0]} radius={.53} tube={.12} c={PALETTE.purple} /><T p={[1.05,0,0]} r={[0,Math.PI/2,0]} radius={.53} tube={.12} c={PALETTE.purple} /><S scale={6.7} c={PALETTE.carbon} opacity={.12} /></G>
  <G i={5} {...props}><S p={[0,-.85,0]} scale={3.9} c={PALETTE.amber} opacity={.12} /><S p={[.82,.72,.72]} scale={.35} c={PALETTE.cyan} /></G>
  </> }

function CoolingModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[-1.15,.15,.2]} s={[1.15,.22,1.8]} c={PALETTE.cyan} opacity={.65} /><T p={[1.1,.1,.1]} r={[0,Math.PI/2,0]} radius={.7} tube={.16} c={PALETTE.cyan} opacity={.65} /></G>
  <G i={1} {...props}><C p={[0,-.65,.9]} r={[Math.PI/2,0,0]} radius={.42} radius2={.28} h={.75} c={PALETTE.dark} /><C p={[0,-.65,1.33]} r={[Math.PI/2,0,0]} radius={.18} h={.35} c={PALETTE.metal} /></G>
  <G i={2} {...props}><B p={[0,.35,-1.25]} s={[2.7,1.55,.28]} c={PALETTE.carbon} /><Fins p={[0,.35,-1.08]} /></G>
  <G i={3} {...props}><C p={[1.55,1.0,-.45]} radius={.36} radius2={.46} h={.95} c={PALETTE.amber} opacity={.72} /><C p={[1.55,1.54,-.45]} radius={.18} h={.12} c={PALETTE.dark} /></G>
  <G i={4} {...props}><Rod a={[-1.15,.2,.9]} b={[0,-.65,.9]} radius={.09} c={PALETTE.red} /><Rod a={[0,-.65,.9]} b={[0,.1,-1.1]} radius={.09} c={PALETTE.red} /><Rod a={[0,.55,-1.1]} b={[1.55,.55,-.45]} radius={.09} c={PALETTE.cyan} /><Rod a={[1.55,.55,-.45]} b={[1.1,.1,.8]} radius={.09} c={PALETTE.cyan} /></G>
  <G i={5} {...props}><S p={[-.55,-.3,.9]} scale={.32} c={PALETTE.purple} /><S p={[.35,.2,-1.05]} scale={.32} c={PALETTE.purple} /><S p={[1.35,.55,-.32]} scale={.32} c={PALETTE.purple} /></G>
  </> }

function EcuModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0,.25,0]} s={[.85,.24,.85]} c={PALETTE.dark} /><B p={[0,.4,0]} s={[.55,.08,.55]} c={PALETTE.metal} /></G>
  <G i={1} {...props}>{[-1.2,-.8,-.4,0,.4,.8,1.2].map(x=><B key={x} p={[x,-.55,1.05]} s={[.25,.42,.55]} c={PALETTE.cyan} />)}</G>
  <G i={2} {...props}>{[-.9,-.3,.3,.9].map(x=><B key={x} p={[x,.45,-.95]} s={[.38,.18,.25]} c={PALETTE.amber} />)}<Rod a={[-1.2,.55,-1.25]} b={[1.2,.55,-1.25]} radius={.035} c={PALETTE.red} /></G>
  <G i={3} {...props}><B p={[-.8,.12,.05]} s={[.62,.12,.72]} c={PALETTE.purple} /><B p={[-.8,.24,.05]} s={[.34,.05,.4]} c={PALETTE.cyan} /></G>
  <G i={4} {...props}><B p={[.8,.12,.05]} s={[.62,.12,.72]} c={PALETTE.red} />{[-.18,.18].map(z=><S key={z} p={[.8,.25,z]} scale={.2} c={PALETTE.cyan} />)}</G>
  <G i={5} {...props}><B p={[0,.1,-.65]} s={[.75,.12,.42]} c={PALETTE.green} /><B p={[0,.1,.7]} s={[.75,.12,.42]} c={PALETTE.copper} /></G>
  </> }

function SensorsModel(props: AssemblyProps) { return <>
  <G i={0} {...props}><C p={[-1.45,.35,.45]} r={[0,0,Math.PI/2]} radius={.26} h={.7} c={PALETTE.dark} /><Gear p={[-1.05,.35,.45]} radius={.48} width={.08} teeth={18} c={PALETTE.metal} /></G>
  <G i={1} {...props}><C p={[-.45,.45,-.55]} radius={.2} h={.75} c={PALETTE.copper} /><Rod a={[-.45,.05,-.55]} b={[-.45,-.55,-.55]} radius={.06} c={PALETTE.metal} /><C p={[.25,.45,-.55]} radius={.16} h={.6} c={PALETTE.purple} /></G>
  <G i={2} {...props}><B p={[.75,.3,.35]} s={[.75,.32,.72]} c={PALETTE.dark} rounded={.08} /><B p={[.75,.62,.35]} s={[1.1,.08,1.1]} c={PALETTE.cyan} /></G>
  <G i={3} {...props}><B p={[-.25,-.45,.65]} s={[1.5,.16,.35]} c={PALETTE.metal} />{[-.7,-.35,0,.35,.7].map(x=><B key={x} p={[-.25+x,-.34,.65]} s={[.12,.025,.28]} c={PALETTE.copper} />)}</G>
  <G i={4} {...props}><B p={[.55,-.35,-.35]} s={[1.15,.7,.85]} c={PALETTE.carbon} rounded={.1} /><B p={[.55,.05,-.35]} s={[.75,.07,.45]} c={PALETTE.green} /></G>
  <G i={5} {...props}><Rod a={[1.45,-.2,-.35]} b={[1.45,1.35,-.35]} radius={.045} c={PALETTE.cyan} /><S p={[1.45,1.42,-.35]} scale={.3} c={PALETTE.cyan} /><B p={[-1.15,-.55,-.75]} s={[1.2,.18,.7]} c={PALETTE.dark} /></G>
  </> }

function GPActiveFrontWing(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[0,.24,.47].map((y,i)=><B key={y} p={[0,y,-i*.18]} s={[3.6-i*.22,.09,.48]} r={[-.05-i*.04,0,0]} c={i ? '#29404a' : PALETTE.carbon} rounded={.045}/>)}</G>
  <G i={1} {...props}><B p={[-.78,.58,-.42]} s={[1.38,.09,.42]} r={[-.2,0,0]} c={PALETTE.cyan}/><B p={[.78,.58,-.42]} s={[1.38,.09,.42]} r={[-.2,0,0]} c={PALETTE.cyan}/></G>
  <G i={2} {...props}><B p={[-1.82,.28,-.05]} s={[.08,1.02,1.15]} c={PALETTE.dark}/><B p={[1.82,.28,-.05]} s={[.08,1.02,1.15]} c={PALETTE.dark}/></G>
  <G i={3} {...props}><C p={[-.35,.86,-.55]} r={[0,0,Math.PI/2]} radius={.13} h={.42} c={PALETTE.amber}/><C p={[.35,.86,-.55]} r={[0,0,Math.PI/2]} radius={.13} h={.42} c={PALETTE.amber}/><Rod a={[-.35,.8,-.5]} b={[-.78,.6,-.38]} radius={.035}/><Rod a={[.35,.8,-.5]} b={[.78,.6,-.38]} radius={.035}/></G>
  <G i={4} {...props}><Rod a={[-.62,.05,.1]} b={[-.3,1.0,.95]} radius={.065}/><Rod a={[.62,.05,.1]} b={[.3,1.0,.95]} radius={.065}/><B p={[0,1.0,.95]} s={[.72,.2,.45]} c={PALETTE.red} rounded={.08}/></G>
  <G i={5} {...props}>{[-1.3,-.65,0,.65,1.3].map((x,i)=><S key={x} p={[x,.28+i%2*.18,-.35]} scale={.28} c={PALETTE.purple}/>)}</G>
  </> }

function GPActiveRearWing(props: AssemblyProps) { return <>
  <G i={0} {...props}><B s={[3.15,.18,.76]} r={[-.1,0,0]} c={PALETTE.carbon} rounded={.06}/></G>
  <G i={1} {...props}><B p={[0,.58,-.4]} s={[2.82,.12,.42]} r={[-.22,0,0]} c={PALETTE.cyan} rounded={.05}/></G>
  <G i={2} {...props}><B p={[-1.62,.28,-.05]} s={[.09,1.22,1.2]} c={PALETTE.dark}/><B p={[1.62,.28,-.05]} s={[.09,1.22,1.2]} c={PALETTE.dark}/></G>
  <G i={3} {...props}><Rod a={[-.58,-.08,.1]} b={[-.58,-1.3,.5]} radius={.08}/><Rod a={[.58,-.08,.1]} b={[.58,-1.3,.5]} radius={.08}/><B p={[0,-1.3,.5]} s={[1.55,.2,.4]} c={PALETTE.carbon}/></G>
  <G i={4} {...props}><C p={[0,.9,-.48]} r={[0,0,Math.PI/2]} radius={.16} h={.7} c={PALETTE.amber}/><Rod a={[0,.85,-.48]} b={[0,.58,-.35]} radius={.04}/><S p={[0,.9,-.48]} scale={.35} c={PALETTE.purple}/></G>
  <G i={5} {...props}>{[-1.25,-.4,.4,1.25].map(x=><S key={x} p={[x,.22,-.18]} scale={.27} c={PALETTE.green}/>)}</G>
  </> }

function GPSurvivalCell(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[-.92,.15,0]} s={[.12,1.65,3.4]} c={PALETTE.carbon}/><B p={[.92,.15,0]} s={[.12,1.65,3.4]} c={PALETTE.carbon}/><B p={[0,-.65,0]} s={[1.84,.12,3.4]} c={PALETTE.carbon}/></G>
  <G i={1} {...props}><B p={[-.78,.12,0]} s={[.09,1.32,3.05]} c={PALETTE.amber} opacity={.58}/><B p={[.78,.12,0]} s={[.09,1.32,3.05]} c={PALETTE.amber} opacity={.58}/></G>
  <G i={2} {...props}><B p={[0,.1,1.58]} s={[1.76,1.48,.14]} c={PALETTE.metal}/><B p={[0,.1,-1.58]} s={[1.76,1.48,.14]} c={PALETTE.metal}/></G>
  <G i={3} {...props}><B p={[0,-.05,.15]} s={[1.05,1.25,1.75]} r={[-.18,0,0]} c={PALETTE.dark} rounded={.28}/><S p={[0,.82,-.15]} scale={1.45} c="#dce7ea"/></G>
  <G i={4} {...props}>{[-.38,.38].map(x=><Rod key={x} a={[x,.7,-.25]} b={[x*.55,-.6,.55]} radius={.055} c={PALETTE.red}/>)}<Rod a={[-.48,.15,.45]} b={[.48,.15,.45]} radius={.05} c={PALETTE.amber}/></G>
  <G i={5} {...props}><B p={[0,.68,-.48]} s={[.9,.52,.32]} c={PALETTE.dark} rounded={.14}/>{[-1.0,1.0].map(x=><B key={x} p={[x,.18,0]} s={[.2,1.05,2.3]} c={PALETTE.red} opacity={.65}/>)}</G>
  </> }

function GPHaloWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><Rod a={[0,-.55,1.0]} b={[0,1.45,.45]} radius={.13}/></G>
  <G i={1} {...props}><Rod a={[0,1.45,.45]} b={[-.7,1.05,-.05]} radius={.13}/><Rod a={[0,1.45,.45]} b={[.7,1.05,-.05]} radius={.13}/><Rod a={[-.7,1.05,-.05]} b={[-1.0,.45,-.55]} radius={.13}/><Rod a={[.7,1.05,-.05]} b={[1.0,.45,-.55]} radius={.13}/></G>
  <G i={2} {...props}>{[[0,-.55,1.0],[-1,.45,-.55],[1,.45,-.55]].map((p,i)=><C key={i} p={p as V3} radius={.24} h={.28} c={PALETTE.amber}/>)}</G>
  <G i={3} {...props}><Rod a={[-1.05,-.5,-1.1]} b={[-.82,1.35,-1.1]} radius={.11}/><Rod a={[1.05,-.5,-1.1]} b={[.82,1.35,-1.1]} radius={.11}/><Rod a={[-.82,1.35,-1.1]} b={[.82,1.35,-1.1]} radius={.11}/></G>
  <G i={4} {...props}><Rod a={[-.75,-.5,.95]} b={[0,.9,.95]} radius={.085}/><Rod a={[.75,-.5,.95]} b={[0,.9,.95]} radius={.085}/></G>
  <G i={5} {...props}><B p={[0,-.05,-.2]} s={[1.15,1.15,1.45]} c={PALETTE.carbon} rounded={.25}/><S p={[0,.62,.05]} scale={1.6} c={PALETTE.cyan} opacity={.16}/></G>
  </> }

function GPBrakeWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><C p={[1.2,0,0]} r={[0,0,Math.PI/2]} radius={1.18} h={.18} c="#555d60"/><C p={[1.2,0,0]} r={[0,0,Math.PI/2]} radius={.42} h={.24} c={PALETTE.dark}/></G>
  <G i={1} {...props}><B p={[.45,.1,.25]} s={[.78,1.3,.62]} c={PALETTE.red} rounded={.18}/>{[-.3,.3].map(y=><C key={y} p={[.02,y,.25]} r={[0,0,Math.PI/2]} radius={.17} h={.22}/>)}</G>
  <G i={2} {...props}><B p={[-1.45,-.35,.35]} s={[.34,1.1,.2]} r={[0,0,-.22]} c={PALETTE.metal} rounded={.06}/><C p={[-.55,.15,.35]} r={[0,0,Math.PI/2]} radius={.2} h={.8}/></G>
  <G i={3} {...props}><B p={[-.65,-.65,-.65]} s={[1.25,.65,.8]} c={PALETTE.dark} rounded={.12}/><C p={[-.1,-.65,-.65]} radius={.18} h={.72} c={PALETTE.amber}/></G>
  <G i={4} {...props}><C p={[-.65,.75,-.65]} r={[0,0,Math.PI/2]} radius={.42} h={.7} c={PALETTE.cyan}/><Rod a={[-.25,.75,-.65]} b={[.25,.45,-.35]} radius={.065} c={PALETTE.copper}/></G>
  <G i={5} {...props}><B p={[1.35,-.9,.2]} s={[1.4,.4,.72]} r={[0,.25,0]} c={PALETTE.cyan} opacity={.35}/>{[-.45,.45].map(x=><S key={x} p={[x,.65,.75]} scale={.3} c={PALETTE.purple}/>)}</G>
  </> }

function GPPowerUnitWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-.52,.52].map(x=><group key={x}><B p={[x,0,0]} s={[.72,.9,1.7]} r={[0,0,x>0?-.22:.22]} c={PALETTE.metal} rounded={.12}/>{[-.48,0,.48].map(z=><C key={z} p={[x,.52,z]} radius={.12} h={.36} c={PALETTE.amber}/>)}</group>)}</G>
  <G i={1} {...props}><T p={[1.5,.52,-.42]} r={[0,Math.PI/2,0]} radius={.55} tube={.18} c={PALETTE.metal}/><C p={[1.5,.52,.28]} r={[Math.PI/2,0,0]} radius={.42} radius2={.25} h={.8} c={PALETTE.dark}/></G>
  <G i={2} {...props}>{[-.62,.62].map(x=><Rod key={x} a={[x,.55,.55]} b={[x*.45,1.3,-.2]} radius={.055} c={PALETTE.copper}/>)}<B p={[0,1.38,-.3]} s={[1.5,.22,.72]} c={PALETTE.carbon}/></G>
  <G i={3} {...props}><T p={[-1.45,-.15,0]} r={[0,Math.PI/2,0]} radius={.62} tube={.24} c={PALETTE.cyan}/><C p={[-1.45,-.15,0]} r={[0,0,Math.PI/2]} radius={.36} h={.8} c={PALETTE.dark}/></G>
  <G i={4} {...props}><C p={[.4,-.9,.2]} r={[0,0,Math.PI/2]} radius={.28} h={1.2} c={PALETTE.green}/><B p={[-.5,-.9,.2]} s={[.8,.55,.7]} c={PALETTE.amber} rounded={.1}/></G>
  <G i={5} {...props}>{[-1.2,-.6,0,.6,1.2].map((x,i)=><S key={x} p={[x,.95,(i%2?-.8:.8)]} scale={.3} c={PALETTE.purple}/>)}</G>
  </> }

function GPControlWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0,.5,1.15]} s={[1.35,.72,.18]} c={PALETTE.dark} rounded={.2}/><B p={[0,.5,1.27]} s={[.72,.34,.05]} c={PALETTE.cyan}/></G>
  <G i={1} {...props}>{[-.6,-.3,0,.3,.6].map((x,i)=><C key={x} p={[x,.95,1.18]} radius={.1} h={.18} c={i%2?PALETTE.amber:PALETTE.purple}/>)}</G>
  <G i={2} {...props}><Rod a={[0,.45,1.02]} b={[0,.1,.18]} radius={.08}/><Rod a={[0,.1,.18]} b={[0,-.1,-.55]} radius={.08}/></G>
  <G i={3} {...props}><B p={[0,-.15,-.8]} s={[2.35,.3,.3]} c={PALETTE.carbon} rounded={.08}/><Gear p={[0,.1,-.55]} r={[0,0,0]} radius={.32} width={.18} teeth={14}/></G>
  <G i={4} {...props}><B p={[-.62,-.75,.2]} s={[.18,.55,.3]} r={[.2,0,0]} c={PALETTE.metal}/><B p={[0,-.75,.2]} s={[.18,.55,.3]} r={[.2,0,0]} c={PALETTE.metal}/><B p={[.62,-.75,.2]} s={[.18,.55,.3]} r={[.2,0,0]} c={PALETTE.metal}/></G>
  <G i={5} {...props}>{[-.9,.9].map(x=><S key={x} p={[x,-.15,-.8]} scale={.3} c={PALETTE.purple}/>)}<S p={[0,-.75,.2]} scale={.3} c={PALETTE.green}/></G>
  </> }

function GPFloorWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0,.05,0]} s={[3.5,.12,4.6]} c={PALETTE.carbon} rounded={.05}/>{[-1.62,1.62].map(x=><B key={x} p={[x,.16,.1]} s={[.16,.24,4.35]} c={PALETTE.dark}/>)}</G>
  <G i={1} {...props}>{[-.92,-.3,.3,.92].map((x,i)=><B key={x} p={[x,.23,-.1]} s={[.08,.28,3.55]} r={[0,0,x*.04]} c={i%2?PALETTE.cyan:'#31454d'}/>)}</G>
  <G i={2} {...props}>{[-1.45,1.45].map(x=><B key={x} p={[x,.24,.15]} s={[.22,.34,3.9]} c={PALETTE.cyan} opacity={.42}/>)}</G>
  <G i={3} {...props}>{[-1.05,-.35,.35,1.05].map(x=><B key={x} p={[x,.62,-2.15]} s={[.09,.7,1.65]} r={[-.3,0,0]} c={PALETTE.metal}/>)}</G>
  <G i={4} {...props}><B p={[0,-.14,.15]} s={[.55,.05,3.8]} c={PALETTE.amber}/>{[-1.25,1.25].map(x=><B key={x} p={[x,-.12,1.1]} s={[.24,.06,.85]} c={PALETTE.copper}/>)}</G>
  <G i={5} {...props}>{[-1.2,-.4,.4,1.2].map((x,i)=><S key={x} p={[x,.45,i%2?.8:-.8]} scale={.26} c={PALETTE.purple}/>)}<Rod a={[-1.2,.45,.8]} b={[1.2,.45,.8]} radius={.018} c={PALETTE.purple}/></G>
  </> }

function GPNoseWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><C p={[0,0,.4]} r={[Math.PI/2,0,0]} radius={.28} radius2={.7} h={3.2} c={PALETTE.red}/><B p={[0,0,-1.24]} s={[1.36,1.2,.16]} c={PALETTE.carbon}/></G>
  <G i={1} {...props}><B p={[0,0,-1.48]} s={[1.55,1.38,.18]} c={PALETTE.metal}/>{[-.48,.48].map(x=><C key={x} p={[x,0,-1.62]} radius={.14} h={.3} c={PALETTE.amber}/>)}</G>
  <G i={2} {...props}>{[-.62,.62].map(x=><Rod key={x} a={[x,-.3,-1.46]} b={[x,-.55,-2.12]} radius={.07}/>)}<B p={[0,-.55,-2.15]} s={[1.7,.18,.42]} c={PALETTE.dark}/></G>
  <G i={3} {...props}><B p={[0,.72,.2]} s={[.62,.28,.75]} c={PALETTE.dark} rounded={.12}/><C p={[0,.8,.2]} r={[0,0,Math.PI/2]} radius={.18} h={.72} c={PALETTE.cyan}/></G>
  <G i={4} {...props}><B p={[0,.05,-.72]} s={[.88,.58,.1]} c={PALETTE.cyan} opacity={.45}/>{[-.28,.28].map(x=><Rod key={x} a={[x,.3,-.76]} b={[x,.85,-.95]} radius={.035} c={PALETTE.metal}/>)}</G>
  <G i={5} {...props}>{[-.42,0,.42].map((x,i)=><S key={x} p={[x,.46,-1.25+i*.34]} scale={.28} c={i===1?PALETTE.green:PALETTE.purple}/>)}<Rod a={[0,.46,-.9]} b={[0,.46,.85]} radius={.02} c={PALETTE.purple}/></G>
  </> }

function GPTireWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><T p={[0,0,0]} r={[0,Math.PI/2,0]} scale={[1,1,1.85]} radius={1.25} tube={.43} c="#15191b"/>{Array.from({ length: 18 }, (_, i) => <B key={i} p={[0, Math.cos(i*Math.PI/9)*1.25, Math.sin(i*Math.PI/9)*1.25]} s={[1.55,.05,.18]} r={[i*Math.PI/9,0,0]} c="#2b3134" />)}</G>
  <G i={1} {...props}><T p={[0,0,0]} r={[0,Math.PI/2,0]} scale={[1,1,1.7]} radius={1.05} tube={.25} c={PALETTE.amber} opacity={.38}/><T p={[0,0,0]} r={[0,Math.PI/2,0]} scale={[1,1,1.45]} radius={.92} tube={.12} c={PALETTE.metal}/></G>
  <G i={2} {...props}><T p={[-.32,0,0]} r={[0,Math.PI/2,0]} radius={.74} tube={.1} c={PALETTE.copper}/><T p={[.32,0,0]} r={[0,Math.PI/2,0]} radius={.74} tube={.1} c={PALETTE.copper}/></G>
  <G i={3} {...props}><C p={[0,0,0]} r={[0,0,Math.PI/2]} radius={.78} h={1.25} c={PALETTE.metal}/><C p={[-.66,0,0]} r={[0,0,Math.PI/2]} radius={.82} h={.08} c={PALETTE.dark}/><C p={[-.72,0,0]} r={[0,0,Math.PI/2]} radius={.16} h={.1} c={PALETTE.metal}/></G>
  <G i={4} {...props}><S p={[0,0,0]} scale={2.05} c={PALETTE.cyan} opacity={.08}/><Rod a={[.38,.72,.15]} b={[.55,1.18,.28]} radius={.035} c={PALETTE.green}/></G>
  <G i={5} {...props}>{[-.42,0,.42].map((x,i)=><S key={x} p={[x,1.28,.08]} scale={.27} c={i===1?PALETTE.green:PALETTE.purple}/>)}<B p={[.55,1.15,.35]} s={[.35,.22,.18]} c={PALETTE.dark} rounded={.06}/></G>
  </> }

function GPFrontSuspensionWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-1,1].map(side=><group key={side}><Rod a={[side*.25,.55,-.85]} b={[side*1.65,.45,.25]} radius={.055}/><Rod a={[side*.25,.55,.75]} b={[side*1.65,.45,.25]} radius={.055}/></group>)}</G>
  <G i={1} {...props}>{[-1,1].map(side=><group key={side}><Rod a={[side*.35,-.45,-.75]} b={[side*1.65,.15,.25]} radius={.065}/><Rod a={[side*.35,-.45,.75]} b={[side*1.65,.15,.25]} radius={.065}/></group>)}</G>
  <G i={2} {...props}>{[-1,1].map(side=><group key={side}><C p={[side*1.68,.3,.25]} radius={.3} h={.62} c={PALETTE.dark}/><Rod a={[side*1.65,.35,.25]} b={[side*.42,1.1,.1]} radius={.045} c={PALETTE.red}/></group>)}</G>
  <G i={3} {...props}>{[-.55,.55].map(x=><group key={x}><T p={[x,1.12,.05]} r={[Math.PI/2,0,0]} radius={.3} tube={.09} c={PALETTE.amber}/><C p={[x,.65,-.65]} r={[Math.PI/2,0,0]} radius={.13} h={1.15} c={PALETTE.metal}/></group>)}</G>
  <G i={4} {...props}><C p={[0,.83,.15]} r={[0,0,Math.PI/2]} radius={.2} h={1.2} c={PALETTE.cyan}/><Rod a={[-.55,1.12,.05]} b={[.55,1.12,.05]} radius={.045} c={PALETTE.copper}/></G>
  <G i={5} {...props}>{[-1.68,0,1.68].map((x,i)=><S key={x} p={[x,.72,.25]} scale={.28} c={i===1?PALETTE.green:PALETTE.purple}/>)}<Rod a={[-1.68,.72,.25]} b={[1.68,.72,.25]} radius={.018} c={PALETTE.purple}/></G>
  </> }

function GPRearSuspensionWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-1,1].map(side=><group key={side}><Rod a={[side*.3,.55,-.85]} b={[side*1.62,.48,.2]} radius={.055}/><Rod a={[side*.3,.55,.75]} b={[side*1.62,.48,.2]} radius={.055}/></group>)}</G>
  <G i={1} {...props}>{[-1,1].map(side=><group key={side}><Rod a={[side*.38,-.45,-.72]} b={[side*1.62,.12,.2]} radius={.065}/><Rod a={[side*.38,-.45,.72]} b={[side*1.62,.12,.2]} radius={.065}/></group>)}</G>
  <G i={2} {...props}>{[-1,1].map(side=><group key={side}><C p={[side*1.65,.3,.2]} radius={.31} h={.64} c={PALETTE.dark}/><Rod a={[side*1.62,.35,.2]} b={[side*.5,1.08,-.05]} radius={.045} c={PALETTE.red}/></group>)}</G>
  <G i={3} {...props}>{[-.52,.52].map(x=><group key={x}><T p={[x,1.08,-.05]} r={[Math.PI/2,0,0]} radius={.29} tube={.09} c={PALETTE.amber}/><C p={[x,.62,-.62]} r={[Math.PI/2,0,0]} radius={.13} h={1.12} c={PALETTE.metal}/></group>)}</G>
  <G i={4} {...props}><Rod a={[-.52,1.08,-.05]} b={[.52,1.08,-.05]} radius={.045} c={PALETTE.copper}/><C p={[0,.78,.05]} r={[0,0,Math.PI/2]} radius={.19} h={1.1} c={PALETTE.cyan}/></G>
  <G i={5} {...props}><Rod a={[-1.62,.3,.2]} b={[-.34,.15,.2]} radius={.085} c={PALETTE.metal}/><Rod a={[1.62,.3,.2]} b={[.34,.15,.2]} radius={.085} c={PALETTE.metal}/>{[-1.62,1.62].map(x=><S key={x} p={[x,.65,.2]} scale={.27} c={PALETTE.purple}/>)}</G>
  </> }

function GPEnergyStoreWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-1.05,-.35,.35,1.05].flatMap((x,row)=>[-.65,0,.65].map((z,col)=><C key={`${x}-${z}`} p={[x,.05,z]} radius={.24} h={1.2} c={(row+col)%2?PALETTE.amber:PALETTE.copper}/>))}</G>
  <G i={1} {...props}><B p={[0,.74,0]} s={[2.75,.08,1.75]} c={PALETTE.copper}/>{[-.9,0,.9].map(x=><B key={x} p={[x,.82,0]} s={[.16,.08,1.5]} c={PALETTE.metal}/>)}</G>
  <G i={2} {...props}>{[-.65,.05,.75].map((x,i)=><C key={x} p={[x,1.12,.55]} radius={.19} h={.48} c={i===2?PALETTE.red:PALETTE.dark}/>)}<B p={[0,1.12,-.45]} s={[1.7,.35,.45]} c={PALETTE.dark} rounded={.08}/></G>
  <G i={3} {...props}><B p={[0,1.05,-.72]} s={[1.75,.18,.35]} c={PALETTE.green}/>{[-.7,-.35,0,.35,.7].map(x=><S key={x} p={[x,1.2,-.72]} scale={.22} c={PALETTE.purple}/>)}</G>
  <G i={4} {...props}><B p={[0,-.78,0]} s={[2.9,.16,1.9]} c={PALETTE.cyan}/>{[-1,0,1].map(x=><Rod key={x} a={[x,-.68,-.72]} b={[x,-.68,.72]} radius={.045} c={PALETTE.metal}/>)}</G>
  <G i={5} {...props}><B p={[0,0,0]} s={[3.25,1.95,2.2]} c={PALETTE.carbon} opacity={.28}/><Rod a={[-1.62,.95,.9]} b={[1.62,.95,.9]} radius={.025} c={PALETTE.red}/><S p={[1.45,1.02,.9]} scale={.28} c={PALETTE.green}/></G>
  </> }

function GPInverterWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>{[-1.0,0,1.0].flatMap(x=>[-.45,.45].map(z=><B key={`${x}-${z}`} p={[x,.15,z]} s={[.72,.62,.58]} c={PALETTE.dark} rounded={.08}/>))}</G>
  <G i={1} {...props}><B p={[0,.75,0]} s={[2.75,.08,1.4]} c={PALETTE.copper}/>{[-.78,0,.78].map(x=><C key={x} p={[x,1.02,-.3]} radius={.25} h={.6} c={PALETTE.cyan}/>)}</G>
  <G i={2} {...props}>{[-1.0,0,1.0].map(x=><B key={x} p={[x,.72,.48]} s={[.68,.12,.38]} c={PALETTE.green}/>)}</G>
  <G i={3} {...props}>{[-.8,0,.8].map((x,i)=><T key={x} p={[x,.12,-.65]} r={[Math.PI/2,0,0]} radius={.25} tube={.06} c={i===1?PALETTE.purple:PALETTE.cyan}/>)}<S p={[0,.55,-.65]} scale={.25} c={PALETTE.amber}/></G>
  <G i={4} {...props}><B p={[0,1.18,.38]} s={[2.15,.18,.6]} c={PALETTE.green}/>{[-.7,-.35,0,.35,.7].map(x=><S key={x} p={[x,1.32,.38]} scale={.2} c={PALETTE.purple}/>)}</G>
  <G i={5} {...props}><B p={[0,-.62,0]} s={[2.95,.18,1.65]} c={PALETTE.cyan}/><B p={[0,0,0]} s={[3.2,1.75,1.95]} c={PALETTE.metal} opacity={.2}/></G>
  </> }

function GPTransmissionWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}>
    <Rod a={[-.38, 0, -1.42]} b={[-.38, 0, 1.42]} radius={.075} c={PALETTE.amber} />
    <Rod a={[.38, 0, -1.42]} b={[.38, 0, 1.42]} radius={.075} c={PALETTE.metal} />
    {Array.from({ length: 8 }, (_, i) => {
      const z = -1.12 + i * .32
      const primaryRadius = .25 + i * .025
      const secondaryRadius = .51 - i * .025
      return <group key={z}>
        <Gear p={[-.38, 0, z]} radius={primaryRadius} width={.14} teeth={12 + i} c={PALETTE.amber} />
        <Gear p={[.38, 0, z]} radius={secondaryRadius} width={.14} teeth={24 - i} c={PALETTE.metal} />
      </group>
    })}
  </G>
  <G i={1} {...props}><C p={[0,1.0,0]} r={[Math.PI/2,0,0]} radius={.24} h={2.3} c={PALETTE.dark}/>{[-.75,0,.75].map(z=><B key={z} p={[0,.82,z]} s={[1.65,.12,.18]} c={PALETTE.red}/>)}</G>
  <G i={2} {...props}><Gear p={[0,0,-1.55]} radius={.82} width={.22} teeth={26} c={PALETTE.metal}/><Gear p={[0,0,-2.05]} radius={.4} width={.22} teeth={14} c={PALETTE.amber}/></G>
  <G i={3} {...props}><C p={[0,0,-2.5]} r={[Math.PI/2,0,0]} radius={.65} h={.75} c={PALETTE.dark}/>{[-.28,0,.28].map(x=><Gear key={x} p={[x,0,-2.5]} radius={.24} width={.1} teeth={10} c={PALETTE.copper}/>)}</G>
  <G i={4} {...props}><Rod a={[-2.0,0,-2.5]} b={[-.4,0,-2.5]} radius={.1}/><Rod a={[.4,0,-2.5]} b={[2.0,0,-2.5]} radius={.1}/>{[-2,2].map(x=><T key={x} p={[x,0,-2.5]} r={[0,Math.PI/2,0]} radius={.23} tube={.08} c={PALETTE.cyan}/>)}</G>
  <G i={5} {...props}><B p={[0,0,-.6]} s={[2.2,1.75,4.5]} c={PALETTE.metal} opacity={.22}/><B p={[0,-.78,-.6]} s={[1.65,.15,3.8]} c={PALETTE.cyan}/></G>
  </> }

function GPCoolingWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><C p={[-1.1,.35,0]} radius={.42} h={1.1} c={PALETTE.red}/><Rod a={[-1.1,.75,0]} b={[-.3,1.2,.65]} radius={.1} c={PALETTE.red}/><B p={[-.3,1.2,.65]} s={[.8,.55,.22]} c={PALETTE.metal}/></G>
  <G i={1} {...props}><C p={[0,.2,-.4]} radius={.34} h={.9} c={PALETTE.amber}/><Rod a={[0,.5,-.4]} b={[.8,1.05,-.65]} radius={.08} c={PALETTE.amber}/><B p={[.8,1.05,-.65]} s={[.72,.48,.2]} c={PALETTE.dark}/></G>
  <G i={2} {...props}><T p={[1.05,.35,.35]} r={[0,Math.PI/2,0]} radius={.5} tube={.16} c={PALETTE.metal}/><B p={[1.05,1.18,.35]} s={[.9,.52,.24]} c={PALETTE.cyan}/></G>
  <G i={3} {...props}><B p={[0,-.85,.35]} s={[1.8,.3,.75]} c={PALETTE.cyan} rounded={.08}/><Rod a={[-.72,-.7,.35]} b={[.72,-.7,.35]} radius={.07} c={PALETTE.green}/></G>
  <G i={4} {...props}>{[-1.45,1.45].map(x=><group key={x}><B p={[x,.2,-.1]} s={[.32,2.25,1.35]} r={[0,0,x>0?.18:-.18]} c={PALETTE.metal}/>{[-.42,0,.42].map(y=><B key={y} p={[x,.2+y,-.78]} s={[.28,.04,.22]} c={PALETTE.dark}/>)}</group>)}</G>
  <G i={5} {...props}><C p={[0,-.35,-.82]} r={[0,0,Math.PI/2]} radius={.28} h={.75} c={PALETTE.green}/><C p={[.65,-.35,-.82]} radius={.22} h={.65} c={PALETTE.dark}/>{[-.85,0,.85].map(x=><S key={x} p={[x,.65,-.8]} scale={.25} c={PALETTE.purple}/>)}</G>
  </> }

function GPEcuWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0,0,0]} s={[2.65,.85,1.75]} c={PALETTE.dark} rounded={.16}/><B p={[0,.48,0]} s={[1.85,.08,1.15]} c={PALETTE.green}/></G>
  <G i={1} {...props}>{[-.75,0,.75].map((x,i)=><B key={x} p={[x,.72,-.45]} s={[.55,.2,.48]} c={i===1?PALETTE.red:PALETTE.amber}/>)}</G>
  <G i={2} {...props}><B p={[-.72,.72,.45]} s={[.7,.18,.5]} c={PALETTE.purple}/><B p={[.72,.72,.45]} s={[.7,.18,.5]} c={PALETTE.cyan}/></G>
  <G i={3} {...props}>{[-.72,.72].map(x=><B key={x} p={[x,-.72,.35]} s={[.65,.35,.55]} c={PALETTE.metal} rounded={.07}/>)}<Rod a={[-.72,-.45,.35]} b={[.72,-.45,.35]} radius={.035} c={PALETTE.copper}/></G>
  <G i={4} {...props}>{[-1.45,-.9,-.35,.35,.9,1.45].map((x,i)=><C key={x} p={[x,0,-1.05]} r={[0,0,Math.PI/2]} radius={.12} h={.35} c={i%2?PALETTE.cyan:PALETTE.purple}/>)}<Rod a={[-1.45,.1,-1.25]} b={[1.45,.1,-1.25]} radius={.025} c={PALETTE.green}/></G>
  <G i={5} {...props}><B p={[0,-.72,-.45]} s={[1.6,.32,.55]} c={PALETTE.red}/>{[-.55,0,.55].map(x=><S key={x} p={[x,-.48,-.45]} scale={.23} c={PALETTE.green}/>)}</G>
  </> }

function GPSensorsWorkshop(props: AssemblyProps) { return <>
  <G i={0} {...props}><B p={[0,.85,0]} s={[.75,.42,.75]} c={PALETTE.dark} rounded={.08}/>{[-.18,0,.18].map(x=><S key={x} p={[x,1.15,0]} scale={.22} c={PALETTE.cyan}/>)}<Rod a={[0,1.05,.4]} b={[0,1.55,.9]} radius={.035} c={PALETTE.green}/></G>
  <G i={1} {...props}>{[-1.35,1.35].map(x=><group key={x}><Gear p={[x,0,.55]} radius={.42} width={.09} teeth={18}/><C p={[x,.65,.55]} radius={.16} h={.6} c={PALETTE.red}/></group>)}</G>
  <G i={2} {...props}>{[-1.25,-.42,.42,1.25].map((x,i)=><group key={x}><Rod a={[x,-.25,-.7]} b={[x,.25,-.2]} radius={.05}/><S p={[x,.3,-.15]} scale={.24} c={i%2?PALETTE.purple:PALETTE.amber}/></group>)}</G>
  <G i={3} {...props}><B p={[0,-.8,.3]} s={[2.2,.3,.78]} c={PALETTE.dark}/>{[-.75,-.25,.25,.75].map((x,i)=><S key={x} p={[x,-.55,.3]} scale={.24} c={i%2?PALETTE.red:PALETTE.copper}/>)}</G>
  <G i={4} {...props}><B p={[0,-.35,-.85]} s={[1.8,.65,.72]} c={PALETTE.green} rounded={.1}/><Rod a={[0,-.05,-1.0]} b={[0,1.35,-1.3]} radius={.045} c={PALETTE.cyan}/><T p={[0,1.45,-1.35]} r={[Math.PI/2,0,0]} radius={.3} tube={.045} c={PALETTE.cyan}/></G>
  <G i={5} {...props}><B p={[0,.25,1.05]} s={[1.45,.7,.55]} c={PALETTE.red} rounded={.1}/>{[-.45,0,.45].map(x=><S key={x} p={[x,.7,1.05]} scale={.24} c={PALETTE.green}/>)}</G>
  </> }

const GP_MODEL_BY_PART: Record<PartId, (props: AssemblyProps) => ReactNode> = {
  'front-wing': GPActiveFrontWing, 'rear-wing': GPActiveRearWing,
  floor: GPFloorWorkshop,
  nose: GPNoseWorkshop,
  monocoque: GPSurvivalCell, halo: GPHaloWorkshop,
  tires: GPTireWorkshop, brakes: GPBrakeWorkshop,
  'front-suspension': GPFrontSuspensionWorkshop,
  'rear-suspension': GPRearSuspensionWorkshop,
  steering: GPControlWorkshop,
  battery: GPEnergyStoreWorkshop,
  inverter: GPInverterWorkshop,
  motor: GPPowerUnitWorkshop,
  differential: GPTransmissionWorkshop,
  cooling: GPCoolingWorkshop,
  ecu: GPEcuWorkshop,
  sensors: GPSensorsWorkshop,
}

const MODEL_BY_PART: Record<PartId, (props: AssemblyProps) => ReactNode> = {
  'front-wing': FrontWing, 'rear-wing': RearWing, floor: FloorModel, nose: NoseModel, monocoque: MonocoqueModel, halo: HaloModel, tires: TireModel, brakes: BrakeModel,
  'front-suspension': FrontSuspension, 'rear-suspension': RearSuspension, steering: SteeringModel, battery: BatteryModel, inverter: InverterModel, motor: MotorModel,
  differential: DifferentialModel, cooling: CoolingModel, ecu: EcuModel, sensors: SensorsModel,
}

function ModelAssembly({ vehicleId, partId, explode, ...props }: AssemblyProps & { vehicleId: VehicleId; partId: PartId }) {
  const Model = vehicleId === 'grand-prix-2026' ? GP_MODEL_BY_PART[partId] : MODEL_BY_PART[partId]
  const ref = useRef<Group>(null)
  const baseScale = partId === 'floor' ? .92 : partId === 'steering' ? 1.05 : 1.18
  const targetScale = useMemo(() => new Vector3(baseScale, baseScale, baseScale), [baseScale])
  useFrame((_, delta) => {
    const scale = workshopScaleForExplode(baseScale, explode)
    targetScale.setScalar(scale)
    ref.current?.scale.lerp(targetScale, 1 - Math.exp(-7 * delta))
  })
  return <group ref={ref} rotation={[.04, -.38, 0]} scale={baseScale}><Model {...props} explode={explode} /></group>
}

const ui = {
  zh: { reset: '复位视角', rotate: '自动旋转', stop: '停止旋转', explode: '分层拆解', assemble: '合拢部件', structure: '结构组成', position: '所在位置', role: '功能作用', principle: '工作机理', plain: '通俗理解' },
  en: { reset: 'Reset view', rotate: 'Auto rotate', stop: 'Stop rotation', explode: 'Explode', assemble: 'Assemble', structure: 'Subassemblies', position: 'Location', role: 'Function', principle: 'How it works', plain: 'Plain-language view' },
}

export function ComponentWorkshop({ vehicleId, partId, locale, lesson }: { vehicleId: VehicleId; partId: PartId; locale: Locale; lesson: EngineeringLesson }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [explode, setExplode] = useState(0)
  const [autoRotate, setAutoRotate] = useState(false)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const c = ui[locale]
  const facts = vehicleId === 'grand-prix-2026' ? grandPrixWorkshopFacts(partId, lesson) : COMPONENT_FACTS[partId]
  const current = selected === null ? null : facts[selected]!
  useEffect(() => {
    setSelected(null)
    setExplode(0)
    setAutoRotate(false)
    const frame = requestAnimationFrame(() => controls.current?.reset())
    return () => cancelAnimationFrame(frame)
  }, [vehicleId, partId])
  return <div className="component-learning">
    <section className="component-workshop">
      <div className="component-workshop__stage">
        <div className="component-workshop__tools">
          <button onClick={() => controls.current?.reset()} aria-label={c.reset} title={c.reset}><RotateCcw size={18} /></button>
          <button className={autoRotate ? 'is-active' : ''} onClick={() => setAutoRotate(value => !value)} aria-label={autoRotate ? c.stop : c.rotate} title={autoRotate ? c.stop : c.rotate} aria-pressed={autoRotate}>{autoRotate ? <Pause size={18} /> : <Play size={18} />}</button>
        </div>
        <Canvas camera={{ position: [4.7, 3.35, 5.45], fov: 38 }} dpr={[1, 1.55]} onPointerMissed={() => setSelected(null)}>
          <color attach="background" args={['#101b21']} />
          <ambientLight intensity={1.25} /><directionalLight position={[5, 7, 5]} intensity={2.2} color="#dff8ff" /><pointLight position={[-4, 2, -3]} intensity={8} color="#37d7ff" distance={10} />
          <ModelAssembly vehicleId={vehicleId} partId={partId} selected={selected} explode={explode} onSelect={setSelected} />
          <ContactShadows position={[0, -2.05, 0]} opacity={.38} scale={9} blur={2.3} far={5} />
          <OrbitControls ref={controls} makeDefault autoRotate={autoRotate} autoRotateSpeed={1.05} enableDamping dampingFactor={.08} minDistance={3.5} maxDistance={12} maxPolarAngle={Math.PI * .82} />
        </Canvas>
        <div className="component-workshop__explode"><button onClick={() => setExplode(explode > .5 ? 0 : 1)}><Layers3 size={18} />{explode > .5 ? c.assemble : c.explode}</button><input aria-label={c.explode} type="range" min="0" max="1" step="0.01" value={explode} onChange={(event) => setExplode(Number(event.target.value))} /><strong>{Math.round(explode * 100)}%</strong></div>
      </div>
      <div className="component-workshop__parts"><strong><Box size={17} />{c.structure}</strong><div>{lesson.subcomponents.map((name, index) => <button key={index} className={selected === index ? 'is-active' : ''} onClick={() => setSelected(index)} aria-pressed={selected === index}><i />{localise(name, locale)}</button>)}</div></div>
    </section>
    {selected === null || current === null ? <aside className="component-inspector is-empty" aria-hidden="true"><Box size={40} /></aside> : <aside className="component-inspector">
      <header><span><Cog size={18} />{c.structure}</span><h3>{localise(lesson.subcomponents[selected]!, locale)}</h3></header>
      <div><article><span><MapPin size={17} />{c.position}</span><p>{localise(current.position, locale)}</p></article><article><span><Wrench size={17} />{c.role}</span><p>{localise(current.role, locale)}</p></article><article><span><CircleDot size={17} />{c.principle}</span><p>{localise(current.principle, locale)}</p></article><article className="is-plain"><span><Lightbulb size={17} />{c.plain}</span><p>{localise(current.plain, locale)}</p></article></div>
    </aside>}
  </div>
}
