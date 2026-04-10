<template lang="pug">
v-container(fluid)
  v-row.align-center
    v-col(cols="auto")
      v-btn(icon variant="text" to="/behaviors" :title="$t('common.back')")
        v-icon mdi-arrow-left
    v-col
      h1.text-h4.text-truncate {{ behavior?.title || $t('behaviors.behavior') }}

  v-row(v-if="loading && !behavior")
    v-col(cols="12")
      v-skeleton-loader(type="article")

  v-alert(v-else-if="!behavior" type="warning") {{ $t('behaviors.behaviorNotFound') }}

  template(v-else)
    v-tabs(v-model="activeTab" class="mb-4")
      v-tab(value="details") {{ $t('common.details') }}
      v-tab(value="knowledge") {{ $t('knowledge.title') }}

    v-window(v-model="activeTab")
      v-window-item(value="details")
        v-row
          v-col(cols="12" md="8")
            v-chip(:color="typeColor" class="mb-3") {{ $t(`behaviors.${behavior.type}`) }}
            p.text-body-1.mb-3 {{ behavior.description }}
            p.text-body-2.text-medium-emphasis.mb-4 {{ behavior.rationale }}
            template(v-if="behavior.actionPlans?.length")
              .text-subtitle-2.mb-2 {{ $t('behaviors.actionPlans') }}
              v-card(
                v-for="(plan, i) in behavior.actionPlans"
                :key="i"
                variant="outlined"
                class="mb-2"
              )
                v-card-text {{ plan.description }}

      v-window-item(value="knowledge")
        KnowledgeConnections(
          node-type="behavior"
          :entity-id="behavior.id"
        )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useKnowledgeStore } from '~/stores/knowledge'
import KnowledgeConnections from '~/components/knowledge/KnowledgeConnections.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const behaviorsStore = useBehaviorsStore()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const activeTab = ref('details')

const behavior = computed(() => behaviorsStore.getById(route.params.id as string))
const typeColor = computed(() => {
  switch (behavior.value?.type) {
    case 'doWell': return 'success'
    case 'wantToDoBetter': return 'info'
    case 'needToImprove': return 'warning'
    default: return 'default'
  }
})

onMounted(async () => {
  loading.value = true
  await Promise.all([
    behaviorsStore.behaviors.length === 0 ? behaviorsStore.fetchBehaviors() : Promise.resolve(),
    knowledgeStore.bootstrapped ? Promise.resolve() : knowledgeStore.load()
  ])
  loading.value = false
})
</script>
