<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/tasks" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ task?.title || $t('tasks.task') }}

  v-row(v-if="loading && !task")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!task" type="warning") {{ $t('tasks.taskNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="8")
            v-list(density="compact")
              v-list-item(:title="$t('tasks.status')" :subtitle="task.status")
              v-list-item(:title="$t('tasks.priority')" :subtitle="task.priority")
              v-list-item(
                v-if="task.dueDate"
                :title="$t('tasks.dueDate')"
                :subtitle="formatDate(task.dueDate)"
              )
              v-list-item(
                v-if="task.assignee"
                :title="$t('tasks.assignee')"
                :subtitle="getPersonName(task.assignee)"
              )
            p.text-body-1.mt-4(v-if="task.description") {{ task.description }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="task"
          :entity-id="task.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { locale } = useI18n()
const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const task = computed(() => tasksStore.getById(route.params.id as string))

function getPersonName (personId: string) {
  const p = peopleStore.getById(personId)
  return p ? `${p.firstName} ${p.lastName}` : personId
}

function formatDate (date: Date) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(date))
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    tasksStore.tasks.length === 0 ? tasksStore.fetchTasks() : Promise.resolve(),
    peopleStore.people.length === 0 ? peopleStore.fetchPeople() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load()
  ])
  loading.value = false
})
</script>
