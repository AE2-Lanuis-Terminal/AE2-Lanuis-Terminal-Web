<!--
  ME 控制器 Logo；pulse 受设置「界面动画」约束（animationsEnabled / data-motion）。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'

const props = withDefaults(
  defineProps<{
    /** 边长：sm 28 / md 36 / lg 48 */
    size?: 'sm' | 'md' | 'lg'
    /** 是否播放能量脉冲（仍受全局动效开关限制） */
    pulse?: boolean
  }>(),
  { size: 'md', pulse: true },
)

const { animationsEnabled } = storeToRefs(useSettingsStore())
const pulseOn = computed(() => props.pulse && animationsEnabled.value)
</script>

<template>
  <span class="me-logo" :class="[`me-logo--${size}`, { 'me-logo--pulse': pulseOn }]" role="img" aria-hidden="true">
    <span class="me-logo__face">
      <span class="me-logo__grid" />
      <span class="me-logo__channel me-logo__channel--h" />
      <span class="me-logo__channel me-logo__channel--v" />
      <span class="me-logo__core" />
      <span class="me-logo__corner me-logo__corner--tl" />
      <span class="me-logo__corner me-logo__corner--tr" />
      <span class="me-logo__corner me-logo__corner--bl" />
      <span class="me-logo__corner me-logo__corner--br" />
    </span>
  </span>
</template>

