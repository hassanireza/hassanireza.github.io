/**
 * Code-generated ocean surface texture: no source image at all, so there's
 * no resolution ceiling to hit and no raster bounding-box edge that can
 * ever show against the void. It's a stack of soft, blurred radial
 * gradients (dappled light through water) over a vertical wash that ends
 * on the exact same --void color as the rest of the page, so it can only
 * ever fade to seamless black, never a visible box. A slow, subtle drift
 * animation on the highlight layer keeps it from reading as static.
 */
export function OceanTexture() {
  return (
    <div id="ocean-texture" aria-hidden="true">
      <div className="ocean-texture-caustics" />
      <div className="ocean-texture-glow" />
    </div>
  );
}
