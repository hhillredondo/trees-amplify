import { Component, type ReactNode } from 'react'

interface Props {
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="fixed inset-0 bg-[var(--color-background)] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-[var(--color-error)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              Something went wrong
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-4">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <details className="text-left text-sm text-[var(--color-text-secondary)] mb-4">
                <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-[var(--color-surface)] rounded overflow-auto text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}


