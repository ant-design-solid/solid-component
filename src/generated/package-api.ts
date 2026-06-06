export type GeneratedPackageApiItem = {
  name: string;
  kind: "component" | "hook" | "function" | "type";
  description?: string;
  source: string;
};

export const generatedPackageApi: Record<string, GeneratedPackageApiItem[]> = {
  "color-area": [],
  "color-slider": [
    {
      "name": "ColorSliderRail",
      "kind": "component",
      "source": "ColorSliderRail.tsx"
    },
    {
      "name": "ColorSliderRoot",
      "kind": "component",
      "source": "ColorSliderRoot.tsx"
    },
    {
      "name": "ColorSliderThumb",
      "kind": "component",
      "source": "ColorSliderThumb.tsx"
    },
    {
      "name": "ColorSliderContext",
      "kind": "function",
      "source": "ColorSliderContext.tsx"
    },
    {
      "name": "ColorSliderContextValue",
      "kind": "type",
      "source": "ColorSliderContext.tsx"
    },
    {
      "name": "ColorSliderRailProps",
      "kind": "type",
      "source": "ColorSliderRail.tsx"
    },
    {
      "name": "ColorSliderRootOwnProps",
      "kind": "type",
      "source": "ColorSliderRoot.tsx"
    },
    {
      "name": "ColorSliderRootProps",
      "kind": "type",
      "source": "ColorSliderRoot.tsx"
    },
    {
      "name": "ColorSliderStrategy",
      "kind": "type",
      "source": "strategies.ts"
    },
    {
      "name": "ColorSliderThumbOwnProps",
      "kind": "type",
      "source": "ColorSliderThumb.tsx"
    },
    {
      "name": "ColorSliderThumbProps",
      "kind": "type",
      "source": "ColorSliderThumb.tsx"
    },
    {
      "name": "ColorSliderType",
      "kind": "type",
      "source": "strategies.ts"
    }
  ],
  "field": [],
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
  "menu": [
    {
      "name": "MenuDivider",
      "kind": "component",
      "source": "MenuDivider.tsx"
    },
    {
      "name": "MenuGroup",
      "kind": "component",
      "source": "MenuGroup.tsx"
    },
    {
      "name": "MenuItem",
      "kind": "component",
      "source": "MenuItem.tsx"
    },
    {
      "name": "MenuMore",
      "kind": "component",
      "source": "MenuMore.tsx"
    },
    {
      "name": "MenuRoot",
      "kind": "component",
      "source": "MenuRoot.tsx"
    },
    {
      "name": "MenuSubmenu",
      "kind": "component",
      "source": "MenuSubmenu.tsx"
    },
    {
      "name": "MenuSubmenuContent",
      "kind": "component",
      "source": "MenuSubmenuContent.tsx"
    },
    {
      "name": "MenuActionInfo",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MenuDividerProps",
      "kind": "type",
      "source": "MenuDivider.tsx"
    },
    {
      "name": "MenuGroupOwnProps",
      "kind": "type",
      "source": "MenuGroup.tsx"
    },
    {
      "name": "MenuGroupProps",
      "kind": "type",
      "source": "MenuGroup.tsx"
    },
    {
      "name": "MenuInfo",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MenuItemOwnProps",
      "kind": "type",
      "source": "MenuItem.tsx"
    },
    {
      "name": "MenuItemProps",
      "kind": "type",
      "source": "MenuItem.tsx"
    },
    {
      "name": "MenuItemRenderState",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MenuKey",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MenuMode",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "MenuMoreOwnProps",
      "kind": "type",
      "source": "MenuMore.tsx"
    },
    {
      "name": "MenuMoreProps",
      "kind": "type",
      "source": "MenuMore.tsx"
    },
    {
      "name": "MenuRootElementProps",
      "kind": "type",
      "source": "MenuRoot.tsx"
    },
    {
      "name": "MenuRootOwnProps",
      "kind": "type",
      "source": "MenuRoot.tsx"
    },
    {
      "name": "MenuRootProps",
      "kind": "type",
      "source": "MenuRoot.tsx"
    },
    {
      "name": "MenuSubmenuContentOwnProps",
      "kind": "type",
      "source": "MenuSubmenuContent.tsx"
    },
    {
      "name": "MenuSubmenuContentProps",
      "kind": "type",
      "source": "MenuSubmenuContent.tsx"
    },
    {
      "name": "MenuSubmenuOwnProps",
      "kind": "type",
      "source": "MenuSubmenu.tsx"
    },
    {
      "name": "MenuSubmenuProps",
      "kind": "type",
      "source": "MenuSubmenu.tsx"
    },
    {
      "name": "SelectInfo",
      "kind": "type",
      "source": "types.ts"
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
      "name": "useOverflowContext",
      "kind": "hook",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "useOverflowItemContext",
      "kind": "hook",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowChangeInfo",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "OverflowCollapse",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "OverflowContextValue",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemContextValue",
      "kind": "type",
      "source": "OverflowContext.tsx"
    },
    {
      "name": "OverflowItemKey",
      "kind": "type",
      "source": "types.ts"
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
      "source": "types.ts"
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
      "name": "OverflowItemUid",
      "kind": "type",
      "source": "types.ts"
    },
    {
      "name": "OverflowOwnProps",
      "kind": "type",
      "source": "Overflow.tsx"
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
      "source": "Overflow.tsx"
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
    },
    {
      "name": "OverflowVisibleRange",
      "kind": "type",
      "source": "types.ts"
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
  "slider": [
    {
      "name": "SliderRail",
      "kind": "component",
      "source": "SliderRail.tsx"
    },
    {
      "name": "SliderRoot",
      "kind": "component",
      "source": "SliderRoot.tsx"
    },
    {
      "name": "SliderThumb",
      "kind": "component",
      "source": "SliderThumb.tsx"
    },
    {
      "name": "SliderThumbs",
      "kind": "component",
      "source": "SliderThumbs.tsx"
    },
    {
      "name": "SliderTrack",
      "kind": "component",
      "source": "SliderTrack.tsx"
    },
    {
      "name": "SliderContext",
      "kind": "function",
      "source": "SliderContext.tsx"
    },
    {
      "name": "SliderContextValue",
      "kind": "type",
      "source": "SliderContext.tsx"
    },
    {
      "name": "SliderRailProps",
      "kind": "type",
      "source": "SliderRail.tsx"
    },
    {
      "name": "SliderRootElementProps",
      "kind": "type",
      "source": "SliderRoot.tsx"
    },
    {
      "name": "SliderRootOwnProps",
      "kind": "type",
      "source": "SliderRoot.tsx"
    },
    {
      "name": "SliderRootProps",
      "kind": "type",
      "source": "SliderRoot.tsx"
    },
    {
      "name": "SliderThumbOwnProps",
      "kind": "type",
      "source": "SliderThumb.tsx"
    },
    {
      "name": "SliderThumbProps",
      "kind": "type",
      "source": "SliderThumb.tsx"
    },
    {
      "name": "SliderThumbRenderState",
      "kind": "type",
      "source": "SliderThumbs.tsx"
    },
    {
      "name": "SliderThumbsProps",
      "kind": "type",
      "source": "SliderThumbs.tsx"
    },
    {
      "name": "SliderThumbState",
      "kind": "type",
      "source": "SliderContext.tsx"
    },
    {
      "name": "SliderTrackOwnProps",
      "kind": "type",
      "source": "SliderTrack.tsx"
    },
    {
      "name": "SliderTrackProps",
      "kind": "type",
      "source": "SliderTrack.tsx"
    },
    {
      "name": "SliderValue",
      "kind": "type",
      "source": "SliderContext.tsx"
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
      "source": "dom/index.ts"
    },
    {
      "name": "Color",
      "kind": "function",
      "source": "color/Color.ts"
    },
    {
      "name": "composeHandlers",
      "kind": "function",
      "source": "events.ts"
    },
    {
      "name": "createControllableSignal",
      "kind": "function",
      "source": "primitives/createControllableSignal.ts"
    },
    {
      "name": "createOrderedRegistry",
      "kind": "function",
      "source": "primitives/createOrderedRegistry.ts"
    },
    {
      "name": "error",
      "kind": "function",
      "source": "warn.ts"
    },
    {
      "name": "getDOM",
      "kind": "function",
      "source": "dom/index.ts"
    },
    {
      "name": "isDOM",
      "kind": "function",
      "source": "dom/index.ts"
    },
    {
      "name": "isVisible",
      "kind": "function",
      "source": "dom/isVisible.ts"
    },
    {
      "name": "makeRaf",
      "kind": "function",
      "source": "raf.ts"
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
      "name": "triggerFocus",
      "kind": "function",
      "source": "dom/focus.ts"
    },
    {
      "name": "tryOnCleanup",
      "kind": "function",
      "description": "不在组件内运行时会报错",
      "source": "utils/solid.d.ts"
    },
    {
      "name": "warning",
      "kind": "function",
      "source": "warn.ts"
    },
    {
      "name": "Assign",
      "kind": "type",
      "source": "utils/type.d.ts"
    },
    {
      "name": "ColorFormat",
      "kind": "type",
      "source": "color/types.ts"
    },
    {
      "name": "ColorInput",
      "kind": "type",
      "source": "color/types.ts"
    },
    {
      "name": "CreateControllableSignalProps",
      "kind": "type",
      "source": "primitives/createControllableSignal.ts"
    },
    {
      "name": "CreateOrderedRegistryOptions",
      "kind": "type",
      "source": "primitives/createOrderedRegistry.ts"
    },
    {
      "name": "HSL",
      "kind": "type",
      "source": "color/types.ts"
    },
    {
      "name": "HSV",
      "kind": "type",
      "source": "color/types.ts"
    },
    {
      "name": "MaybeAccessor",
      "kind": "type",
      "source": "utils/solid.d.ts"
    },
    {
      "name": "OrderedRegistryRecord",
      "kind": "type",
      "source": "primitives/createOrderedRegistry.ts"
    },
    {
      "name": "OrderedRegistryUid",
      "kind": "type",
      "source": "primitives/createOrderedRegistry.ts"
    },
    {
      "name": "RGB",
      "kind": "type",
      "source": "color/types.ts"
    },
    {
      "name": "WarningOptions",
      "kind": "type",
      "source": "warn.ts"
    }
  ]
};
