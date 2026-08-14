<!--
  合成确认：摘要 + 指定 CPU + 配方树画布；canSubmit 才可提交。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CraftPlanResponse } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import CraftRecipeTree from './CraftRecipeTree.vue'
import { formatStackAmount } from '../lib/formatAmount'
import { AppButton, AppDialog, AppSelect, type AppSelectOption } from '@/ui'
import { api } from '../api/client'

const props = defineProps<{
  open: boolean
  plan: CraftPlanResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const { t } = useI18n()
const busy = ref(false)
const message = ref('')
/** `__auto__` = 自动选择（Reka Select 禁止空字符串 value） */
const CPU_AUTO = '__auto__'
const selectedCpu = ref(CPU_AUTO)
/** 关闭动画期间仍保留内容，避免主体先空、footer 后消失 */
const viewPlan = ref<CraftPlanResponse | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      message.value = ''
      if (props.plan) viewPlan.value = props.plan
      const suitable = (viewPlan.value?.cpus ?? []).filter((c) => c.suitable)
      selectedCpu.value = suitable.length === 1 ? suitable[0].cpuName : CPU_AUTO
    }
  },
)

watch(
  () => props.plan,
  (p) => {
    if (props.open && p) viewPlan.value = p
  },
)

const cpuOptions = computed<AppSelectOption[]>(() => {
  const opts: AppSelectOption[] = [{ value: CPU_AUTO, label: t('craft.cpuAuto') }]
  for (const cpu of viewPlan.value?.cpus ?? []) {
    if (!cpu.suitable) continue
    opts.push({
      value: cpu.cpuName,
      label: `${cpu.cpuName} · ${t('craft.cpuOptionMeta', { bytes: cpu.bytesAvailable, co: cpu.coProcessors })}`,
    })
  }
  return opts
})

function onOpen(v: boolean) {
  emit('update:open', v)
}

async function submit() {
  const plan = viewPlan.value
  if (!plan?.canSubmit) return
  const cpuName = selectedCpu.value === CPU_AUTO ? '' : selectedCpu.value
  if (cpuName) {
    const row = plan.cpus?.find((c) => c.cpuName === cpuName)
    if (!row?.suitable) {
      message.value = t('craft.cpuUnsuitable')
      return
    }
  }
  busy.value = true
  message.value = ''
  try {
    await api.submit({
      planId: plan.planId,
      ...(cpuName ? { cpuName } : {}),
    })
    emit('submitted')
    emit('update:open', false)
  } catch (e) {
    message.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function modeLabel(mode?: string) {
  if (!mode || mode === 'leaf') return t('craft.treeLeaf')
  const map: Record<string, string> = {
    crafting: t('patterns.modeCrafting'),
    processing: t('patterns.modeProcessing'),
    smithing: t('patterns.modeSmithing'),
    stonecutting: t('patterns.modeStonecutting'),
    other: t('patterns.modeOther'),
  }
  return map[mode] || mode
}
</script>

<template>
  <AppDialog
    :open="open"
    :layer="1"
    class="!flex !max-h-[min(92vh,56rem)] !w-[min(96vw,80rem)] !min-w-0 !max-w-[min(96vw,80rem)] !flex-col sm:!max-w-[min(96vw,80rem)]"
    @update:open="onOpen"
  >
    <template #header>
      <div class="flex items-center gap-2 pr-7">
        <ItemIcon v-if="viewPlan?.output" :item="viewPlan.output" :size="36" />
        <div class="min-w-0">
          <h2 class="m-0 text-[13px] font-semibold tracking-[-0.02em]">
            <template v-if="viewPlan?.output">
              <McFormattedText :text="viewPlan.output.displayName" />
              <span class="mono text-cyan"> × {{ viewPlan.output.amount }}</span>
            </template>
          </h2>
        </div>
      </div>
    </template>

    <template v-if="viewPlan">
      <div class="grid max-h-[min(80vh,48rem)] gap-1.5 overflow-y-auto">
        <div class="grid gap-1 text-[12px]">
          <p class="mono m-0">
            {{ t('craft.bytes', { bytes: viewPlan.bytes }) }}
            <span class="text-muted"> / {{ t('craft.bytesAvailable', { bytes: viewPlan.bytesAvailable }) }}</span>
          </p>
          <p class="m-0 text-muted">
            {{ t('craft.coProcessors', { count: viewPlan.coProcessors }) }}
            · {{ t('craft.idleCpu', { idle: viewPlan.idleCpuCount, total: viewPlan.cpuCount }) }}
          </p>
          <p v-if="viewPlan.multiplePaths" class="m-0 text-[11px] text-amber">{{ t('craft.multiplePaths') }}</p>
          <p v-if="viewPlan.warning" class="m-0 text-amber">{{ viewPlan.warning }}</p>
        </div>

        <label class="mt-1 grid gap-1">
          <span class="text-xs text-muted">{{ t('craft.selectCpu') }}</span>
          <AppSelect v-model="selectedCpu" compact :options="cpuOptions" :aria-label="t('craft.selectCpu')" />
        </label>

        <div v-if="viewPlan.missing.length" class="mt-1 text-[12px] text-amber">
          <strong>{{ t('craft.missing') }}</strong>
          <ul class="mt-1 list-none space-y-1 pl-0">
            <li v-for="m in viewPlan.missing" :key="m.key" class="flex items-center gap-2">
              <ItemIcon :item="m" :size="16" />
              <span><McFormattedText :text="m.displayName" /> × {{ formatStackAmount(m) }}</span>
            </li>
          </ul>
        </div>

        <div v-if="viewPlan.tree" class="mt-1.5 border-t border-line pt-2">
          <div class="h-[min(45vh,24rem)] min-h-[12rem] w-full overflow-hidden rounded-md border border-line">
            <CraftRecipeTree :node="viewPlan.tree" :mode-label="modeLabel" />
          </div>
        </div>

        <p v-if="message" class="m-0 text-xs text-red">{{ message }}</p>
      </div>
    </template>

    <template #footer>
      <AppButton type="button" variant="outline" size="sm" :disabled="busy" @click="onOpen(false)">
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton type="button" variant="primary" size="sm" :disabled="!viewPlan?.canSubmit || busy" @click="submit">
        {{ t('craft.submit') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
