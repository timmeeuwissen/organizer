<template lang="pug">
div
  v-table(v-if="!loading && tasks.length > 0")
    thead
      tr
        th
        th {{ $t('tasks.title') }}
        th(style="width: 120px") {{ $t('tasks.dueDate') }}
        th(style="width: 120px") {{ $t('tasks.priority') }}
        th(style="width: 120px") {{ $t('tasks.status') }}
        th(style="width: 120px") {{ $t('tasks.type') }}
        th
    tbody
      template(v-for="task in pagedProcessedTasks" :key="task.id")
        tr(
          :class="getTaskRowClasses(task)"
          :style="getTaskRowStyle(task)"
          @click="$emit('open', task)"
        )
          td(style="width: 50px")
            div.position-relative.d-flex.align-center
              div.account-indicator(v-if="task.providerAccountId" :style="{ backgroundColor: getProviderColor(task.providerAccountId) }")
              v-checkbox(
                :model-value="task.status === 'completed'"
                color="success"
                @click.stop="$emit('toggle-status', task)"
                :disabled="task.status === 'completed'"
              )
          td.tasks-overview__title-cell
            .d-flex.align-center.min-w-0
              div.flex-shrink-0(
                v-if="task.level > 0"
                :style="{ width: `${task.level * 20}px` }"
              )
              .tasks-disclosure-gutter.d-flex.justify-center.align-center.flex-shrink-0
                v-btn(
                  v-if="showHierarchy && task.hasSubtasks"
                  icon
                  size="x-small"
                  variant="text"
                  :aria-expanded="isExpanded(task.id)"
                  :aria-label="isExpanded(task.id) ? $t('tasks.collapseSubtasks') : $t('tasks.expandSubtasks')"
                  :title="isExpanded(task.id) ? $t('tasks.collapseSubtasks') : $t('tasks.expandSubtasks')"
                  @click.stop="toggleExpand(task.id)"
                )
                  v-icon(
                    size="small"
                    :icon="isExpanded(task.id) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                  )
              v-icon(
                v-if="showHierarchy && task.level > 0 && !task.hasSubtasks"
                size="x-small"
                class="me-1 flex-shrink-0"
                icon="mdi-subdirectory-arrow-right"
              )
              span.tasks-overview__title-text.pl-1.min-w-0.text-truncate {{ task.title }}
          td
            v-chip(
              v-if="task.dueDate"
              size="small"
              :color="getDueDateColor(task.dueDate)"
            ) {{ formatDate(task.dueDate) }}
          td
            v-chip(
              size="small"
              :color="getPriorityColor(task.priority)"
            ) {{ getPriorityText(task.priority) }}
          td
            v-chip(
              size="small"
              :color="getStatusColor(task.status)"
            )
              v-icon(size="x-small" start) {{ getStatusIcon(task.status) }}
              | {{ getStatusText(task.status) }}
          td
            v-chip(
              size="small"
              :color="getTypeColor(task.type)"
            ) {{ getTypeText(task.type) }}
          td(style="width: 160px")
            v-btn(icon size="small" color="primary" @click.stop="$emit('edit', task)")
              v-icon mdi-pencil
            v-btn(
              v-if="task.status !== 'completed'"
              icon
              size="small"
              @click.stop="$emit('toggle-status', task)"
              color="success"
            )
              v-icon mdi-check
            v-btn(
              v-if="!task.hasSubtasks"
              icon
              size="small"
              @click.stop="$emit('add-subtask', task)"
              color="info"
            )
              v-icon mdi-plus-circle-outline
  div.d-flex.align-center.justify-space-between.px-2.py-3(
    v-if="!loading && tasks.length > 0 && totalTaskRows > 0"
  )
    div.text-caption
      span {{ $t('tasks.pagination.showing', { shown: pagedProcessedTasks.length, total: totalTaskRows }) }}
    div.d-flex.align-center
      v-btn(
        variant="text"
        size="small"
        :disabled="!hasPrevTaskPage || loading"
        @click="loadPreviousTaskPage"
        prepend-icon="mdi-chevron-left"
      ) {{ $t('tasks.pagination.previous') }}
      span.mx-2 {{ $t('tasks.pagination.pageOf', { page: clampedTaskPage + 1, pages: totalTaskPages }) }}
      v-btn(
        variant="text"
        size="small"
        :disabled="!hasNextTaskPage || loading"
        @click="loadNextTaskPage"
        append-icon="mdi-chevron-right"
      ) {{ $t('tasks.pagination.next') }}
  template(v-else-if="loading")
    v-skeleton-loader(type="table")
  v-alert(v-else type="info" variant="tonal") {{ $t('tasks.noTasks') }}
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task } from '~/types/models'
import {
  clampTaskListPageIndex,
  sliceTaskListPage,
  taskListTotalPages
} from '~/utils/tasksOverviewPagination'

