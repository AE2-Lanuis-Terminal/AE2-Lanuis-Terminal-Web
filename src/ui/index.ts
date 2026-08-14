/**
 * 应用级 UI 封装（基于 shadcn-vue / Reka UI + Fluix token）
 * 业务页面优先从此处导入，避免直接依赖 `@/components/ui/*`。
 */

export { default as AppButton } from './AppButton.vue'
export { default as AppInput } from './AppInput.vue'
export { default as AppField } from './AppField.vue'
export { default as AppFieldAffix } from './AppFieldAffix.vue'
export { default as AppCheckbox } from './AppCheckbox.vue'
export { default as AppDialog } from './AppDialog.vue'
export { default as AppSelect } from './AppSelect.vue'
export { default as AppPagination } from './AppPagination.vue'
export { default as AppFadeSwap } from './AppFadeSwap.vue'
export { default as AppSheet } from './AppSheet.vue'
export { default as AppSwitch } from './AppSwitch.vue'
export { default as AppTabs } from './AppTabs.vue'
export { default as AppSeparator } from './AppSeparator.vue'
export { affixActionClass } from './utils'
export type { AppSelectOption } from './AppSelect.vue'
export type { AppTabItem } from './AppTabs.vue'
