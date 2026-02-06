import React from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import App from "./App";
import enMessages from "./locales/en.json";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <IntlProvider locale="en" messages={enMessages}>
      <App />
    </IntlProvider>
  </React.StrictMode>
);
