<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/teams" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ team?.name || $t('teams.title') }}
      p.text-caption.text-medium-emphasis(v-if="team?.description") {{ team.description }}

  v-row(v-if="loading && !team")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!team" type="warning") {{ $t('teams.notFound') }}

  template(v-else)
    v-row.align-center.mb-2
      v-col(cols="12" md="4")
        v-select(
          :model-value="team?.columnLayoutMode"
          :items="layoutItems"
          item-title="title"
          item-value="value"
          :label="$t('teams.columnLayout')"
          variant="outlined"
          density="comfortable"
          hide-details
          @update:model-value="onLayoutChange"
        )
      v-col(cols="12" md="8").d-flex.flex-wrap.gap-2.justify-end
        v-chip(v-if="mailStore.getConnectedAccounts.length === 0" color="warning" variant="tonal")
          | {{ $t('teams.noMailIntegration') }}
        v-btn(color="primary" prepend-icon="mdi-account-plus" @click="openAddMember = true") {{ $t('teams.addMember') }}
        v-btn(
          v-if="unassignedEmails.length"
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-email-alert-outline"
          @click="openAssign = true"
        ) {{ $t('teams.assignInbox', { n: unassignedEmails.length }) }}
        v-btn(icon variant="text" @click="refreshBoard" :loading="refreshing")
          v-icon mdi-refresh
        v-menu
          template(v-slot:activator="{ props }")
            v-btn(icon variant="text" v-bind="props")
              v-icon mdi-dots-vertical
          v-list
            v-list-item(@click="confirmDelete = true" base-color="error")
              template(v-slot:prepend)
                v-icon mdi-delete
              v-list-item-title {{ $t('teams.deleteTeam') }}

    v-tabs(v-model="activeTab" class="mb-2")
      v-tab(value="board") {{ $t('teams.title') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}
    v-window(v-model="activeTab")
      v-window-item(value="board")
        v-row.mb-2
          v-col(cols="12")
            v-chip.mr-2(color="primary" variant="flat" size="small")
              | {{ $t('teams.attention') }}: {{ totalWeight }}
            span.text-caption.text-medium-emphasis {{ $t('teams.boardHint') }}

        v-row.mb-2
          v-col(cols="12")
            v-sheet.rounded-lg.pa-3(border)
              .text-caption.text-medium-emphasis.mb-2 {{ $t('teams.displayOptions') }}
              .d-flex.flex-wrap.align-center.gap-4
                v-select(
                  v-model="display.density"
                  :items="densityItems"
                  item-title="title"
                  item-value="value"
                  :label="$t('teams.displayDensity')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="min-width: 160px; max-width: 220px"
                )
                v-switch(
                  v-model="display.showRecentMail"
                  :label="$t('teams.showRecentMail')"
                  color="primary"
                  hide-details
                  density="compact"
                )
                v-switch(
                  v-model="display.showTasks"
                  :label="$t('teams.showTasks')"
                  color="primary"
                  hide-details
                  density="compact"
                )

        //- Kanban columns (emails + tasks assigned to column person)
        .d-flex.overflow-x-auto.pb-4.team-board-columns(
          :class="{ 'team-board-columns--compact': display.density === 'compact' }"
          :style="{ gap: display.density === 'compact' ? '8px' : '12px', alignItems: 'flex-start' }"
        )
          template(v-for="(person, colIndex) in orderedMembers" :key="person.id")
            v-sheet.rounded-lg.flex-shrink-0(
              :class="['team-column', { 'team-column--compact': display.density === 'compact' }]"
              border
            )
              .d-flex.align-center.px-1(:class="display.density === 'compact' ? 'mb-1' : 'mb-2'")
                v-avatar(color="primary" :size="display.density === 'compact' ? 28 : 36")
                  span.text-caption {{ initials(person) }}
                .ml-2.flex-grow-1.min-width-0
                  .text-truncate(:class="display.density === 'compact' ? 'text-body-2 font-weight-medium' : 'text-subtitle-2'") {{ person.firstName }} {{ person.lastName }}
                  .text-caption.text-truncate.text-medium-emphasis {{ person.email || '—' }}
                template(v-if="team.columnLayoutMode !== 'alphabetical'")
                  v-btn(icon size="x-small" variant="text" @click="moveMember(person.id, -1)" :disabled="colIndex === 0")
                    v-icon mdi-chevron-left
                  v-btn(icon size="x-small" variant="text" @click="moveMember(person.id, 1)" :disabled="colIndex >= orderedMembers.length - 1")
                    v-icon mdi-chevron-right
                v-btn(icon size="x-small" variant="text" color="error" @click="removeMember(person.id)" :title="$t('teams.removeMember')")
                  v-icon mdi-close

              .d-flex.flex-column(
                :class="display.density === 'compact' ? 'gap-1 lane-stack--compact' : 'gap-2 lane-stack'"
                style="min-height: 120px"
              )
                template(v-if="!display.showRecentMail && !display.showTasks")
                  .text-caption.text-medium-emphasis.text-center.py-4.px-2 {{ $t('teams.lanePanelsHidden') }}

                //- Recent inbox involving this person (communication context)
                v-card.team-lane-subcard(
                  v-if="display.showRecentMail"
                  variant="outlined"
                  rounded="lg"
                  :class="{ 'team-lane-subcard--compact': display.density === 'compact' }"
                )
                  v-card-title.px-3(:class="display.density === 'compact' ? 'text-body-2 py-1' : 'text-subtitle-2 py-2'") {{ $t('teams.recentMail') }}
                  v-card-text.px-3(:class="display.density === 'compact' ? 'py-1' : 'py-2'")
                    template(v-if="!(recentEmailsByPersonId[person.id] || []).length")
                      .text-caption.text-medium-emphasis.text-center(:class="display.density === 'compact' ? 'py-1' : 'py-2'") {{ $t('teams.recentMailEmpty') }}
                    .d-flex.flex-column(v-else :class="display.density === 'compact' ? 'gap-1' : 'gap-2'")
                      v-sheet.rounded.team-recent-mail-row(
                        v-for="em in recentEmailsByPersonId[person.id]"
                        :key="emailRowKey(em)"
                        color="surface"
                        border
                        :class="display.density === 'compact' ? 'pa-1' : 'pa-2'"
                      )
                        .d-flex.align-center.flex-wrap(:class="display.density === 'compact' ? 'mb-0 gap-1' : 'mb-1 gap-1'")
                          v-chip(v-if="teamMailMetaForEmail(em)" size="x-small") {{ $t('teams.manual') }}
                          v-chip(size="x-small" color="secondary" variant="tonal") {{ $t('teams.email') }}
                          v-chip(v-if="!em.read" size="x-small" color="warning" variant="tonal") {{ $t('teams.unread') }}
                        .text-truncate.cursor-pointer(
                          :class="display.density === 'compact' ? 'text-body-2' : 'text-body-2 font-weight-medium'"
                          @click="onRecentEmailClick(em)"
                        ) {{ em.subject || $t('teams.noSubject') }}
                        .text-caption.text-primary(
                          v-if="projectTitle(projectIdForTeamEmail(em))"
                          :class="display.density === 'compact' ? 'mt-0' : 'mt-1'"
                        ) {{ projectTitle(projectIdForTeamEmail(em)) }}
                        .text-caption.text-medium-emphasis(:class="display.density === 'compact' ? 'mt-0' : 'mt-1'") {{ formatLaneDate(em.date) }}
                        v-select(
                          :class="display.density === 'compact' ? 'mt-1' : 'mt-2'"
                          :model-value="projectIdForTeamEmail(em)"
                          :items="projectItems"
                          item-title="title"
                          item-value="value"
                          density="compact"
                          variant="solo-filled"
                          flat
                          hide-details
                          :placeholder="$t('teams.project')"
                          @update:model-value="(v) => setEmailProjectForPerson(em, person.id, v)"
                          @click.stop
                        )

                //- Tasks & deliverables for this column person
                v-card.team-lane-subcard(
                  v-if="display.showTasks"
                  variant="outlined"
                  rounded="lg"
                  :class="{ 'team-lane-subcard--compact': display.density === 'compact' }"
                )
                  v-card-title.px-3.d-flex.align-center.flex-wrap.gap-1(:class="display.density === 'compact' ? 'text-body-2 py-1' : 'text-subtitle-2 py-2'")
                    span.flex-grow-1 {{ $t('teams.tasksLane') }}
                    v-btn(
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      @click="openAddTaskFor(person.id)"
                    ) {{ $t('teams.addTaskInLane') }}
                  v-card-text.px-3(:class="display.density === 'compact' ? 'py-1' : 'py-2'")
                    template(v-if="!taskItemsForPerson(person.id).length")
                      .text-caption.text-medium-emphasis.text-center(:class="display.density === 'compact' ? 'py-1' : 'py-2'") {{ $t('teams.tasksLaneEmpty') }}
                    .d-flex.flex-column(v-else :class="display.density === 'compact' ? 'gap-1' : 'gap-2'")
                      v-sheet.rounded.team-task-row(
                        v-for="item in taskItemsForPerson(person.id)"
                        :key="boardItemKey(item)"
                        color="surface"
                        border
                        :class="display.density === 'compact' ? 'pa-1' : 'pa-2'"
                      )
                        .d-flex.align-center.flex-wrap(:class="display.density === 'compact' ? 'mb-0 gap-1' : 'mb-1 gap-1'")
                          v-chip(size="x-small" color="teal" variant="tonal") {{ $t('teams.task') }}
                          v-chip(size="x-small" variant="outlined") {{ taskStatusLabel(item.task.status) }}
                        .text-truncate.cursor-pointer(
                          :class="display.density === 'compact' ? 'text-body-2' : 'text-body-2 font-weight-medium'"
                          @click="onBoardItemClick(item)"
                        ) {{ item.task.title }}
                        .text-caption.text-primary(
                          v-if="taskProjectTitle(item.task)"
                          :class="display.density === 'compact' ? 'mt-0' : 'mt-1'"
                        ) {{ taskProjectTitle(item.task) }}
                        .text-caption.text-medium-emphasis(:class="display.density === 'compact' ? 'mt-0' : 'mt-1'")
                          template(v-if="item.task.dueDate") {{ $t('tasks.dueDate') }}: {{ formatLaneDate(item.task.dueDate) }}
                          template(v-else) {{ formatLaneDate(item.task.updatedAt) }}
                        v-select(
                          :class="display.density === 'compact' ? 'mt-1' : 'mt-2'"
                          :model-value="taskPrimaryProjectId(item.task)"
                          :items="projectItems"
                          item-title="title"
                          item-value="value"
                          density="compact"
                          variant="solo-filled"
                          flat
                          hide-details
                          :placeholder="$t('teams.project')"
                          @update:model-value="(v) => setTaskBoardProject(item, v)"
                          @click.stop
                        )

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="team"
          :entity-id="team.id"
        )

    v-dialog(v-model="openAddMember" max-width="480")
      v-card
        v-card-title {{ $t('teams.addMember') }}
        v-card-text
          v-autocomplete(
            v-model="selectedPersonToAdd"
            :items="peopleToAdd"
            item-title="label"
            item-value="id"
            :label="$t('people.title')"
            variant="outlined"
            clearable
          )
        v-card-actions
          v-spacer
          v-btn(@click="openAddMember = false") {{ $t('common.cancel') }}
          v-btn(color="primary" :disabled="!selectedPersonToAdd" @click="addMember") {{ $t('common.add') }}

    v-dialog(v-model="openAssign" max-width="560" scrollable)
      v-card
        v-card-title {{ $t('teams.assignInboxTitle') }}
        v-card-text
          p.text-body-2.mb-4 {{ $t('teams.assignInboxHelp') }}
          v-list
            v-list-item(v-for="em in unassignedEmails" :key="(em.accountId || '') + em.id")
              v-list-item-title.text-truncate {{ em.subject || $t('teams.noSubject') }}
              v-list-item-subtitle {{ em.from?.email }} · {{ formatDate(em.date) }}
              template(v-slot:append)
                v-btn(size="small" color="primary" @click="openAssignOne(em)") {{ $t('teams.assign') }}

        v-card-actions
          v-spacer
          v-btn(@click="openAssign = false") {{ $t('common.close') }}

    v-dialog(v-model="assignOneOpen" max-width="420")
      v-card(v-if="assignOneEmail")
        v-card-title.text-truncate {{ assignOneEmail.subject || $t('teams.noSubject') }}
        v-card-text
          v-select(
            v-model="assignPersonId"
            :items="memberSelectItems"
            item-title="title"
            item-value="value"
            :label="$t('teams.assignToColumn')"
            variant="outlined"
          )
          v-select(
            v-model="assignProjectId"
            :items="projectItems"
            item-title="title"
            item-value="value"
            :label="$t('teams.project')"
            clearable
            variant="outlined"
            class="mt-2"
          )
        v-card-actions
          v-spacer
          v-btn(@click="assignOneOpen = false") {{ $t('common.cancel') }}
          v-btn(color="primary" :disabled="!assignPersonId" @click="submitAssignOne") {{ $t('teams.assign') }}

    v-dialog(v-model="addTaskDialog" max-width="800px" scrollable)
      task-form(
        v-if="addTaskDialog && team"
        :key="addTaskForPersonId || 'new-task'"
        :task="null"
        :loading="addTaskLoading"
        :error="addTaskError"
        :assignee-person-ids-filter="team.memberPersonIds"
        :initial-assigned-to-id="addTaskForPersonId || ''"
        @submit="onAddTaskSubmit"
      )

    v-dialog(v-model="confirmDelete" max-width="400")
      v-card
        v-card-title {{ $t('teams.deleteTeam') }}
        v-card-text {{ $t('teams.deleteConfirm') }}
        v-card-actions
          v-spacer
          v-btn(@click="confirmDelete = false") {{ $t('common.cancel') }}
          v-btn(color="error" @click="deleteTeam") {{ $t('common.delete') }}
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'
import { useTeamsStore } from '~/stores/teams'
import { usePeopleStore } from '~/stores/people'
import { useMailStore } from '~/stores/mail'
import { useProjectsStore } from '~/stores/projects'
import { useNotificationStore } from '~/stores/notification'
import type { TeamColumnLayoutMode, Task, TeamMailMeta } from '~/types/models'
import TaskForm from '~/components/tasks/TaskForm.vue'
import type { Email } from '~/stores/mail'
import type { TeamBoardItem } from '~/composables/useTeamAttentionBoard'
import {
  buildAllBoardItems,
  orderedTeamMembers,
  totalAttentionWeight,
  unassignedInboxEmails,
  taskPrimaryProjectId,
  recentInboxEmailsForPerson,
  taskBoardItemsForPerson
} from '~/composables/useTeamAttentionBoard'
import { useTasksStore } from '~/stores/tasks'
import { useTeamBoardDisplay } from '~/composables/useTeamBoardDisplay'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const teamsStore = useTeamsStore()
const peopleStore = usePeopleStore()
const mailStore = useMailStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const notify = useNotificationStore()

