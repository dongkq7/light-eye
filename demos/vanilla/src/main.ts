import './style.css'
import { init } from '@light-eye/browser'

init({ dsn: 'http://test/api' })

// 异常测试逻辑
function setupErrorTests() {
  // JS运行时异常（类型错误）
  document.querySelector<HTMLButtonElement>('#js-error-btn')?.addEventListener('click', () => {
    const nullObj: any = null
    console.log(nullObj.name)
  })
  // 资源加载异常（无效图片）
  document.querySelector<HTMLButtonElement>('#resource-error-btn')?.addEventListener('click', () => {
    const invalidImg = document.createElement('img')
    invalidImg.src = `invalid-image-${Date.now()}.png` // 用时间戳确保URL唯一
    invalidImg.style.display = 'none'
    document.body.appendChild(invalidImg)
    // 加载失败后清理
    invalidImg.addEventListener('error', () => document.body.removeChild(invalidImg))
  })

  // Promise未捕获异常
  document.querySelector<HTMLButtonElement>('#promise-error-btn')?.addEventListener('click', () => {
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Promise执行失败：模拟异步操作异常'))
      }, 500)
    })
  })
}

setupErrorTests()
