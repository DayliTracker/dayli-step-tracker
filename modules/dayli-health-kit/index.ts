import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * The native surface of the DayliHealthKit local Expo module
 * (modules/dayli-health-kit/ios/DayliHealthKitModule.swift). Read-only:
 * availability plus the authorization request — Apple never discloses the
 * user's read choice, so nothing else is knowable or exposed.
 */
export interface DayliHealthKitNative {
  isHealthDataAvailable(): boolean;
  requestStepReadAuthorization(): Promise<void>;
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
