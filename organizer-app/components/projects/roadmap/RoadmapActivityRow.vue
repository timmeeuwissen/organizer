<template lang="pug">
div.roadmap-activity-row
  //- Label cell (fixed width)
  div.roadmap-activity-row__label
    span {{ label }}

  //- Timeline cell (scrolls with container)
  div.roadmap-activity-row__timeline(:style="{ width: `${timelineWidth}px` }")
    //- Activity bar (only when an activity is provided)
    RoadmapBar(
      v-if="activity"
      :title="activity.title"
      :color="activity.color"
      :left-px="barLeft"
      :width-px="barWidth"
      :links="activity.links"
      @edit="$emit('editActivity', activity)"
      @delete="$emit('deleteActivity', activity.id)"
      @link="$emit('linkActivity', activity)"
      @drag-start="(mode, startX) => $emit('dragStart', activity!.id, mode, startX)"
    )
    //- Milestones on this row
    RoadmapMilestone(
      v-for="ms in rowMilestones"
      :key="ms.id"
      :title="ms.title"
      :description="ms.description"
      :left-px="msLeft(ms)"
      :color="ms.color"
      @edit="$emit('editMilestone', ms)"
    )
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { dateToColumn, durationInColumns, COLUMN_WIDTH } from '~/composables/useRoadmapLayout'
import type { RoadmapActivity, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'
import RoadmapBar from './RoadmapBar.vue'
import RoadmapMilestone from './RoadmapMilestone.vue'

const props = defineProps<{
  label: string
  activity?: RoadmapActivity
  milestones: RoadmapMilestone[]
  startDate: Date
  granularity: RoadmapGranularity
  totalColumns: number
}>()

defineEmits<{
  editActivity: [activity: RoadmapActivity]
  deleteActivity: [id: string]
  linkActivity: [activity: RoadmapActivity]
  editMilestone: [milestone: RoadmapMilestone]
  dragStart: [activityId: string, mode: 'move' | 'resize-left' | 'resize-right', startX: number]
}>()

const colWidth = computed(() => COLUMN_WIDTH[props.granularity])
const timelineWidth = computed(() => props.totalColumns * colWidth.value)

const barLeft = computed(() => {
  if (!props.activity) { return 0 }
  return dateToColumn(props.activity.startDate, props.startDate, props.granularity) * colWidth.value
})

const barWidth = computed(() => {
  if (!props.activity) { return 0 }
  return Math.max(colWidth.value, durationInColumns(props.activity.startDate, props.activity.endDate, props.granularity) * colWidth.value)
})

const rowMilestones = computed(() => props.milestones)

function msLeft (ms: RoadmapMilestone): number {
  return dateToColumn(ms.date, props.startDate, props.granularity) * colWidth.value
}
</script>

<style lang="sass">
.roadmap-activity-row
  display: flex
  height: 40px
  border-bottom: 1px solid rgba(0,0,0,0.06)

  &:hover
    background: rgba(0,0,0,0.02)

.roadmap-activity-row__label
  width: 180px
  min-width: 180px
  display: flex
  align-items: center
  padding: 0 12px
  font-size: 13px
  border-right: 1px solid rgba(0,0,0,0.12)
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis

.roadmap-activity-row__timeline
  position: relative
  flex-shrink: 0
</style>
