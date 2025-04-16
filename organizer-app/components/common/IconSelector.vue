<template lang="pug">
.icon-selector
  // Selected icon display
  v-card(v-if="modelValue" variant="outlined")
    v-card-text.pa-2.d-flex.align-center
      v-avatar(:color="color || 'primary'" :size="36" class="mr-2")
        v-icon(:icon="modelValue" color="white")
      span.text-body-2.mr-2 {{ iconName }}
      v-spacer
      v-btn(size="small" icon @click="clearIcon" variant="text")
        v-icon(size="small") mdi-close

  // Icon selector button / text field
  .d-flex.align-center.mt-2
    v-text-field(
      v-model="searchQuery"
      :label="label || $t('common.search')"
      variant="outlined"
      density="compact"
      hide-details
      @click="openIconSelector"
      prepend-inner-icon="mdi-magnify"
      :placeholder="placeholder || $t('meetings.categoryIcon')"
    )
    v-btn.ml-2(
      color="primary"
      @click="openIconSelector"
      :icon="modelValue ? 'mdi-pencil' : 'mdi-plus'"
      size="small"
    )

  // Icon selector dialog
  v-dialog(v-model="dialog" max-width="700px")
    v-card
      v-card-title.d-flex.align-center
        span {{ $t('common.select') }} {{ label || 'Icon' }}
        v-spacer
        v-text-field(
          v-model="searchQuery"
          :label="$t('common.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="max-w-xs"
          @input="filterIcons"
        )
      
      v-divider
      
      v-card-text
        div(v-if="loading")
          .d-flex.justify-center.align-center.pa-4
            v-progress-circular(indeterminate)
            span.ml-2 {{ $t('common.loading') }}
        
        div(v-else-if="loadError")
          .text-center.text-error.pa-4 {{ loadError }}
        
        div(v-else)
          .text-subtitle-2.mb-2.text-grey {{ filteredIcons.length }} {{ $t('common.select') }}
          v-row(dense)
            v-col(
              v-for="icon in filteredIcons" 
              :key="icon" 
              cols="2" 
              sm="2" 
              md="1"
              class="icon-wrapper"
            )
              v-hover(v-slot="{ isHovering, props }")
                v-card(
                  v-bind="props"
                  @click="selectIcon(icon)"
                  :class="{ 'selected': icon === modelValue, 'hover-effect': isHovering }"
                  flat
                  height="50"
                  class="d-flex align-center justify-center"
                )
                  v-icon(:icon="icon" :size="24")
                  
                  v-tooltip(location="bottom")
                    template(v-slot:activator="{ props: tooltipProps }")
                      .icon-tooltip-trigger(v-bind="tooltipProps")
                    span {{ getIconTranslatedName(icon) }}
      
      v-card-actions
        v-spacer
        v-btn(text @click="dialog = false") {{ $t('common.cancel') }}
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#app'

// Get current locale from i18n
const { locale } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const dialog = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const loadError = ref<string | null>(null)

// Define interface for icon data
interface IconData {
  icon: string
  translations: {
    [key: string]: string
  }
}

const iconData = ref<IconData[]>([])

// Format the icon name for display
const formatIconName = (icon: string) => {
  return icon.replace('mdi-', '')
}

// Get translated name for the icon if available, otherwise just format the icon name
const getIconTranslatedName = (icon: string): string => {
  const iconItem = iconData.value.find(item => item.icon === icon)
  if (iconItem && iconItem.translations[locale.value]) {
    return iconItem.translations[locale.value]
  }
  return formatIconName(icon)
}

// Icon name for display, derived from modelValue
const iconName = computed(() => {
  return getIconTranslatedName(props.modelValue)
})

// Simple list of icon strings for usage
const icons = computed(() => {
  return iconData.value.map(item => item.icon)
})

// Filter icons based on search query
const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return icons.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return iconData.value
    .filter(iconItem => {
      // Search in icon name
      if (iconItem.icon.toLowerCase().includes(query)) {
        return true
      }
      
      // Search in translations
      for (const lang in iconItem.translations) {
        if (iconItem.translations[lang].toLowerCase().includes(query)) {
          return true
        }
      }
      
      return false
    })
    .map(iconItem => iconItem.icon)
})

// Open icon selector dialog
const openIconSelector = () => {
  dialog.value = true
  
  // Load icons if not already loaded
  if (iconData.value.length === 0 && !loading.value && !loadError.value) {
    fetchIcons()
  }
}

// Select an icon
const selectIcon = (icon: string) => {
  emit('update:modelValue', icon)
  dialog.value = false
  searchQuery.value = ''
}

// Clear selected icon
const clearIcon = () => {
  emit('update:modelValue', '')
}

// Filter icons when search query changes
const filterIcons = () => {
  // Already handled by computed property
}

// Fetch icons data from API
const fetchIcons = async () => {
  loading.value = true
  loadError.value = null
  
  try {
    const { data, error } = await useFetch('/api/icons')
    
    if (error.value) {
      loadError.value = 'Error loading icons'
      console.error('Error fetching icons:', error.value)
    } else if (data.value) {
      // Check if the response has the expected format
      const response = data.value as { success: boolean; data?: IconData[]; error?: string }
      
      if (response.success && response.data) {
        iconData.value = response.data
      } else {
        loadError.value = response.error || 'Invalid response format'
      }
    }
  } catch (error) {
    console.error('Error fetching icons:', error)
    loadError.value = 'Failed to load icons'
  } finally {
    loading.value = false
  }
}

// Load icons on component mount
onMounted(() => {
  fetchIcons()
})

// Watch for search query changes
watch(searchQuery, () => {
  // Already handled by computed property
})
</script>

<style scoped>
.icon-wrapper {
  min-height: 50px;
}

.selected {
  background-color: rgb(var(--v-theme-primary-rgb), 0.1);
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
}

.hover-effect {
  background-color: rgb(var(--v-theme-primary-rgb), 0.05);
  border-radius: 4px;
  cursor: pointer;
}

.icon-tooltip-trigger {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
