<template lang="pug">
v-dialog(v-model="open" max-width="400" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addPhase') : $t('roadmap.phase.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.phase.name')"
        autofocus
      )
      v-row
        v-col(cols="6")
          v-text-field(v-model="startStr" type="date" :label="$t('roadmap.phase.startDate')")
        v-col(cols="6")
          v-text-field(v-model="endStr" type="date" :label="$t('roadmap.phase.endDate')")
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.phase.color')"
      )
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapPhase } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  phase?: RoadmapPhase
  nextOrder: number
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [phase: RoadmapPhase]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.phase)
const colorOptions = ['amber', 'teal', 'blue', 'green', 'purple', 'orange', 'red', 'indigo']

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    color: 'amber',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000)
  }
}

const startStr = computed({
  get: () => form.value.startDate.toISOString().slice(0, 10),
  set: v => { form.value.startDate = new Date(v) }
})

const endStr = computed({
  get: () => form.value.endDate.toISOString().slice(0, 10),
  set: v => { form.value.endDate = new Date(v) }
})

watch(() => props.modelValue, (v) => {
  if (v) {
    form.value = props.phase
      ? { ...props.phase }
      : blankForm()
  }
})

function save () {
  emit('save', {
    id: props.phase?.id ?? crypto.randomUUID(),
    title: form.value.title,
    color: form.value.color,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    order: props.phase?.order ?? props.nextOrder
  })
  open.value = false
}
</script>
