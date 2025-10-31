<template>
  <div class="error-test-group">
    <button id="js-error-btn" class="error-btn" @click="jsError">触发JS运行时异常</button>
    <button id="resource-error-btn" class="error-btn" @click="resourceError">触发资源加载异常</button>
    <button id="promise-error-btn" class="error-btn" @click="promiseError">触发Promise异常</button>
  </div>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
.error-test-group {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.error-btn {
  padding: 8px 16px;
  cursor: pointer;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.error-btn:hover {
  background-color: #666;
}
</style>
