import { requireOptionalNativeModule } from 'expo-modules-core';

/** One day interval's step total: the interval's local start (ms) and the
 * summed step count. The native query emits one sample per day that HAS a
 * sum — no sample means no data, never a fabricated 0. */
export interface DayStepSample {
  startMs: number;
  steps: number;
}

/**
 * The native surface of the DayliHealthKit local Expo module
 * (modules/dayli-health-kit/ios/DayliHealthKitModule.swift). Read-only:
 * availability, the authorization request, and the one-shot daily step
 * query — Apple never discloses the user's read choice, so nothing about
 * the grant itself is knowable or exposed.
 */
export interface DayliHealthKitNative {
  isHealthDataAvailable(): boolean;
  requestStepReadAuthorization(): Promise<void>;
  readDailyStepTotals(fromMs: number, toMs: number): Promise<DayStepSample[]>;
}

/**
 * The module when the native build carries it, else null. Expo Go and any
 * build without the module resolve to null — the typed adapter then reports
 * HealthKit as unavailable and manual entry stays the only path. Lazy on
 * purpose: Node tests import the pure logic without touching native modules.
 */
export function getDayliHealthKit(): DayliHealthKitNative | null {
  return requireOptionalNativeModule<DayliHealthKitNative>('DayliHealthKit') ?? null;
}
