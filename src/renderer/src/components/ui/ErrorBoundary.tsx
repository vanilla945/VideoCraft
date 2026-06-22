import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center p-8">
            <h2 className="text-lg font-medium mb-2">出错了</h2>
            <p className="text-sm text-gray-400 mb-4">{this.state.error || '未知错误'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
