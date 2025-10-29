/**
 * 缓存工具类：用于存储需要上报的数据进而实现批量上报
 */

class CachePool {
  private cache: Map<string, any[]>
  constructor() {
    this.cache = new Map()
  }

  getCache(): Map<string, any[]> {
    return this.cache
  }

  /**
   * 添加缓存
   * @param type 缓存的数据类型
   * @param data 缓存的数据
   */
  addCache(type: string, data: any) {
    if (this.cache.has(type)) {
      this.cache.get(type)!.push(data)
    } else {
      this.cache.set(type, [data])
    }
  }
  /**
   * 清空所有缓存
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * 获取指定类型的缓存数据并清空缓存
   */
  takeCache(type: string): any[] {
    const data = this.cache.get(type) || []
    this.cache.delete(type)
    return data
  }
}

export const cache = new CachePool()
