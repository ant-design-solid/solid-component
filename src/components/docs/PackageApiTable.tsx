import { Show } from "solid-js";

import { packageApiByName } from "../../docs";
import { ApiTable } from "./mdx-blocks";

type PackageApiTableProps = {
  packageName: string;
};

export default function PackageApiTable(props: PackageApiTableProps) {
  const items = packageApiByName.get(props.packageName) ?? [];

  return (
    <Show
      when={items.length > 0}
      fallback={<p>No exported API items were discovered for this package.</p>}
    >
      <ApiTable
        columns={[
          { key: "name", label: "Export" },
          { key: "kind", label: "Kind" },
          { key: "description", label: "Description" },
          { key: "source", label: "Source" },
        ]}
        rows={items.map((item) => ({
          name: <code>{item.name}</code>,
          kind: item.kind,
          description: item.description ?? "—",
          source: item.source,
        }))}
      />
    </Show>
  );
}
