import ExpoModulesCore
import HealthKit

/**
 * DayliHealthKit — the app's read-only HealthKit boundary (phase-03 spec,
 * issue #19). Exposes exactly what Apple lets an app know:
 *
 * - `isHealthDataAvailable` — HKHealthStore.isHealthDataAvailable(); false on
 *   devices without HealthKit (iPadOS ≤ 16, macOS, enterprise restrictions).
 * - `requestStepReadAuthorization` — requestAuthorization with an EMPTY share
 *   set, so the app can never write health data. The completion fires after
 *   the user answers the system sheet (or immediately when every requested
 *   type was already answered); Apple never discloses the read choice, so
 *   there is deliberately no result to report.
 * - `readDailyStepTotals` — a one-shot HKStatisticsCollectionQuery
 *   (`.cumulativeSum` over `.stepCount`, day-long intervals anchored at the
 *   device-local midnight of the window's first day). It only reads past
 *   data: the initial results handler resolves once and no update handler is
 *   set, so nothing keeps running and no background delivery is scheduled —
 *   the app refreshes only when it is opened, foregrounded, or pulled.
 *
 * There is still no write API anywhere in the module.
 */
public class DayliHealthKitModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("DayliHealthKit")

    Function("isHealthDataAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestStepReadAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("ERR_UNAVAILABLE", "HealthKit is not available on this device")
        return
      }
      let stepCount = HKQuantityType(.stepCount)
      // Read-only request: the share set is empty. Apple requires the
      // NSHealthShareUsageDescription key to be present or this call crashes;
      // the app.json infoPlist carries it.
      self.store.requestAuthorization(toShare: [], read: [stepCount]) { _, error in
        if let error {
          promise.reject("ERR_REQUEST_FAILED", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    // One-shot daily step totals for [fromMs, toMs]. Resolves
    // [{startMs: Double, steps: Double}] — one entry per day interval that
    // HAS a sum; an interval with no step data yields no entry, so the
    // caller can tell "no data" apart from a truthful 0. The sum is nil-safe:
    // statistics without a cumulative sum are skipped, never read as 0.
    AsyncFunction("readDailyStepTotals") { (fromMs: Double, toMs: Double, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("ERR_UNAVAILABLE", "HealthKit is not available on this device")
        return
      }
      guard fromMs <= toMs else {
        promise.reject("ERR_RANGE", "readDailyStepTotals window is inverted")
        return
      }
      let from = Date(timeIntervalSince1970: fromMs / 1000)
      let to = Date(timeIntervalSince1970: toMs / 1000)
      // The device-local calendar aligns each day interval to the user's own
      // midnight, so a total is attributed to the local date the steps were
      // walked on — never to a UTC bucket.
      let calendar = Calendar.current
      var day = DateComponents()
      day.day = 1
      let query = HKStatisticsCollectionQuery(
        quantityType: HKQuantityType(.stepCount),
        quantitySamplePredicate: nil,
        options: .cumulativeSum,
        anchorDate: calendar.startOfDay(for: from),
        intervalComponents: day)
      query.initialResultsHandler = { _, results, error in
        if let error {
          promise.reject("ERR_QUERY_FAILED", error.localizedDescription)
          return
        }
        var samples: [[String: Any]] = []
        if let results {
          results.enumerateStatistics(from: from, to: to) { statistics, _ in
            guard let sum = statistics.sumQuantity() else { return }
            samples.append([
              "startMs": statistics.startDate.timeIntervalSince1970 * 1000,
              "steps": sum.doubleValue(for: .count()),
            ])
          }
        }
        promise.resolve(samples)
      }
      self.store.execute(query)
    }
  }
}
