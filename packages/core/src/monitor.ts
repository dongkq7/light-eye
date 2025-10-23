import { Transport } from './transport'
import { MonitorOptions } from './types'

export let getTransport: () => Transport | null = () => null
export class Monitor {
  private transport: Transport | null = null

  constructor(private options: MonitorOptions) {}

  init(transport: Transport) {
    this.transport = transport
    getTransport = () => transport
    // 如果集成进来插件了，那么消费相关插件
    for (const integration of this.options.integrations ?? []) {
      integration.init(transport)
    }
  }
}
