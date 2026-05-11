import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import "./styles.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <Suspense>
          {/* 入口层负责挂载文档站外壳，实际页面内容仍由文件路由驱动。 */}
          <div class="docs-shell">{props.children}</div>
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
