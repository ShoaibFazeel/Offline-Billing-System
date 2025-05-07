import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

// Use createRoot instead of ReactDOM.render (React 18 approach)
const container = document.getElementById("root")
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log to confirm the script is running
console.log("React app initialized")
