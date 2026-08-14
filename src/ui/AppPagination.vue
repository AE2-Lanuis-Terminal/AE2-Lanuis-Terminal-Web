<!--
  工具条分页：首页/末页、页码窗、每页条数、跳转；宽度随工具栏换行。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDownIcon, ChevronLeft, ChevronRight, ChevronUpIcon, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { affixActionClass } from './utils'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 96 })

const props = withDefaults(
  defineProps<{
    total: number
    pageSizes?: number[]
    disabled?: boolean
    /** 是否显示每页条数 */
    showSize?: boolean
    /** 是否显示跳转 */
    showJumper?: boolean
  }>(),
  {
    pageSizes: () => [48, 96, 128, 192],
    disabled: false,
    showSize: true,
    showJumper: true,
  },
)

const emit = defineEmits<{
  change: []
}>()

const { t } = useI18n()
/** number 输入可能回写 number，读写统一经 String / jumpValue */
const jumpDraft = ref<string | number>(String(page.value))

const pageCount = computed(() => Math.max(1, Math.ceil(Math.max(0, props.total) / Math.max(1, pageSize.value))))
const canPrev = computed(() => page.value > 1 && !props.disabled)
const canNext = computed(() => page.value < pageCount.value && !props.disabled)

const sizeOptions = computed<AppSelectOption[]>(() =>
  props.pageSizes.map((n) => ({
    value: String(n),
    label: String(n),
  })),
)

const sizeModel = computed({
  get: () => String(pageSize.value),
  set: (v: string) => {
    const next = Number(v) || pageSize.value
    if (next === pageSize.value) return
    pageSize.value = next
    page.value = 1
    emit('change')
  },
})

/** 页码 ≤4 全展示；更多时保留首尾 + 当前邻域，中间用省略 */
const pageWindow = computed(() => {
  const total = pageCount.value
  const current = Math.min(Math.max(1, page.value), total)
  if (total <= 4) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total])
  if (current <= 2) {
    pages.add(2)
    pages.add(3)
  } else if (current >= total - 1) {
    pages.add(total - 1)
    pages.add(total - 2)
  } else {
    pages.add(current)
  }

  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!
    if (i > 0 && n - sorted[i - 1]! > 1) out.push('gap')
    out.push(n)
  }
  return out
})

const rangeLabel = computed(() => {
  if (props.total <= 0) return t('pagination.empty')
  return t('pagination.total', { total: props.total })
})

watch(pageCount, (pages) => {
  if (page.value > pages) {
    page.value = pages
    emit('change')
  }
})

watch(page, (p) => {
  jumpDraft.value = String(p)
})

function jumpValue() {
  const raw = jumpDraft.value
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NaN
  const s = String(raw ?? '').trim()
  if (s === '') return Number.NaN
  return Number(s)
}

function go(target: number) {
  if (props.disabled) return
  const next = Math.min(Math.max(1, Math.round(target)), pageCount.value)
  if (next === page.value) return
  page.value = next
  emit('change')
}

function onJump() {
  if (props.disabled) return
  let n = jumpValue()
  if (!Number.isFinite(n)) n = page.value
  const next = Math.min(Math.max(1, Math.round(n)), pageCount.value)
  jumpDraft.value = String(next)
  if (next === page.value) return
  page.value = next
  emit('change')
}

function bumpJump(delta: number) {
  if (props.disabled) return
  const cur = jumpValue()
  const base = Number.isFinite(cur) ? cur : page.value
  const next = Math.min(Math.max(1, Math.round(base + delta)), pageCount.value)
  jumpDraft.value = String(next)
}

/** 点击省略：跳到两侧页码的中点 */
function goGap(idx: number) {
  const win = pageWindow.value
  const prev = win[idx - 1]
  const next = win[idx + 1]
  if (typeof prev !== 'number' || typeof next !== 'number') return
  go(Math.floor((prev + next) / 2))
}

const navBtnClass = 'h-8 min-w-8 shrink-0 px-1.5 text-muted transition-none disabled:opacity-40 [&_svg]:size-3.5'
const pageBtnActiveClass =
  '!border-cyan/50 !bg-[color-mix(in_srgb,var(--color-cyan-dim)_26%,var(--glass-bg))] !text-cyan !shadow-none hover:!border-cyan/50 hover:!bg-[color-mix(in_srgb,var(--color-cyan-dim)_26%,var(--glass-bg))] hover:!text-cyan hover:!shadow-none'
