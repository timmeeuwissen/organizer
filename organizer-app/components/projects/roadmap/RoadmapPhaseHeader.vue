<template lang="pug">
div.roadmap-phase-header
  div.roadmap-phase-header__cell(
    v-for="phase in sortedPhases"
    :key="phase.id"
    :style="phaseStyle(phase)"
    @dblclick="$emit('editPhase', phase)"
  ) {{ phase.title }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { dateToColumn, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapPhase, RoadmapGranularity } from '~/types/models/roadmap'

const props = defineProps<{
  phases: RoadmapPhase[]
  startDate: Date
  granularity: RoadmapGranularity
}>()

defineEmits<{ editPhase: [phase: RoadmapPhase] }>()

const colWidth = computed(() => COLUMN_WIDTH[props.granularity])

const sortedPhases = computed(() =>
  [...props.phases].sort((a, b) => a.order - b.order)
)

function phaseStyle (phase: RoadmapPhase) {
  const startCol = dateToColumn(phase.startDate, props.startDate, props.granularity)
  const endCol = dateToColumn(phase.endDate, props.startDate, props.granularity)
  const width = Math.max(1, endCol - startCol) * colWidth.value
  const left = startCol * colWidth.value
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    width: `${width}px`,
    background: `rgb(var(--v-theme-${phase.color}))`,
    opacity: 0.85
  }
}
</script>

<style lang="sass">
.roadmap-phase-header
  position: relative
  height: 40px
  z-index: 4
  background: rgb(var(--v-theme-surface))
  border-bottom: 1px solid rgba(0,0,0,0.12)

.roadmap-phase-header__cell
  position: absolute
  top: 0
  bottom: 0
  display: flex
  align-items: center
  padding: 0 8px
  font-size: 12px
  font-weight: 600
  color: white
  border-radius: 2px
  cursor: pointer
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis
</style>
