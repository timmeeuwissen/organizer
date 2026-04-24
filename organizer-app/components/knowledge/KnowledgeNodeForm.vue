<template lang="pug">
v-dialog(v-model="internalModel" max-width="640px" scrollable)
  v-card
    v-card-title
      span {{ isRelationOnly ? $t('knowledge.editRelation') : (props.knowledge ? $t('knowledge.editKnowledge') : $t('knowledge.addKnowledge')) }}
    v-divider
    v-card-text
      v-form(ref="formRef" v-model="valid")
        template(v-if="!isRelationOnly")
          v-textarea(
            v-model="form.content"
            :label="$t('knowledge.content')"
            :rules="[v => !!v || $t('common.required')]"
            rows="3"
            auto-grow
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-select(
            v-model="form.subtype"
            :items="subtypeItems"
            :label="$t('knowledge.subtype')"
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-row(dense class="mb-1 align-center")
            v-col(cols="12")
              .text-caption.text-medium-emphasis.mb-1 {{ $t('knowledge.certainty') }}: {{ Math.round(form.certainty * 100) }}%
              v-slider(
                v-model="form.certainty"
                min="0"
                max="1"
                step="0.05"
                color="primary"
                hide-details
              )
          v-combobox(
            v-model="form.tags"
            :label="$t('knowledge.tags')"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="compact"
            class="mb-3"
          )

        v-divider(v-if="!isRelationOnly" class="mb-3")

        template(v-if="!props.lockedEntity && !isRelationOnly && !props.knowledge")
          v-select(
            v-model="attachEntityType"
            :items="entityTypeItems"
            :label="$t('knowledge.attachModule')"
            clearable
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-autocomplete(
            v-if="attachEntityType"
            v-model="attachEntityId"
            :items="entityItems"
            item-title="label"
            item-value="id"
            :label="$t('knowledge.attachItem')"
            clearable
            variant="outlined"
            density="compact"
            class="mb-3"
          )

        template(v-if="!props.knowledge")
          .text-caption.text-medium-emphasis.mb-1 {{ $t('knowledge.relations') }}
          v-table(density="compact" class="mb-3")
            thead
              tr
                th {{ $t('knowledge.relationType') }}
                th {{ $t('knowledge.relationLabel') }}
                th(style="width:40px")
            tbody
              tr(v-for="(rel, i) in form.relations" :key="i")
                td
                  v-select(
                    v-model="rel.relationType"
                    :items="relationTypeItems"
                    density="compact"
                    variant="outlined"
                    hide-details
                  )
                td
                  v-text-field(
                    v-model="rel.label"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :placeholder="$t('knowledge.relationLabel')"
                  )
                td
                  v-btn(icon size="x-small" variant="text" color="error" :disabled="form.relations.length <= 1" @click="form.relations.splice(i, 1)")
                    v-icon mdi-delete
              tr
                td(colspan="3")
                  v-btn(size="small" variant="text" prepend-icon="mdi-plus" @click="form.relations.push({ relationType: 'references', label: '' })") {{ $t('knowledge.addRelation') }}

        template(v-else)
          v-select(
            v-model="form.relationType"
            :items="relationTypeItems"
            :label="$t('knowledge.relationType')"
            variant="outlined"
            density="compact"
            class="mb-3"
          )
          v-text-field(
            v-model="form.relationLabel"
            :label="$t('knowledge.relationLabel')"
            variant="outlined"
            density="compact"
            class="mb-3"
          )

    v-divider
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="emit('cancel')") {{ $t('common.cancel') }}
      v-btn(color="primary" :disabled="!valid || saving" :loading="saving" @click="submit") {{ $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useMeetingsStore } from '~/stores/meetings'
import { useTeamsStore } from '~/stores/teams'
import { useCoachingStore } from '~/stores/coaching'
import type { KnowledgeNode, NodeType, EdgeType, KnowledgeSubtype } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'
import { debugAgentLog } from '~/utils/debugAgentLog'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  knowledge: KnowledgeNode | null
  edge: KnowledgeEdge | null
  lockedEntity: { nodeType: NodeType; entityId: string } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: {
    content: string
    subtype: KnowledgeSubtype
    certainty: number
    certaintyDate: Date
    tags: string[]
    relationType: EdgeType
    relationLabel?: string
    relations?: Array<{ relationType: EdgeType; label?: string }>
    entityType?: NodeType
    entityId?: string
  }]
  cancel: []
}>()

const internalModel = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const isRelationOnly = computed(() => props.edge !== null && props.knowledge !== null && false)
// Show all fields when editing; show only relation fields when edge-only mode.
// For now always show full form — simpler and consistent.

const valid = ref(false)
const saving = ref(false)
const formRef = ref()

const form = ref({
  content: '',
  subtype: 'observation' as KnowledgeSubtype,
  certainty: 0.7,
  certaintyDate: new Date() as Date,
  tags: [] as string[],
  relationType: 'references' as EdgeType,
  relationLabel: '',
  relations: [{ relationType: 'references' as EdgeType, label: '' }] as Array<{ relationType: EdgeType; label: string }>
})

const attachEntityType = ref<NodeType | null>(null)
const attachEntityId = ref<string | null>(null)

watch(() => props.modelValue, (open) => {
  saving.value = false
  if (!open) { return }
  if (props.knowledge) {
    form.value = {
      content: props.knowledge.content,
      subtype: props.knowledge.subtype,
      certainty: props.knowledge.certainty,
      certaintyDate: props.knowledge.certaintyDate instanceof Date ? props.knowledge.certaintyDate : new Date(props.knowledge.certaintyDate),
      tags: [...props.knowledge.tags],
      relationType: (props.edge?.relationType ?? 'references') as EdgeType,
      relationLabel: props.edge?.label ?? '',
      relations: [{ relationType: (props.edge?.relationType ?? 'references') as EdgeType, label: props.edge?.label ?? '' }]
    }
    attachEntityType.value = null
    attachEntityId.value = null
  } else {
    form.value = {
      content: '',
      subtype: 'observation',
      certainty: 0.7,
      certaintyDate: new Date(),
      tags: [],
      relationType: 'references',
      relationLabel: '',
      relations: [{ relationType: 'references' as EdgeType, label: '' }]
    }
    attachEntityType.value = props.lockedEntity?.nodeType ?? null
    attachEntityId.value = props.lockedEntity?.entityId ?? null
  }
})

const subtypeItems = computed(() =>
  (['observation', 'concept', 'reason', 'fact', 'insight', 'pattern', 'decision'] as KnowledgeSubtype[]).map(v => ({
    title: t(`knowledge.subtypes.${v}`),
    value: v
  }))
)

const entityTypeItems = computed(() =>
  (['person', 'project', 'task', 'behavior', 'meeting', 'team', 'coaching'] as NodeType[]).map(v => ({
    title: t(`network.nodeType.${v}`),
    value: v
  }))
)

const relationTypeItems = computed(() => [
  { title: t('knowledge.relationTypes.references'), value: 'references' },
  { title: t('knowledge.relationTypes.related'), value: 'related' },
  { title: t('knowledge.relationTypes.contains'), value: 'contains' },
  { title: t('knowledge.relationTypes.stakeholder'), value: 'stakeholder' },
  { title: t('knowledge.relationTypes.reason'), value: 'reason' }
])

const entityItems = computed(() => {
  switch (attachEntityType.value) {
    case 'person': return usePeopleStore().people.map(p => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }))
    case 'project': return useProjectsStore().projects.map(p => ({ id: p.id, label: p.title }))
    case 'task': return useTasksStore().tasks.map(t => ({ id: t.id, label: t.title }))
    case 'behavior': return useBehaviorsStore().behaviors.map(b => ({ id: b.id, label: b.title }))
    case 'meeting': return useMeetingsStore().meetings.map(m => ({ id: m.id, label: m.title }))
    case 'team': return useTeamsStore().teams.map(t => ({ id: t.id, label: t.name }))
    case 'coaching': return useCoachingStore().records.map(c => ({ id: c.id, label: c.title ?? c.id }))
    default: return []
  }
})

