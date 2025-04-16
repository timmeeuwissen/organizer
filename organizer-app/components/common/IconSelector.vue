<template lang="pug">
.icon-selector
  // Selected icon display - Simplified field view
  .d-flex.align-center.mt-2(v-if="modelValue")
    v-avatar(:color="color || 'primary'" :size="36" class="mr-2")
      v-icon(:icon="modelValue" color="white")
    span.text-body-2.mr-2 {{ modelValue }}
    v-spacer
    v-btn(size="small" icon @click="clearIcon" variant="text")
      v-icon(size="small") mdi-close
    v-btn(size="small" icon @click="openIconSelector" variant="text")
      v-icon(size="small") mdi-pencil
  
  // Empty state with add button
  .d-flex.align-center.mt-2(v-else)
    span.text-subtitle-2.text-medium-emphasis {{ placeholder || $t('meetings.categoryIcon') }}
    v-spacer
    v-btn(
      color="primary"
      @click="openIconSelector"
      icon="mdi-plus"
      size="small"
    )

  // Icon selector dialog
  v-dialog(v-model="dialog" max-width="800px")
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
        )
      
      v-divider
      
      v-card-text.dialog-content
        div(v-if="loading")
          .d-flex.justify-center.align-center.pa-4
            v-progress-circular(indeterminate)
            span.ml-2 {{ $t('common.loading') }}
        
        div(v-else-if="loadError")
          .text-center.text-error.pa-4 {{ loadError }}
        
        div(v-else)
          // Tab navigation for categories (when not searching)
          v-tabs(
            v-model="selectedCategory"
            v-if="!searchQuery"
            show-arrows
            color="primary"
            slider-color="primary"
            @update:model-value="scrollToCategory"
          )
            v-tab(
              v-for="(translation, key) in categoryTranslations"
              :key="key"
              :value="key"
            ) {{ translation }}
          
          // All results when searching
          div(v-if="searchQuery")
            .text-subtitle-2.mb-2.text-grey {{ filteredIcons.length }} {{ $t('common.select') }}
            v-row(dense)
              v-col(
                v-for="icon in filteredIcons" 
                :key="icon.icon" 
                cols="2" 
                sm="2" 
                md="1"
                class="icon-wrapper"
              )
                v-hover(v-slot="{ isHovering, props }")
                  v-card(
                    v-bind="props"
                    @click="selectIcon(icon.icon)"
                    :class="{ 'selected': icon.icon === modelValue, 'hover-effect': isHovering }"
                    flat
                    height="50"
                    class="d-flex align-center justify-center"
                  )
                    v-icon(:icon="icon.icon" :size="24")
                    
                    v-tooltip(location="bottom")
                      template(v-slot:activator="{ props: tooltipProps }")
                        .icon-tooltip-trigger(v-bind="tooltipProps")
                      span {{ getIconTranslatedName(icon.icon) }}
          
          // Show all categories when not searching
          .categories-container.pa-2(v-else ref="categoriesContainer")
            .category-section(
              v-for="(category, categoryKey) in categoriesByKey" 
              :key="categoryKey"
              :id="`category-${categoryKey}`"
              :ref="el => { if (el) categoryRefs[categoryKey] = el }"
            )
              .category-title.text-subtitle-1.py-2.sticky-header {{ category.translation }}
              v-row(dense)
                v-col(
                  v-for="icon in category.icons" 
                  :key="icon.icon" 
                  cols="2" 
                  sm="2" 
                  md="1"
                  class="icon-wrapper"
                )
                  v-hover(v-slot="{ isHovering, props }")
                    v-card(
                      v-bind="props"
                      @click="selectIcon(icon.icon)"
                      :class="{ 'selected': icon.icon === modelValue, 'hover-effect': isHovering }"
                      flat
                      height="50"
                      class="d-flex align-center justify-center"
                    )
                      v-icon(:icon="icon.icon" :size="24")
                      
                      v-tooltip(location="bottom")
                        template(v-slot:activator="{ props: tooltipProps }")
                          .icon-tooltip-trigger(v-bind="tooltipProps")
                        span {{ getIconTranslatedName(icon.icon) }}
      
      v-card-actions
        v-spacer
        v-btn(text @click="dialog = false") {{ $t('common.cancel') }}
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#app'

// Get current locale from i18n
const { locale, t } = useI18n()

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

// Define interfaces for data
interface IconData {
  icon: string
  category?: string
  translations: {
    [key: string]: string
  }
}

interface CategoryData {
  [key: string]: {
    [lang: string]: string
  }
}

// Interface for organized category display
interface CategoryWithIcons {
  translation: string
  icons: {
    icon: string
    translations: { [key: string]: string }
  }[]
}

// References for scrolling to categories
const categoriesContainer = ref<HTMLElement | null>(null)
const categoryRefs = reactive<Record<string, HTMLElement>>({})

const iconData = ref<IconData[]>([])
const categories = ref<CategoryData>({})
const selectedCategory = ref<string | null>(null)

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

// Get category translations for the current locale
const categoryTranslations = computed(() => {
  const translations: { [key: string]: string } = {}
  
  for (const categoryKey in categories.value) {
    const categoryData = categories.value[categoryKey]
    translations[categoryKey] = categoryData[locale.value] || categoryData['en'] || categoryKey
  }
  
  return translations
})

// Organize icons by category for display
const categoriesByKey = computed(() => {
  const result: Record<string, CategoryWithIcons> = {}
  
  // Initialize categories
  for (const categoryKey in categories.value) {
    result[categoryKey] = {
      translation: categoryTranslations.value[categoryKey],
      icons: []
    }
  }
  
  // Add icons to their respective categories
  iconData.value.forEach(icon => {
    if (icon.category && result[icon.category]) {
      result[icon.category].icons.push({
        icon: icon.icon,
        translations: icon.translations
      })
    }
  })
  
  return result
})

// Filter icons based on search query
const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return []
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
})

// Scroll to selected category
const scrollToCategory = (categoryKey: string) => {
  if (!categoryKey || !categoryRefs[categoryKey]) return
  
  nextTick(() => {
    categoryRefs[categoryKey].scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

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
      const response = data.value as { 
        success: boolean; 
        data?: IconData[]; 
        categories?: CategoryData;
        error?: string 
      }
      
      if (response.success) {
        if (response.data) {
          iconData.value = response.data
        }
        
        if (response.categories) {
          categories.value = response.categories
          
          // Set default selected category if not already set
          if (!selectedCategory.value && Object.keys(response.categories).length > 0) {
            selectedCategory.value = Object.keys(response.categories)[0]
          }
        }
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
  // Reset the selected category when searching
  if (searchQuery.value) {
    selectedCategory.value = null
  } else if (Object.keys(categories.value).length > 0 && !selectedCategory.value) {
    // Restore the default category when clearing search
    selectedCategory.value = Object.keys(categories.value)[0]
  }
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

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.categories-container {
  max-height: 50vh;
  overflow-y: auto;
}

.sticky-header {
  position: sticky;
  top: 0;
  background-color: rgb(var(--v-theme-surface));
  z-index: 1;
}

.category-section {
  scroll-margin-top: 60px;
}
</style>
