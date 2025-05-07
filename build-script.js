const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Ensure build directory exists
if (!fs.existsSync("build")) {
  fs.mkdirSync("build")
}

// Run webpack to build the React app
console.log("Building React app with webpack...")
try {
  execSync("npx webpack", { stdio: "inherit" })
  console.log("React build completed successfully!")
} catch (error) {
  console.error("Error building React app:", error)
  process.exit(1)
}

console.log("Build process completed!")
