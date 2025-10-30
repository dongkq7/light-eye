/**
 * 获取事件完整路径
 * @param e 事件对象
 * @returns 事件路径数组
 */
export const getComposedPathEle = (e: Event): EventTarget[] => {
  if (!e) return []

  // 兼容逻辑
  let target = e.target as Node | null
  const composedPathEle: EventTarget[] = []
  while (target) {
    composedPathEle.push(target)
    // 若已到达顶层节点，停止循环（避免重复添加）
    if (target === document.documentElement) {
      break
    }
    target = target.parentNode
  }

  // 补充 document 和 window（仅当未包含时）
  if (!composedPathEle.includes(document)) {
    composedPathEle.push(document)
  }
  if (!composedPathEle.includes(window)) {
    composedPathEle.push(window)
  }

  return composedPathEle
}

/**
 * 将事件路径转换为选择器字符串数组
 * @param e 事件对象
 * @returns 选择器数组
 */
export const getComposedPath = (e: Event): string[] => {
  if (!e) {
    return []
  }
  const composedPathEle = getComposedPathEle(e)
  return composedPathEle
    .reverse()
    .slice(2)
    .map(el => {
      const element = el as HTMLElement
      return getElementSelector(element)
    })
}

/**
 * 获取事件触发的完整路径字符串
 * @param e 事件对象
 * @returns 路径字符串，如 "html > body > div > button#jsError"
 */
export const getPaths = (e: Event): string => {
  if (!e) return ''
  const composedPath = getComposedPath(e)
  return composedPath.join(' > ')
}

/**
 * 获取元素选择器
 */
export function getElementSelector(element: HTMLElement | null): string {
  if (!element) return ''
  let selector = element.tagName?.toLowerCase() || ''
  if (element.id) {
    selector += `#${element.id}`
  }
  if (element.className) {
    selector += `.${(element.className as string).replace(/\s+/g, '.')}`
  }

  return selector
}
