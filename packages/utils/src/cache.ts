/**
 * 缓存工具类：用于存储需要上报的数据进而实现批量上报
 */

export interface ICachePool {
  getCache(): Map<string, any[]> // 获取缓存map
  addCache(type: string, data: any): void // 将指定类型数据加入到map
  clearCache(): void // 清空所有数据
  takeCache(type: string): any[] // 获取指定类型数据
  addBatchCache(type: string, data: any[]): void // 批量加入缓存
  getSize(type?: string): number // 获取缓存大小
  getAllCacheData(): any[] // 获取缓存的所有数据
  clearTypeCache(type: string): void // 将指定类型的缓存清空
}

class CachePool implements ICachePool {
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
  clearTypeCache(type: string) {
    this.cache.set(type, [])
  }

  /**
   * 获取指定类型的缓存数据并清空缓存
   */
  takeCache(type: string): any[] {
    const data = this.cache.get(type) || []
    this.cache.delete(type)
    return data
  }
  /**
   * 批量添加缓存
   */
  addBatchCache(type: string, data: any[]) {
    if (this.cache.has(type)) {
      this.cache.get(type)!.push(...data)
    } else {
      this.cache.set(type, [...data])
    }
  }

  /**
   * 获取缓存大小
   */
  getSize(type?: string) {
    if (type) {
      return this.cache.get(type)?.length || 0
    }
    return Array.from(this.cache.values()).reduce((total, arr) => total + arr.length, 0)
  }

  getAllCacheData(): Array<[any, any[]]> {
    return Array.from(this.cache.entries())
  }
}

export const cachePool = new CachePool()
