import { MonitorOptions, Transport } from './types'

export let getTransport: () => Transport | null = () => null
export class Monitor {
  private transport: Transport | null = null
  private initialized: boolean = false

  constructor(private options: MonitorOptions) {}

  init(transport: Transport) {
    if (this.initialized) {
      console.warn('Monitor has already been initialized...✅')
      return
    }
    this.transport = transport
    this.initialized = true
    getTransport = () => this.transport
    // 如果集成进来插件了，那么消费相关插件
    const initializedNames = new Set<string>()
    this.options.integrations?.forEach(integration => {
      if (initializedNames.has(integration.name)) {
        console.warn(`⚠️ Integration ${integration.name} is duplicated, skipping`)
        return
      }
      try {
        integration.init(transport)
        initializedNames.add(integration.name)
        console.log(`✅ Integration ${integration.name} initialized`)
      } catch (error) {
        console.error(`❌ Failed to initialize integration ${integration.name}:`, error)
      }
    })
  }

  isInitialized(): boolean {
    return this.initialized
  }

  destroy() {
    if (!this.initialized) return

    // 调用插件的销毁方法（若插件实现了destroy）
    // this.options.integrations?.forEach(integration => {
    //   if (typeof integration.destroy === 'function') {
    //     integration.destroy()
    //   }
    // })

    // 清理传输层
    this.transport?.destroy?.() // 假设Transport有destroy方法
    this.transport = null
    this.initialized = false
  }
}
