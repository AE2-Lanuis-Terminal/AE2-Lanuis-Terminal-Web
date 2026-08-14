<!--
  合成 CPU 任务列表：进度条；忙碌任务可 pin 到右下角；点击打开进度明细；「完成推送」开关。
  列表数据由全局 store 轮询，切页不中断。
-->
<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { PinIcon, PinOffIcon } from '@lucide/vue'
import { AppSwitch } from '@/ui'
import ItemIcon from './ItemIcon.vue'
import ScrollFade from './ScrollFade.vue'
import CraftJobDetailDialog from './CraftJobDetailDialog.vue'
import { useCraftJobsStore } from '@/stores/craftJobs'
import { hasJobProgress, jobProgressPercent, jobQuantity } from '@/lib/craftJobProgress'
import { stripMcFormat } from '@/lib/mcFormat'

const { t } = useI18n()
const store = useCraftJobsStore()
const { jobs, message, notifyComplete, pinnedCpuNames } = storeToRefs(store)

const detailOpen = ref(false)
const detailCpu = ref<string | null>(null)

function pinned(cpuName: string) {
  return pinnedCpuNames.value.includes(cpuName)
}

function quantityLabel(job: (typeof jobs.value)[number]) {
  const q = jobQuantity(job)
  if (!q) return null
  return t('jobs.progressCount', { progress: q.progress, total: q.total })
}

function openDetail(cpuName: string) {
  detailCpu.value = cpuName
  detailOpen.value = true
}
</script>

<template>
  <section class="flex h-full min-h-[240px] min-w-[280px] flex-col overflow-hidden">
    <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
      <h3 class="m-0">{{ t('jobs.title') }}</h3>
      <div class="flex flex-wrap items-center gap-3">
        <label class="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
          <span>{{ t('jobs.notifyComplete') }}</span>
          <AppSwitch :model-value="notifyComplete" @update:model-value="store.setNotifyComplete($event)" />
        </label>
        <button type="button" class="ui-btn !h-[32px]" @click="store.refresh()">
          {{ t('common.refresh') }}
        </button>
      </div>
    </div>
    <p class="mb-2 min-h-4 shrink-0 text-xs text-muted">{{ message }}</p>
    <ScrollFade class="min-h-0 flex-1 overflow-auto">
      <p v-if="!jobs.length" class="text-muted">{{ t('jobs.empty') }}</p>
      <div v-else class="grid gap-2">
        <article
          v-for="job in jobs"
          :key="job.cpuName"
          class="ui-glass-chip flex min-h-[64px] flex-col gap-2 rounded-[8px] px-3.5 py-3"
          :class="[
            job.busy ? '!border-[color:var(--glass-border-bright)]' : '',
            job.busy ? 'cursor-pointer transition-[border-color,background] hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_10%,transparent)]' : '',
          ]"
          :role="job.busy ? 'button' : undefined"
          :tabindex="job.busy ? 0 : undefined"
          :aria-label="job.busy ? t('jobs.openDetail', { name: job.cpuName }) : undefined"
          @click="job.busy && openDetail(job.cpuName)"
          @keydown.enter.prevent="job.busy && openDetail(job.cpuName)"
          @keydown.space.prevent="job.busy && openDetail(job.cpuName)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span v-if="job.output" class="inline-block size-8 shrink-0">
                <ItemIcon :item="job.output" />
              </span>
              <div class="min-w-0">
                <strong class="block truncate">{{ job.cpuName }}</strong>
                <p class="mono m-0 mt-0.5 truncate text-xs text-muted">
                  <template v-if="job.output">{{ stripMcFormat(job.output.displayName) }}</template>
                  <template v-else>{{ job.status }}</template>
                </p>
                <small v-if="job.detail && !job.output" class="text-[11px] text-[#6f788a]">{{ job.detail }}</small>
              </div>
            </div>
            <div v-if="job.busy" class="flex shrink-0 items-center gap-1" @click.stop>
              <button
                type="button"
                class="ui-btn !px-2"
                :class="pinned(job.cpuName) ? '!border-cyan/50 !text-cyan' : ''"
                :aria-pressed="pinned(job.cpuName)"
                :aria-label="pinned(job.cpuName) ? t('jobs.unpin') : t('jobs.pin')"
                :title="pinned(job.cpuName) ? t('jobs.unpin') : t('jobs.pin')"
                @click="store.togglePin(job.cpuName)"
              >
                <PinOffIcon v-if="pinned(job.cpuName)" class="size-3.5" />
                <PinIcon v-else class="size-3.5" />
              </button>
              <button type="button" class="ui-btn" @click="store.cancel(job.cpuName)">
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
          <div v-if="job.busy" class="min-w-0">
            <div class="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span class="mono">
                <template v-if="quantityLabel(job)">{{ quantityLabel(job) }}</template>
                <template v-else>{{ t('jobs.crafting') }}</template>
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
        </article>
      </div>
    </ScrollFade>

    <CraftJobDetailDialog v-model:open="detailOpen" :cpu-name="detailCpu" />
  </section>
</template>
