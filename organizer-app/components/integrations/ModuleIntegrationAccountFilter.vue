<template lang="pug">
ProviderAccountsCard(
  v-if="accounts.length > 0"
  v-bind="attrsWithoutClass"
  :class="attrsClass"
  :accounts="accounts"
  :model-value="modelValue"
  @update:model-value="emit('update:modelValue', $event)"
  :title="cardTitle"
)
  template(v-slot:account-chip="slotProps")
    slot(name="account-chip" v-bind="slotProps")
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import ProviderAccountsCard from '~/components/integrations/ProviderAccountsCard.vue'
import { useModuleIntegrationAccounts } from '~/composables/useModuleIntegrationAccounts'
import type { ModuleIntegrationSegment } from '~/config/moduleIntegration'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  moduleSegment: ModuleIntegrationSegment
  modelValue: string[]
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useI18n()
const attrs = useAttrs()

const { accounts } = useModuleIntegrationAccounts(props.moduleSegment)

const cardTitle = computed(() => props.title ?? t('common.integrationAccounts'))

const attrsClass = computed(() => attrs.class)

const attrsWithoutClass = computed(() => {
  const { class: _c, ...rest } = attrs as Record<string, unknown>
  return rest
})
</script>