const teamId = computed(() => route.params.id as string)
const team = computed(() => teamsStore.currentTeam)
const loading = computed(() => teamsStore.loading)

const { display } = useTeamBoardDisplay(teamId)

const activeTab = ref('board')
const openAddMember = ref(false)
const selectedPersonToAdd = ref<string | null>(null)
const openAssign = ref(false)
const confirmDelete = ref(false)
const refreshing = ref(false)

const addTaskDialog = ref(false)
const addTaskForPersonId = ref<string | null>(null)
const addTaskLoading = ref(false)
const addTaskError = ref('')

const assignOneOpen = ref(false)
const assignOneEmail = ref<Email | null>(null)
const assignPersonId = ref<string | null>(null)
const assignProjectId = ref<string | null>(null)

const peopleById = computed(() => {
  const m = new Map<string, (typeof peopleStore.people)[0]>()
  for (const p of peopleStore.people) { m.set(p.id, p) }
  return m
})

const orderedMembers = computed(() => {
  if (!team.value) { return [] }
  return orderedTeamMembers(team.value, peopleById.value)
})

const boardItems = computed(() => {
  if (!team.value) { return [] }
  const members = team.value.memberPersonIds
    .map(id => peopleById.value.get(id))
    .filter(Boolean) as typeof peopleStore.people
  const meta = teamsStore.mailMetaForTeam(teamId.value)
  return buildAllBoardItems(
    team.value,
    mailStore.emails,
    meta,
    members,
    tasksStore.tasks
  )
})

