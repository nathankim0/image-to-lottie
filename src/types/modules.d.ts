declare module "gifenc";
declare module "canvaskit-wasm/bin/full/canvaskit.js" {
  import type { CanvasKitInitOptions, CanvasKit } from "canvaskit-wasm";
  const init: (opts?: CanvasKitInitOptions) => Promise<CanvasKit>;
  export default init;
}
