import { useCallback, useEffect, useRef, useState } from 'react'
import { RequestError } from '../service/utils/errorHandler'
import { toast } from 'sonner'

interface UseRequestOptions<T> {
  onSuccess?: (data: T, params?: any[]) => void
  onError?: (error: RequestError, params?: any[]) => void
  onFinally?: () => void
  successMessage?: string | ((data: T) => string)
  errorMessage?: string | ((error: RequestError) => string)
  showSuccess?: boolean
  showError?: boolean
  immediate?: boolean
}

export function useRequest<T = any>(apiFunction: (...args: any[]) => Promise<T>, options: UseRequestOptions<T> = {}) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<RequestError | Record<'errorFields', unknown> | null>(null)
  const hasExecuteRef = useRef(false)

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(false)
      setError(null)

      try {
        const response = await apiFunction(...args)
        setData(response)

        // 成功消息处理
        if (options.showSuccess !== false || options.successMessage) {
          const successMsg =
            typeof options.successMessage === 'function' ? options.successMessage(response) : options.successMessage
          if (successMsg) {
            toast.success(successMsg)
          }
        }

        if (options.onSuccess) {
          options.onSuccess(response, args)
        }
        return { data: response, error: null }
      } catch (err) {
        // 1. 优先处理表单校验错误（保持之前的逻辑）
        if (err && typeof err === 'object' && 'errorFields' in err) {
          console.warn('表单校验失败:', err)
          setError(err)
          return { data: null, error: err }
        }

        // 2. 处理手动抛出的字符串错误（如两次密码不一致）
        let requestError: RequestError
        if (typeof err === 'string') {
          // 字符串错误：转换为 BUSINESS 类型的 RequestError
          requestError = new RequestError(
            'BUSINESS',
            -200, // 自定义业务错误码（区别于接口错误）
            err, // 错误消息直接使用字符串
            new Error(err)
          )
        }
        // 3. 处理其他错误（保持原逻辑）
        else if (err instanceof RequestError) {
          requestError = err
        } else {
          requestError = new RequestError('NETWORK', -999, '未知错误', err as Error)
        }

        // 4. 统一处理错误消息和回调
        console.error(`[${requestError.type}] 请求失败:`, requestError)
        setError(requestError)

        if (options.showError !== false) {
          const errorMsg =
            typeof options.errorMessage === 'function'
              ? options.errorMessage(requestError)
              : options.errorMessage || requestError.message
          toast.error(errorMsg)
        }

        if (options.onError) {
          options.onError(requestError, args)
        }

        return { data: null, error: requestError }
      } finally {
        setLoading(false)
        options.onFinally?.()
      }
    },
    [apiFunction, options]
  )

  useEffect(() => {
    if (options.immediate && !hasExecuteRef.current) {
      hasExecuteRef.current = true
      execute()
    }
  }, [options.immediate, execute])

  return {
    execute,
    loading,
    data,
    error,
    setData,
    setError
  }
}
