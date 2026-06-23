# Virtual Scroller: Testing, Edge Cases & Demo Enhancement Design

## Overview

Build on the existing headless `useVirtualScroll` hook implementation by adding:
1. Comprehensive unit test coverage
2. Edge case handling (height sync, Filler component)
3. Enhanced demo examples

## 1. Test Strategy

### 1.1 Principles

- **Test logic, not DOM** — hooks are pure functional logic testable in jsdom
- **Isolation first** — each sub-hook tested independently before integration
- **Verify plan commitments** — each DEVELOPMENT_PLAN.md "验收标准" gets a test

### 1.2 Test Files & Scope

| File | Tests |
|---|---|
| `useVisibleRange.test.ts` | Visible range calculation, overscan, edge cases (empty/short lists), scroll position updates, dynamic height mixtures |
| `useHeights.test.ts` | Unmeasured returns estimated, measurement updates cache, duplicate measurement no-ops, `onHeightChange` callback, `onCleanup` cleanup |
| `useShiftAnchor.test.ts` | Scroll position recovery after data insert/delete, graceful degradation when anchor item removed, multiple save/restore cycles |
| `useScrollTo.test.ts` | 4 align modes (start/center/end/auto), index out-of-bounds safety, retry tolerance |
| `useVirtualScroll.test.tsx` | Integration: scroll → visibleItems update → measureItem triggers, data change → totalHeight update, end-to-end flow |

### 1.3 Testing Tools

- **vitest** with jsdom environment (already configured in project)
- `createRoot` + `createEffect` for testing reactive hooks
- Manual DOM mock for scroll positions (no real layout needed)

## 2. Edge Cases

### 2.1 Height Change Instant Sync

**Problem:** When the first visible item's measured height differs from `estimatedItemHeight`, the scroll position jumps because offsets were calculated with estimates.

**Solution:** Add a `createEffect` in `useVirtualScroll` that watches `heights` changes. When the first visible item's actual height is measured, compute the delta from `estimatedItemHeight` and call `syncScrollTop` to compensate.

**Location:** `useVirtualScroll.ts`, after `useHeights` integration.

### 2.2 Data Shrinkage Fallback

**Problem:** When items are deleted, the current `scrollTop` may exceed the new `maxScrollHeight`, leaving blank space.

**Status:** Already has a `createEffect` watching `items()` and checking `maxScrollHeight`. Needs test verification.

### 2.3 Filler Helper Component

**Problem:** Current headless design requires manual `<div style={{ height: totalHeight(), position: 'relative' }}>` + absolute positioning. This increases boilerplate.

**Solution:** New `Filler.tsx` component — syntactic sugar only:

```tsx
<Filler totalHeight={scroll.totalHeight()} startOffset={scroll.startOffset()}>
  <For each={scroll.visibleItems()}>
    {(item) => <div ref={el => scroll.measureItem(item.index, el)}>...</div>}
  </For>
</Filler>
```

Pure convenience — does not change the headless nature. Users can still render manually.

## 3. Demo Enhancement

### 3.1 Demo Files

| File | Purpose |
|---|---|
| `docs/basic.tsx` (existing) | Basic usage — unchanged |
| `docs/dynamic-height.tsx` | Expandable/collapsible items to demonstrate height cache + ResizeObserver |
| `docs/infinite-scroll.tsx` | Scroll-to-bottom auto-load with loading state — `useInfiniteScroll` integration |
| `docs/scroll-to.tsx` | Programmatic `scrollToIndex` buttons with all 4 align modes |
| `docs/custom-scrollbar.tsx` | `ScrollBar` component with custom styling + `useVirtualScroll` coordination |

### 3.2 Docs Site Integration

Demos use the existing vite dev server at project root — no additional setup needed.

## 4. Implementation Order

| Step | Description | Depends On |
|---|---|---|
| 1 | `useVisibleRange.test.ts` + `useHeights.test.ts` | Nothing — pure logic |
| 2 | `useShiftAnchor.test.ts` + `useScrollTo.test.ts` | Nothing — pure logic |
| 3 | `useVirtualScroll.test.tsx` integration test | Sub-hook tests pass |
| 4 | Height change sync (2.1) | Test infra in place |
| 5 | `Filler.tsx` component (2.3) | — |
| 6 | Demo files | Core + Filler ready |

## 5. Out of Scope

- Animation support (rc feature — deferred)
- `useDiffItem` (diff detection for animation transitions — deferred)
- View Pool optimization (deferred — SolidJS reactivity already efficient)
- Performance benchmarking (future concern)