const props = withDefaults(defineProps<{
  tasks: Task[]
  loading?: boolean
  showHierarchy?: boolean
  pageSize?: number
}>(), {
  loading: false,
  showHierarchy: true,
  pageSize: 20
})
const { t } = useI18n()

defineEmits<{
  open: [task: Task]
  edit: [task: Task]
  'toggle-status': [task: Task]
  'add-subtask': [task: Task]
}>()

const expandedTasks = reactive(new Set<string>())
const currentPage = ref(0)

const isExpanded = (taskId: string): boolean => expandedTasks.has(taskId)
const toggleExpand = (taskId: string) => {
  if (expandedTasks.has(taskId)) { expandedTasks.delete(taskId) } else { expandedTasks.add(taskId) }
}

const processedTasks = computed(() => {
  const tasks = props.tasks
  const taskMap = new Map<string, Task[]>()

  tasks.forEach((task) => {
    const parentId = task.parentTask || task.parent
    if (!parentId) { return }
    if (!taskMap.has(parentId)) { taskMap.set(parentId, []) }
    taskMap.get(parentId)?.push(task)
  })

  const taskById = new Map<string, Task>()
  tasks.forEach(task => taskById.set(task.id, task))

  const hasSubtasks = (taskId: string): boolean => {
    const task = taskById.get(taskId)
    if (!task) { return false }
    return (task.subtasks && task.subtasks.length > 0) || (taskMap.get(taskId)?.length || 0) > 0
  }

  function processTasksRecursively (
    parentId: string | null,
    level: number,
    result: Array<Task & { level: number; hasSubtasks: boolean }>
  ) {
    const levelTasks = parentId === null
      ? tasks.filter(t => !t.parentTask && !t.parent)
      : taskMap.get(parentId) || []

    levelTasks.forEach((task) => {
      const processedTask = { ...task, level, hasSubtasks: hasSubtasks(task.id) }
      result.push(processedTask)

      if (props.showHierarchy && hasSubtasks(task.id) && isExpanded(task.id)) {
        if (taskMap.has(task.id)) { processTasksRecursively(task.id, level + 1, result) }
        if (task.subtasks) {
          task.subtasks.forEach((subtaskId) => {
            const subtask = taskById.get(subtaskId)
            if (subtask && !subtask.parentTask && !subtask.parent) {
              result.push({
                ...subtask,
                level: level + 1,
                parentTask: task.id,
                hasSubtasks: hasSubtasks(subtask.id)
              })
            }
          })
        }
      }
    })
  }

  const result: Array<Task & { level: number; hasSubtasks: boolean }> = []
  processTasksRecursively(null, 0, result)
  return result
})

const totalTaskRows = computed(() => processedTasks.value.length)
const clampedTaskPage = computed(() =>
  clampTaskListPageIndex(currentPage.value, totalTaskRows.value, props.pageSize)
)
const totalTaskPages = computed(() => taskListTotalPages(totalTaskRows.value, props.pageSize))
const pagedProcessedTasks = computed(() =>
  sliceTaskListPage(processedTasks.value, currentPage.value, props.pageSize)
)
const hasPrevTaskPage = computed(() => clampedTaskPage.value > 0)
const hasNextTaskPage = computed(() => clampedTaskPage.value < totalTaskPages.value - 1)

function loadPreviousTaskPage () {
  if (!hasPrevTaskPage.value) { return }
  currentPage.value -= 1
}

function loadNextTaskPage () {
  if (!hasNextTaskPage.value) { return }
  currentPage.value += 1
}

