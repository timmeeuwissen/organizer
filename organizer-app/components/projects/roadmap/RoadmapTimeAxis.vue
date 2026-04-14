<template lang="pug">
div.roadmap-time-axis
  div.roadmap-time-axis__cell(
    v-for="unit in units"
    :key="unit.date.toISOString()"
    :style="{ width: `${colWidth}px` }"
  ) {{ unit.label }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateTimeUnits, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapGranularity } from '~/types/models/roadmap'

const props = defineProps<{
  startDate: Date
  endDate: Date
  granularity: RoadmapGranularity
}>()

const units = computed(() => generateTimeUnits(props.startDate, props.endDate, props.granularity))
const colWidth = computed(() => COLUMN_WIDTH[props.granularity])
</script>

<style lang="sass">
.roadmap-time-axis
  display: flex
  height: 32px
  border-bottom: 1px solid rgba(0,0,0,0.12)
  position: sticky
  top: 40px
  background: rgb(var(--v-theme-surface))
  z-index: 3

.roadmap-time-axis__cell
  flex-shrink: 0
  border-right: 1px solid rgba(0,0,0,0.08)
  display: flex
  align-items: center
  justify-content: center
  font-size: 11px
  color: rgba(0,0,0,0.6)
  padding: 0 4px
</style>
