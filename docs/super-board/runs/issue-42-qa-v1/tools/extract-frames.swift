import AVFoundation
import AppKit

// Extract PNG frames from a movie at given second-offsets.
// Usage: extract-frames.swift <video> <out-dir> <t1> <t2> ...
let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: extract-frames <video> <outdir> <seconds...>"); exit(1) }
let url = URL(fileURLWithPath: args[1])
let outDir = args[2]
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = CMTime(seconds: 0.033, preferredTimescale: 600)
for a in args[3...] {
    guard let t = Double(a) else { continue }
    let time = CMTime(seconds: t, preferredTimescale: 600)
    do {
        let cg = try gen.copyCGImage(at: time, actualTime: nil)
        let rep = NSBitmapImageRep(cgImage: cg)
        guard let data = rep.representation(using: .png, properties: [:]) else { continue }
        let name = String(format: "%@/frame-%05.2f.png", outDir, t)
        try data.write(to: URL(fileURLWithPath: name))
        print("wrote", name)
    } catch {
        print("err at", t, error.localizedDescription)
    }
}
