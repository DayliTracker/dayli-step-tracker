# Delivery plan

This folder contains the phased execution plan for the product requirements in
[`../plan.md`](../plan.md). The source plan remains unchanged; these documents
expand its requirements into design, implementation, verification, and
deployment-readiness work.

## Phases

| Phase | Scope | Depends on |
| --- | --- | --- |
| [1. Foundation and experience](./phase-01-foundation-and-experience.md) | UI/UX design, navigation, shared visual foundation, and core screen experience | Existing project scaffold (plan Todo 2) |
| [2. Local product rules and persistence](./phase-02-local-product-rules-and-persistence.md) | Goals, local-date history, manual totals, language, settings, and clear-data behavior | Existing project scaffold (plan Todo 2); can proceed alongside Phase 1 |
| [3. Native health integration](./phase-03-native-health-integration.md) | Read-only HealthKit and Health Connect access, permissions, refresh, and platform-specific states | Existing project scaffold (plan Todo 2) and Phase 2 (plan Todo 4); can proceed alongside Phase 1 |
| [4. Verification and release documentation](./phase-04-verification-and-release-readiness.md) | Integrated acceptance, platform validation, and release-readiness documentation | Phases 1, 2, and 3 (plan Todo 6 depends on Todos 3–5) |

## How to use these documents

- Each phase has **Plan**, **Design**, **Implement**, **Test**, and **Deploy**
  steps, followed by measurable exit criteria and risks.
- Treat a phase as complete only when its exit criteria have evidence; a list of
  planned tasks is not evidence that the work is implemented.
- “Deploy” describes development-build, installation, signing, and release
  readiness actions. It does not authorize or imply publishing to an app store,
  provisioning cloud services, or deploying a backend.
- The app remains local-first: do not introduce a backend, cloud sync,
  analytics, authentication, or other excluded features from the source plan.
- Native health integrations must be validated in development or production
  builds. Expo Go is not sufficient to verify them.