</script>

<template>
  <nav class="mt-3 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-3 text-muted" :aria-label="t('pagination.nav')">
    <div class="flex flex-wrap items-center gap-1">
      <AppButton
        type="button"
        variant="outline"
        size="sm"
        :class="navBtnClass"
        :disabled="!canPrev"
        :aria-label="t('pagination.first')"
        :title="t('pagination.first')"
        @click="go(1)"
      >
        <ChevronsLeft aria-hidden="true" />
      </AppButton>
      <AppButton
        type="button"
        variant="outline"
        size="sm"
        :class="navBtnClass"
        :disabled="!canPrev"
        :aria-label="t('common.prevPage')"
        :title="t('common.prevPage')"
        @click="go(page - 1)"
      >
        <ChevronLeft aria-hidden="true" />
      </AppButton>

      <template v-for="(item, idx) in pageWindow" :key="item === 'gap' ? `gap-${idx}` : `p-${item}`">
        <AppButton
          v-if="item === 'gap'"
          type="button"
          variant="outline"
          size="sm"
          :class="cn(navBtnClass, 'mono min-w-8')"
          :disabled="disabled"
          :aria-label="t('pagination.morePages')"
          :title="t('pagination.morePages')"
          @click="goGap(idx)"
        >
          …
        </AppButton>
        <AppButton
          v-else
          type="button"
          variant="outline"
          size="sm"
          :class="cn(navBtnClass, 'mono min-w-8', item === page && pageBtnActiveClass)"
          :disabled="disabled"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="t('pagination.pageAria', { page: item })"
          @click="go(item)"
        >
          {{ item }}
        </AppButton>
      </template>

      <AppButton
        type="button"
        variant="outline"
        size="sm"
        :class="navBtnClass"
        :disabled="!canNext"
        :aria-label="t('common.nextPage')"
        :title="t('common.nextPage')"
        @click="go(page + 1)"
      >
        <ChevronRight aria-hidden="true" />
      </AppButton>
      <AppButton
        type="button"
        variant="outline"
        size="sm"
        :class="navBtnClass"
        :disabled="!canNext"
        :aria-label="t('pagination.last')"
        :title="t('pagination.last')"
        @click="go(pageCount)"
      >
        <ChevronsRight aria-hidden="true" />
      </AppButton>
    </div>

    <span
      class="mono inline-flex h-8 shrink-0 items-center rounded-[var(--app-radius-md)] border border-[color:var(--glass-border)] bg-[var(--glass-bg-soft)] px-2.5 text-[0.75rem] text-muted shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[10px]"
    >
      {{ rangeLabel }}
    </span>

    <AppSelect v-if="showSize" v-model="sizeModel" compact :disabled="disabled" :options="sizeOptions" :aria-label="t('pagination.pageSize')" />

    <form v-if="showJumper" class="inline-flex items-center" @submit.prevent="onJump">
      <AppInput v-model="jumpDraft" compact mono type="number" class="w-[6.75rem]" :disabled="disabled" :placeholder="String(page)" :aria-label="t('pagination.goto')">
        <template #prefix>
          <div class="ui-stepper" role="group" :aria-label="t('pagination.stepper')">
            <button type="button" class="ui-stepper-btn" :disabled="disabled" :aria-label="t('pagination.stepUp')" tabindex="-1" @click="bumpJump(1)">
              <ChevronUpIcon aria-hidden="true" />
            </button>
            <button type="button" class="ui-stepper-btn" :disabled="disabled" :aria-label="t('pagination.stepDown')" tabindex="-1" @click="bumpJump(-1)">
              <ChevronDownIcon aria-hidden="true" />
            </button>
          </div>
        </template>
        <template #affix>
          <button type="button" :class="affixActionClass()" :disabled="disabled" @click="onJump">
            {{ t('pagination.gotoConfirm') }}
          </button>
        </template>
      </AppInput>
    </form>
  </nav>
</template>
