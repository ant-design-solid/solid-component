import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MDXContext } from "solid-mdx";

import "./styles.css";
import { Suspense } from "solid-js";

export default function App() {
  const components = {};
  return (
    <Router
      root={(props) => (
        // <MDXContext.Provider value={components}>
        <Suspense>
          <div class="docs-shell">{props.children}</div>
        </Suspense>
        // </MDXContext.Provider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
