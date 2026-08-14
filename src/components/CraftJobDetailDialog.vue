<!--
  合成 CPU 进度明细：对齐游戏内合成 CPU GUI（库存 / 制造中 / 计划中）。
  打开后随 craftJobs 轮询自动刷新。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { CraftJob } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import ScrollFade from './ScrollFade.vue'
import { AppButton, AppDialog } from '@/ui'
import { useCraftJobsStore } from '@/stores/craftJobs'
import { formatCompactCount, formatStackAmount } from '@/lib/formatAmount'
import { hasJobProgress, jobProgressPercent, jobQuantity } from '@/lib/craftJobProgress'
import { stripMcFormat } from '@/lib/mcFormat'

const props = defineProps<{
  open: boolean
  cpuName: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const store = useCraftJobsStore()
const { jobs } = storeToRefs(store)

const job = computed<CraftJob | null>(() => {
  if (!props.cpuName) return null
  return jobs.value.find((j) => j.cpuName === props.cpuName) ?? null
})

const quantityLabel = computed(() => {
  const j = job.value
  if (!j) return null
  const q = jobQuantity(j)
  if (!q) return null
  return t('jobs.progressCount', { progress: q.progress, total: q.total })
})

const elapsedLabel = computed(() => formatElapsedNanos(job.value?.elapsedNanos))

const entries = computed(() => job.value?.entries ?? [])

function onOpen(v: boolean) {
  emit('update:open', v)
}

function formatElapsedNanos(nanos?: string): string | null {
  if (!nanos) return null
  let sec: number
  try {
    sec = Number(BigInt(nanos) / 1_000_000_000n)
  } catch {
    return null
  }
  if (!Number.isFinite(sec) || sec < 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return t('jobs.elapsedHms', { h, m, s })
  if (m > 0) return t('jobs.elapsedMs', { m, s })
  return t('jobs.elapsedS', { s })
}

async function cancel() {
  if (!job.value?.busy) return
  await store.cancel(job.value.cpuName)
  onOpen(false)
}
</script>

<template>
  <AppDialog :open="open" class="!flex !max-h-[min(92vh,40rem)] !w-[min(96vw,36rem)] !min-w-0 !max-w-[min(96vw,36rem)] !flex-col sm:!max-w-[min(96vw,36rem)]" @update:open="onOpen">
    <template #header>
      <div class="flex items-center gap-2.5 pr-7">
        <span v-if="job?.output" class="inline-block size-9 shrink-0">
          <ItemIcon :item="job.output" />
        </span>
        <div class="min-w-0">
          <h2 class="m-0 truncate text-[14px] font-semibold tracking-[-0.02em]">
            {{ job?.cpuName || cpuName || t('jobs.detailTitle') }}
          </h2>
          <p class="mono m-0 mt-0.5 truncate text-xs text-muted">
            <template v-if="job?.output">
              <McFormattedText :text="job.output.displayName" />
              <span class="text-cyan"> × {{ formatStackAmount(job.output) }}</span>
            </template>
            <template v-else-if="job">{{ job.status }}</template>
          </p>
        </div>
      </div>
    </template>

    <div v-if="job" class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div class="shrink-0">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span class="mono">
            <template v-if="quantityLabel">{{ quantityLabel }}</template>
            <template v-else>{{ t('jobs.crafting') }}</template>
            <template v-if="elapsedLabel"> · {{ elapsedLabel }}</template>
          </span>
          <span v-if="jobProgressPercent(job) != null" class="mono text-cyan"> {{ Math.round(jobProgressPercent(job)!) }}% </span>
        </div>
        <div
          v-if="hasJobProgress(job) && jobProgressPercent(job) != null"
          class="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,var(--color-panel))]"
          role="progressbar"
          :aria-valuenow="Math.round(jobProgressPercent(job)!)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="h-full rounded-full bg-cyan transition-[width] duration-500 ease-out" :style="{ width: `${jobProgressPercent(job)}%` }" />
        </div>
      </div>

      <div class="grid shrink-0 grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem] gap-1 border-b border-line pb-1 text-[10px] uppercase tracking-wide text-muted">
        <span>{{ t('jobs.colItem') }}</span>
        <span class="text-right">{{ t('jobs.colStored') }}</span>
        <span class="text-right">{{ t('jobs.colActive') }}</span>
        <span class="text-right">{{ t('jobs.colPending') }}</span>
      </div>

      <ScrollFade class="min-h-0 flex-1 overflow-auto">
        <p v-if="!entries.length" class="py-6 text-center text-xs text-muted">{{ t('jobs.detailEmpty') }}</p>
        <ul v-else class="m-0 list-none space-y-1 p-0">
          <li
            v-for="row in entries"
            :key="row.item.key"
            class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem] items-center gap-1 rounded-md px-1 py-1 hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_8%,transparent)]"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span class="inline-block size-6 shrink-0">
                <ItemIcon :item="row.item" />
              </span>
              <span class="min-w-0 truncate text-[12px]" :title="stripMcFormat(row.item.displayName)">
                <McFormattedText :text="row.item.displayName" />
              </span>
            </div>
            <span class="mono text-right text-[12px] tabular-nums" :class="row.stored === '0' ? 'text-muted' : ''">
              {{ formatCompactCount(row.stored) }}
            </span>
            <span class="mono text-right text-[12px] tabular-nums text-cyan" :class="row.active === '0' ? '!text-muted' : ''">
              {{ formatCompactCount(row.active) }}
            </span>
            <span class="mono text-right text-[12px] tabular-nums" :class="row.pending === '0' ? 'text-muted' : ''">
              {{ formatCompactCount(row.pending) }}
            </span>
          </li>
        </ul>
      </ScrollFade>
    </div>
    <p v-else class="py-6 text-center text-xs text-muted">{{ t('jobs.detailGone') }}</p>

    <template #footer>
      <AppButton type="button" variant="outline" size="sm" @click="onOpen(false)">
        {{ t('common.close') }}
      </AppButton>
      <AppButton v-if="job?.busy" type="button" variant="outline" size="sm" @click="cancel">
        {{ t('common.cancel') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
