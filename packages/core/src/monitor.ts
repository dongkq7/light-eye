import { MonitorOptions, Transport } from './types'

export let getTransport: () => Transport | null = () => null
export class Monitor {
  private transport: Transport | null = null
  private initialized: boolean = false

  constructor(private options: MonitorOptions) {}

  init(transport: Transport) {
    if (this.initialized) {
      console.warn('Monitor has already been initialized')
      return
    }
    this.transport = transport
    this.initialized = true
    getTransport = () => transport
    // 如果集成进来插件了，那么消费相关插件
    // 初始化所有集成插件
    this.options.integrations?.forEach(integration => {
      try {
        integration.init(transport)
        console.log(`✅ Integration ${integration.name} initialized`)
      } catch (error) {
        console.error(`❌ Failed to initialize integration ${integration.name}:`, error)
      }
    })
  }

  isInitialized(): boolean {
    return this.initialized
  }
}
