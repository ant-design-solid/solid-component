import Polymorphic, {
  ElementOf,
  PolymorphicProps,
} from "@solid-component/polymorphic";
import { mergeStyle } from "@solid-component/utils";
import {
  createMemo,
  mergeProps,
  Show,
  splitProps,
  ValidComponent,
  type JSX,
} from "solid-js";
import { useFloatingContext } from "./FloatingContext";

export interface FloatingArrowOwnProps {
  size?: number;
  builtin?: boolean;
  auto?: boolean;
}

interface FloatingArrowCommonProps<T extends ValidComponent> extends Pick<
  JSX.HTMLAttributes<T>,
  "style" | "children"
> {}

export interface FloatingArrowProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
>
  extends FloatingArrowOwnProps, FloatingArrowCommonProps<ElementOf<T>> {}

const DEFAULT_SIZE = 30;

const HALF_DEFAULT_SIZE = DEFAULT_SIZE / 2;

const ARROW_TRANSFORM = {
  top: "translateX(-50%) translateY(-100%)",
  bottom: "translateX(-50%) translateY(100%)",
  left: "translateX(-100%) translateY(-50%)",
  right: "translateX(100%) translateY(-50%)",
} as const;

const ROTATION_DEG = {
  top: 0,
  right: 90,
  bottom: 180,
  left: -90,
} as const;

export const ARROW_PATH =
  "M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z";

const defaults = {
  size: DEFAULT_SIZE,
  builtin: true,
  auto: true,
} as const;
export default function FloatingArrow<T extends ValidComponent = "div">(
  props: PolymorphicProps<T, FloatingArrowProps>,
) {
  const { state, host } = useFloatingContext();
  const smooth = () => host()?.smooth();
  const merged = mergeProps(defaults, props);
  const [local, rest] = splitProps(merged, [
    "size",
    "style",
    "builtin",
    "auto",
  ]);

  const arrowStyle = createMemo(() => {
    const { arrow, align } = state();
    if (!align?.points) {
      return {
        display: "none",
      };
    }

    const style: JSX.CSSProperties = {
      position: "absolute",
      "pointer-events": "none",
    };

    if (local.auto && align.autoArrow !== false) {
      if (arrow.dir) {
        style[arrow.dir] = 0;
        const isTB = ["top", "bottom"].includes(arrow.dir);

        if (isTB) {
          style.left = `${arrow.x}px`;
        } else {
          style.top = `${arrow.y}px`;
        }
        style.transform = ARROW_TRANSFORM[arrow.dir];
      } else {
        style.top = `${arrow.y}px`;
        style.left = `${arrow.x}px`;
        style.transform = `translate(-50%, -50%)`;
      }
    }

    return mergeStyle(style, local.style);
  });

  return (
    <Show when={!smooth()}>
      <Polymorphic as="div" aria-hidden="true" style={arrowStyle()} {...rest}>
        <Show when={!rest.children} fallback={rest.children}>
          <Show when={local.builtin && state().arrow.dir}>
            {(dir) => {
              const style = () => {
                const { arrow } = state();

                return {
                  transform: "scale(1.02)",
                  "font-size": `${local.size}px`,
                  width: "1em",
                  height: "1em",
                  fill: arrow.fill,
                  stroke: arrow.stroke,
                  "stroke-width": arrow.strokeWidth
                    ? Number.parseInt(arrow.strokeWidth) *
                      2 *
                      (DEFAULT_SIZE / local.size)
                    : undefined,
                } satisfies JSX.CSSProperties;
              };

              return (
                <svg
                  display="block"
                  viewBox={`0 0 ${DEFAULT_SIZE} ${DEFAULT_SIZE}`}
                  style={style()}
                >
                  <g
                    transform={`rotate(${
                      ROTATION_DEG[dir()]
                    } ${HALF_DEFAULT_SIZE} ${HALF_DEFAULT_SIZE}) translate(0 2)`}
                  >
                    <path fill="none" d={ARROW_PATH} />
                    <path stroke="none" d={ARROW_PATH} />
                  </g>
                </svg>
              );
            }}
          </Show>
        </Show>
      </Polymorphic>
    </Show>
  );
}