<style scoped>
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo {
  /* CSS 变量 --me-size */
  --me-size: 36px;
  /* CSS 变量 --me-metal */
  --me-metal: #1c2129;
  /* CSS 变量 --me-metal-hi */
  --me-metal-hi: #2a3140;
  /* CSS 变量 --me-edge */
  --me-edge: #3d4658;
  /* CSS 变量 --me-fluix */
  --me-fluix: #5ad6ff;
  /* CSS 变量 --me-fluix-dim */
  --me-fluix-dim: #1a7a9c;
  /* CSS 变量 --me-core */
  --me-core: #9ef0ff;
  /* 布局显示方式 */
  display: inline-grid;
  /* 声明属性 place-items */
  place-items: center;
  /* 宽度 */
  width: var(--me-size);
  /* 高度 */
  height: var(--me-size);
  /* 弹性收缩 */
  flex-shrink: 0;
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo--sm {
  /* CSS 变量 --me-size */
  --me-size: 28px;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo--md {
  /* CSS 变量 --me-size */
  --me-size: 36px;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo--lg {
  /* CSS 变量 --me-size */
  --me-size: 48px;
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__face {
  /* 定位方式 */
  position: relative;
  /* 宽度 */
  width: 100%;
  /* 高度 */
  height: 100%;
  /* 圆角 */
  border-radius: 5px;
  /* 背景 */
  background: linear-gradient(145deg, var(--me-metal-hi) 0%, var(--me-metal) 48%, #12161d 100%);
  /* 阴影/内描边 */
  box-shadow:
    /* 样式声明 */
    inset 0 0 0 1px color-mix(in srgb, var(--me-edge) 70%, transparent),
    /* 样式声明 */ inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent),
    /* 样式声明 */ 0 0 0 1px color-mix(in srgb, #000 35%, transparent);
  /* 溢出裁剪 */
  overflow: hidden;
}

/* ME 面板格栅 */
.me-logo__grid {
  /* 定位方式 */
  position: absolute;
  /* 四边偏移 */
  inset: 18%;
  /* 圆角 */
  border-radius: 2px;
  /* 背景图（网格/光晕等） */
  background-image:
    /* 样式声明 */
    linear-gradient(/* 样式声明 */ to right, /* 样式声明 */ color-mix(in srgb, var(--me-edge) 55%, transparent) 1px, /* 样式声明 */ transparent 1px /* 样式细节 */),
    /* 样式声明 */ linear-gradient(/* 样式声明 */ to bottom, /* 样式声明 */ color-mix(in srgb, var(--me-edge) 55%, transparent) 1px, /* 样式声明 */ transparent 1px /* 样式细节 */);
  /* 背景尺寸 */
  background-size: 25% 25%;
  /* 不透明度 */
  opacity: 0.55;
}

/* Fluix 能量通道 */
.me-logo__channel {
  /* 定位方式 */
  position: absolute;
  /* 背景 */
  background: linear-gradient(
    /* 样式声明 */ 90deg,
    /* 样式声明 */ transparent,
    /* 样式声明 */ var(--me-fluix-dim) 18%,
    /* 样式声明 */ var(--me-fluix) 50%,
    /* 样式声明 */ var(--me-fluix-dim) 82%,
    /* 样式声明 */ transparent /* 样式细节 */
  );
  /* 不透明度 */
  opacity: 0.92;
  /* 滤镜（亮度/发光） */
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--me-fluix) 55%, transparent));
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__channel--h {
  /* 左侧偏移 */
  left: 12%;
  /* 右侧偏移 */
  right: 12%;
  /* 顶部偏移 */
  top: 50%;
  /* 高度 */
  height: 12%;
  /* 位移变换 */
  translate: 0 -50%;
  /* 圆角 */
  border-radius: 999px;
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__channel--v {
  /* 顶部偏移 */
  top: 12%;
  /* 底部偏移 */
  bottom: 12%;
  /* 左侧偏移 */
  left: 50%;
  /* 宽度 */
  width: 12%;
  /* 位移变换 */
  translate: -50% 0;
  /* 圆角 */
  border-radius: 999px;
  /* 背景 */
  background: linear-gradient(
    /* 样式声明 */ 180deg,
    /* 样式声明 */ transparent,
    /* 样式声明 */ var(--me-fluix-dim) 18%,
    /* 样式声明 */ var(--me-fluix) 50%,
    /* 样式声明 */ var(--me-fluix-dim) 82%,
    /* 样式声明 */ transparent /* 样式细节 */
  );
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__core {
  /* 定位方式 */
  position: absolute;
  /* 四边偏移 */
  inset: 36%;
  /* 圆角 */
  border-radius: 2px;
  /* 背景 */
  background: radial-gradient(
    /* 样式声明 */ circle at 35% 30%,
    /* 样式规则：#e8fbff 0%, */ #e8fbff 0%,
    /* 样式声明 */ var(--me-core) 35%,
    /* 样式声明 */ var(--me-fluix) 70%,
    /* 样式声明 */ var(--me-fluix-dim) 100% /* 样式细节 */
  );
  /* 阴影/内描边 */
  box-shadow:
    /* 样式声明 */
    0 0 6px color-mix(in srgb, var(--me-fluix) 70%, transparent),
    /* 样式声明 */ inset 0 0 0 1px color-mix(in srgb, #fff 35%, transparent);
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__corner {
  /* 定位方式 */
  position: absolute;
  /* 宽度 */
  width: 14%;
  /* 高度 */
  height: 14%;
  /* 背景 */
  background: color-mix(in srgb, var(--me-fluix) 35%, var(--me-metal-hi));
  /* 阴影/内描边 */
  box-shadow: 0 0 4px color-mix(in srgb, var(--me-fluix) 40%, transparent);
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__corner--tl {
  /* 顶部偏移 */
  top: 10%;
  /* 左侧偏移 */
  left: 10%;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__corner--tr {
  /* 顶部偏移 */
  top: 10%;
  /* 右侧偏移 */
  right: 10%;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__corner--bl {
  /* 底部偏移 */
  bottom: 10%;
  /* 左侧偏移 */
  left: 10%;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo__corner--br {
  /* 底部偏移 */
  bottom: 10%;
  /* 右侧偏移 */
  right: 10%;
}

/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo--pulse .me-logo__core {
  /* 动画 */
  animation: me-core-pulse 2.4s ease-in-out infinite;
}
/* ME 控制器视觉表面 / Logo 局部样式 */
.me-logo--pulse .me-logo__channel {
  /* 动画 */
  animation: me-channel-glow 2.4s ease-in-out infinite;
}

/* 定义关键帧动画 */
@keyframes me-core-pulse {
  /* 样式声明 */
  0%,
  /* 样式声明 */
  100% {
    /* 滤镜（亮度/发光） */
    filter: brightness(1);
    /* 阴影/内描边 */
    box-shadow:
      /* 样式声明 */
      0 0 5px color-mix(in srgb, var(--me-fluix) 55%, transparent),
      /* 样式声明 */ inset 0 0 0 1px color-mix(in srgb, #fff 30%, transparent);
  }
  /* 样式声明 */
  50% {
    /* 滤镜（亮度/发光） */
    filter: brightness(1.25);
    /* 阴影/内描边 */
    box-shadow:
      /* 样式声明 */
      0 0 10px color-mix(in srgb, var(--me-fluix) 80%, transparent),
      /* 样式声明 */ inset 0 0 0 1px color-mix(in srgb, #fff 45%, transparent);
  }
}

/* 定义关键帧动画 */
@keyframes me-channel-glow {
  /* 样式声明 */
  0%,
  /* 样式声明 */
  100% {
    /* 不透明度 */
    opacity: 0.75;
  }
  /* 样式声明 */
  50% {
    /* 不透明度 */
    opacity: 1;
  }
}

/* 媒体查询：无障碍或响应式分支 */
@media (prefers-reduced-motion: reduce) {
  .me-logo--pulse .me-logo__core,
  .me-logo--pulse .me-logo__channel {
    animation: none;
  }
}

:global(html[data-motion='off']) .me-logo--pulse .me-logo__core,
:global(html[data-motion='off']) .me-logo--pulse .me-logo__channel {
  animation: none !important;
}
</style>