const totalWeight = computed(() => totalAttentionWeight(boardItems.value))

const teamMailMetaRows = computed(() => teamsStore.mailMetaForTeam(teamId.value))

const metaByEmailKey = computed(() => {
  const m = new Map<string, TeamMailMeta>()
  for (const row of teamMailMetaRows.value) {
    m.set(`${row.accountId}::${row.emailId}`, row)
  }
  return m
})

const recentEmailsByPersonId = computed(() => {
  const out: Record<string, Email[]> = {}
  if (!team.value) { return out }
  for (const id of team.value.memberPersonIds) {
    const p = peopleById.value.get(id)
    if (p) {
      out[id] = recentInboxEmailsForPerson(mailStore.emails, p)
    }
  }
  return out
})

const unassignedEmails = computed(() => {
  if (!team.value) { return [] }
  const members = team.value.memberPersonIds
    .map(id => peopleById.value.get(id))
    .filter(Boolean) as typeof peopleStore.people
  const meta = teamsStore.mailMetaForTeam(teamId.value)
  return unassignedInboxEmails(mailStore.emails, team.value, meta, members)
})

const projectItems = computed(() => [
  { title: '—', value: null as string | null },
  ...projectsStore.projects.map(p => ({ title: p.title, value: p.id }))
])

const layoutItems = computed(() => [
  { title: t('teams.layoutAlphabetical'), value: 'alphabetical' as TeamColumnLayoutMode },
  { title: t('teams.layoutManual'), value: 'manual' as TeamColumnLayoutMode },
  { title: t('teams.layoutDrag'), value: 'drag' as TeamColumnLayoutMode }
])

