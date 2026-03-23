<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      .d-flex.align-center.flex-wrap.gap-2.mb-4
        h1.text-h4 {{ $t('teams.title') }}
        v-spacer
        v-btn(color="primary" prepend-icon="mdi-plus" @click="openCreateDialog") {{ $t('teams.createTeam') }}

  v-row(v-if="teamsStore.loading && !teamsStore.teams.length")
    v-col(cols="12")
      v-skeleton-loader(type="card" v-for="i in 3" :key="i")

  v-alert(v-else-if="teamsStore.error" type="error" class="mb-4") {{ teamsStore.error }}

  v-row(v-else-if="!teamsStore.teams.length")
    v-col(cols="12" md="8")
      v-card
        v-card-text.text-center.pa-8
          v-icon(size="64" color="primary" class="mb-4") mdi-account-group-outline
          p.text-h6 {{ $t('teams.emptyTitle') }}
          p.text-body-2.text-medium-emphasis {{ $t('teams.emptyHint') }}

  v-row(v-else)
    v-col(cols="12" sm="6" md="4" v-for="team in teamsStore.teams" :key="team.id")
      v-card(:to="`/teams/${team.id}`" hover)
        v-card-title.d-flex.align-center
          span.text-truncate {{ team.name }}
          v-spacer
          v-chip(
            size="small"
            :color="attentionColor(scores[team.id])"
            variant="flat"
          ) {{ $t('teams.attention') }}: {{ scores[team.id] ?? '—' }}
        v-card-text
          p.text-body-2.text-truncate(v-if="team.description") {{ team.description }}
          p.text-caption.text-medium-emphasis {{ $t('teams.membersCount', { n: team.memberPersonIds.length }) }}

  v-dialog(
    :key="createDialogKey"
    v-model="openCreate"
    max-width="480"
    :z-index="2600"
    @after-leave="onCreateDialogAfterLeave"
  )
    v-card
      v-card-title {{ $t('teams.createTeam') }}
      v-card-text
        v-text-field(
          v-model="newName"
          :label="$t('teams.teamName')"
          variant="outlined"
          density="comfortable"
          class="mt-2"
          @keyup.enter="submitCreate"
        )
        v-textarea(
          v-model="newDescription"
          :label="$t('common.description')"
          variant="outlined"
          rows="2"
        )
      v-card-actions
        v-spacer
        v-btn(@click="openCreate = false") {{ $t('common.cancel') }}
        v-btn(color="primary" :loading="creating" :disabled="!newName.trim()" @click="submitCreate") {{ $t('common.create') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTeamsStore } from '~/stores/teams'
import { usePeopleStore } from '~/stores/people'
import { useMailStore } from '~/stores/mail'
import { useTasksStore } from '~/stores/tasks'
import {
  buildAllBoardItems,
  totalAttentionWeight,
} from '~/composables/useTeamAttentionBoard'

const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const peopleStore = usePeopleStore()
const mailStore = useMailStore()
const tasksStore = useTasksStore()

const openCreate = ref(false)
/** Remount v-dialog on each open so overlay/transition state cannot get stuck after navigate-away mid-close */
const createDialogKey = ref(0)
/** Navigate only after dialog has fully closed — avoids orphan scrim when router unmounts the page during leave transition */
const pendingNavigateToTeamId = ref<string | null>(null)

const newName = ref('')
const newDescription = ref('')
const creating = ref(false)

async function openCreateDialog() {
  createDialogKey.value += 1
  await nextTick()
  openCreate.value = true
}

function onCreateDialogAfterLeave() {
  const id = pendingNavigateToTeamId.value
  pendingNavigateToTeamId.value = null
  if (id) {
    void router.push(`/teams/${id}`)
  }
}

const peopleById = computed(() => {
  const m = new Map<string, (typeof peopleStore.people)[0]>()
  for (const p of peopleStore.people) m.set(p.id, p)
  return m
})

/** teamId -> weighted attention total */
const scores = ref<Record<string, number>>({})

function attentionColor(score: number | undefined) {
  if (score == null || Number.isNaN(score)) return 'default'
  if (score <= 3) return 'success'
  if (score <= 8) return 'warning'
  return 'error'
}

async function refreshScores() {
  const teams = teamsStore.teams
  if (!teams.length) {
    scores.value = {}
    return
  }
  await tasksStore.fetchTasks()
  const hasMail = mailStore.getConnectedAccounts.length > 0
  if (hasMail) {
    await mailStore.fetchEmails({ folder: 'inbox' }, { page: 0, pageSize: 100 })
  }
  for (const t of teams) {
    await teamsStore.fetchTeamMailMeta(t.id)
  }
  const o: Record<string, number> = {}
  for (const t of teams) {
    const members = t.memberPersonIds.map((id) => peopleById.value.get(id)).filter(Boolean) as typeof peopleStore.people
    const meta = teamsStore.mailMetaForTeam(t.id)
    const items = buildAllBoardItems(
      t,
      hasMail ? mailStore.emails : [],
      meta,
      members,
      tasksStore.tasks,
    )
    o[t.id] = totalAttentionWeight(items)
  }
  scores.value = o
}

async function submitCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const id = await teamsStore.createTeam({
      name: newName.value.trim(),
      description: newDescription.value.trim() || undefined,
    })
    newName.value = ''
    newDescription.value = ''
    pendingNavigateToTeamId.value = id
    openCreate.value = false
  } catch (e) {
    console.error(e)
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await teamsStore.fetchTeams()
  await peopleStore.fetchPeople()
  await refreshScores()
  if (route.query.new === '1') {
    await openCreateDialog()
    router.replace({ path: '/teams', query: {} })
  }
})
</script>
