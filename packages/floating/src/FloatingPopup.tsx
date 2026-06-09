import Motion from "@solid-component/motion";
import type { ElementOf, PolymorphicProps } from "@solid-component/polymorphic";
import {
  composeHandlers,
  mergeRefs,
  mergeStyle,
  warning,
} from "@solid-component/utils";
import {
  Show,
  createEffect,
  createMemo,
  onCleanup,
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Portal } from "solid-js/web";
import { useFloatingContext, useFloatingHostContext } from "./FloatingContext";
import { createFloatingPopupShared } from "./FloatingPopup.shared";

export interface FloatingPopupOwnProps {
  zIndex?: number;
  motion?: import("./FloatingContext").FloatingMotionConfig;
  portal?: boolean | Omit<ComponentProps<typeof Portal>, "children">;
}

export const POPUP_OWN_PROPS = ["motion", "portal", "zIndex"] as const;

export const POPUP_COMMON_PROPS = [
  "ref",
  "onMouseLeave",
  "onMouseEnter",
  "style",
] as const;

interface FloatingPopupCommonProps<T extends HTMLElement> extends Pick<
  JSX.HTMLAttributes<T>,
  | "children"
  | "class"
  | "id"
  | "onMouseEnter"
  | "onMouseLeave"
  | "ref"
  | "role"
  | "style"
  | "tabIndex"
> {}

export interface FloatingPopupProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends FloatingPopupOwnProps, FloatingPopupCommonProps<ElementOf<T>> {}

export function FloatingPopupView(props: FloatingPopupProps) {
  const [own, common, rest] = splitProps(
    props,
    POPUP_OWN_PROPS,
    POPUP_COMMON_PROPS,
  );
  const { portal, Portal, presence, shell, surface } =
    createFloatingPopupShared(own);

  return (
    <Portal>
      <Motion
        ref={mergeRefs(common.ref, shell.ref)}
        style={mergeStyle(
          shell.style(),
          mergeStyle(surface.style(), common.style),
        )}
        visible={presence.open()}
        forceRender={presence.forceRender()}
        removeOnLeave={!presence.forceRender()}
        aria-hidden={!presence.open()}
        onMouseLeave={composeHandlers(common.onMouseLeave, shell.onMouseLeave)}
        onMouseEnter={composeHandlers(common.onMouseEnter, shell.onMouseEnter)}
        {...presence.motion()}
        {...rest}
      />
    </Portal>
  );
}

export default function FloatingPopup<T extends ValidComponent>(
  props: PolymorphicProps<T, FloatingPopupProps<T>>,
) {
  const context = useFloatingContext();
  const { id, open, rootOptions } = context;
  const host = useFloatingHostContext();
  const merged = props as FloatingPopupProps;
  const useHost = createMemo(() => {
    if (!rootOptions().singleton) {
      return;
    }
    if (!host) {
      warning(`singleton need <Floating.Host>`);
      return;
    }
    return host;
  });

  return (
    <Show when={useHost()} fallback={<FloatingPopupView {...merged} />}>
      {(host) => {
        const hostContext = host();
        hostContext.register({
          id,
          context,
          props: () => merged,
        });

        onCleanup(() => {
          hostContext.unregister(id);
        });
        createEffect(() => {
          if (open()) {
            hostContext.activate(id);
          } else {
            hostContext.deactivate(id);
          }
        });

        return null;
      }}
    </Show>
  );
}
