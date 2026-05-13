# Component Composition

## Purpose
Rules and patterns for keeping Vue SFCs focused and extracting logic into composables.

## Requirements

### REQ-1: Single Responsibility
Each `.vue` file's `<script setup>` must own at most one domain concern. IPC registration, resize logic, progress tracking, and theme management are separate concerns.

### REQ-2: Composable Extraction Pattern
When extracting logic:
- The composable returns reactive refs and functions needed by the template
- IPC listeners are registered inside `onMounted` (or guarded by `import.meta.client`) and cleaned up in `onUnmounted` where possible
- Composables live in `app/composables/use<Name>.ts`

### REQ-3: No `any` Casts
Extracted composables must not introduce or preserve `as any` casts. Use proper types from return types or `Parameters<>` utility.

### REQ-4: Zero Behaviour Change
Refactoring must not alter observable behaviour — same IPC handlers fire, same UI renders, same event flow.
