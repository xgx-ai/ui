import { render } from "@solidjs/web";

import App from "./App.tsx";
import "./styles.css";
import "@xgx/ui/map/style.css";
import "@xgx/ui/flow/style.css";

render(() => <App />, document.getElementById("root")!);
