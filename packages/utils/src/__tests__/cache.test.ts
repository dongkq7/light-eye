import { cachePool } from '../cache' // 根据根据实际文件路径调整

describe('CachePool', () => {
  // 每个测试前清空缓存，确保隔离性
  beforeEach(() => {
    cachePool.clearCache()
  })

  describe('addCache', () => {
    test('should add single data to cache by type', () => {
      // 测试添加单条数据
      cachePool.addCache('test', { id: 1 })

      // 验证数据已添加
      expect(cachePool.getCache().get('test')).toEqual([{ id: 1 }])
      expect(cachePool.getSize('test')).toBe(1)
    })

    test('should append data to existing type', () => {
      // 测试向已有类型添加数据
      cachePool.addCache('test', { id: 1 })
      cachePool.addCache('test', { id: 2 })

      expect(cachePool.getCache().get('test')).toEqual([{ id: 1 }, { id: 2 }])
      expect(cachePool.getSize('test')).toBe(2)
    })
  })

  describe('addBatchCache', () => {
    test('should add multiple data to new type', () => {
      // 测试批量添加到新类型
      const batchData = [{ id: 1 }, { id: 2 }]
      cachePool.addBatchCache('batch', batchData)

      expect(cachePool.getCache().get('batch')).toEqual(batchData)
      expect(cachePool.getSize('batch')).toBe(2)
    })

    test('should merge multiple data to existing type', () => {
      // 测试批量添加到已有类型
      cachePool.addCache('batch', { id: 1 })
      const newData = [{ id: 2 }, { id: 3 }]
      cachePool.addBatchCache('batch', newData)

      expect(cachePool.getCache().get('batch')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })
  })

  describe('takeCache', () => {
    test('should get and remove data by type', () => {
      // 测试获取并删除指定类型数据
      cachePool.addCache('take', { id: 1 })
      const data = cachePool.takeCache('take')

      expect(data).toEqual([{ id: 1 }])
      expect(cachePool.getCache().has('take')).toBe(false) // 验证已删除
    })

    test('should return empty array for non-existent type', () => {
      // 测试获取不存在的类型
      const data = cachePool.takeCache('nonexistent')

      expect(data).toEqual([])
    })
  })

  describe('getSize', () => {
    test('should return total size of specific type', () => {
      // 测试获取指定类型的大小
      cachePool.addBatchCache('size', [{ id: 1 }, { id: 2 }])

      expect(cachePool.getSize('size')).toBe(2)
      expect(cachePool.getSize('nonexistent')).toBe(0) // 不存在的类型返回0
    })

    test('should return total size of all types', () => {
      // 测试获取所有类型的总大小
      cachePool.addCache('a', { id: 1 })
      cachePool.addBatchCache('b', [{ id: 2 }, { id: 3 }])

      expect(cachePool.getSize()).toBe(3) // 1 + 2 = 3
    })
  })

  describe('getAllCacheData', () => {
    test('should return all cache data as tuple array', () => {
      // 测试获取所有缓存数据（元组数组形式）
      cachePool.addCache('user', { name: 'test' })
      cachePool.addBatchCache('log', [{ msg: 'a' }, { msg: 'b' }])

      const allData = cachePool.getAllCacheData()

      // 验证返回格式为 [type, data[]] 的元组数组
      expect(allData).toEqual(
        expect.arrayContaining([
          ['user', [{ name: 'test' }]],
          ['log', [{ msg: 'a' }, { msg: 'b' }]]
        ])
      )
      expect(allData.length).toBe(2)
    })

    test('should return empty array when cache is empty', () => {
      // 测试空缓存时的返回值
      expect(cachePool.getAllCacheData()).toEqual([])
    })
  })

  describe('clearCache & clearTypeCache', () => {
    test('clearTypeCache should clear specific type data', () => {
      // 测试清空指定类型
      cachePool.addCache('clear', { id: 1 })
      cachePool.clearTypeCache('clear')

      expect(cachePool.getCache().get('clear')).toEqual([]) // 清空为[]而非删除
      expect(cachePool.getSize('clear')).toBe(0)
    })

    test('clearCache should clear all data', () => {
      // 测试清空所有缓存
      cachePool.addCache('a', { id: 1 })
      cachePool.addCache('b', { id: 2 })
      cachePool.clearCache()

      expect(cachePool.getCache().size).toBe(0) // Map为空
      expect(cachePool.getSize()).toBe(0)
    })
  })

  describe('getCache', () => {
    test('should return the underlying Map instance', () => {
      // 测试获取原始Map
      const cache = cachePool.getCache()
      expect(cache).toBeInstanceOf(Map)

      // 验证Map的引用一致性
      cachePool.addCache('ref', { data: 'test' })
      expect(cache.get('ref')).toEqual([{ data: 'test' }])
    })
  })
})
