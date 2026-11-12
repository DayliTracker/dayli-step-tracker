# TEST-GAP — issue #57 (PR #68)

Ledger, edge cases and ranking live in REPORT.md § Test-gap check. Summary:

- High gaps: none. The scrim-top geometry has no unit-rung assertion possible
  in the node suite; the device scan here is the asserting evidence and is
  committed on the branch for re-runs.
- Medium gaps (not written): none.
- Low gaps (not written): hasManual (Remove-button) stepper variant not
  captured on-device; Reduce Motion and explain-sheet interplay not re-driven —
  all three share the exact mount under test and add no motion or mount risk.
- Test-the-tests: the builder's new shell test was mutation-checked — removing
  the Modal mount turns it red (9/1), restoring turns it green (10/10). It does
  not assert on its own mock and cannot pass vacuously.
