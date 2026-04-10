<template lang="pug">
v-card(class="mb-2" variant="outlined" density="compact")
  v-card-text.pa-2.d-flex.align-center.ga-2
    v-tooltip(:text="$t('common.dataModel')" location="bottom")
      template(v-slot:activator="{ props: tooltipProps }")
        v-btn(
          v-bind="tooltipProps"
          icon="mdi-code-json"
          variant="text"
          size="small"
          @click="modelDialog = true"
        )
    v-tooltip(:text="$t('common.exportCsv')" location="bottom")
      template(v-slot:activator="{ props: tooltipProps }")
        v-btn(
          v-bind="tooltipProps"
          icon="mdi-file-export-outline"
          variant="text"
          size="small"
          @click="exportCsv"
        )

v-dialog(v-model="modelDialog" max-width="700" scrollable)
  v-card
    v-card-title.d-flex.align-center
      v-icon.mr-2 mdi-code-json
      | {{ $t('common.dataModel') }}
      v-spacer
      v-btn(icon="mdi-close" variant="text" @click="modelDialog = false")
    v-divider
    v-card-text
      pre.text-body-2(style="white-space:pre-wrap;word-break:break-all") {{ prettyModel }}
    v-card-actions
      v-spacer
      v-btn(variant="text" @click="modelDialog = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  items: Record<string, unknown>[]
  modelSample?: Record<string, unknown>
}>()

const modelDialog = ref(false)

const prettyModel = computed(() => {
  const sample = props.modelSample ?? props.items[0] ?? {}
  return JSON.stringify(sample, null, 2)
})

function exportCsv () {
  if (!props.items.length) { return }
  const keys = Object.keys(props.items[0])
  const rows = [
    keys.join(','),
    ...props.items.map(item =>
      keys.map((k) => {
        const val = (item as Record<string, unknown>)[k]
        const str = val === null || val === undefined ? '' : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    )
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'export.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
