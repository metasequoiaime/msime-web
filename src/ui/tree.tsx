/** The dawn redwood silhouette repeated across the design (hero grove, privacy banner, about illustration). 40 x 170 units, trunk base at the bottom centre. */
const TREE_PATH =
  "M20 0L24 18L22 18L28 40L25 40L32 66L28 66L35 94L30 94L38 124L32 124L40 156L21.5 156L21.5 170L18.5 170L18.5 156L0 156L8 124L2 124L10 94L5 94L12 66L8 66L15 40L12 40L18 18L16 18Z";

type MetasequoiaTreeProps = {
  /** Position of the tree's top-left corner in the parent SVG's user units. */
  x: number;
  y: number;
  scale?: number;
  /** Any CSS colour; defaults to the season's tree token. Applied through `style` because SVG presentation attributes do not resolve `var()`. */
  fill?: string;
  opacity?: number;
};

/** One tree, for use inside an `<svg>`. */
export function MetasequoiaTree({ x, y, scale = 1, fill = "var(--tree)", opacity }: MetasequoiaTreeProps) {
  return <path d={TREE_PATH} transform={`translate(${x} ${y}) scale(${scale})`} style={{ fill, opacity }} />;
}

export type GroveTree = readonly [x: number, y: number, scale: number];

/** A row of trees sharing one opacity, as the design layers them (far rows faint, near rows solid). */
export function Grove({ trees, opacity, fill }: { trees: readonly GroveTree[]; opacity?: number; fill?: string }) {
  return (
    <g style={{ opacity }}>
      {trees.map(([x, y, scale]) => (
        <MetasequoiaTree key={`${x},${y}`} x={x} y={y} scale={scale} fill={fill} />
      ))}
    </g>
  );
}
