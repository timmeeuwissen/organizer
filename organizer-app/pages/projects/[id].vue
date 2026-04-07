<template lang="pug">
v-container
  v-row
    v-col(cols="12")
      v-btn(
        color="primary"
        prepend-icon="mdi-arrow-left"
        :to="`/projects`"
        class="mb-4"
      ) {{ $t('common.back') }}

      v-card(v-if="project" :color="project.color || getStatusColor(project.status)")
        v-card-item
          v-card-title.d-flex.align-center
            v-icon(:color="isLightColor(project.color) ? 'black' : 'white'" size="large" class="mr-2") {{ project.icon || 'mdi-folder-outline' }}
            span {{ project.title }}
            v-spacer
            v-btn(
              color="white"
              variant="tonal"
              icon
              @click="showEditDialog"
            )
              v-icon mdi-pencil
        
        v-card-text
          v-row
            v-col(cols="12" md="8")
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.details') }}
                v-card-text
                  p.text-body-1.mb-4 
                    span.font-weight-bold {{ $t('projects.description') }}: 
                    span {{ project.description || $t('projects.none') }}
                  
                  v-chip(:color="getStatusColorLight(project.status)" class="mr-2 mb-2")
                    v-icon(start) {{ getStatusIcon(project.status) }}
                    | {{ getStatusText(project.status) }}
                  
                  v-chip(:color="getPriorityColor(project.priority)" class="mr-2 mb-2")
                    v-icon(start) mdi-flag
                    | {{ getPriorityText(project.priority) }}
                  
                  div.mt-4(v-if="project.dueDate")
                    v-icon(class="mr-1") mdi-calendar
                    | {{ formatDate(project.dueDate) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.progress') }}
                v-card-text
                  v-progress-linear(
                    :model-value="project.progress" 
                    height="24" 
                    color="primary"
                    bg-color="grey-lighten-3"
                    rounded
                  )
                    template(v-slot:default="{ value }")
                      strong {{ Math.round(value) }}%
            
            v-col(cols="12" md="4")
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.team') }}
                v-card-text
                  div(v-if="project.members.length === 0") {{ $t('projects.noMembers') }}
                  
                  div.d-flex.flex-wrap.align-center(v-for="memberId in project.members" :key="memberId" class="mb-2")
                    v-avatar(:color="getAvatarColor(memberId)" size="32" class="mr-2") {{ getPersonInitials(memberId) }}
                    span {{ getPersonName(memberId) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.stakeholders') }}
                v-card-text
                  div(v-if="!project.stakeholders || project.stakeholders.length === 0") {{ $t('projects.noStakeholders') }}
                  
                  div.d-flex.flex-wrap.align-center(v-for="stakeholderId in project.stakeholders || []" :key="stakeholderId" class="mb-2")
                    v-avatar(:color="getAvatarColor(stakeholderId)" size="32" class="mr-2") {{ getPersonInitials(stakeholderId) }}
                    span {{ getPersonName(stakeholderId) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.tags') }}
                v-card-text
                  div(v-if="project.tags.length === 0") {{ $t('projects.noTags') }}
                  v-chip(
                    v-for="tag in project.tags" 
                    :key="tag"
                    color="primary-lighten-4"
                    class="mr-1 mb-1"
                  ) {{ tag }}
      
      v-card(v-else-if="loading")
        v-card-text
          v-skeleton-loader(type="card" :loading="loading")
      
      v-alert(
        v-else-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-alert(
        v-else
        type="warning"
        class="mb-4"
      ) {{ $t('projects.projectNotFound') }}
  
  v-row
    v-col(cols="12")
      v-tabs(v-model="activeTab")
        v-tab(value="tasks") {{ $t('projects.tasks') }}
        v-tab(value="notes") {{ $t('projects.notes') }}
        v-tab(value="meetings") {{ $t('projects.meetings') }}
        v-tab(value="links") {{ $t('projects.links') }}
        v-tab(value="files") {{ $t('projects.files') }}
        v-tab(value="mail") {{ $t('projects.connectedMail') }}
        v-tab(value="knowledge") {{ $t('knowledge.title') }}

      v-window(v-model="activeTab")
        v-window-item(value="tasks")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.tasks') }}
              v-spacer
              add-button(:items="taskItems")
            v-card-text
              v-list(v-if="projectTasks.length > 0" density="compact")
                v-list-item(
                  v-for="t in projectTasks"
                  :key="t.id"
                  :title="t.title"
                  :subtitle="t.status"
                )
                  template(v-slot:append)
                    v-chip(size="x-small" variant="tonal") {{ taskPriorityLabel(t) }}
              p(v-else) {{ $t('projects.noTasks') }}
        
        v-window-item(value="notes")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.notes') }}
              v-spacer
              add-button(:items="noteItems")
            v-card-text
              v-list(v-if="notePages.length > 0" density="compact")
                v-list-item(
                  v-for="pg in notePages"
                  :key="pg.id"
                  :title="pg.title"
                  :subtitle="pg.content?.slice(0, 120) || ''"
                )
              p(v-else) {{ $t('projects.noNotes') }}
        
        v-window-item(value="meetings")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.meetings') }}
              v-spacer
              add-button(:items="meetingItems")
            v-card-text
              v-list(v-if="projectMeetings.length > 0" density="compact")
                v-list-item(
                  v-for="m in projectMeetings"
                  :key="m.id"
                  :to="`/meetings/${m.id}`"
                  :title="meetingDisplayTitle(m)"
                  :subtitle="formatDate(m.startTime)"
                )
              p(v-else) {{ $t('projects.noMeetings') }}

        v-window-item(value="links")
          v-card(elevation="1" class="mt-4")
            v-card-title {{ $t('projects.links') }}
            v-card-text
              v-row(dense)
                v-col(cols="12" md="6")
                  v-text-field(
                    v-model="newLinkUrl"
                    :label="$t('projects.linkUrl')"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="mb-2"
                  )
                v-col(cols="12" md="4")
                  v-text-field(
                    v-model="newLinkTitle"
                    :label="$t('projects.linkTitleOptional')"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="mb-2"
                  )
                v-col(cols="12" md="2").d-flex.align-end
                  v-btn(
                    color="primary"
                    block
                    :loading="linkSaving"
                    @click="submitNewLink"
                  ) {{ $t('projects.addLink') }}
              v-list(v-if="attachmentLinks.length > 0" density="compact")
                v-list-item(
                  v-for="row in attachmentLinks"
                  :key="row.id"
                  :title="row.title || row.url"
                  :subtitle="row.title ? row.url : undefined"
                )
                  template(v-slot:append)
                    v-btn(icon variant="text" :href="row.url" target="_blank" rel="noopener noreferrer")
                      v-icon mdi-open-in-new
                    v-btn(icon variant="text" color="error" @click="confirmRemoveLink(row)")
                      v-icon mdi-delete
              p(v-else) {{ $t('projects.noLinks') }}

        v-window-item(value="files")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex.align-center
              span {{ $t('projects.files') }}
              v-spacer
              input(
                ref="fileInputRef"
                type="file"
                class="d-none"
                @change="onProjectFileChange"
              )
              v-btn(color="primary" prepend-icon="mdi-upload" @click="triggerFilePick") {{ $t('projects.uploadFile') }}
            v-card-text
              v-alert(v-if="fileHint" type="info" density="compact" class="mb-2") {{ fileHint }}
              v-list(v-if="attachmentFiles.length > 0" density="compact")
                v-list-item(
                  v-for="f in attachmentFiles"
                  :key="f.id"
                  :title="f.name"
                  :subtitle="`${Math.round(f.size / 1024)} KB`"
                )
                  template(v-slot:append)
                    v-btn(icon variant="text" :loading="fileDownloadingId === f.id" @click="downloadProjectFile(f)")
                      v-icon mdi-download
                    v-btn(icon variant="text" color="error" @click="confirmRemoveFile(f)")
                      v-icon mdi-delete
              p(v-else) {{ $t('projects.noFiles') }}

        v-window-item(value="mail")
          v-card(elevation="1" class="mt-4")
            v-card-title {{ $t('projects.connectedMail') }}
            v-card-text
              v-list(v-if="attachmentMailLinks.length > 0" density="compact")
                v-list-item(
                  v-for="row in attachmentMailLinks"
                  :key="row.id"
                  :title="row.subjectSnapshot || row.emailId"
                  :subtitle="row.fromSnapshot || row.accountId"
                )
                  template(v-slot:append)
                    v-btn(icon variant="text" @click="openMailDeepLink(row)")
                      v-icon mdi-email-open
                    v-btn(icon variant="text" color="error" @click="confirmRemoveMailLink(row)")
                      v-icon mdi-link-off
              p(v-else) {{ $t('projects.noConnectedMail') }}

        v-window-item(value="knowledge")
          v-card(elevation="1" class="mt-4")
            v-card-text
              KnowledgeConnections(
                v-if="project"
                node-type="project"
                :entity-id="project.id"
              )

  // Project edit dialog
  v-dialog(v-model="editDialog" max-width="800px")
    v-card(v-if="editDialog && project")
      v-card-title.d-flex.align-center
        v-icon(:color="project.color || getStatusColor(project.status)" class="mr-2") {{ project.icon || 'mdi-folder-outline' }}
        span {{ $t('projects.edit') }}: {{ project.title }}
      
      project-form(
        :project="project"
        :loading="formLoading"
        :error="formError"
        @submit="updateProject"
        @delete="deleteProject"
      )
  
  // Task dialog
  v-dialog(v-model="taskDialog" max-width="800px")
    v-card(v-if="taskDialog")
      task-form(
        :loading="taskLoading"
        :error="taskError"
        :task="taskDefaults"
        @submit="createTask"
      )
  
  // Note dialog
  v-dialog(v-model="noteDialog" max-width="800px")
    v-card(v-if="noteDialog")
      v-card-title {{ $t('projects.addNote') }}
      v-card-text
        v-form(@submit.prevent="createNote")
          v-text-field(
            v-model="noteTitle"
            :label="$t('common.title')"
            required
          )
          
          v-textarea(
            v-model="noteContent"
            :label="$t('common.content')"
            rows="5"
            required
          )
      
      v-card-actions
        v-spacer
        v-btn(
          color="primary"
          :loading="noteLoading"
          :disabled="!noteTitle || !noteContent || noteLoading"
          @click="createNote"
        ) {{ $t('common.save') }}
  
  // Meeting dialog
  v-dialog(v-model="meetingDialog" max-width="800px")
    v-card(v-if="meetingDialog")
      meeting-form(
        :loading="meetingLoading"
        :error="meetingError"
        :meeting="meetingDefaults"
        @submit="createMeeting"
      )

  v-dialog(v-model="confirmDialog.open" max-width="420px")
    v-card
      v-card-title {{ confirmDialog.title }}
      v-card-text {{ confirmDialog.text }}
      v-card-actions
        v-spacer
        v-btn(variant="text" @click="confirmDialog.open = false") {{ $t('common.cancel') }}
        v-btn(color="error" variant="flat" @click="runConfirmAction") {{ $t('common.delete') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '~/stores/projects'
import { usePeopleStore } from '~/stores/people'
import { useTasksStore } from '~/stores/tasks'
import { useMeetingsStore } from '~/stores/meetings'
import { useProjectAttachmentsStore } from '~/stores/projectAttachments'
import { useNotificationStore } from '~/stores/notification'
import type { Project, Task, Meeting, ProjectPage } from '~/types/models'
import type { ProjectLink, ProjectFile, ProjectMailLink } from '~/types/models/projectAttachments'
import { isValidHttpUrlForProject } from '~/utils/normalizeProjectUrl'
import ProjectForm from '~/components/projects/ProjectForm.vue'
import TaskForm from '~/components/tasks/TaskForm.vue'
import MeetingForm from '~/components/meetings/MeetingForm.vue'
import AddButton from '~/components/common/AddButton.vue'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const nuxtApp = useNuxtApp()
const projectsStore = useProjectsStore()
const peopleStore = usePeopleStore()
const attachmentsStore = useProjectAttachmentsStore()
const notify = useNotificationStore()

// State
const loading = ref(false)
const error = ref('')
const activeTab = ref('tasks')
const editDialog = ref(false)
const formLoading = ref(false)
const formError = ref('')

// Task dialog
const taskDialog = ref(false)
const taskLoading = ref(false)
const taskError = ref('')
const tasksStore = useTasksStore()
const taskDefaults = ref({
  title: '',
  description: '',
  status: 'todo',
  priority: 3,
  dueDate: null
})

// Note dialog
const noteDialog = ref(false)
const noteTitle = ref('')
const noteContent = ref('')
const noteLoading = ref(false)
const noteError = ref('')

// Meeting dialog
const meetingDialog = ref(false)
const meetingLoading = ref(false)
const meetingError = ref('')
const meetingsStore = useMeetingsStore()
const meetingDefaults = ref({
  subject: '',
  summary: '',
  category: '',
  plannedStatus: 'to_be_planned',
  date: new Date().toISOString().substr(0, 10),
  time: '09:00',
  location: '',
  participants: []
})

const notePages = ref<ProjectPage[]>([])
const newLinkUrl = ref('')
const newLinkTitle = ref('')
const linkSaving = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const fileDownloadingId = ref<string | null>(null)
const fileHint = ref('')

const confirmDialog = reactive({
  open: false,
  title: '',
  text: '',
})

let pendingConfirm: (() => Promise<void>) | null = null

const runConfirmAction = async () => {
  const fn = pendingConfirm
  confirmDialog.open = false
  pendingConfirm = null
  if (fn) {
    await fn()
  }
}

// Get project ID from route
const projectId = computed(() => route.params.id as string)

// Fetch project
const fetchProject = async () => {
  if (!projectId.value) return

  loading.value = true
  error.value = ''

  try {
    await projectsStore.fetchProject(projectId.value)
  } catch (err: any) {
    error.value = err.message || 'Failed to load project'
  } finally {
    loading.value = false
  }
}

const loadWorkspace = async () => {
  const pid = projectId.value
  if (!pid) return
  await fetchProject()
  if (!projectsStore.currentProject) {
    return
  }
  try {
    const pages = await projectsStore.fetchProjectPages(pid)
    notePages.value = Array.isArray(pages) ? pages : []
  } catch {
    notePages.value = []
  }
  await Promise.all([
    tasksStore.fetchTasks(),
    meetingsStore.fetchMeetings(),
    attachmentsStore.fetchForProject(pid),
  ])
}

// Watch for changes to project ID
watch(projectId, loadWorkspace, { immediate: true })

// Get current project
const project = computed(() => projectsStore.currentProject)

const projectTasks = computed(() => tasksStore.getByProject(projectId.value))
const projectMeetings = computed(() => meetingsStore.getByProject(projectId.value))
const attachmentLinks = computed(() => attachmentsStore.linksForProject(projectId.value))
const attachmentFiles = computed(() => attachmentsStore.filesForProject(projectId.value))
const attachmentMailLinks = computed(() => attachmentsStore.mailLinksForProject(projectId.value))

function taskPriorityLabel(t: Task) {
  const p = t.priority as string | number | undefined
  if (typeof p === 'string') {
    return getPriorityText(p)
  }
  if (typeof p === 'number') {
    if (p <= 3) return getPriorityText('low')
    if (p <= 6) return getPriorityText('medium')
    if (p <= 8) return getPriorityText('high')
    return getPriorityText('urgent')
  }
  return getPriorityText('medium')
}

function meetingDisplayTitle(m: Meeting) {
  const any = m as Meeting & { subject?: string }
  return any.subject || m.title || '—'
}

async function submitNewLink() {
  const pid = projectId.value
  if (!pid || !newLinkUrl.value.trim()) return
  if (!isValidHttpUrlForProject(newLinkUrl.value)) {
    notify.pushError(t('validation.invalidFormat'))
    return
  }
  linkSaving.value = true
  try {
    await attachmentsStore.addLink(pid, newLinkUrl.value, newLinkTitle.value || undefined)
    newLinkUrl.value = ''
    newLinkTitle.value = ''
    notify.pushSuccess(t('projects.linkAdded'))
  } catch (e: unknown) {
    notify.pushError(e instanceof Error ? e.message : t('errors.generic'))
  } finally {
    linkSaving.value = false
  }
}

function confirmRemoveLink(row: ProjectLink) {
  confirmDialog.title = t('projects.removeLink')
  confirmDialog.text = row.url
  pendingConfirm = async () => {
    await attachmentsStore.deleteLink(projectId.value, row.id)
    notify.pushSuccess(t('projects.linkRemoved'))
  }
  confirmDialog.open = true
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

async function onProjectFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const pid = projectId.value
  if (!pid) return
  try {
    await attachmentsStore.uploadFile(pid, file)
    notify.pushSuccess(t('projects.fileUploaded'))
  } catch (e: unknown) {
    notify.pushError(e instanceof Error ? e.message : t('errors.generic'))
  }
}

async function downloadProjectFile(f: ProjectFile) {
  fileDownloadingId.value = f.id
  try {
    const url = await attachmentsStore.getFileDownloadUrl(f.storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e: unknown) {
    notify.pushError(e instanceof Error ? e.message : t('errors.generic'))
  } finally {
    fileDownloadingId.value = null
  }
}

function confirmRemoveFile(f: ProjectFile) {
  confirmDialog.title = t('projects.removeFile')
  confirmDialog.text = f.name
  pendingConfirm = async () => {
    await attachmentsStore.deleteFile(projectId.value, f)
    notify.pushSuccess(t('projects.fileRemoved'))
  }
  confirmDialog.open = true
}

function openMailDeepLink(row: ProjectMailLink) {
  navigateTo({
    path: '/mail',
    query: { accountId: row.accountId, emailId: row.emailId },
  })
}

function confirmRemoveMailLink(row: ProjectMailLink) {
  confirmDialog.title = t('projects.removeMailLink')
  confirmDialog.text = row.subjectSnapshot || row.emailId
  pendingConfirm = async () => {
    await attachmentsStore.deleteMailLink(projectId.value, row.id, row.accountId, row.emailId)
    notify.pushSuccess(t('projects.mailUnlinked'))
  }
  confirmDialog.open = true
}

// AddButton menu items
const taskItems = computed(() => [
  {
    title: 'Add Task',
    icon: 'mdi-checkbox-marked-circle-outline',
    color: 'primary',
    action: openTaskDialog
  }
])

const noteItems = computed(() => [
  {
    title: 'Add Note',
    icon: 'mdi-note-outline',
    color: 'info',
    action: openNoteDialog
  }
])

const meetingItems = computed(() => [
  {
    title: 'Add Meeting',
    icon: 'mdi-account-group',
    color: 'success',
    action: openMeetingDialog
  }
])

// Navigation
const goToProjects = () => {
  router.push('/projects')
}

// Task methods
const openTaskDialog = () => {
  // Reset task form data and set defaults
  taskDefaults.value = {
    title: '',
    description: '',
    status: 'todo',
    priority: 3,
    dueDate: null
  }
  taskDialog.value = true
}

const createTask = async (taskData: Partial<Task>) => {
  if (!project.value) return
  
  taskLoading.value = true
  taskError.value = ''
  
  try {
    // Add the project ID to the related projects array
    const updatedTaskData = {
      ...taskData,
      relatedProjects: [project.value.id]
    }
    
    // Create the task
    const taskId = await tasksStore.createTask(updatedTaskData)
    taskDialog.value = false
    
    // Reset form data
    taskError.value = ''
  } catch (error: any) {
    taskError.value = error.message || 'Failed to create task'
  } finally {
    taskLoading.value = false
  }
}

// Note methods
const openNoteDialog = () => {
  noteTitle.value = ''
  noteContent.value = ''
  noteDialog.value = true
}

const createNote = async () => {
  if (!project.value || !noteTitle.value || !noteContent.value) return
  
  noteLoading.value = true
  noteError.value = ''
  
  try {
    // Currently there's no dedicated notes store, so we'll create a project page instead
    await projectsStore.createProjectPage(project.value.id, {
      title: noteTitle.value,
      content: noteContent.value,
      order: 0, // Set a default order for the page
      tags: []
    })

    const pages = await projectsStore.fetchProjectPages(project.value.id)
    notePages.value = Array.isArray(pages) ? pages : []

    noteDialog.value = false
    noteTitle.value = ''
    noteContent.value = ''
  } catch (error: any) {
    noteError.value = error.message || 'Failed to create note'
  } finally {
    noteLoading.value = false
  }
}

// Meeting methods
const openMeetingDialog = () => {
  // Reset meeting form data and set defaults
  meetingDefaults.value = {
    subject: '',
    summary: '',
    category: '',
    plannedStatus: 'to_be_planned',
    date: new Date().toISOString().substr(0, 10),
    time: '09:00',
    location: '',
    participants: []
  }
  meetingDialog.value = true
}

const createMeeting = async (meetingData: Partial<Meeting>) => {
  if (!project.value) return
  
  meetingLoading.value = true
  meetingError.value = ''
  
  try {
    // Add the project ID to the related projects array
    const updatedMeetingData = {
      ...meetingData,
      relatedProjects: [project.value.id]
    }
    
    // Create the meeting
    const meetingId = await meetingsStore.createMeeting(updatedMeetingData)
    meetingDialog.value = false
    
    // Reset form data
    meetingError.value = ''
  } catch (error: any) {
    meetingError.value = error.message || 'Failed to create meeting'
  } finally {
    meetingLoading.value = false
  }
}

// Helper functions
const formatDate = (date: Date | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getPersonInitials = (id: string) => {
  const person = peopleStore.getById(id)
  if (!person) return '?'
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getPersonName = (id: string) => {
  const person = peopleStore.getById(id)
  if (!person) return 'Unknown'
  return `${person.firstName} ${person.lastName}`
}

const getAvatarColor = (id: string) => {
  const colors = ['primary', 'secondary', 'info', 'success', 'warning']
  return colors[id.charCodeAt(0) % colors.length]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'planning': return 'info'
    case 'active': return 'success'
    case 'onHold': return 'warning'
    case 'completed': return 'primary'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const isLightColor = (colorValue: string) => {
  if (!colorValue) return false;
  
  // These colors are known to be light
  const lightColors = [
    'light-blue', 
    'light-green', 
    'amber', 
    'yellow', 
    'lime', 
    'grey-lighten-3', 
    'grey-lighten-4',
    'grey-lighten-5'
  ];
  
  return lightColors.some(c => colorValue?.includes(c));
}

const getStatusColorLight = (status: string) => {
  switch (status) {
    case 'planning': return 'info-lighten-3'
    case 'active': return 'success-lighten-3'
    case 'onHold': return 'warning-lighten-3'
    case 'completed': return 'primary-lighten-3'
    case 'cancelled': return 'error-lighten-3'
    default: return 'grey-lighten-3'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'planning': return 'Planning'
    case 'active': return 'Active'
    case 'onHold': return 'On Hold'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'planning': return 'mdi-pencil'
    case 'active': return 'mdi-play'
    case 'onHold': return 'mdi-pause'
    case 'completed': return 'mdi-check'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-help'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'success'
    case 'medium': return 'info'
    case 'high': return 'warning'
    case 'urgent': return 'error'
    default: return 'grey'
  }
}

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'low': return 'Low'
    case 'medium': return 'Medium'
    case 'high': return 'High'
    case 'urgent': return 'Urgent'
    default: return priority
  }
}

// Edit functions
const showEditDialog = () => {
  editDialog.value = true
}

const updateProject = async (projectData: Partial<Project>) => {
  if (!project.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.updateProject(project.value.id, projectData)
    editDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update project'
  } finally {
    formLoading.value = false
  }
}

const deleteProject = async () => {
  if (!project.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.deleteProject(project.value.id)
    editDialog.value = false
    router.push('/projects')
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete project'
  } finally {
    formLoading.value = false
  }
}

// Load people data if needed
onMounted(async () => {
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
  if (!nuxtApp.$storage) {
    fileHint.value = t('projects.storageUnavailable')
  }
})
</script>
