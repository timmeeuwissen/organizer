<template lang="pug">
v-breadcrumbs.pa-0.mb-2(
  v-if="breadcrumbItems.length > 1"
  :items="breadcrumbItems"
  density="compact"
)
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppNavigationContext } from '~/composables/useAppNavigationContext'

const { segments } = useAppNavigationContext()

const breadcrumbItems = computed(() => {
  const list = segments.value
  return list.map((s, i) => {
    const last = i === list.length - 1
    const item: { title: string; disabled: boolean; to?: string } = {
      title: s.title,
      disabled: last
    }
    if (s.to && !last) {
      item.to = s.to
    }
    return item
  })
})
</script>
