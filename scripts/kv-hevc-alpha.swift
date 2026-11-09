// HEVC + alpha encoder for the Live2D KV (Safari / iOS), using macOS's own AVFoundation.
// Called by scripts/kv-motion-mov.mjs when Homebrew ffmpeg (hevc_videotoolbox) is missing.
//
//   xcrun swift scripts/kv-hevc-alpha.swift <frames dir of RGBA PNGs> <out.mov> <bitrate bps> <fps>
//
// Reads PNG frames (not a ProRes file: AVFoundation drops the alpha of ffmpeg-made ProRes)
// and draws each one into a premultiplied BGRA buffer, so the alpha is guaranteed. Stops if
// the first frame's top-left corner is not transparent.
import AVFoundation
import CoreGraphics
import ImageIO
import VideoToolbox

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 5, let bitrate = Int(args[3]), let fps = Int32(args[4]), fps > 0 else {
  fail("usage: kv-hevc-alpha.swift <frames dir> <out.mov> <bitrate bps> <fps>")
}
let dir = URL(fileURLWithPath: args[1], isDirectory: true)
let outURL = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: outURL)

let files: [URL]
do {
  files = try FileManager.default
    .contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "png" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }
} catch { fail("cannot list \(args[1]): \(error.localizedDescription)") }
guard !files.isEmpty else { fail("no PNG frames in \(args[1])") }

func loadImage(_ url: URL) -> CGImage {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fail("cannot read \(url.lastPathComponent)")
  }
  return image
}

let first = loadImage(files[0])
let width = first.width
let height = first.height
switch first.alphaInfo {
case .none, .noneSkipFirst, .noneSkipLast: fail("frames have no alpha channel")
default: break
}

let writer: AVAssetWriter
do { writer = try AVAssetWriter(outputURL: outURL, fileType: .mov) } catch { fail("writer: \(error.localizedDescription)") }
// Index (moov) at the front, so the browser can start playing before the whole file arrives.
writer.shouldOptimizeForNetworkUse = true

var compression: [String: Any] = [
  AVVideoAverageBitRateKey: bitrate,
  kVTCompressionPropertyKey_TargetQualityForAlpha as String: 0.75,
]
if #available(macOS 13.0, *) {
  // The buffers below are premultiplied; say so, so edges don't get a dark fringe.
  compression[kVTCompressionPropertyKey_AlphaChannelMode as String] = kVTAlphaChannelMode_PremultipliedAlpha
}
let input = AVAssetWriterInput(
  mediaType: .video,
  outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.hevcWithAlpha,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: compression,
  ]
)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
  ]
)
writer.add(input)
guard writer.startWriting() else { fail("writer: \(writer.error?.localizedDescription ?? "cannot start")") }
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue

for (index, url) in files.enumerated() {
  autoreleasepool {
    let image = index == 0 ? first : loadImage(url)
    guard image.width == width, image.height == height else { fail("\(url.lastPathComponent) has a different size") }
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    guard let pool = adaptor.pixelBufferPool else { fail("no pixel buffer pool: \(writer.error?.localizedDescription ?? "?")") }
    var made: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &made)
    guard let buffer = made else { fail("cannot create pixel buffer") }

    CVPixelBufferLockBaseAddress(buffer, [])
    guard let base = CVPixelBufferGetBaseAddress(buffer),
          let context = CGContext(
            data: base, width: width, height: height, bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace, bitmapInfo: bitmapInfo
          ) else { fail("cannot draw frame \(index)") }
    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    if index == 0 {
      // BGRA in memory: byte 3 is the alpha of the first pixel (a corner, empty in the KV).
      let cornerAlpha = base.assumingMemoryBound(to: UInt8.self)[3]
      if cornerAlpha != 0 { fail("alpha lost: first frame corner alpha = \(cornerAlpha), expected 0") }
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])

    let time = CMTime(value: CMTimeValue(index), timescale: fps)
    if !adaptor.append(buffer, withPresentationTime: time) {
      fail("append failed at frame \(index): \(writer.error?.localizedDescription ?? "?")")
    }
  }
}

input.markAsFinished()
let finished = DispatchSemaphore(value: 0)
writer.finishWriting { finished.signal() }
finished.wait()
guard writer.status == .completed else { fail("encode failed: \(writer.error?.localizedDescription ?? "?")") }
print("ok \(width)x\(height) · \(files.count) frames · corner alpha 0")
