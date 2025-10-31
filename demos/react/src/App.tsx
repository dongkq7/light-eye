import './App.css'
function jsError() {
  const nullObj: any = null
  console.log(nullObj.name)
}

function resourceError() {
  const invalidImg = document.createElement('img')
  invalidImg.src = `invalid-image-${Date.now()}.png` // 用时间戳确保URL唯一
  invalidImg.style.display = 'none'
  document.body.appendChild(invalidImg)
  // 加载失败后清理
  invalidImg.addEventListener('error', () => document.body.removeChild(invalidImg))
}

function promiseError() {
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Promise执行失败：模拟异步操作异常'))
    }, 500)
  })
}
function App() {
  return (
    <>
      <div className="error-test-group">
        <button onClick={jsError}>触发JS运行时异常</button>
        <button onClick={resourceError}>触发资源加载异常</button>
        <button onClick={promiseError}>触发Promise异常</button>
      </div>
    </>
  )
}

export default App
