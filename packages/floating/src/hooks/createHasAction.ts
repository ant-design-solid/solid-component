import { access, createCollection, toArray } from "@solid-primitive/shared";
import { Accessor, batch, createEffect } from "solid-js";

export type ActionType = "hover" | "focus" | "click" | "contextMenu";

type NormalizedActionType = Lowercase<ActionType> | "touch";

type ExternalActionType =
  | NormalizedActionType
  | Uppercase<NormalizedActionType>
  | "contextMenu";

type ActionTypes = ExternalActionType | ExternalActionType[];

export type HasAction = ReturnType<typeof createHasAction>


function normalizeAction(action: ExternalActionType): NormalizedActionType {
  if (typeof action === "string") {
    return action.toLowerCase() as NormalizedActionType;
  }
  return action;
}

export default function createHasAction(
  action: Accessor<ActionTypes>,
  showAction: Accessor<ActionTypes | undefined>,
  hideAction: Accessor<ActionTypes | undefined>,
) {
  const showActionSet = createCollection(
    new Set<NormalizedActionType>(),
  );
  const hideActionSet = createCollection(
    new Set<NormalizedActionType>(),
  );

  createEffect(() => {
    const mergedShowActions = toArray(access(showAction) ?? access(action)).map(
      normalizeAction,
    );
    const mergedHideActions = toArray(access(hideAction) ?? access(action)).map(
      normalizeAction,
    );

    batch(() => {
      showActionSet.clear();
      hideActionSet.clear();

      mergedShowActions.forEach((action) => {
        showActionSet.add(action);
      });
      mergedHideActions.forEach((action) => {
        hideActionSet.add(action);
      });

      if (showActionSet.has("hover") && !showActionSet.has("click")) {
        showActionSet.add("touch");
      }
      if (hideActionSet.has("hover") && !hideActionSet.has("click")) {
        hideActionSet.add("touch");
      }
    });
  });

  return (type: "show" | "hide", action: NormalizedActionType) => {
    const set = type === "show" ? showActionSet : hideActionSet;
    return set.has(action);
  };
}
