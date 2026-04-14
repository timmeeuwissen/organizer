<template lang="pug">
v-dialog(v-model="open" max-width="400" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addMilestone') : $t('roadmap.milestone.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.milestone.name')"
        autofocus
      )
      v-text-field(
        v-model="form.description"
        :label="$t('roadmap.milestone.description')"
      )
      v-text-field(v-model="dateStr" type="date" :label="$t('roadmap.milestone.date')")
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.milestone.color')"
      )
      v-select(
        v-if="activities.length"
        v-model="form.activityId"
        :items="activityOptions"
        :label="$t('roadmap.milestone.activity')"
        clearable
      )
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapMilestone, RoadmapActivity } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  milestone?: RoadmapMilestone
  activities: RoadmapActivity[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [milestone: RoadmapMilestone]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.milestone)
const colorOptions = ['amber', 'orange', 'red', 'green', 'blue', 'purple']

const activityOptions = computed(() =>
  props.activities.map(a => ({ title: a.title, value: a.id }))
)

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    description: '',
    date: new Date(),
    color: 'amber',
    activityId: undefined as string | undefined
  }
}

const dateStr = computed({
  get: () => form.value.date.toISOString().slice(0, 10),
  set: v => { form.value.date = new Date(v) }
})

watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = props.milestone
      ? { ...props.milestone, description: props.milestone.description ?? '' }
      : blankForm()
  }
})

function save () {
  emit('save', {
    id: props.milestone?.id ?? crypto.randomUUID(),
    title: form.value.title,
    description: form.value.description || undefined,
    date: form.value.date,
    color: form.value.color,
    activityId: form.value.activityId
  })
  open.value = false
}
</script>
