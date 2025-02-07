import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

// Wait for the DOM to be ready before mounting the app
document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    // Mount the React application
    ReactDOM.createRoot(rootElement).render(
      // React StrictMode for highlighting potential issues
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});