import XCTest
import ObjectiveC.runtime

/// QA driver for issue #43 moods (PR #50 head 8697eac) on the booted iPhone 18 Pro
/// simulator against com.anonymous.dayli-step-tracker.
/// Public XCUITest APIs drive press/tap/single-drag. The wiggle (three direction
/// legs in ONE touch) and a guaranteed-fast double-tap bind the framework's
/// XCPointerEventPath / XCSynthesizedEventRecord at runtime.
final class MoodsQATests: XCTestCase {

  let bid = "com.anonymous.dayli-step-tracker"

  // normalized coords (app frame 402x874 pt)
  let duckNX = 0.37562, duckNY = 0.33638          // duck box (101..301, 266..466)
  let wigR1 = 0.48756                              // duck + 45pt
  let wigL  = 0.08955                              // duck - 115pt
  let wigR2 = 0.47512                              // duck + 40pt
  let bgNX  = 0.5, bgNY = 0.56636                  // background (201, 495) — in wrapper band, between duck and pill
  let bg2NX = 0.5, bg2NY = 0.20595                 // background (201, 180) — in wrapper band, above the bubble
  let edgeNX = 0.04975                             // left edge for the decisive swipe
  let toastNX = 0.95274, toastNY = 0.92792         // LogBox close X

  func coord(_ dx: Double, _ dy: Double, _ app: XCUIApplication) -> XCUICoordinate {
    app.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: dy))
  }

  func shot(_ name: String) {
    let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    a.name = name
    a.lifetime = .keepAlways
    add(a)
    print("QA43-SHOT \(name)")
  }

  func burst(_ names: [String]) {
    for n in names { shot(n) }
  }

  func mark(_ m: String) {
    print("QA43-MARK \(m) \(Date().timeIntervalSince1970)")
  }

  func relaunch() -> XCUIApplication {
    let app = XCUIApplication(bundleIdentifier: bid)
    app.terminate()
    app.launch()
    Thread.sleep(forTimeInterval: 2.0)
    coord(toastNX, toastNY, app).tap() // dismiss the dev LogBox if present
    Thread.sleep(forTimeInterval: 0.6)
    return app
  }

  func sleepDuck(_ app: XCUIApplication) {
    coord(duckNX, duckNY, app).press(forDuration: 1.6)
    Thread.sleep(forTimeInterval: 0.6)
  }

  // --- private-bind helpers -------------------------------------------------

  func impFor(_ cls: AnyClass, _ selName: String) -> IMP? {
    let sel = NSSelectorFromString(selName)
    if let m = class_getInstanceMethod(cls, sel) { return method_getImplementation(m) }
    if let m = class_getClassMethod(cls, sel) { return method_getImplementation(m) }
    return nil
  }

  func allocObj(_ cls: AnyClass) -> AnyObject {
    let sel = NSSelectorFromString("alloc")
    typealias AllocFn = @convention(c) (AnyObject, Selector) -> AnyObject
    return unsafeBitCast(method_getImplementation(class_getClassMethod(cls, sel)!), to: AllocFn.self)(cls, sel)
  }

  func dynClass(_ obj: AnyObject) -> AnyClass { object_getClass(obj)! }

  /// One pointer path: touch down at points[0] (offset 0), move through the rest, lift at the end.
  func makePointerPath(_ points: [(CGPoint, Double)]) -> AnyObject? {
    guard let cls = objc_lookUpClass("XCPointerEventPath") else { print("QA43-ERR no XCPointerEventPath"); return nil }
    typealias InitFn = @convention(c) (AnyObject, Selector, CGPoint, Double) -> AnyObject?
    guard let iimp = impFor(cls, "initForTouchAtPoint:offset:") else { print("QA43-ERR no initForTouchAtPoint"); return nil }
    guard let obj = unsafeBitCast(iimp, to: InitFn.self)(allocObj(cls), NSSelectorFromString("initForTouchAtPoint:offset:"), points[0].0, points[0].1) else { return nil }
    typealias MoveFn = @convention(c) (AnyObject, Selector, CGPoint, Double) -> Void
    if let mimp = impFor(dynClass(obj), "moveToPoint:atOffset:") {
      for p in points.dropFirst() {
        unsafeBitCast(mimp, to: MoveFn.self)(obj, NSSelectorFromString("moveToPoint:atOffset:"), p.0, p.1)
      }
    } else { print("QA43-ERR no moveToPoint"); return nil }
    typealias LiftFn = @convention(c) (AnyObject, Selector, Double) -> Void
    if let limp = impFor(dynClass(obj), "liftUpAtOffset:") {
      unsafeBitCast(limp, to: LiftFn.self)(obj, NSSelectorFromString("liftUpAtOffset:"), points.last!.1)
    } else { print("QA43-ERR no liftUpAtOffset"); return nil }
    return obj
  }

  func makeRecord(_ name: String, paths: [AnyObject]) -> AnyObject? {
    guard let rcls = objc_lookUpClass("XCSynthesizedEventRecord") else { print("QA43-ERR no record class"); return nil }
    typealias RecFn = @convention(c) (AnyObject, Selector, NSString) -> AnyObject?
    guard let iimp = impFor(rcls, "initWithName:") else { print("QA43-ERR no initWithName:"); return nil }
    guard let record = unsafeBitCast(iimp, to: RecFn.self)(allocObj(rcls), NSSelectorFromString("initWithName:"), name as NSString) else { print("QA43-ERR record init nil"); return nil }
    typealias AddFn = @convention(c) (AnyObject, Selector, AnyObject) -> Void
    guard let aimp = impFor(dynClass(record), "addPointerEventPath:") else { print("QA43-ERR no addPointerEventPath"); return nil }
    for p in paths {
      unsafeBitCast(aimp, to: AddFn.self)(record, NSSelectorFromString("addPointerEventPath:"), p)
    }
    return record
  }

  var synthesizer: AnyObject? = nil

  /// Walk XCTestDriver's object graph (2 levels) for anything that responds to
  /// synthesizeEvent:completion: — this SDK's owner is XCTRunnerDaemonSession.
  func findSynthesizer() {
    guard let dcls = objc_lookUpClass("XCTestDriver"), let dimp = impFor(dcls, "sharedTestDriver") else { print("QA43-ERR no XCTestDriver"); return }
    typealias SharedFn = @convention(c) (AnyObject, Selector) -> AnyObject?
    guard let driver = unsafeBitCast(dimp, to: SharedFn.self)(dcls, NSSelectorFromString("sharedTestDriver")) else { print("QA43-ERR driver nil"); return }
    let sel = "synthesizeEvent:completion:"
    var count: UInt32 = 0
    guard let ivars = class_copyIvarList(dcls, &count) else { print("QA43-INFO driver has no ivars"); return }
    for i in 0..<Int(count) {
      let nName = ivar_getName(ivars[i])
      let nEnc = ivar_getTypeEncoding(ivars[i])
      let name = nName.map { String(cString: $0) } ?? "?\(i)"
      let enc = nEnc.map { String(cString: $0) } ?? "?"
      guard enc.hasPrefix("@") else { continue }
      guard let v = object_getIvar(driver, ivars[i]) as AnyObject? else { continue }
      if impFor(dynClass(v), sel) != nil { synthesizer = v; print("QA43-INFO synthesizer via driver.\(name)"); return }
      var c2: UInt32 = 0
      if let iv2 = class_copyIvarList(dynClass(v), &c2) {
        for j in 0..<Int(c2) {
          let enc2 = ivar_getTypeEncoding(iv2[j]).map { String(cString: $0) } ?? "?"
          guard enc2.hasPrefix("@") else { continue }
          if let v2 = object_getIvar(v, iv2[j]) as AnyObject? {
            if impFor(dynClass(v2), sel) != nil {
              synthesizer = v2
              print("QA43-INFO synthesizer via driver.\(name).\(ivar_getName(iv2[j]).map { String(cString: $0) } ?? "?")")
              return
            }
          }
        }
      }
    }
    print("QA43-ERR no synthesizer in driver graph (\(count) ivars scanned)")
  }

  func performRecord(_ record: AnyObject) {
    if synthesizer == nil { findSynthesizer() }
    guard let target = synthesizer, let simp = impFor(dynClass(target), "synthesizeEvent:completion:") else { print("QA43-ERR no synthesizer for perform"); return }
    typealias SynFn = @convention(c) (AnyObject, Selector, AnyObject, @escaping (AnyObject?) -> Void) -> Void
    let done = expectation(description: "synthesized event performed")
    unsafeBitCast(simp, to: SynFn.self)(target, NSSelectorFromString("synthesizeEvent:completion:"), record, { _ in done.fulfill() })
    wait(for: [done], timeout: 15)
  }

  // --- synthesized gestures --------------------------------------------------

  /// Wiggle: right 45, left past start (-115), right again (+40) — two direction
  /// reversals inside the 140pt excursion cap, all in ONE continuous touch.
  func wiggleDuck(_ app: XCUIApplication) {
    let pts: [(CGPoint, Double)] = [
      (CGPoint(x: 151, y: 366), 0.0),
      (CGPoint(x: 196, y: 366), 0.13),
      (CGPoint(x: 36,  y: 366), 0.27),
      (CGPoint(x: 191, y: 366), 0.41),
    ]
    guard let path = makePointerPath(pts) else { return }
    guard let record = makeRecord("qa43-wiggle", paths: [path]) else { return }
    mark("wiggle-perform")
    performRecord(record)
  }

  /// Double-tap: two taps 120ms apart — well inside the 300ms window.
  func fastDoubleTap(_ app: XCUIApplication) {
    guard let p1 = makePointerPath([(CGPoint(x: 151, y: 366), 0.0), (CGPoint(x: 151, y: 366), 0.05)]) else { return }
    guard let p2 = makePointerPath([(CGPoint(x: 151, y: 366), 0.17), (CGPoint(x: 151, y: 366), 0.22)]) else { return }
    guard let record = makeRecord("qa43-doubletap", paths: [p1, p2]) else { return }
    mark("fastdoubletap-perform")
    performRecord(record)
  }

  // --- the QA sequence ------------------------------------------------------

  func testMoodsEvidence() throws {
    // ---------- baseline ----------
    let app = relaunch()
    shot("01-idle")

    // ---------- AC1: sleep, wake on touch, self-wake ----------
    sleepDuck(app)
    shot("02-sleep-longpress")

    coord(duckNX, duckNY, app).tap() // any touch wakes
    Thread.sleep(forTimeInterval: 0.18)
    shot("03-wake-startle")
    Thread.sleep(forTimeInterval: 1.1)
    shot("03b-wake-idle")

    sleepDuck(app)
    shot("04-sleep-again")
    Thread.sleep(forTimeInterval: 12.6)
    shot("05-selfwake-12s")

    // ---------- AC3: background hold stroll, in wrapper band ----------
    _ = relaunch()
    mark("stroll-hold-begin")
    coord(bgNX, bgNY, app).press(forDuration: 0.9)
    mark("stroll-hold-end")
    burst(["06-stroll-a", "06-stroll-b", "06-stroll-c", "06-stroll-d", "06-stroll-e", "06-stroll-f"])

    _ = relaunch()
    mark("stroll2-hold-begin")
    coord(bg2NX, bg2NY, app).press(forDuration: 0.9)
    mark("stroll2-hold-end")
    burst(["06b-stroll-a", "06b-stroll-b", "06b-stroll-c", "06b-stroll-d", "06b-stroll-e", "06b-stroll-f"])

    // ---------- AC5: precedence — sleep + background hold, sleep + swipe ----------
    _ = relaunch()
    sleepDuck(app)
    mark("sleeper-hold-begin")
    coord(bgNX, bgNY, app).press(forDuration: 0.9) // hold wakes the sleeper, then strolls
    mark("sleeper-hold-end")
    burst(["07-sleeper-a", "07-sleeper-b", "07-sleeper-c", "07-sleeper-d"])

    _ = relaunch()
    sleepDuck(app)
    coord(duckNX, duckNY, app).press(forDuration: 0.05, thenDragTo: coord(edgeNX, duckNY, app)) // decisive swipe
    Thread.sleep(forTimeInterval: 1.2)
    shot("08-swipe-from-sleep-navigates")

    // ---------- AC4: double-tap hop (public API) + a11y dump ----------
    _ = relaunch()
    mark("doubletap-begin")
    coord(duckNX, duckNY, app).doubleTap()
    mark("doubletap-end")
    burst(["09-hop-a", "09-hop-b", "09-hop-c", "09-hop-d", "09-hop-e", "09-hop-f"])
    print("QA43-A11Y-BEGIN\n\(app.debugDescription)\nQA43-A11Y-END")

    // ---------- AC2: wiggle dizzy — LAST (private synthesis may crash the runner) ----------
    _ = relaunch()
    wiggleDuck(app)
    burst(["10-dizzy-a", "10-dizzy-b", "10-dizzy-c", "10-dizzy-d", "10-dizzy-e", "10-dizzy-f"])
  }
}
