<template lang="pug">
v-dialog(:model-value="modelValue" max-width="500" @update:model-value="$emit('update:modelValue', $event)")
  v-card
    v-card-title.d-flex.align-center
      v-icon.mr-2(color="error") mdi-delete-alert
      | {{ $t('common.deleteTitle') }}
    v-divider
    v-card-text
      template(v-if="references.length > 0")
        p.text-body-2.mb-3 {{ $t('common.deleteReferencesWarning') }}
        v-list(density="compact")
          v-list-item(
            v-for="ref in references"
            :key="ref.id"
            :prepend-icon="ref.icon"
            :title="ref.label"
            :subtitle="ref.module"
            density="compact"
          )
      template(v-else)
        p.text-body-2 {{ $t('common.noReferences') }}
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="$emit('update:modelValue', false)") {{ $t('common.cancel') }}
      v-btn(
        color="error"
        variant="flat"
        @click="confirm"
      ) {{ references.length > 0 ? $t('common.deleteAnyway') : $t('common.delete') }}
</template>

<script setup lang="ts">
import type { ReferenceItem } from '~/composables/useDeleteWithReferences'

defineProps<{
  modelValue: boolean
  references: ReferenceItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
}>()

function confirm () {
  emit('update:modelValue', false)
  emit('confirm')
}
</script>
