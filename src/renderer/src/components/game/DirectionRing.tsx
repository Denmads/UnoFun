import type { PlayDirection } from '../../../../shared/types'

interface DirectionRingProps {
  direction: PlayDirection
  size?: number
}

const CX = 100
const CY = 100
const R = 85

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function arcPath(startDeg: number, endDeg: number): string {
  const x1 = CX + R * Math.cos(toRad(startDeg))
  const y1 = CY + R * Math.sin(toRad(startDeg))
  const x2 = CX + R * Math.cos(toRad(endDeg))
  const y2 = CY + R * Math.sin(toRad(endDeg))
  const span = ((endDeg - startDeg) % 360 + 360) % 360
  const largeArc = span > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`
}

function arrowheadPath(tipDeg: number, headSize: number = 10): string {
  const tipX = CX + R * Math.cos(toRad(tipDeg))
  const tipY = CY + R * Math.sin(toRad(tipDeg))
  const backDeg = tipDeg - 18
  const innerR = R - headSize
  const outerR = R + headSize
  const x1 = CX + innerR * Math.cos(toRad(backDeg))
  const y1 = CY + innerR * Math.sin(toRad(backDeg))
  const x2 = CX + outerR * Math.cos(toRad(backDeg))
  const y2 = CY + outerR * Math.sin(toRad(backDeg))
  return `M ${tipX} ${tipY} L ${x1} ${y1} L ${x2} ${y2} Z`
}

const ARCS = [
  { start: 5, end: 105 },
  { start: 125, end: 225 },
  { start: 245, end: 345 },
]

export default function DirectionRing({ direction, size = 310 }: DirectionRingProps) {
  const isClockwise = direction === 'clockwise'
  const strokeColor = 'hsl(240 28% 23.5%)'
  const fillColor = 'hsl(240 28% 23.5%)'

  return (
    <div
      className="pointer-events-none"
      style={{
        width: size,
        height: size,
        transform: isClockwise ? undefined : 'scaleX(-1)',
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {ARCS.map((arc, i) => (
          <g key={i}>
            <path
              d={arcPath(arc.start, arc.end)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <path
              d={arrowheadPath(arc.end + 5)}
              fill={fillColor}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
