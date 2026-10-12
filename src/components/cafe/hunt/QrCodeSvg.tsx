import qrcode from "qrcode-generator";

/** White border around the code, in modules. Scanners need at least 4. */
const QUIET_ZONE = 4;

type QrCodeSvgProps = {
  value: string;
  /** Text for screen readers, e.g. which evidence point this is. */
  label: string;
  className?: string;
};

/**
 * QR code drawn as one SVG path. Server-safe (no browser APIs), so the codes
 * are built on the server and no QR library reaches the visitor's phone.
 */
export function QrCodeSvg({ value, label, className }: QrCodeSvgProps) {
  // Type 0 = smallest size that fits; level M survives small scuffs on print.
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();

  const count = code.getModuleCount();
  const size = count + QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (code.isDark(row, col)) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
