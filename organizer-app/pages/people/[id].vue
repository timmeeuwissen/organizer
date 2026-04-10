<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/people" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ personName }}

  v-row(v-if="loading && !person")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!person" type="warning") {{ $t('people.personNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="6")
            v-list(density="compact")
              v-list-item(:title="$t('people.email')" :subtitle="person.email || '—'")
              v-list-item(:title="$t('people.phone')" :subtitle="person.phone || '—'")
              v-list-item(:title="$t('people.organization')" :subtitle="person.organization || '—'")
              v-list-item(:title="$t('people.role')" :subtitle="person.role || '—'")
              v-list-item(:title="$t('people.team')" :subtitle="person.team || '—'")
          v-col(cols="12" md="6")
            v-card(variant="outlined" v-if="person.notes")
              v-card-title {{ $t('people.notes') }}
              v-card-text {{ person.notes }}
            .d-flex.flex-wrap.gap-1.mt-2(v-if="person.tags?.length")
              v-chip(v-for="tag in person.tags" :key="tag" size="small" variant="tonal") {{ tag }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="person"
          :entity-id="person.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePeopleStore } from '~/stores/people'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const peopleStore = usePeopleStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const person = computed(() => peopleStore.getById(route.params.id as string))
const personName = computed(() => person.value ? `${person.value.firstName} ${person.value.lastName}` : '')

onMounted(async () => {
  loading.value = true
  await Promise.all([
    peopleStore.people.length === 0 ? peopleStore.fetchPeople() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load()
  ])
  loading.value = false
})
</script>
