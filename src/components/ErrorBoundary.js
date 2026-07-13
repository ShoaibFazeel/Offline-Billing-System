import { Component } from "react"

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error boundary caught an error", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="max-w-lg w-full rounded-lg border border-red-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-3 text-sm text-gray-600">
              The app hit an unexpected error while rendering this section. You can retry the app or continue working after a refresh.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Reload app
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
