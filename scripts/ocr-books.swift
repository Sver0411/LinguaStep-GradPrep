// Local, offline OCR for user-provided Japanese book scans. Never edits a PDF.
// swiftc scripts/ocr-books.swift -o /tmp/linguastep-book-ocr
// /tmp/linguastep-book-ocr INPUT.pdf OUTPUT.jsonl [FIRST] [LAST] [PREVIEW.png]
import Foundation
import Vision
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3, let document = CGPDFDocument(URL(fileURLWithPath: args[1]) as CFURL) else {
    fputs("Usage: book-ocr INPUT.pdf OUTPUT.jsonl [FIRST] [LAST] [PREVIEW.png]\n", stderr)
    exit(1)
}
let first = args.count > 3 ? Int(args[3]) ?? 1 : 1
let last = min(document.numberOfPages, args.count > 4 ? Int(args[4]) ?? document.numberOfPages : document.numberOfPages)
let outputURL = URL(fileURLWithPath: args[2])
FileManager.default.createFile(atPath: outputURL.path, contents: nil)
let output = try FileHandle(forWritingTo: outputURL)
defer { try? output.close() }
for number in first...last {
    try autoreleasepool {
        guard let page = document.page(at: number) else { return }
        let bounds = page.getBoxRect(.mediaBox)
        let width = 1800
        let height = Int(CGFloat(width) * bounds.height / bounds.width)
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
            bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
        context.setFillColor(CGColor(gray: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.scaleBy(x: CGFloat(width) / bounds.width, y: CGFloat(height) / bounds.height)
        context.translateBy(x: -bounds.minX, y: -bounds.minY)
        context.drawPDFPage(page)
        guard let image = context.makeImage() else { return }
        if args.count > 5 && number == first,
           let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[5]) as CFURL, UTType.png.identifier as CFString, 1, nil) {
            CGImageDestinationAddImage(destination, image, nil)
            CGImageDestinationFinalize(destination)
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ja-JP", "zh-Hans", "en-US"]
        request.usesLanguageCorrection = false
        try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            let box = observation.boundingBox
            return ["text": candidate.string, "confidence": candidate.confidence,
                    "x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
        }
        let data = try JSONSerialization.data(withJSONObject: ["page": number, "lines": lines], options: [.sortedKeys])
        output.write(data)
        output.write(Data([10]))
        if number == first || number % 20 == 0 || number == last {
            fputs("\(URL(fileURLWithPath: args[1]).lastPathComponent): \(number)/\(last)\n", stderr)
        }
    }
}
