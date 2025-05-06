<template lang="pug">
v-row.row
  v-col(cols="12" md="6")
    v-card(variant="outlined" class="mb-4 h-100").card
      v-card-title {{ $t('ai.summary') }}
      v-card-text {{ summary }}
  v-col(cols="12" md="6")
    v-card(variant="outlined" class="mb-4 h-100").card.original-text-container
      v-card-title {{ $t('common.original') }}
      v-card-text(fill-height).original-text
        | {{ originalText }}
</template>

<script setup>
const props = defineProps({
  summary: {
    type: String,
    required: true
  },
  originalText: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.card {
  max-height: 250px
}
.origintal-text-container {
  position: relative;
  max-height: 100%;
}
.original-text {
  overflow-y: auto;
  height: 100%;
  white-space: pre-wrap;
}

</style>