const densityItems = computed(() => [
  { title: t('teams.densityNormal'), value: 'normal' as const },
  { title: t('teams.densityCompact'), value: 'compact' as const }
])

function emailMetaKey (email: Email) {
  return `${email.accountId || ''}::${email.id}`
}

function teamMailMetaForEmail (email: Email) {
  return metaByEmailKey.value.get(emailMetaKey(email))
}

function projectIdForTeamEmail (email: Email): string | null {
  return teamMailMetaForEmail(email)?.projectId ?? null
}

function taskItemsForPerson (personId: string) {
  return taskBoardItemsForPerson(boardItems.value, personId)
}

function emailRowKey (em: Email) {
  return `e-${em.accountId || ''}-${em.id}`
}

function boardItemKey (item: TeamBoardItem) {
  if (item.kind === 'email') {
    return `e-${item.email.accountId || ''}-${item.email.id}`
  }
  return `t-${item.task.id}`
}

function initials (person: { firstName: string; lastName: string }) {
  const a = (person.firstName || '?')[0] || ''
  const b = (person.lastName || '')[0] || ''
  return (a + b).toUpperCase()
}

function formatDate (d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  } catch {
    return String(d)
  }
}

function formatLaneDate (d: Date) {
  if (display.value.density === 'compact') {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d)
    } catch {
      return String(d)
    }
  }
  return formatDate(d)
}

