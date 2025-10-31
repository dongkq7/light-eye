import { init } from '@light-eye/browser'
import { getLastEvent, getRecentEvents } from '@light-eye/browser-utils'
import { MonitorOptions, Transport } from '@light-eye/core'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  options: MonitorOptions
  fallback?: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  transport?: Transport
}

export class LightEyeBoundary extends Component<Props, State> {
  private initialized = false
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidMount() {
    if (!this.props.options || this.initialized) return

    try {
      const { monitor, transport } = init(this.props.options) ?? {}
      if (monitor && transport) {
        this.setState({ transport })
        this.initialized = true
      } else {
        console.error('🔨 LightEye start error, please check config...')
      }
    } catch (error) {
      console.error('🔨 LightEye initialization failed:', error)
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，下一次渲染将显示错误降级 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { transport } = this.state

    if (!transport) {
      return
    }
    const lastEvent = getLastEvent()
    const recentEvents = getRecentEvents(3)

    transport.send({
      event_type: 'error',
      type: 'react_runtime_error',
      message: error.message,
      name: error.name,
      stack: error.stack,
      component_stack: errorInfo.componentStack,
      path: window.location.pathname,
      timestamp: Date.now(),
      event_context: {
        has_last_event: !!lastEvent,
        last_event: lastEvent
          ? {
              type: lastEvent.type,
              target: lastEvent.target,
              timestamp: Date.now()
            }
          : undefined,
        recent_events: recentEvents
      }
    })
  }

  render() {
    if (this.state.hasError) {
      // 自定义错误降级 UI
      return (
        this.props.fallback || (
          <div>
            <h2>发生错误</h2>
            <button onClick={() => this.setState({ hasError: false })}>刷新页面</button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// 工具函数：用于简化 React 应用集成
export const withLightEyeMonitoring = (options: MonitorOptions, fallback?: ReactNode) => {
  return (Component: React.ComponentType) => {
    return (props: any) => (
      <LightEyeBoundary options={options} fallback={fallback}>
        <Component {...props} />
      </LightEyeBoundary>
    )
  }
}
