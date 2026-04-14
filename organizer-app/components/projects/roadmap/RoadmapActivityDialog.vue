<template lang="pug">
v-dialog(v-model="open" max-width="480" @keydown.esc="open = false")
  v-card
    v-card-title {{ isNew ? $t('roadmap.addActivity') : $t('roadmap.activity.edit') }}
    v-card-text
      v-text-field(
        v-model="form.title"
        :label="$t('roadmap.activity.name')"
        :rules="[v => !!v || $t('common.title') + ' required']"
        autofocus
      )
      v-row
        v-col(cols="6")
          v-text-field(
            v-model="startStr"
            type="date"
            :label="$t('roadmap.activity.startDate')"
          )
        v-col(cols="6")
          v-text-field(
            v-model="endStr"
            type="date"
            :label="$t('roadmap.activity.endDate')"
          )
      v-select(
        v-model="form.color"
        :items="colorOptions"
        :label="$t('roadmap.activity.color')"
      )
        template(v-slot:item="{ item, props: itemProps }")
          v-list-item(v-bind="itemProps")
            template(v-slot:prepend)
              v-icon(:color="item.value") mdi-square
      v-select(
        v-if="phases.length"
        v-model="form.phaseId"
        :items="phaseOptions"
        :label="$t('roadmap.activity.phase')"
        clearable
      )
      v-divider.my-2
      .text-subtitle-2.mb-1 {{ $t('roadmap.linkedItems') }}
      v-chip-group
        v-chip(
          v-for="lnk in form.links"
          :key="lnk.id"
          closable
          @click:close="removeLink(lnk.id)"
        )
          v-icon(start :icon="linkIcon(lnk.module)" size="small")
          | {{ lnk.title }}
      p.text-caption.text-medium-emphasis(v-if="!form.links.length") {{ $t('roadmap.noLinkedItems') }}
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="open = false") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!form.title" @click="save") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoadmapActivity, RoadmapPhase, RoadmapActivityLink } from '~/types/models/roadmap'

const props = defineProps<{
  modelValue: boolean
  activity?: RoadmapActivity
  phases: RoadmapPhase[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: [activity: Omit<RoadmapActivity, 'order'>]
}>()

const open = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isNew = computed(() => !props.activity)

const colorOptions = ['primary', 'secondary', 'success', 'warning', 'error', 'info',
  'amber', 'teal', 'purple', 'indigo', 'pink', 'brown']

const phaseOptions = computed(() =>
  props.phases.map(p => ({ title: p.title, value: p.id }))
)

const form = ref(blankForm())

function blankForm () {
  return {
    title: '',
    color: 'primary',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 86400000),
    phaseId: undefined as string | undefined,
    links: [] as RoadmapActivityLink[]
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
    form.value = props.activity
      ? { ...props.activity }
      : blankForm()
  }
})

function removeLink (id: string) {
  form.value.links = form.value.links.filter(l => l.id !== id)
}

function linkIcon (module: RoadmapActivityLink['module']): string {
  switch (module) {
    case 'tasks': return 'mdi-checkbox-marked-outline'
    case 'meetings': return 'mdi-account-group-outline'
    case 'notes': return 'mdi-note-outline'
  }
}

function save () {
  emit('save', {
    id: props.activity?.id ?? crypto.randomUUID(),
    title: form.value.title,
    color: form.value.color,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    phaseId: form.value.phaseId,
    links: form.value.links
  })
  open.value = false
}
</script>
