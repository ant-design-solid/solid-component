import { createMemo, splitProps, type JSX } from "solid-js";
import { mergeStyle } from "@solid-component/utils";
import { useFloatingContext } from "./FloatingContext";

export interface FloatingArrowProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export default function FloatingArrow(props: FloatingArrowProps) {
  const { position } = useFloatingContext();
  const [local, rest] = splitProps(props, ["children", "style"]);

  const arrowStyle = createMemo(() => {
    const { arrowX, arrowY, align } = position();
    if (!align?.points) {
      return {
        display: "none",
      };
    }
    const { points, autoArrow } = align;

    const alignStyle: JSX.CSSProperties = {
      position: "absolute",
    };
    if (autoArrow !== false) {
      const [popupPoints, targetPoints] = points!;
      const [popupTB, popupLR] = popupPoints;
      const [targetTB, targetLR] = targetPoints;

      if (popupTB === targetTB || !["t", "b"].includes(popupTB)) {
        alignStyle.top = `${arrowY}px`;
      } else if (popupTB === "t") {
        alignStyle.top = 0;
      } else {
        alignStyle.bottom = 0;
      }

      if (popupLR === targetLR && !["l", "r"].includes(popupLR)) {
        alignStyle.left = `${arrowX}px`;
      } else if (popupLR === "l") {
        alignStyle.left = 0;
      } else {
        alignStyle.right = 0;
      }
    }

    return mergeStyle(alignStyle, local.style);
  });

  return (
    <div aria-hidden="true" style={arrowStyle()} {...rest}>
      {local.children}
    </div>
  );
}
