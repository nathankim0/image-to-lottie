// Minimal Lottie (Bodymovin) shapes used by this tool. Not a full schema.

export type Vec = number[];

export interface Keyframe {
  t: number;
  s: Vec;
  o?: { x: number[]; y: number[] };
  i?: { x: number[]; y: number[] };
  h?: 0 | 1;
}

export type Prop = { a: 0; k: unknown } | { a: 1; k: Keyframe[] };

export interface Transform {
  o: Prop;
  r: Prop;
  p: Prop;
  a: Prop;
  s: Prop;
}

export interface Layer {
  ty: number;
  nm: string;
  ind: number;
  ip: number;
  op: number;
  st: number;
  sr: number;
  ao: number;
  bm: number;
  ks: Transform;
  refId?: string;
  parent?: number;
  shapes?: unknown[];
}

export interface ImageAsset {
  id: string;
  w: number;
  h: number;
  u: string;
  p: string;
  e: 0 | 1;
}

export interface Animation {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: 0;
  assets: ImageAsset[];
  layers: Layer[];
}
