<template lang="pug">
div.project-roadmap

  //- Toolbar
  v-toolbar(density="compact" flat)
    v-btn-toggle(v-model="granularity" mandatory density="compact" rounded)
      v-btn(value="day" size="small") {{ $t('roadmap.granularity.day') }}
      v-btn(value="week" size="small") {{ $t('roadmap.granularity.week') }}
      v-btn(value="month" size="small") {{ $t('roadmap.granularity.month') }}
      v-btn(value="quarter" size="small") {{ $t('roadmap.granularity.quarter') }}
    v-spacer
    v-btn(prepend-icon="mdi-calendar-arrow-right" variant="tonal" size="small" @click="shiftDialog = true")
      | {{ $t('roadmap.shiftAll') }}
    v-menu
      template(v-slot:activator="{ props: menuProps }")
        v-btn(v-bind="menuProps" color="primary" prepend-icon="mdi-plus" size="small")
          | {{ $t('common.add') }}
      v-list(density="compact")
        v-list-item(prepend-icon="mdi-chart-gantt" :title="$t('roadmap.addActivity')" @click="openAddActivity")
        v-list-item(prepend-icon="mdi-flag" :title="$t('roadmap.addPhase')" @click="phaseDialog = true; editingPhase = undefined")
        v-list-item(prepend-icon="mdi-diamond-stone" :title="$t('roadmap.addMilestone')" @click="milestoneDialog = true; editingMilestone = undefined")

  //- Empty state
  v-alert(v-if="!roadmap || (!roadmap.activities.length && !roadmap.phases.length)" type="info" variant="tonal" class="ma-4")
    | {{ $t('roadmap.noRoadmap') }}

  //- Chart area
  div.project-roadmap__chart(
    v-if="roadmap"
    ref="chartEl"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  )
    //- Header: left spacer + scrollable header area
    div.project-roadmap__chart-header
      div.project-roadmap__label-spacer
      div.project-roadmap__header-scroll(ref="headerScrollEl")
        RoadmapPhaseHeader(
          :phases="roadmap.phases"
          :start-date="chartStart"
          :granularity="granularity"
          @edit-phase="p => { editingPhase = p; phaseDialog = true }"
        )
        RoadmapTimeAxis(
          :start-date="chartStart"
          :end-date="chartEnd"
          :granularity="granularity"
        )

    //- Rows
    div.project-roadmap__rows(ref="rowsEl" @scroll="syncHeaderScroll")
      RoadmapActivityRow(
        v-for="activity in sortedActivities"
        :key="activity.id"
        :label="activity.title"
        :activity="activity"
        :milestones="milestonesForActivity(activity.id)"
        :start-date="chartStart"
        :granularity="granularity"
        :total-columns="totalColumns"
        @edit-activity="a => { editingActivity = a; activityDialog = true }"
        @delete-activity="confirmDeleteActivity"
        @link-activity="a => { editingActivity = a; activityDialog = true }"
        @edit-milestone="ms => { editingMilestone = ms; milestoneDialog = true }"
        @drag-start="onDragStart"
      )
      //- Standalone milestones row
      RoadmapActivityRow(
        v-if="standaloneMilestones.length"
        label="Milestones"
        :milestones="standaloneMilestones"
        :start-date="chartStart"
        :granularity="granularity"
        :total-columns="totalColumns"
        @edit-milestone="ms => { editingMilestone = ms; milestoneDialog = true }"
      )

  //- Dialogs
  RoadmapActivityDialog(
    v-model="activityDialog"
    :activity="editingActivity"
    :phases="roadmap?.phases ?? []"
    @save="onSaveActivity"
  )

  RoadmapPhaseDialog(
    v-model="phaseDialog"
    :phase="editingPhase"
    :next-order="roadmap?.phases.length ?? 0"
    @save="onSavePhase"
  )

  RoadmapMilestoneDialog(
    v-model="milestoneDialog"
    :milestone="editingMilestone"
    :activities="roadmap?.activities ?? []"
    @save="onSaveMilestone"
  )

  //- Shift all dialog
  v-dialog(v-model="shiftDialog" max-width="320")
    v-card
      v-card-title {{ $t('roadmap.shiftAllDialog') }}
      v-card-text
        v-text-field(v-model.number="shiftDays" type="number" :label="$t('roadmap.shiftDays')" autofocus)
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="shiftDialog = false") {{ $t('common.cancel') }}
        v-btn(color="primary" @click="applyShift") {{ $t('common.apply') }}

  //- Delete confirmation
  v-dialog(v-model="deleteDialog" max-width="360")
    v-card
      v-card-title {{ $t('roadmap.activity.delete') }}
      v-card-text {{ $t('roadmap.activity.confirmDelete') }}
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="deleteDialog = false") {{ $t('common.cancel') }}
        v-btn(color="error" @click="doDeleteActivity") {{ $t('common.delete') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoadmapStore } from '~/stores/roadmap'
import { COLUMN_WIDTH, generateTimeUnits } from '~/composables/useRoadmapLayout'
import type { RoadmapActivity, RoadmapPhase, RoadmapMilestone, RoadmapGranularity } from '~/types/models/roadmap'
import RoadmapPhaseHeader from './RoadmapPhaseHeader.vue'
import RoadmapTimeAxis from './RoadmapTimeAxis.vue'
import RoadmapActivityRow from './RoadmapActivityRow.vue'
import RoadmapActivityDialog from './RoadmapActivityDialog.vue'
import RoadmapPhaseDialog from './RoadmapPhaseDialog.vue'
import RoadmapMilestoneDialog from './RoadmapMilestoneDialog.vue'

const props = defineProps<{ projectId: string }>()

const roadmapStore = useRoadmapStore()
const roadmap = computed(() => roadmapStore.roadmap)

// ── Load ───────────────────────────────────────────────────────────
onMounted(async () => {
  await roadmapStore.fetchRoadmap(props.projectId)
  if (!roadmap.value) {
    await roadmapStore.createRoadmap(props.projectId)
  }
})

// ── Granularity ────────────────────────────────────────────────────
const granularity = computed<RoadmapGranularity>({
  get: () => roadmap.value?.granularity ?? 'month',
  set: v => roadmapStore.setGranularity(props.projectId, v)
})

// ── Chart bounds ────────────────────────────────────────────────────
const chartStart = computed<Date>(() => {
  if (!roadmap.value) { return new Date() }
  const all: Date[] = [
    ...roadmap.value.activities.map(a => a.startDate),
    ...roadmap.value.phases.map(p => p.startDate),
    ...roadmap.value.milestones.map(m => m.date)
  ]
  if (!all.length) {
    const d = new Date()
    d.setDate(1)
    return d
  }
  const min = new Date(Math.min(...all.map(d => d.getTime())))
  switch (granularity.value) {
    case 'day': min.setDate(min.getDate() - 1); break
    case 'week': min.setDate(min.getDate() - 7); break
    case 'month': min.setMonth(min.getMonth() - 1); break
    case 'quarter': min.setMonth(min.getMonth() - 3); break
  }
  return min
})

const chartEnd = computed<Date>(() => {
  if (!roadmap.value) { return new Date() }
  const all: Date[] = [
    ...roadmap.value.activities.map(a => a.endDate),
    ...roadmap.value.phases.map(p => p.endDate),
    ...roadmap.value.milestones.map(m => m.date)
  ]
  if (!all.length) {
    const d = new Date(chartStart.value)
    d.setMonth(d.getMonth() + 3)
    return d
  }
  const max = new Date(Math.max(...all.map(d => d.getTime())))
  switch (granularity.value) {
    case 'day': max.setDate(max.getDate() + 1); break
    case 'week': max.setDate(max.getDate() + 7); break
    case 'month': max.setMonth(max.getMonth() + 1); break
    case 'quarter': max.setMonth(max.getMonth() + 3); break
  }
  return max
})

const totalColumns = computed(() =>
  generateTimeUnits(chartStart.value, chartEnd.value, granularity.value).length
)

// ── Sorted data ─────────────────────────────────────────────────────
const sortedActivities = computed(() =>
  [...(roadmap.value?.activities ?? [])].sort((a, b) => a.order - b.order)
)

function milestonesForActivity (activityId: string): RoadmapMilestone[] {
  return (roadmap.value?.milestones ?? []).filter(m => m.activityId === activityId)
}

const standaloneMilestones = computed(() =>
  (roadmap.value?.milestones ?? []).filter(m => !m.activityId)
)

// ── Drag ────────────────────────────────────────────────────────────
type DragMode = 'move' | 'resize-left' | 'resize-right'
const dragActivityId = ref<string | null>(null)
const dragMode = ref<DragMode>('move')
const dragStartX = ref(0)
const dragOriginalActivity = ref<RoadmapActivity | null>(null)

const rowsEl = ref<HTMLElement | null>(null)
const headerScrollEl = ref<HTMLElement | null>(null)
const chartEl = ref<HTMLElement | null>(null)

function onDragStart (activityId: string, mode: DragMode, startX: number) {
  dragActivityId.value = activityId
  dragMode.value = mode
  dragStartX.value = startX
  dragOriginalActivity.value = roadmap.value!.activities.find(a => a.id === activityId) ?? null
}

function onMouseMove (e: MouseEvent) {
  if (!dragActivityId.value || !dragOriginalActivity.value || !roadmap.value) { return }

  const colWidth = COLUMN_WIDTH[granularity.value]
  const deltaCols = Math.round((e.clientX - dragStartX.value) / colWidth)
  if (deltaCols === 0) { return }

  const msPerCol = colWidth === COLUMN_WIDTH.day ? 86400000
    : colWidth === COLUMN_WIDTH.week ? 7 * 86400000
      : colWidth === COLUMN_WIDTH.month ? 30 * 86400000
        : 90 * 86400000

  const orig = dragOriginalActivity.value
  const ms = deltaCols * msPerCol

  let newStart = orig.startDate
  let newEnd = orig.endDate

  if (dragMode.value === 'move') {
    newStart = new Date(orig.startDate.getTime() + ms)
    newEnd = new Date(orig.endDate.getTime() + ms)
  } else if (dragMode.value === 'resize-left') {
    newStart = new Date(orig.startDate.getTime() + ms)
    if (newStart >= newEnd) { return }
  } else if (dragMode.value === 'resize-right') {
    newEnd = new Date(orig.endDate.getTime() + ms)
    if (newEnd <= newStart) { return }
  }

  const idx = roadmap.value.activities.findIndex(a => a.id === dragActivityId.value)
  if (idx !== -1) {
    roadmap.value.activities[idx] = { ...roadmap.value.activities[idx], startDate: newStart, endDate: newEnd }
  }
}

function onMouseUp () {
  if (!dragActivityId.value || !roadmap.value) {
    dragActivityId.value = null
    return
  }
  const updated = roadmap.value.activities.find(a => a.id === dragActivityId.value)
  if (updated) {
    roadmapStore.upsertActivity(props.projectId, updated)
  }
  dragActivityId.value = null
  dragOriginalActivity.value = null
}

function syncHeaderScroll (e: Event) {
  if (headerScrollEl.value) {
    headerScrollEl.value.scrollLeft = (e.target as HTMLElement).scrollLeft
  }
}

// ── Dialogs ─────────────────────────────────────────────────────────
const activityDialog = ref(false)
const phaseDialog = ref(false)
const milestoneDialog = ref(false)
const shiftDialog = ref(false)
const deleteDialog = ref(false)
const editingActivity = ref<RoadmapActivity | undefined>()
const editingPhase = ref<RoadmapPhase | undefined>()
const editingMilestone = ref<RoadmapMilestone | undefined>()
const pendingDeleteId = ref<string | null>(null)
const shiftDays = ref(0)

function openAddActivity () {
  editingActivity.value = undefined
  activityDialog.value = true
}

function onSaveActivity (activity: Omit<RoadmapActivity, 'order'>) {
  const existing = roadmap.value?.activities.find(a => a.id === activity.id)
  const order = existing?.order ?? (roadmap.value?.activities.length ?? 0)
  roadmapStore.upsertActivity(props.projectId, { ...activity, order })
}

function onSavePhase (phase: RoadmapPhase) {
  roadmapStore.upsertPhase(props.projectId, phase)
}

function onSaveMilestone (milestone: RoadmapMilestone) {
  roadmapStore.upsertMilestone(props.projectId, milestone)
}

function confirmDeleteActivity (id: string) {
  pendingDeleteId.value = id
  deleteDialog.value = true
}

function doDeleteActivity () {
  if (pendingDeleteId.value) {
    roadmapStore.deleteActivity(props.projectId, pendingDeleteId.value)
  }
  deleteDialog.value = false
  pendingDeleteId.value = null
}

function applyShift () {
  roadmapStore.shiftAll(props.projectId, shiftDays.value)
  shiftDays.value = 0
  shiftDialog.value = false
}
</script>

<style lang="sass">
.project-roadmap
  display: flex
  flex-direction: column
  overflow: hidden

.project-roadmap__chart
  display: flex
  flex-direction: column
  overflow: hidden
  user-select: none

.project-roadmap__chart-header
  display: flex
  position: sticky
  top: 0
  z-index: 5
  background: rgb(var(--v-theme-surface))

.project-roadmap__label-spacer
  width: 180px
  min-width: 180px
  border-right: 1px solid rgba(0,0,0,0.12)

.project-roadmap__header-scroll
  overflow: hidden
  flex: 1

.project-roadmap__rows
  overflow: auto
  flex: 1
</style>