function projectTitle (projectId: string | null) {
  if (!projectId) { return '' }
  return projectsStore.getById(projectId)?.title || ''
}

function taskProjectTitle (task: Task) {
  const pid = taskPrimaryProjectId(task)
  return pid ? projectTitle(pid) : ''
}

function taskStatusLabel (status: Task['status']) {
  switch (status) {
    case 'todo':
      return t('tasks.todoTasks')
    case 'inProgress':
      return t('tasks.inProgressTasks')
    case 'delegated':
      return t('tasks.delegated')
    default:
      return status
  }
}

async function load () {
  await teamsStore.fetchTeam(teamId.value)
  await teamsStore.fetchTeamMailMeta(teamId.value)
  await peopleStore.fetchPeople()
  await projectsStore.fetchProjects()
  await tasksStore.fetchTasks()
  if (mailStore.getConnectedAccounts.length) {
    await mailStore.fetchEmails({ folder: 'inbox' }, { page: 0, pageSize: 100 })
  }
}

async function refreshBoard () {
  refreshing.value = true
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}

async function onLayoutChange (v: TeamColumnLayoutMode) {
  if (!team.value) { return }
  await teamsStore.updateTeam(team.value.id, { columnLayoutMode: v })
  notify.success(t('teams.layoutSaved'))
}

async function moveMember (personId: string, dir: -1 | 1) {
  if (!team.value) { return }
  await teamsStore.moveMember(team.value.id, personId, dir)
  await teamsStore.fetchTeam(team.value.id)
}

