import { getComposedPath, getComposedPathEle, getPaths } from '../paths'

// 模拟DOM环境
describe('getComposedPathEle', () => {
  let container: HTMLElement
  let parent: HTMLElement
  let child: HTMLElement
  let event: Event

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'container'

    parent = document.createElement('div')
    parent.className = 'parent'

    child = document.createElement('button')
    child.textContent = '测试按钮'
    child.className = 'btn'

    parent.appendChild(child)
    container.appendChild(parent)
    document.body.appendChild(container)
    event = new Event('click', { bubbles: true, composed: true })
  })

  test('should return correct path when composedPath is supported', () => {
    child.dispatchEvent(event)
    const path = getComposedPathEle(event)

    // 验证路径包含所有节点
    expect(path).toContain(child) // 目标元素
    expect(path).toContain(parent) // 父元素
    expect(path).toContain(container) // 容器元素
    expect(path).toContain(document.body) // body
    expect(path).toContain(document.documentElement) // html
    expect(path).toContain(document)
    expect(path).toContain(window)

    // 验证路径顺序（从目标到顶层）
    expect(path[0]).toBe(child)
    expect(path[path.length - 1]).toBe(window)
  })

  // 测试不支持composedPath的浏览器（模拟兼容情况）
  test('should return correct path when composedPath is not supported', () => {
    // 保存原始方法
    const originalComposedPath = Event.prototype.composedPath

    delete Event.prototype.composedPath

    child.dispatchEvent(event)
    const path = getComposedPathEle(event)

    Event.prototype.composedPath = originalComposedPath

    // 验证兼容模式下的路径
    expect(path).toContain(child)
    expect(path).toContain(parent)
    expect(path).toContain(container)
    expect(path).toContain(document)
    expect(path).toContain(window)
  })

  // 测试非冒泡事件
  test('should handle non-bubbling events', () => {
    // 创建非冒泡事件
    const nonBubblingEvent = new Event('click', { bubbles: false })
    child.dispatchEvent(nonBubblingEvent)

    const path = getComposedPathEle(nonBubblingEvent)

    // 非冒泡事件也应该能获取到完整路径
    expect(path).toContain(child)
  })

  // 测试document上的事件
  test('should handle events on document', () => {
    const docEvent = new Event('click')
    document.dispatchEvent(docEvent)

    const path = getComposedPathEle(docEvent)

    expect(path).toContain(document)
    expect(path).toContain(window)
  })

  // 测试window上的事件
  test('should handle events on window', () => {
    const winEvent = new Event('resize')
    window.dispatchEvent(winEvent)

    const path = getComposedPathEle(winEvent)

    expect(path).toContain(window)
  })
  // 测试基础的选择器生成
  test('getComposedPath should generate correct selector array', () => {
    child.dispatchEvent(event)
    const path = getComposedPath(event)

    expect(path).toEqual(['html', 'body', 'div#container', 'div.parent', 'button.btn'])
  })

  // 测试路径字符串拼接
  test('getPaths should generate correct path string', () => {
    child.dispatchEvent(event)
    const pathStr = getPaths(event)

    expect(pathStr).toBe('html > body > div#container > div.parent > button.btn')
  })

  // 测试无id和类名的元素
  test('should handle elements without id and class', () => {
    // 创建无标识的元素
    const plainDiv = document.createElement('div')
    document.body.appendChild(plainDiv)

    const plainEvent = new Event('click', { bubbles: true })
    plainDiv.dispatchEvent(plainEvent)

    expect(getComposedPath(plainEvent)).toContain('div')
    expect(getPaths(plainEvent)).toContain('html > body > div')
  })

  // 测试文本节点的过滤（避免非元素节点生成无效选择器）
  test('should ignore non-element nodes (e.g., text nodes)', () => {
    const textContainer = document.createElement('div')
    textContainer.textContent = '测试文本' // 会生成Text节点
    document.body.appendChild(textContainer)

    // 触发事件（目标可能是Text节点）
    const textEvent = new Event('click', { bubbles: true })
    textContainer.dispatchEvent(textEvent)

    const path = getComposedPath(textEvent)
    // 确保Text节点被过滤，只保留元素节点
    expect(path).not.toContain('') // 无空字符串
    expect(path).toContain('div') // 只包含元素节点的选择器
  })
  // 测试null/undefined事件
  test('should return empty array for null/undefined event', () => {
    expect(getComposedPathEle(null as unknown as Event)).toEqual([])
    expect(getComposedPathEle(undefined as unknown as Event)).toEqual([])
    expect(getComposedPath(null as unknown as Event)).toEqual([])
    expect(getComposedPath(undefined as unknown as Event)).toEqual([])
    expect(getPaths(null as unknown as Event)).toBe('')
    expect(getPaths(undefined as unknown as Event)).toBe('')
  })
})
