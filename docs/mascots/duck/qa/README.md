# Duck pack · engine QA shots

Per-state screenshots saved during mascot adoption (mascot skill GATE 3). The
phase-1 shell cannot trigger walk or celebrate on device — the truthful
snapshot has no step data, so progress stays 0 — so these shots are the
engine-level evidence for those states.

All four shots were captured from the v1-era adoption commit `e285831`
(2026-10-30). The engine this repo vendors differs from that commit in exactly
two behavior spots (see `git diff e285831 -- components/PixelPet.tsx`):

1. Mood exit: v1 exited walk on a progress fall but celebrated forever; the
   first vendored copy exited walk and celebrate on any mood re-run, which
   self-canceled walk (review round 1, R1). The current engine exits walk and
   celebrate only when progress actually falls, keyed on `[progress]`.
2. Idle face: the vendored copy resets the idle frame on a mood change so
   idle never resumes holding a blink or look.

| Shot | State | Provenance |
|---|---|---|
| idle.png | idle bob + blink | idle rendering unchanged by both engine changes |
| poke.png | surprised hop + heart | poke path untouched by both engine changes |
| celebrate.png | celebrate at goal | at-goal rendering unchanged; the vendored engine additionally exits celebrate when progress falls |
| walk.png | walk burst | captured while the v1 engine still walked. The vendored lineage could not enter walk until the R1 fix; the walk rendering (walk_a/walk_b frames, tilt + bob drivers) is identical in all three engines, so after the fix the shot again depicts what the vendored engine renders mid-walk. The walk mood behavior is pinned by the mood-machine harness in `tests/today.test.mjs`. |

Re-capture protocol: mascot skill `references/qa.md` — drive every state and
save per-state shots here.
