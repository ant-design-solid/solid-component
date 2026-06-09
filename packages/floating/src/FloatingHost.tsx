import { ReactiveMap } from "@solid-primitive/map";
import { createMemo, createSignal, type JSX, Show } from "solid-js";
import FloatingContext, {
  FloatingHostContext,
  type FloatingHostContextValue,
  type FloatingPopupEntry,
} from "./FloatingContext";
import { FloatingPopupView } from "./FloatingPopup";

interface FloatingHostProps {
  children?: JSX.Element;
}

export default function FloatingHost(props: FloatingHostProps) {
  const entries = new ReactiveMap<string, FloatingPopupEntry>();
  const [activeId, setActiveId] = createSignal<string>();
  const activeEntry = createMemo(() => {
    const id = activeId();
    return id ? entries.get(id) : undefined;
  });

  let activeAt = 0;

  const findLastOpenEntry = (excludeId?: string) => {
    let fallback: FloatingPopupEntry | undefined;

    for (const entry of entries.values()) {
      if (entry.id === excludeId || !entry.context.open()) {
        continue;
      }

      if (!fallback || entry.activeAt > fallback.activeAt) {
        fallback = entry;
      }
    }

    return fallback;
  };

  const activateEntry = (entry: FloatingPopupEntry) => {
    const prevId = activeId();
    activeAt += 1;
    entry.activeAt = activeAt;
    setActiveId(entry.id);

    if (prevId && prevId !== entry.id) {
      entries.get(prevId)?.context.setOpen(false);
    }

    requestAnimationFrame(() => {
      if (activeId() === entry.id && entry.context.open()) {
        void entry.context.reposition();
      }
    });
  };

  const context = {
    register(entry) {
      const prevEntry = entries.get(entry.id);
      entries.set(entry.id, {
        ...entry,
        activeAt: prevEntry?.activeAt ?? 0,
      });
    },
    unregister(id) {
      const wasActive = activeId() === id;

      entries.delete(id);

      if (wasActive) {
        const nextEntry = findLastOpenEntry(id);
        if (nextEntry) {
          activateEntry(nextEntry);
        } else {
          setActiveId(undefined);
        }
      }
    },
    activate(id) {
      const entry = entries.get(id);
      if (!entry) {
        return;
      }

      activateEntry(entry);
    },
    deactivate(id) {
      if (activeId() !== id) {
        return;
      }

      const nextEntry = findLastOpenEntry(id);
      if (nextEntry) {
        activateEntry(nextEntry);
      } else {
        setActiveId(undefined);
      }
    },
  } satisfies FloatingHostContextValue;

  return (
    <FloatingHostContext.Provider value={context}>
      {props.children}
      <Show when={activeEntry()}>
        {(entry) => (
          <FloatingContext.Provider value={entry().context}>
            <FloatingPopupView {...entry().props()} />
          </FloatingContext.Provider>
        )}
      </Show>
    </FloatingHostContext.Provider>
  );
}
