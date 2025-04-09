<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4(data-test="behaviors-heading") {{ $t('behaviors.title') }}
      
  v-row
    v-col(cols="12" md="4")
      v-card(class="mb-4")
        v-card-title(class="bg-primary text-white") {{ $t('behaviors.doWell') }}
        v-card-text(v-if="loading") 
          v-skeleton-loader(type="list-item-three-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="doWellBehaviors.length === 0") 
          v-alert(type="info" variant="tonal") {{ $t('behaviors.noBehaviors') }}
        v-card-text(v-else)
          v-list(data-test="behaviors-list")
            v-list-item(
              v-for="behavior in doWellBehaviors" 
              :key="behavior.id"
              :title="behavior.title"
              :subtitle="behavior.rationale"
              @click="openBehavior(behavior)"
              data-test="behavior-item"
            )
              template(v-slot:prepend)
                v-avatar(color="primary" size="36")
                  v-icon(color="white") mdi-check
        v-card-actions
          v-spacer
          v-btn(
            prepend-icon="mdi-plus"
            color="primary"
            variant="text"
            @click="openAddBehavior('doWell')"
            data-test="add-behavior-btn"
          ) {{ $t('behaviors.add') }}
    
    v-col(cols="12" md="4")
      v-card(class="mb-4")
        v-card-title(class="bg-info text-white") {{ $t('behaviors.wantToDoBetter') }}
        v-card-text(v-if="loading") 
          v-skeleton-loader(type="list-item-three-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="wantToDoBetterBehaviors.length === 0") 
          v-alert(type="info" variant="tonal") {{ $t('behaviors.noBehaviors') }}
        v-card-text(v-else)
          v-list
            v-list-item(
              v-for="behavior in wantToDoBetterBehaviors" 
              :key="behavior.id"
              :title="behavior.title"
              :subtitle="behavior.rationale"
              @click="openBehavior(behavior)"
              data-test="behavior-item"
            )
              template(v-slot:prepend)
                v-avatar(color="info" size="36")
                  v-icon(color="white") mdi-trending-up
        v-card-actions
          v-spacer
          v-btn(
            prepend-icon="mdi-plus"
            color="info"
            variant="text"
            @click="openAddBehavior('wantToDoBetter')"
            data-test="add-behavior-btn"
          ) {{ $t('behaviors.add') }}
    
    v-col(cols="12" md="4")
      v-card(class="mb-4")
        v-card-title(class="bg-warning text-white") {{ $t('behaviors.needToImprove') }}
        v-card-text(v-if="loading") 
          v-skeleton-loader(type="list-item-three-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="needToImproveBehaviors.length === 0") 
          v-alert(type="info" variant="tonal") {{ $t('behaviors.noBehaviors') }}
        v-card-text(v-else)
          v-list
            v-list-item(
              v-for="behavior in needToImproveBehaviors" 
              :key="behavior.id"
              :title="behavior.title"
              :subtitle="behavior.rationale"
              @click="openBehavior(behavior)"
              data-test="behavior-item"
            )
              template(v-slot:prepend)
                v-avatar(color="warning" size="36")
                  v-icon(color="white") mdi-alert
        v-card-actions
          v-spacer
          v-btn(
            prepend-icon="mdi-plus"
            color="warning"
            variant="text"
            @click="openAddBehavior('needToImprove')"
            data-test="add-behavior-btn"
          ) {{ $t('behaviors.add') }}

  // View/Edit Dialog
  v-dialog(v-model="behaviorDialog" max-width="600px" data-test="behavior-dialog")
    behavior-form(
      v-if="behaviorDialog"
      :behavior="selectedBehavior"
      :loading="formLoading"
      :error="formError"
      @submit="updateBehavior"
      @delete="deleteBehavior"
    )
  
  // Add Dialog
  v-dialog(v-model="addDialog" max-width="600px" data-test="add-behavior-dialog")
    behavior-form(
      v-if="addDialog"
      :loading="formLoading"
      :error="formError"
      @submit="createBehavior"
    )

  // Action Plan section
  v-row(v-if="selectedBehavior" data-test="action-plans-section")
    v-col(cols="12")
      v-card
        v-card-title {{ $t('behaviors.actionPlan') }} - {{ selectedBehavior.title }}
        v-card-text
          v-expansion-panels(
            v-if="selectedBehavior.actionPlans && selectedBehavior.actionPlans.length"
            data-test="action-plans-list"
          )
            v-expansion-panel(
              v-for="plan in selectedBehavior.actionPlans"
              :key="plan.id"
              :title="plan.description"
              :text="getActionPlanStatus(plan)"
            )
              template(v-slot:text)
                div.mb-2 {{ plan.description }}
                v-chip(:color="getStatusColor(plan.status)" class="mr-2") {{ plan.status }}
                
                div.mt-3.d-flex.justify-space-between
                  v-btn(
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-pencil"
                    @click="editActionPlan(plan)"
                  ) {{ $t('common.edit') }}
                  v-btn(
                    size="small"
                    variant="tonal"
                    color="error"
                    prepend-icon="mdi-delete"
                    @click="deleteActionPlan(plan.id)"
                  ) {{ $t('common.delete') }}
                  
          v-alert(v-else type="info" variant="tonal") {{ $t('behaviors.noActionPlans') }}
        
        v-card-actions
          v-spacer
          v-btn(
            color="primary"
            prepend-icon="mdi-plus"
            @click="openAddActionPlan"
            data-test="add-action-plan-btn"
          ) {{ $t('behaviors.addActionPlan') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBehaviorsStore } from '~/stores/behaviors'
import type { Behavior, ActionPlan } from '~/types/models'
import BehaviorForm from '~/components/behaviors/BehaviorForm.vue'

const behaviorStore = useBehaviorsStore()

// UI state
const loading = ref(true)
const formLoading = ref(false)
const formError = ref('')
const behaviorDialog = ref(false)
const addDialog = ref(false)
const selectedBehavior = ref<Behavior | null>(null)
const newBehaviorType = ref<'doWell' | 'wantToDoBetter' | 'needToImprove'>('wantToDoBetter')

// Get behaviors by type
const doWellBehaviors = computed(() => 
  behaviorStore.getBehaviorsByType('doWell')
)
const wantToDoBetterBehaviors = computed(() => 
  behaviorStore.getBehaviorsByType('wantToDoBetter')
)
const needToImproveBehaviors = computed(() => 
  behaviorStore.getBehaviorsByType('needToImprove')
)

// Initialize data
onMounted(async () => {
  try {
    await behaviorStore.fetchBehaviors()
  } catch (error: any) {
    formError.value = error.message || 'Failed to load behaviors'
  } finally {
    loading.value = false
  }
})

// Dialog functions
const openBehavior = (behavior: Behavior) => {
  selectedBehavior.value = behavior
  behaviorDialog.value = true
}

const openAddBehavior = (type: 'doWell' | 'wantToDoBetter' | 'needToImprove') => {
  newBehaviorType.value = type
  addDialog.value = true
}

// CRUD operations
const createBehavior = async (behaviorData: Partial<Behavior>) => {
  formLoading.value = true
  formError.value = ''
  
  try {
    const newBehavior = {
      ...behaviorData,
      type: newBehaviorType.value
    }
    
    await behaviorStore.createBehavior(newBehavior)
    addDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to create behavior'
  } finally {
    formLoading.value = false
  }
}

const updateBehavior = async (behaviorData: Partial<Behavior>) => {
  if (!selectedBehavior.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await behaviorStore.updateBehavior(selectedBehavior.value.id, behaviorData)
    behaviorDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update behavior'
  } finally {
    formLoading.value = false
  }
}

const deleteBehavior = async () => {
  if (!selectedBehavior.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await behaviorStore.deleteBehavior(selectedBehavior.value.id)
    behaviorDialog.value = false
    selectedBehavior.value = null
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete behavior'
  } finally {
    formLoading.value = false
  }
}

// Action plan functions
const openAddActionPlan = () => {
  // In a real implementation, this would open a dialog for adding action plans
  console.log('Open add action plan dialog')
}

const editActionPlan = (plan: ActionPlan) => {
  // In a real implementation, this would open a dialog for editing action plans
  console.log('Edit action plan', plan)
}

const deleteActionPlan = async (planId: string) => {
  if (!selectedBehavior.value) return
  
  try {
    await behaviorStore.deleteActionPlan(selectedBehavior.value.id, planId)
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete action plan'
  }
}

// Helper functions
const getActionPlanStatus = (plan: ActionPlan) => {
  return plan.status === 'completed' 
    ? 'Completed' 
    : plan.status === 'inProgress'
      ? 'In Progress'
      : 'Pending'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'inProgress': return 'info'
    case 'pending': return 'warning'
    default: return 'grey'
  }
}
</script>