async function removeMember (personId: string) {
  if (!team.value) { return }
  await teamsStore.removeMember(team.value.id, personId)
  notify.success(t('teams.memberRemoved'))
}

const peopleToAdd = computed(() => {
  const ids = new Set(team.value?.memberPersonIds || [])
  return peopleStore.people
    .filter(p => !ids.has(p.id))
    .map(p => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName}${p.email ? ` · ${p.email}` : ''}`
    }))
})

const memberSelectItems = computed(() =>
  orderedMembers.value.map(p => ({
    title: `${p.firstName} ${p.lastName}`,
    value: p.id
  }))
)

function openAddTaskFor (personId: string) {
  addTaskForPersonId.value = personId
  addTaskDialog.value = true
}

async function onAddTaskSubmit (taskData: Partial<Task>) {
  addTaskLoading.value = true
  addTaskError.value = ''
  try {
    await tasksStore.createTask(taskData)
    addTaskDialog.value = false
    addTaskForPersonId.value = null
    await tasksStore.fetchTasks()
    notify.success(t('teams.taskCreated'))
  } catch (e: unknown) {
    addTaskError.value = e instanceof Error ? e.message : 'Failed to create task'
  } finally {
    addTaskLoading.value = false
  }
}

async function addMember () {
  if (!team.value || !selectedPersonToAdd.value) { return }
  await teamsStore.addMember(team.value.id, selectedPersonToAdd.value)
  selectedPersonToAdd.value = null
  openAddMember.value = false
  notify.success(t('teams.memberAdded'))
}

function onBoardItemClick (item: TeamBoardItem) {
  if (item.kind === 'email') {
    router.push({ path: '/mail' })
    return
  }
  router.push({ path: '/tasks', query: { id: item.task.id } })
}

function onRecentEmailClick (_em: Email) {
  router.push({ path: '/mail' })
}

async function setEmailProjectForPerson (email: Email, personId: string, projectId: string | null) {
  if (!team.value) { return }
  await teamsStore.upsertTeamMailMeta({
    teamId: team.value.id,
    accountId: email.accountId || '',
    emailId: email.id,
    personId,
    projectId: projectId || null
  })
  notify.success(t('teams.projectLinked'))
  await teamsStore.fetchTeamMailMeta(team.value.id)
}

async function setTaskBoardProject (item: TeamBoardItem, projectId: string | null) {
  if (item.kind !== 'task') { return }
  const pid = projectId || undefined
  await tasksStore.updateTask(item.task.id, {
    projectId: pid,
    relatedProjects: pid ? [pid] : []
  })
  await tasksStore.fetchTasks()
  notify.success(t('teams.projectLinked'))
}

function openAssignOne (em: Email) {
  assignOneEmail.value = em
  assignPersonId.value = orderedMembers.value[0]?.id ?? null
  assignProjectId.value = null
  assignOneOpen.value = true
}

async function submitAssignOne () {
  if (!team.value || !assignOneEmail.value || !assignPersonId.value) { return }
  const em = assignOneEmail.value
  await teamsStore.upsertTeamMailMeta({
    teamId: team.value.id,
    accountId: em.accountId || '',
    emailId: em.id,
    personId: assignPersonId.value,
    projectId: assignProjectId.value
  })
  assignOneOpen.value = false
  assignOneEmail.value = null
  openAssign.value = false
  notify.success(t('teams.assigned'))
  await teamsStore.fetchTeamMailMeta(team.value.id)
}

async function deleteTeam () {
  if (!team.value) { return }
  const id = team.value.id
  await teamsStore.deleteTeam(id)
  confirmDelete.value = false
  notify.success(t('teams.deleted'))
  await router.push('/teams')
}

watch(
  () => route.params.id as string,
  () => load()
)

onMounted(() => load())
</script>

<style scoped lang="sass">
.team-column
  background: rgba(var(--v-theme-surface-variant), 0.15)
  min-width: 280px
  max-width: 320px
  padding: 8px
.team-column--compact
  min-width: 220px
  max-width: 260px
  padding: 6px
.team-lane-subcard
  background: rgba(var(--v-theme-surface), 0.35)
.cursor-pointer
  cursor: pointer
</style>
