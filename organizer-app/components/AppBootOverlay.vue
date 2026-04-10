<template lang="pug">
transition(name="app-boot-fade")
  .app-boot-root(v-if="modelValue" role="status" aria-live="polite" :aria-busy="modelValue")
    .app-boot-backdrop
    .app-boot-content
      v-avatar.app-boot-icon(size="80" rounded)
        v-img(:src="iconSrc" :alt="appName" cover)
      span.app-boot-title.mt-5.text-h6.text-center {{ appName }}
      v-progress-linear.app-boot-bar.mt-5(
        :model-value="clampedProgress"
        color="primary"
        height="10"
        rounded
        aria-hidden="true"
      )
      span.app-boot-percent.mt-2.text-body-2.text-medium-emphasis {{ percentLabel }}
      span.app-boot-label.mt-3.text-body-2.text-medium-emphasis.text-center {{ label }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 0–100 rough boot progress */
    progress?: number
    /** Public app icon (same as favicon by default) */
    iconSrc?: string
  }>(),
  {
    progress: 0,
    iconSrc: '/favicon.ico'
  }
)

const { t } = useI18n()

const appName = computed(() => t('common.appName'))

const clampedProgress = computed(() =>
  Math.min(100, Math.max(0, props.progress))
)

const percentRounded = computed(() => Math.round(clampedProgress.value))

const percentLabel = computed(() =>
  t('common.bootLoadingPercent', { n: percentRounded.value })
)

const label = computed(() => t('common.preparingApp'))
</script>

<style lang="sass" scoped>
.app-boot-root
  position: fixed
  inset: 0
  z-index: 10010
  display: flex
  align-items: center
  justify-content: center
  pointer-events: auto

.app-boot-backdrop
  position: absolute
  inset: 0
  background: rgb(var(--v-theme-surface))
  opacity: 0.97

.app-boot-content
  position: relative
  z-index: 1
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  width: min(20rem, calc(100vw - 2rem))
  padding: 1rem

.app-boot-icon
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12)

.app-boot-bar
  width: 100%

.app-boot-title
  line-height: 1.3
  font-weight: 600

.app-boot-percent
  font-variant-numeric: tabular-nums

.app-boot-label
  line-height: 1.4

.app-boot-fade-enter-active,
.app-boot-fade-leave-active
  transition: opacity 0.35s ease

.app-boot-fade-enter-from,
.app-boot-fade-leave-to
  opacity: 0
</style>
