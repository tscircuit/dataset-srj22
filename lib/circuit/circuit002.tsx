import { Fragment } from "react"

const bgaGrid: ReadonlyArray<readonly [string, readonly number[]]> = [
  ["A", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  ["B", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  ["C", [1, 2, 3, 10, 11]],
  ["D", [1, 2, 10, 11]],
  ["E", [1, 2, 10, 11]],
  ["F", [1, 2, 10, 11]],
  ["G", [1, 2, 10, 11]],
  ["H", [1, 2, 10, 11]],
  ["I", [1, 2, 8, 9, 10, 11]],
  ["J", [1, 2, 3, 4, 5, 6, 7, 9, 10, 11]],
  ["K", [1, 2, 3, 4, 5, 6, 7, 8, 11]],
] as const

const bgaPitchMm = 0.5
const bgaColumnCount = 11
const bgaRowCount = bgaGrid.length
const bgaXOriginMm = -((bgaColumnCount - 1) * bgaPitchMm) / 2
const bgaYOriginMm = ((bgaRowCount - 1) * bgaPitchMm) / 2

const bgaPins = bgaGrid.flatMap(([row, columns], rowIndex) =>
  columns.map((column) => {
    const label = `${row}${column}`
    const pinNumber =
      bgaGrid
        .slice(0, rowIndex)
        .reduce((pinCount, [, rowColumns]) => pinCount + rowColumns.length, 0) +
      columns.indexOf(column) +
      1

    return {
      pin: `pin${pinNumber}`,
      label,
      x: bgaXOriginMm + (column - 1) * bgaPitchMm,
      y: bgaYOriginMm - rowIndex * bgaPitchMm,
    }
  }),
)

const pinLabels = Object.fromEntries(
  bgaPins.map(({ pin, label }) => [pin, [label]]),
)

const bottomSupportGrid = [
  {
    type: "inductor",
    name: "L_AVDD",
    rail: "AVDD",
    gridX: -2,
    gridY: 1,
    rotation: "90deg",
    bgaPin: "pin2",
    edgePad: "PAD2.pin1",
  },
  {
    type: "inductor",
    name: "L_DVDD",
    rail: "DVDD",
    gridX: 0,
    gridY: 1,
    rotation: "90deg",
    bgaPin: "pin8",
    edgePad: "PAD8.pin1",
  },
  {
    type: "inductor",
    name: "L_DOVDD",
    rail: "DOVDD",
    gridX: 2,
    gridY: 1,
    rotation: "90deg",
    bgaPin: "pin65",
    edgePad: "PAD65.pin1",
  },
  {
    type: "capacitor",
    name: "C_AVDD",
    rail: "AVDD",
    gridX: -2,
    gridY: -1,
    rotation: "0deg",
    bgaPin: "pin2",
    groundPin: "pin3",
  },
  {
    type: "capacitor",
    name: "C_DVDD_1",
    rail: "DVDD",
    gridX: -1,
    gridY: -1,
    rotation: "0deg",
    bgaPin: "pin8",
    groundPin: "pin9",
  },
  {
    type: "capacitor",
    name: "C_DVDD_2",
    rail: "DVDD",
    gridX: 0,
    gridY: -1,
    rotation: "0deg",
    bgaPin: "pin63",
    groundPin: "pin71",
  },
  {
    type: "capacitor",
    name: "C_DOVDD_1",
    rail: "DOVDD",
    gridX: 1,
    gridY: -1,
    rotation: "0deg",
    bgaPin: "pin54",
    groundPin: "pin56",
  },
  {
    type: "capacitor",
    name: "C_DOVDD_2",
    rail: "DOVDD",
    gridX: 2,
    gridY: -1,
    rotation: "0deg",
    bgaPin: "pin65",
    groundPin: "pin70",
  },
] as const

const bottomSupportGridPitchMm = 1.25
const powerRails = ["AVDD", "DVDD", "DOVDD"] as const

type Point = { x: number; y: number }
type PowerRail = (typeof powerRails)[number]
type CopperPourLayer = "top" | "inner1" | "inner2" | "bottom"
type Quadrant = "nw" | "ne" | "sw" | "se"
type CopperPourRegion = {
  name: string
  connectsTo: `net.${string}`
  outline: Point[]
}

const boardCopperPourBounds = {
  minX: -10.8,
  maxX: 10.8,
  minY: -10.8,
  maxY: 10.8,
} as const

const getQuadrant = ({ x, y }: Point): Quadrant => {
  if (x < 0 && y >= 0) return "nw"
  if (x >= 0 && y >= 0) return "ne"
  if (x < 0 && y < 0) return "sw"
  return "se"
}

const getQuadrantLabel = (quadrant: Quadrant) =>
  ({
    nw: "northwest",
    ne: "northeast",
    sw: "southwest",
    se: "southeast",
  })[quadrant]

const getPointBounds = (points: Point[]) => ({
  minX: Math.min(...points.map((point) => point.x)),
  maxX: Math.max(...points.map((point) => point.x)),
  minY: Math.min(...points.map((point) => point.y)),
  maxY: Math.max(...points.map((point) => point.y)),
})

const createRectOutlineFromPoints = (
  points: Point[],
  margin: number,
): Point[] => {
  const bounds = getPointBounds(points)
  const minX = Math.max(boardCopperPourBounds.minX, bounds.minX - margin)
  const maxX = Math.min(boardCopperPourBounds.maxX, bounds.maxX + margin)
  const minY = Math.max(boardCopperPourBounds.minY, bounds.minY - margin)
  const maxY = Math.min(boardCopperPourBounds.maxY, bounds.maxY + margin)

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
}

const groupPointsByQuadrant = (points: Point[]) => {
  const grouped: Record<Quadrant, Point[]> = {
    nw: [],
    ne: [],
    sw: [],
    se: [],
  }

  for (const point of points) {
    grouped[getQuadrant(point)].push(point)
  }

  return grouped
}

const getDensestPointCluster = (points: Point[]): Point[] => {
  const grouped = groupPointsByQuadrant(points)
  const sortedClusters = Object.values(grouped)
    .filter((cluster) => cluster.length > 0)
    .sort((a, b) => b.length - a.length)

  return sortedClusters[0] ?? []
}

const getEdgePadPosition = (index: number) => {
  const boardEdge = 10.3
  const topCount = 18
  const rightCount = 18
  const bottomCount = 18
  const leftCount = 17
  const spread = 18

  if (index < topCount) {
    return {
      x: -spread / 2 + (index * spread) / (topCount - 1),
      y: boardEdge,
    }
  }

  if (index < topCount + rightCount) {
    const sideIndex = index - topCount
    return {
      x: boardEdge,
      y: boardEdge - (sideIndex * spread) / (rightCount - 1),
    }
  }

  if (index < topCount + rightCount + bottomCount) {
    const sideIndex = index - topCount - rightCount
    return {
      x: boardEdge - (sideIndex * spread) / (bottomCount - 1),
      y: -boardEdge,
    }
  }

  const sideIndex = index - topCount - rightCount - bottomCount
  return {
    x: -boardEdge,
    y: -boardEdge + (sideIndex * spread) / (leftCount - 1),
  }
}

const getBottomSupportPosition = (gridX: number, gridY: number) => ({
  x: gridX * bottomSupportGridPitchMm,
  y: gridY * bottomSupportGridPitchMm,
})

const getBgaPinPosition = (pinName: string): Point => {
  const pinInfo = bgaPins.find(({ pin }) => pin === pinName)
  if (!pinInfo) throw new Error(`Unknown BGA pin "${pinName}"`)
  return { x: pinInfo.x, y: pinInfo.y }
}

const PassiveFootprint = ({ type }: { type: "capacitor" | "inductor" }) => {
  const isInductor = type === "inductor"
  const padOffset = isInductor ? 0.45 : 0.28
  const padWidth = isInductor ? 0.45 : 0.28
  const padHeight = isInductor ? 0.5 : 0.34

  return (
    <footprint>
      <smtpad
        pcbX={`${-padOffset}mm`}
        pcbY="0mm"
        layer="bottom"
        shape="rect"
        width={`${padWidth}mm`}
        height={`${padHeight}mm`}
        portHints={["pin1", "1"]}
      />
      <smtpad
        pcbX={`${padOffset}mm`}
        pcbY="0mm"
        layer="bottom"
        shape="rect"
        width={`${padWidth}mm`}
        height={`${padHeight}mm`}
        portHints={["pin2", "2"]}
      />
    </footprint>
  )
}

const getPowerRailPins = (rail: PowerRail) =>
  Array.from(
    new Set(
      bottomSupportGrid
        .filter((part) => part.rail === rail)
        .map((part) => part.bgaPin),
    ),
  )

const getGroundPins = () =>
  Array.from(
    new Set(
      bottomSupportGrid.flatMap((part) =>
        "groundPin" in part ? [part.groundPin] : [],
      ),
    ),
  )

const getPowerRailSupportPoints = (rail: PowerRail): Point[] =>
  bottomSupportGrid
    .filter((part) => part.rail === rail)
    .map(({ gridX, gridY }) => getBottomSupportPosition(gridX, gridY))

const getPowerPourRegions = (): CopperPourRegion[] =>
  powerRails.map((rail) => {
    const railPoints = [
      ...getPowerRailPins(rail).map((pin) => getBgaPinPosition(pin)),
      ...getPowerRailSupportPoints(rail),
    ]
    const clusterPoints = getDensestPointCluster(railPoints)
    const quadrant = getQuadrant(clusterPoints[0] ?? railPoints[0])

    return {
      name: `${rail}_${getQuadrantLabel(quadrant)}_island`,
      connectsTo: `net.${rail}`,
      outline: createRectOutlineFromPoints(clusterPoints, 0.65),
    } satisfies CopperPourRegion
  })

const getGroundPourRegions = (): CopperPourRegion[] => [
  {
    name: "GND_bga_return_cluster",
    connectsTo: "net.GND",
    outline: createRectOutlineFromPoints(
      getGroundPins().map((pin) => getBgaPinPosition(pin)),
      0.85,
    ),
  },
]

const copperPourRegions = {
  ground: getGroundPourRegions(),
  power: getPowerPourRegions(),
} as const

const getGroundCopperPourLayers = (layerCount: 2 | 4): CopperPourLayer[] =>
  layerCount === 4 ? ["top", "inner1"] : ["top"]

const getPowerCopperPourLayers = (layerCount: 2 | 4): CopperPourLayer[] =>
  layerCount === 4 ? ["inner2", "bottom"] : ["bottom"]

export const BgaBreakoutBoard = ({
  layers,
  includeCopperPours = false,
}: {
  layers: 2 | 4
  includeCopperPours?: boolean
}) => {
  return (
    <board
      width="24mm"
      height="24mm"
      layers={layers}
      borderRadius="0mm"
      thickness="1.566mm"
      solderMaskColor="black"
      silkscreenColor="white"
      routingDisabled={true}
    >
      <chip
        name="BGA"
        manufacturerPartNumber="BGA-from-circuit001"
        pcbX="0mm"
        pcbY="0mm"
        pcbRotation="0deg"
        layer="top"
        pinLabels={pinLabels}
        connections={{}}
        footprint={
          <footprint>
            {bgaPins.map(({ pin, label, x, y }) => (
              <Fragment key={pin}>
                <smtpad
                  pcbX={`${x}mm`}
                  pcbY={`${y}mm`}
                  layer="top"
                  shape="circle"
                  radius="0.125mm"
                  portHints={[pin, label]}
                />
              </Fragment>
            ))}
          </footprint>
        }
      />
      {bgaPins.map(({ pin, label }, index) => {
        const { x, y } = getEdgePadPosition(index)

        return (
          <chip
            key={`pad-${pin}`}
            name={`PAD${index + 1}`}
            manufacturerPartNumber={`BGA-breakout-${label}`}
            pcbX={`${x}mm`}
            pcbY={`${y}mm`}
            layer="top"
            pinLabels={{ pin1: [label, "pin1"] }}
            connections={{}}
            footprint={
              <footprint>
                <smtpad
                  pcbX="0mm"
                  pcbY="0mm"
                  layer="top"
                  shape="rect"
                  width="0.95mm"
                  height="0.95mm"
                  portHints={["pin1", label]}
                />
              </footprint>
            }
          />
        )
      })}
      {bottomSupportGrid.map(({ type, name, gridX, gridY, rotation }) => {
        const { x, y } = getBottomSupportPosition(gridX, gridY)

        return (
          <chip
            key={name}
            name={name}
            manufacturerPartNumber={`BGA-bottom-${type}`}
            pcbX={`${x}mm`}
            pcbY={`${y}mm`}
            pcbRotation={rotation}
            layer="bottom"
            pinLabels={{ pin1: ["1", "pin1"], pin2: ["2", "pin2"] }}
            connections={{}}
            footprint={<PassiveFootprint type={type} />}
          />
        )
      })}
      {bgaPins.map(({ pin }, index) => (
        <Fragment key={`trace-${pin}`}>
          <trace from={`BGA.${pin}`} to={`PAD${index + 1}.pin1`} />
        </Fragment>
      ))}
      {bottomSupportGrid.map((part) => (
        <Fragment key={`support-traces-${part.name}`}>
          <trace from={`BGA.${part.bgaPin}`} to={`${part.name}.pin1`} />
          {"groundPin" in part ? (
            <trace from={`BGA.${part.groundPin}`} to={`${part.name}.pin2`} />
          ) : (
            <trace from={part.edgePad} to={`${part.name}.pin2`} />
          )}
        </Fragment>
      ))}
      {includeCopperPours &&
        getGroundCopperPourLayers(layers).flatMap((layer) =>
          copperPourRegions.ground.map(({ name, connectsTo, outline }) => (
            <Fragment key={`${name}_${layer}_pour`}>
              <copperpour
                name={`${name}_${layer}_pour`}
                layer={layer}
                connectsTo={connectsTo}
                outline={outline}
              />
            </Fragment>
          )),
        )}
      {includeCopperPours &&
        copperPourRegions.power.flatMap(({ name, connectsTo, outline }) =>
          getPowerCopperPourLayers(layers).map((layer) => (
            <Fragment key={`${name}_${layer}_pour`}>
              <copperpour
                name={`${name}_${layer}_pour`}
                layer={layer}
                connectsTo={connectsTo}
                outline={outline}
              />
            </Fragment>
          )),
        )}
    </board>
  )
}

export default () => <BgaBreakoutBoard layers={2} />
