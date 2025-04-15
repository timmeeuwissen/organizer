<template lang="pug">
v-menu(location="bottom end" :offset="[0, 5]" v-model="menu")
  template(v-slot:activator="{ props }")
    v-btn(icon v-bind="props" @click.stop)
      v-icon mdi-plus
  
  v-list
    v-list-item(
      v-for="(item, i) in items" 
      :key="i" 
      @click.stop.prevent="item.action"
      :to="null"
    )
      template(v-slot:prepend)
        v-icon(:icon="item.icon" :color="item.color")
      v-list-item-title {{ item.title }}
</template>

<script setup lang="ts">
import { ref } from 'vue'

const menu = ref(false)

const props = defineProps({
  items: {
    type: Array as () => Array<{
      title: string,
      icon: string,
      color?: string,
      action: () => void
    }>,
    required: true
  }
})
</script>