watch(
  () => processedTasks.value.length,
  () => {
    const next = clampTaskListPageIndex(currentPage.value, totalTaskRows.value, props.pageSize)
    if (next !== currentPage.value) { currentPage.value = next }
  }
)

const formatDate = (date: Date | null | undefined) => (date ? new Date(date).toLocaleDateString() : '')
const getDueDateColor = (date: Date | null | undefined) => {
  if (!date) { return 'grey' }
  const now = new Date()
  const dueDate = new Date(date)
  if (dueDate < now) { return 'error' }
  const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 1) { return 'error' }
  if (days <= 3) { return 'warning' }
  return 'success'
}
const getStatusText = (status: string) =>
  ({
    todo: t('tasks.todoTasks'),
    inProgress: t('tasks.inProgressTasks'),
    completed: t('tasks.completedTasks'),
    delegated: t('tasks.delegatedTasks'),
    cancelled: t('tasks.cancelledTasks')
  }[status] || status)
const getStatusIcon = (status: string) =>
  ({ todo: 'mdi-checkbox-blank-outline', inProgress: 'mdi-progress-check', completed: 'mdi-checkbox-marked', delegated: 'mdi-account-arrow-right', cancelled: 'mdi-cancel' }[status] || 'mdi-help')
const getStatusColor = (status: string) =>
  ({ todo: 'grey', inProgress: 'info', completed: 'success', delegated: 'warning', cancelled: 'error' }[status] || 'grey')
const getTypeText = (type?: string) =>
  ({
    task: t('tasks.typeTask'),
    routine: t('tasks.typeRoutine'),
    delegation: t('tasks.typeDelegation'),
    followUp: t('tasks.typeFollowUp')
  }[type || ''] || (type || ''))
const getTypeColor = (type?: string) =>
  ({ task: 'primary', routine: 'secondary', delegation: 'warning', followUp: 'info' }[type || ''] || 'grey')
const getPriorityText = (priority: number | string) => {
  if (typeof priority === 'string') {
    return ({
      low: t('projects.priorityLow'),
      medium: t('projects.priorityMedium'),
      high: t('projects.priorityHigh'),
      urgent: t('projects.priorityUrgent')
    }[priority] || priority)
  }
  return ({
    1: t('tasks.priorityHighest'),
    2: t('tasks.priorityHigh'),
    3: t('tasks.priorityMedium'),
    4: t('tasks.priorityLow'),
    5: t('tasks.priorityLowest')
  }[priority as 1 | 2 | 3 | 4 | 5] || `P${priority}`)
}
const getPriorityColor = (priority: number | string) => {
  if (typeof priority === 'string') {
    return ({ low: 'success', medium: 'warning', high: 'error-lighten-1', urgent: 'error' }[priority] || 'grey')
  }
  return ({ 1: 'error', 2: 'error-lighten-1', 3: 'warning', 4: 'success-lighten-1', 5: 'success' }[priority as 1 | 2 | 3 | 4 | 5] || 'grey')
}
const getTaskRowClasses = (task: Task & { level: number; hasSubtasks: boolean }) => ({
  'text-decoration-line-through': task.status === 'completed',
  'task-parent': task.hasSubtasks,
  'task-child': task.level > 0
})
const getTaskRowStyle = (task: Task & { level: number; hasSubtasks: boolean }) => ({
  cursor: 'pointer',
  backgroundColor: task.level > 0 ? `rgba(0, 0, 0, ${0.03 * task.level})` : ''
})
const getProviderColor = (providerAccountId?: string) => {
  if (!providerAccountId) { return 'primary' }
  let hash = 0
  for (let i = 0; i < providerAccountId.length; i += 1) {
    hash = Math.imul(hash, 31) + providerAccountId.charCodeAt(i)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}
</script>

<style scoped>
.account-indicator {
  position: absolute;
  left: 0;
  height: 100%;
  width: 4px;
  border-radius: 2px 0 0 2px;
}

.tasks-overview__title-cell {
  vertical-align: middle;
  max-width: 0;
}

.tasks-overview__title-text {
  flex: 1 1 auto;
  display: block;
}

.tasks-disclosure-gutter {
  width: 28px;
  min-width: 28px;
  height: 28px;
}
</style>
