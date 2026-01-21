import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

// Use createRoot instead of ReactDOM.render (React 18 approach)
// Initialize ConfigService before rendering the app
import configService from "./services/ConfigService"

const container = document.getElementById("root")
const root = createRoot(container)

configService.init().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

// Log to confirm the script is running
console.log("React app initialized")
