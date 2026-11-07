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
 *
 * There is no write API and no query API here: step reads are the follow-on
 * card, and the permission surface stays minimal.
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
  }
}
