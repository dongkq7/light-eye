import { ClickHouseClient } from '@clickhouse/client'
import { Inject, Injectable } from '@nestjs/common'

interface MonitorEvent {
  app_id?: string
  event_type?: string
  message?: string
  [key: string]: any // 允许其他扩展字段（对应原 body 中的额外数据）
}

@Injectable()
export class StorageService {
  constructor(@Inject('CLICKHOUSE_CLIENT') private clickhouseClient: ClickHouseClient) {}

  async getData() {
    const res = await this.clickhouseClient.query({
      query: 'SELECT * FROM monitor_view',
      format: 'JSON'
    })

    const json = await res.json()
    return json.data
  }

  async tracing(app_id: string, body: any) {
    const reportData = Array.isArray(body.data) ? body.data[0] : []
    const commonItem: Record<string, any> = {}
    Object.keys(body).forEach(key => {
      if (key !== 'data') {
        commonItem[key] = JSON.parse(JSON.stringify(body[key]))
      }
    })
    const formatData = reportData.map(item => {
      // 若 item 不是对象，转为对象（避免非对象类型导致的合并问题）
      const itemObj = typeof item === 'object' && item !== null ? item : { value: item }
      return {
        app_id: app_id || '1',
        event_type: body.event_type || 'unknown',
        message: body.message,
        info: { ...commonItem, ...itemObj }
      }
    })
    await this.clickhouseClient.insert({
      table: 'monitor_storage',
      columns: ['app_id', 'event_type', 'message', 'info'],
      values: formatData,
      format: 'JSONEachRow'
    })
  }

  async bugs() {
    const res = await this.clickhouseClient.query({
      query: `SELECT * FROM monitor_view WHERE event_type='error';`,
      format: 'JSON'
    })
    const queryResult = await res.json()
    return queryResult.data
  }
}
