/**
 * 列表/分页换页：筛选或页码变化后，等数据到位再换 Transition key，避免旧数据套新动画。
 */
import { ref, watch, type Ref, type WatchSource } from 'vue'

export function useSwapKey(triggerSources: WatchSource[], dataSource: WatchSource, initial = '0') {
  const swapKey = ref(initial)
  let pending = false

  watch(triggerSources, () => {
    pending = true
  })

  watch(dataSource, () => {
    if (!pending && swapKey.value !== initial) return
    pending = false
    swapKey.value = `${Date.now()}`
  })

  return swapKey as Ref<string>
}
