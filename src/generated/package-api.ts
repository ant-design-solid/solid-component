export type GeneratedPackageApiItem = {
  name: string;
  kind: "component" | "hook" | "function" | "type";
  description?: string;
  source: string;
};

export const generatedPackageApi: Record<string, GeneratedPackageApiItem[]> = {
  "floating": [
    {
      "name": "FloatingArrow",
      "kind": "component",
      "source": "FloatingArrow.tsx"
    },
    {
      "name": "FloatingMask",
      "kind": "component",
      "source": "FloatingMask.tsx"
    },
    {
      "name": "FloatingPopup",
      "kind": "component",
      "source": "FloatingPopup.tsx"
    },
    {
      "name": "FloatingPortal",
      "kind": "component",
      "source": "index.tsx"
    },
    {
      "name": "FloatingRoot",
      "kind": "component",
      "source": "FloatingRoot.tsx"
    },
    {
      "name": "FloatingTrigger",
      "kind": "component",
      "source": "FloatingTrigger.tsx"
    },
    {
      "name": "FloatingContext",
      "kind": "function",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "useFloatingContext",
      "kind": "hook",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingAlign",
      "kind": "type",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingArrowProps",
      "kind": "type",
      "source": "FloatingArrow.tsx"
    },
    {
      "name": "FloatingContextValue",
      "kind": "type",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingMaskProps",
      "kind": "type",
      "source": "FloatingMask.tsx"
    },
    {
      "name": "FloatingMotionConfig",
      "kind": "type",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingPlacements",
      "kind": "type",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingPopupProps",
      "kind": "type",
      "source": "FloatingPopup.tsx"
    },
    {
      "name": "FloatingPortalProps",
      "kind": "type",
      "source": "FloatingPortal.tsx"
    },
    {
      "name": "FloatingPositionState",
      "kind": "type",
      "source": "FloatingContext.tsx"
    },
    {
      "name": "FloatingRootOwnProps",
      "kind": "type",
      "source": "FloatingRoot.tsx"
    },
    {
      "name": "FloatingRootProps",
      "kind": "type",
      "source": "FloatingRoot.tsx"
    },
    {
      "name": "FloatingTriggerOwnProps",
      "kind": "type",
      "source": "FloatingTrigger.tsx"
    },
    {
      "name": "FloatingTriggerProps",
      "kind": "type",
      "source": "FloatingTrigger.tsx"
    }
  ],
  "motion": [
    {
      "name": "Motion",
      "kind": "component",
      "source": "Motion.tsx"
    },
    {
      "name": "MotionGroup",
      "kind": "component",
      "source": "MotionGroup.tsx"
    },
    {
      "name": "MotionBaseProps",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MotionGroupOwnProps",
      "kind": "type",
      "source": "MotionGroup.tsx"
    },
    {
      "name": "MotionGroupProps",
      "kind": "type",
      "source": "MotionGroup.tsx"
    },
    {
      "name": "MotionLifecycle",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MotionName",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MotionOwnProps",
      "kind": "type",
      "source": "Motion.tsx"
    },
    {
      "name": "MotionPhase",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MotionProps",
      "kind": "type",
      "source": "Motion.tsx"
    },
    {
      "name": "MotionStatus",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MotionStep",
      "kind": "type",
      "source": "types.ts"
    }
  ],
  "overflow": [
    {
      "name": "OverflowItem",
      "kind": "component",
      "source": "OverflowItem.tsx"
    },
    {
      "name": "OverflowItems",
      "kind": "component",
      "source": "OverflowItems.tsx"
    },
    {
      "name": "OverflowPrefix",
      "kind": "component",
      "source": "OverflowPrefix.tsx"
    },
    {
      "name": "OverflowRest",
      "kind": "component",
      "source": "OverflowRest.tsx"
    },
    {
      "name": "OverflowRoot",
      "kind": "component",
      "source": "OverflowRoot.tsx"
    },
    {
      "name": "OverflowSuffix",
      "kind": "component",
      "source": "OverflowSuffix.tsx"
    },
    {
      "name": "useOverflowItemContext",
      "kind": "hook",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "useOverflowRootContext",
      "kind": "hook",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemContextValue",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemId",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemKey",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemOwnProps",
      "kind": "type",
      "source": "OverflowItem.tsx"
    },
    {
      "name": "OverflowItemProps",
      "kind": "type",
      "source": "OverflowItem.tsx"
    },
    {
      "name": "OverflowItemRecord",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemRole",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemsOwnProps",
      "kind": "type",
      "source": "OverflowItems.tsx"
    },
    {
      "name": "OverflowItemsProps",
      "kind": "type",
      "source": "OverflowItems.tsx"
    },
    {
      "name": "OverflowOwnProps",
      "kind": "type",
      "source": "index.tsx"
    },
    {
      "name": "OverflowPrefixOwnProps",
      "kind": "type",
      "source": "OverflowPrefix.tsx"
    },
    {
      "name": "OverflowPrefixProps",
      "kind": "type",
      "source": "OverflowPrefix.tsx"
    },
    {
      "name": "OverflowProps",
      "kind": "type",
      "source": "index.tsx"
    },
    {
      "name": "OverflowRestOwnProps",
      "kind": "type",
      "source": "OverflowRest.tsx"
    },
    {
      "name": "OverflowRestProps",
      "kind": "type",
      "source": "OverflowRest.tsx"
    },
    {
      "name": "OverflowRootContextValue",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowRootOwnProps",
      "kind": "type",
      "source": "OverflowRoot.tsx"
    },
    {
      "name": "OverflowRootProps",
      "kind": "type",
      "source": "OverflowRoot.tsx"
    },
    {
      "name": "OverflowSuffixOwnProps",
      "kind": "type",
      "source": "OverflowSuffix.tsx"
    },
    {
      "name": "OverflowSuffixProps",
      "kind": "type",
      "source": "OverflowSuffix.tsx"
    }
  ],
  "polymorphic": [
    {
      "name": "Polymorphic",
      "kind": "component",
      "description": "A utility component that render its `as` prop.",
      "source": "index.tsx"
    },
    {
      "name": "ElementOf",
      "kind": "type",
      "source": "index.tsx"
    },
    {
      "name": "PolymorphicAttributes",
      "kind": "type",
      "description": "Polymorphic attribute.",
      "source": "index.tsx"
    },
    {
      "name": "PolymorphicProps",
      "kind": "type",
      "description": "Props used by a polymorphic component.",
      "source": "index.tsx"
    }
  ],
  "utils": [
    {
      "name": "access",
      "kind": "function",
      "source": "utils/solid.d.ts"
    },
    {
      "name": "callHandler",
      "kind": "function",
      "source": "events.ts"
    },
    {
      "name": "canUseDom",
      "kind": "function",
      "source": "dom.ts"
    },
    {
      "name": "getDOM",
      "kind": "function",
      "source": "dom.ts"
    },
    {
      "name": "isDOM",
      "kind": "function",
      "source": "dom.ts"
    },
    {
      "name": "isVisible",
      "kind": "function",
      "source": "dom.ts"
    },
    {
      "name": "mergeRefs",
      "kind": "function",
      "source": "solid.ts"
    },
    {
      "name": "mergeStyle",
      "kind": "function",
      "source": "solid.ts"
    },
    {
      "name": "tryOnCleanup",
      "kind": "function",
      "description": "不在组件内运行时会报错",
      "source": "utils/solid.d.ts"
    },
    {
      "name": "Assign",
      "kind": "type",
      "source": "dom.ts"
    },
    {
      "name": "MaybeAccessor",
      "kind": "type",
      "source": "utils/solid.d.ts"
    }
  ]
};
