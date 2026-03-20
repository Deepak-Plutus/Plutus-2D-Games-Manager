export type EntityDefinition = {
  id: string;
  /**
   * Preferred: explicit entity class identifier (Rect, Circle, Sprite, Button...).
   */
  entityType?: string;
  /**
   * Back-compat: prefab string (your earlier examples).
   */
  prefab?: string;
  pos?: [number, number] | number[];
  width?: number;
  height?: number;
  /**
   * Uniform scale number OR [x, y] scale tuple.
   */
  scale?: number | [number, number] | number[];
  props?: Record<string, unknown>;
  components?: Array<Record<string, unknown> & { type: string }>;
};

export type GameDefinition = {
  genre: string;
  engine: 'pixi_2d' | string;
  world?: Record<string, unknown>;
  entities: EntityDefinition[];
};

