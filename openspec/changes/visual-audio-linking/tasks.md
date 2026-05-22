## 1. Data Model

- [ ] 1.1 Extend `VisualMediaItem` in `app/types/project.ts` with optional `linkDelay?: number`, `fadeIn?: number`, `fadeOut?: number`
- [ ] 1.2 Default missing fields to `0` at read sites (composables/components)
- [ ] 1.3 Update any project-load/migration code to tolerate older projects without these fields

## 2. Cue Picker Component

- [ ] 2.1 Create `CuePicker.vue` — modal listing all audio items (flattened from groups)
- [ ] 2.2 Add search/filter input for filtering by displayName
- [ ] 2.3 Highlight currently linked cue (if any)
- [ ] 2.4 Emit selected UUID on click, close modal

## 3. Visual Properties Pane

- [ ] 3.1 Create `VisualPropertiesPane.vue` mirroring the layout/idiom of the audio `PropertiesPanel.vue`
- [ ] 3.2 Field: editable `displayName` (text input, commit on blur/enter)
- [ ] 3.3 Field: linked audio cue — shows current cue name or "None"; buttons to Link / Change (opens `CuePicker`) and Clear
- [ ] 3.4 Field: `linkDelay` — signed number input (seconds), with a slider in ±30s range and an explanation label ("+: audio first, −: visual first")
- [ ] 3.5 Field: `fadeIn` — non-negative number input (seconds)
- [ ] 3.6 Field: `fadeOut` — non-negative number input (seconds)
- [ ] 3.7 Wire all edits to `updateVisualMedia(uuid, patch)`
- [ ] 3.8 Wire cog click in `MediaLibraryPanel.vue` so `@properties` opens this pane for the selected item

## 4. Auto-trigger Logic (push-time)

- [ ] 4.1 In `useVisualDisplay.ts`, on push: read `linkedCueUuid`, `linkDelay`, `fadeIn`
- [ ] 4.2 If `linkedCueUuid` is missing or stale, push visual normally with fade-in; do not trigger audio
- [ ] 4.3 If `linkDelay === 0`: reveal visual (with fade-in) and call `playCue` synchronously
- [ ] 4.4 If `linkDelay > 0`: call `playCue` immediately; schedule visual reveal after `linkDelay` seconds
- [ ] 4.5 If `linkDelay < 0`: reveal visual immediately; schedule `playCue` after `|linkDelay|` seconds
- [ ] 4.6 Track any pending timer keyed by visual uuid; cancel pending timer on any subsequent push or unpublish
- [ ] 4.7 On unpublish: fade out the live visual using `fadeOut`; cancel any pending audio timer for that visual (no audio re-trigger on unpublish)
- [ ] 4.8 `linkDelay` is push-only — triggering the linked cue stand-alone from the audio tab MUST ignore it

## 5. Player-side Fades

- [ ] 5.1 In the player window's visual layer, apply CSS opacity transition: `fadeIn` on push, `fadeOut` on unpublish
- [ ] 5.2 If a new push or unpublish arrives mid-fade, the new transition replaces the in-flight one
- [ ] 5.3 `0`-duration fades behave exactly like the current instant cut (no regression)
- [ ] 5.4 Unpublish completes only after `fadeOut` finishes (visual removed from DOM/state after opacity reaches 0)

## 6. Grid Badge

- [ ] 6.1 Add music-note badge overlay to `MediaLibraryItem.vue` when `linkedCueUuid` is set
- [ ] 6.2 Style badge (small icon, corner position, semi-transparent background)

## 7. Validation / Edge Cases

- [ ] 7.1 Clamp UI inputs: `linkDelay` ∈ [−30, 30]; `fadeIn`, `fadeOut` ∈ [0, 10]
- [ ] 7.2 Pending-timer indicator (subtle "queued" hint) when a delayed action is in flight
- [ ] 7.3 If the linked cue is deleted from the audio library, the visual still pushes; properties pane shows "None (was deleted)" and offers a Clear action
