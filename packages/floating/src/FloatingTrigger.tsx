import type { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import { Polymorphic } from "@solid-component/polymorphic";
import {
  callHandler,
  composeHandlers,
  mergeRefs,
} from "@solid-component/utils";
import { ValueOf } from "@solid-primitive/shared";
import { splitProps, type JSX, type ValidComponent } from "solid-js";
import { useFloatingContext } from "./FloatingContext";

const COMMON_PROPS = [
  "ref",
  "onClick",
  "onTouchStart",
  "onPointerEnter",
  "onPointerDown",
  "onPointerLeave",
  "onFocus",
  "onBlur",
  "onContextMenu",
] as const;

export interface FloatingTriggerOwnProps {}

export interface FloatingTriggerCommonProps<
  T extends HTMLElement = HTMLElement,
> extends Pick<JSX.HTMLAttributes<T>, ValueOf<typeof COMMON_PROPS>> {}

type FloatingTriggerElementProps<T extends HTMLElement = HTMLElement> =
  FloatingTriggerCommonProps<T> & {
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
  };

export interface FloatingTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends FloatingTriggerOwnProps, FloatingTriggerCommonProps<ElementOf<T>> {}

export default function FloatingTrigger<T extends ValidComponent>(
  props: PolymorphicProps<T, FloatingTriggerProps<T>>,
) {
  const {
    id,
    hasAction,
    setPointerPoint,
    setOpen,
    open,
    reposition,
    setTriggerRef,
    rootOptions,
  } = useFloatingContext();

  const [local, others] = splitProps(
    props as FloatingTriggerProps,
    COMMON_PROPS,
  );
  const onPointerEnter: FloatingTriggerProps["onPointerEnter"] = (e) => {
    if (e.pointerType === "mouse" && hasAction("show", "hover")) {
      setPointerPoint(e.clientX, e.clientY);
      setOpen(true, rootOptions().delay.hoverOpen);
    }
  };

  const onPointerLeave: FloatingTriggerCommonProps["onPointerLeave"] = (e) => {
    if (e.pointerType === "mouse" && hasAction("hide", "hover")) {
      setOpen(false, rootOptions().delay.hoverClose);
    }
  };

  const onClick: FloatingTriggerCommonProps["onClick"] = (e) => {
    const clickToShow = hasAction("show", "click");
    const clickToHide = hasAction("hide", "click");
    if (clickToShow || clickToHide) {
      const opened = open();
      if (opened && clickToHide) {
        setOpen(false);
      } else if (!opened && clickToShow) {
        setPointerPoint(e.clientX, e.clientY);
        setOpen(true);
      }
    }
    callHandler(e, local.onClick);
  };

  const onTouchStart: FloatingTriggerProps["onTouchStart"] = (e) => {
    const touchToShow = hasAction("show", "touch");
    const touchToHide = hasAction("hide", "touch");
    if (touchToShow || touchToHide) {
      if (open() && touchToHide) {
        setOpen(false);
      } else if (!open() && touchToShow) {
        setOpen(true);
      }
    }
  };

  const onPointerDown: FloatingTriggerProps["onPointerDown"] = (e) => {
    if (!open()) {
      void reposition();
    }
  };

  const onFocus: FloatingTriggerProps["onFocus"] = (e) => {
    if (hasAction("show", "focus")) {
      setOpen(true, rootOptions().delay.focusOpen);
    }
  };
  const onBlur: FloatingTriggerProps["onBlur"] = (e) => {
    if (hasAction("hide", "focus")) {
      setOpen(false, rootOptions().delay.focusClose);
    }
  };

  const onContextMenu: FloatingTriggerProps["onContextMenu"] = (e) => {
    if (hasAction("show", "contextmenu")) {
      if (open() && hasAction("hide", "contextmenu")) {
        setOpen(false);
      } else {
        setPointerPoint(e.clientX, e.clientY);
        setOpen(true);
      }

      e.preventDefault();
    }
  };

  return (
    <Polymorphic<FloatingTriggerElementProps<ElementOf<T>>>
      as="button"
      ref={mergeRefs(local.ref, setTriggerRef)}
      onClick={onClick}
      onPointerDown={composeHandlers(local.onPointerDown, onPointerDown)}
      onTouchStart={composeHandlers(local.onTouchStart, onTouchStart)}
      onPointerEnter={composeHandlers(local.onPointerEnter, onPointerEnter)}
      onPointerLeave={composeHandlers(local.onPointerLeave, onPointerLeave)}
      onFocus={composeHandlers(local.onFocus, onFocus)}
      onBlur={composeHandlers(local.onBlur, onBlur)}
      onContextMenu={composeHandlers(local.onContextMenu, onContextMenu)}
      aria-expanded={open()}
      aria-controls={open() ? id : undefined}
      {...others}
    />
  );
}
