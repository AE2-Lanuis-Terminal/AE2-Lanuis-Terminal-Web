<!--
  右下角：完成 Toast + 用户手动 pin 的忙碌任务进度。
  默认不展示进度面板，需在任务列表点 pin。
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ChevronDownIcon, ChevronUpIcon, XIcon } from '@lucide/vue'
import ItemIcon from './ItemIcon.vue'
import { useCraftJobsStore } from '@/stores/craftJobs'
import { hasJobProgress, jobProgressPercent, jobQuantity } from '@/lib/craftJobProgress'
import { stripMcFormat } from '@/lib/mcFormat'

const { t } = useI18n()
const store = useCraftJobsStore()
const { pinnedBusyJobs, toasts, dockCollapsed, notifyComplete } = storeToRefs(store)

function label(job: (typeof pinnedBusyJobs.value)[number]) {
  if (job.output) return stripMcFormat(job.output.displayName)
  return job.detail || job.cpuName
}

function quantityLabel(job: (typeof pinnedBusyJobs.value)[number]) {
  const q = jobQuantity(job)
  if (!q) return null
  return t('jobs.progressCount', { progress: q.progress, total: q.total })
}
</script>

<template>
  <div class="pointer-events-none app-safe-dock fixed z-[80] flex w-[min(100vw-1.5rem,20rem)] flex-col items-stretch gap-2">
    <TransitionGroup v-if="notifyComplete" name="ui-craft-toast" tag="div" class="pointer-events-auto flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="ui-glass-chip flex items-start gap-2.5 rounded-[10px] border border-[color:var(--glass-border-bright)] px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
      >
        <ItemIcon v-if="toast.output" :item="toast.output" :size="28" class="mt-0.5" />
        <div class="min-w-0 flex-1">
          <p class="m-0 text-[12px] font-medium text-ink">{{ t('jobs.completeToast') }}</p>
          <p class="mono m-0 mt-0.5 truncate text-[11px] text-muted">
            {{ toast.output ? stripMcFormat(toast.output.displayName) : toast.detail || toast.cpuName }}
          </p>
          <p class="m-0 mt-0.5 truncate text-[10px] text-muted">{{ toast.cpuName }}</p>
        </div>
        <button
          type="button"
          class="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-muted hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_16%,transparent)] hover:text-ink"
          :aria-label="t('common.close')"
          @click="store.dismissToast(toast.id)"
        >
          <XIcon class="size-3.5" />
        </button>
      </div>
    </TransitionGroup>

    <section
      v-if="pinnedBusyJobs.length"
      class="pointer-events-auto ui-glass-chip overflow-hidden rounded-[10px] border border-[color:var(--glass-border-bright)] shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
    >
      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-line px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_10%,transparent)]"
        :aria-expanded="!dockCollapsed"
        :aria-label="dockCollapsed ? t('jobs.dockExpand') : t('jobs.dockCollapse')"
        @click="store.setDockCollapsed(!dockCollapsed)"
      >
        <span class="m-0 text-[12px] font-medium text-ink">{{ t('jobs.dockTitle') }}</span>
        <span class="inline-flex size-6 shrink-0 items-center justify-center text-muted" aria-hidden="true">
          <ChevronDownIcon v-if="!dockCollapsed" class="size-3.5" />
          <ChevronUpIcon v-else class="size-3.5" />
        </span>
      </button>
      <div v-show="!dockCollapsed" class="max-h-[40vh] space-y-2.5 overflow-auto px-3 py-2.5">
        <article v-for="job in pinnedBusyJobs" :key="job.cpuName" class="min-w-0">
          <div class="flex items-center gap-2">
            <ItemIcon v-if="job.output" :item="job.output" :size="24" />
            <div class="min-w-0 flex-1">
              <p class="m-0 truncate text-[12px] text-ink">{{ label(job) }}</p>
              <p class="mono m-0 truncate text-[10px] text-muted">{{ job.cpuName }}</p>
            </div>
            <span v-if="jobProgressPercent(job) != null" class="mono shrink-0 text-[11px] text-cyan"> {{ Math.round(jobProgressPercent(job)!) }}% </span>
            <button
              type="button"
              class="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-muted hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_16%,transparent)] hover:text-ink"
              :aria-label="t('jobs.unpin')"
              :title="t('jobs.unpin')"
              @click="store.unpinJob(job.cpuName)"
            >
              <XIcon class="size-3.5" />
            </button>
          </div>
          <div
            v-if="hasJobProgress(job) && jobProgressPercent(job) != null"
            class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,var(--color-panel))]"
            role="progressbar"
            :aria-valuenow="Math.round(jobProgressPercent(job)!)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="h-full rounded-full bg-cyan transition-[width] duration-500 ease-out" :style="{ width: `${jobProgressPercent(job)}%` }" />
          </div>
          <p v-if="quantityLabel(job)" class="mono m-0 mt-1 text-[10px] text-muted">{{ quantityLabel(job) }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ui-craft-toast-enter-active,
.ui-craft-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.ui-craft-toast-enter-from,
.ui-craft-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
