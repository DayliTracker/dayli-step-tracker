# AC4 a11y evidence — decorative states hidden

Tool: `idb ui describe-all` (AX tree dump) against the running app, home screen,
duck idle; confirmed twice during the QA session (pre-gesture baseline and after
the run). Also: the XCUITest runner's own UI Snapshot at the a11y-dump step
(`56674542-689D-476D-B86E-421874A2C411` in the run xcresult) contains exactly one
labeled element — the app itself ("Dayli Step Tracker").

Observed AX tree (3 elements, no duck):

- Application "Dayli Step Tracker" (0,0 402x874)
- GenericElement "No steps recorded yet today. Daily goal: 8,000 steps." (101,146 200x414) — the accessible group, the single screen-reader source
- GenericElement "!, Open debugger to view warnings." — the dev-mode LogBox toast (debug builds only)

"Poke the duck" (copy.petPoke, the labeled Pressable on the duck) does NOT appear:
the petSlot wraps it with `accessible={false}` +
`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`
(components/PixelPet.tsx is mounted inside App.tsx's decorative slot). The mood
layers add nothing to the tree: Snores z-glyph layer is `accessible={false}`
pointerEvents="none" (PixelPet.tsx:717-720), star/heart particle layers are
pointerEvents="none" images without labels. All four mood states are therefore
out of the VoiceOver tree by construction — the state you put the duck in cannot
change what the screen reader sees.
