import { Integration, Transport } from '@light-eye/core'
import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals'

export class Metrics implements Integration {
  public name = 'Metrics'
  private reported = new Set<string>() // 存储已上报ID避免重复上报
  constructor(private transport: Transport) {}

  init(): void {
    // 采集Web Vitals核心指标
    this.collectWebVitals()
    // FP、DomReady、Load
    this.collectBasicMetrics()
    // 采集网络相关指标
    this.collectNetworkMetrics()
  }

  // 采集Web Vitals核心指标
  private collectWebVitals() {
    const metrics: Array<(callback: (metric: Metric) => void) => void> = [onCLS, onFCP, onINP, onLCP, onTTFB]

    metrics.forEach(metricFn => {
      metricFn(metric => {
        if (this.reported.has(metric.id)) return
        this.reported.add(metric.id)

        this.transport.send({
          event_type: 'performance',
          type: 'web_vitals',
          name: metric.name,
          value: Math.round(metric.value).toFixed(2),
          rating: metric.rating, // 性能评级（good/needs-improvement/poor）
          delta: metric.delta, // 指标变化值
          path: window.location.pathname
        })
      })
    })
  }

  private collectBasicMetrics() {
    const handleLoad = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigationEntry) {
        // load
        const loadTime = navigationEntry.loadEventEnd - navigationEntry.startTime
        this.reportBasicMetric('load', loadTime)

        // DomReady
        const domReadyTime = navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime
        this.reportBasicMetric('dom_ready', domReadyTime)
      }
    }

    // 若页面已加载完成那么直接执行
    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      // 否则就监听load事件去执行
      window.addEventListener('load', handleLoad)
    }

    // 2. 首次绘制（FP）
    const paintObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-paint' && !this.reported.has('fp')) {
          this.reported.add('fp')
          this.reportBasicMetric('first_paint', entry.startTime)
        }
      }
    })
    paintObserver.observe({ type: 'paint', buffered: true })
  }

  // 采集网络相关指标
  private collectNetworkMetrics() {
    const handleNavigationTiming = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (!navigationEntry) return

      const metrics = {
        // dns查询耗时
        dns_lookup: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
        // tcp连接耗时
        tcp_handshake: navigationEntry.connectEnd - navigationEntry.connectStart,
        // ssl安全连接耗时
        ssl_handshake:
          navigationEntry.secureConnectionStart > 0
            ? navigationEntry.connectEnd - navigationEntry.secureConnectionStart
            : 0,
        // 请求响应耗时
        // ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
        // 内容传输耗时
        request_response: navigationEntry.responseEnd - navigationEntry.requestStart,

        // 渲染相关指标
        // dom完成加载时间
        dom_parsing: navigationEntry.domComplete - navigationEntry.domInteractive,
        // 资源加载耗时
        resource_load: navigationEntry.loadEventStart - navigationEntry.domContentLoadedEventEnd
      }

      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          this.reportBasicMetric(name, Math.round(value))
        }
      })
    }

    if (document.readyState === 'complete') {
      setTimeout(handleNavigationTiming, 0)
    } else {
      window.addEventListener('load', () => {
        setTimeout(handleNavigationTiming, 0)
      })
    }
  }
  private reportBasicMetric(name: string, value: number) {
    this.transport.send({
      event_type: 'performance',
      type: 'basic',
      name,
      value: Math.round(value).toFixed(2),
      path: window.location.pathname
    })
  }
}