async function submit () {
  // #region agent log
  debugAgentLog({ hypothesisId: 'H4', location: 'components/knowledge/KnowledgeNodeForm.vue:submit:pre-validate', message: 'Knowledge form submit called', data: { hasKnowledge: !!props.knowledge, contentLength: form.value.content?.length ?? 0, certaintyDateType: typeof form.value.certaintyDate, hasCertaintyDate: !!form.value.certaintyDate, attachEntityType: attachEntityType.value, attachEntityIdPresent: !!attachEntityId.value } })
  // #endregion
  const { valid: v } = await formRef.value.validate()
  // #region agent log
  debugAgentLog({ hypothesisId: 'H1', location: 'components/knowledge/KnowledgeNodeForm.vue:submit:post-validate', message: 'Knowledge form validation result', data: { valid: v, certaintyDateType: typeof form.value.certaintyDate, certaintyDateIso: form.value.certaintyDate instanceof Date ? form.value.certaintyDate.toISOString() : null, tagsCount: Array.isArray(form.value.tags) ? form.value.tags.length : 0 } })
  // #endregion
  if (!v) { return }
  saving.value = true
  const firstRelation = props.knowledge
    ? { relationType: form.value.relationType as EdgeType, label: form.value.relationLabel }
    : (form.value.relations[0] ?? { relationType: 'references' as EdgeType, label: '' })
  emit('submit', {
    content: form.value.content,
    subtype: form.value.subtype,
    certainty: form.value.certainty,
    certaintyDate: form.value.certaintyDate,
    tags: form.value.tags,
    relationType: firstRelation.relationType,
    ...(firstRelation.label ? { relationLabel: firstRelation.label } : {}),
    ...(!props.knowledge ? { relations: form.value.relations } : {}),
    ...(attachEntityType.value && attachEntityId.value
      ? { entityType: attachEntityType.value, entityId: attachEntityId.value }
      : {})
  })
}
</script>
