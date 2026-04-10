<template lang="pug">
v-card(class="mb-4")
  v-card-title.d-flex
    span {{ title }}
    v-spacer
    v-btn(
      v-if="hasFilters"
      icon
      variant="text"
      size="small"
      @click="clearFilters"
      color="error"
    )
      v-icon mdi-filter-remove

  v-card-text
    // Search filter
    v-text-field(
      v-if="searchable"
      v-model="searchText"
      :label="searchLabel"
      prepend-inner-icon="mdi-magnify"
      hide-details
      variant="outlined"
      density="compact"
      class="mb-4"
      clearable
      @update:model-value="$emit('search-change', $event)"
    )

    // Provider accounts section
    template(v-if="accounts && accounts.length > 0")
      div.mb-4
        div.text-subtitle-2.mb-2 {{ accountsTitle }}
        div.d-flex.flex-wrap.gap-2
          v-chip(
            v-for="account in accounts"
            :key="account.id"
            :color="isProviderSelected(account.id) ? (account.color || 'primary') : undefined"
            :variant="isProviderSelected(account.id) ? 'flat' : 'outlined'"
            @click="toggleProvider(account.id)"
            class="mb-2 mr-2"
            filter
            :filter-icon="isProviderSelected(account.id) ? 'mdi-check' : ''"
          )
            v-avatar(start :color="account.color || 'primary'")
              v-icon(v-if="account.icon" :icon="account.icon" size="small" color="white")
              span(v-else class="text-white") {{ (account.provider || account.name || 'A').substring(0, 1).toUpperCase() }}
            | {{ account.name || account.provider || 'Account' }}

    // Select filters (dropdowns)
    template(v-if="selectFilters && selectFilters.length > 0")
      div(v-for="(filter, index) in selectFilters" :key="`select-${index}`" class="mb-4")
        v-select(
          v-model="filter.selected"
          :items="filter.items"
          :label="filter.title"
          :multiple="filter.multiple"
          :clearable="!filter.multiple"
          chips
          closable-chips
          hide-details
          variant="outlined"
          density="compact"
          @update:model-value="emitFilterChange"
        )

    // Switch filters (toggle)
    template(v-if="switchFilters && switchFilters.length > 0")
      div(v-for="(filter, index) in switchFilters" :key="`switch-${index}`" class="mb-2")
        v-switch(
          v-model="filter.selected"
          :color="filter.color || 'primary'"
          :label="filter.title"
          hide-details
          @update:model-value="emitFilterChange"
        )

    // Checkbox filters (with collapsible sections)
    template(v-if="checkboxFilters && checkboxFilters.length > 0")
      v-expansion-panels(variant="accordion")
        v-expansion-panel(
          v-for="(filter, index) in checkboxFilters"
          :key="`checkbox-${index}`"
        )
          v-expansion-panel-title
            | {{ filter.title }}
            v-chip(
              v-if="filter.selected && filter.selected.length > 0"
              size="x-small"
              color="primary"
              class="ml-2"
            ) {{ filter.selected.length }}
          v-expansion-panel-text
            // Search within the checkbox list if more than 5 items
            v-text-field(
              v-if="filter.items && filter.items.length > 5"
              v-model="filterSearches[index]"
              :label="searchLabel"
              prepend-inner-icon="mdi-magnify"
              hide-details
              variant="outlined"
              density="compact"
              class="mb-2"
              clearable
            )

            // Scrollable container for checkbox list
            div(style="max-height: 200px; overflow-y: auto")
              v-checkbox(
                v-for="item in getFilteredItems(filter.items, index)"
                :key="getItemKey(item)"
                v-model="filter.selected"
                :label="getItemLabel(item)"
                :value="getItemValue(item)"
                density="compact"
                hide-details
                class="mb-1"
                @update:model-value="emitFilterChange"
              )

    // Chip filters (tags)
    template(v-if="chipFilters && chipFilters.length > 0")
      v-expansion-panels(variant="accordion")
        v-expansion-panel(
          v-for="(filter, index) in chipFilters"
          :key="`chip-${index}`"
        )
          v-expansion-panel-title
            | {{ filter.title }}
            v-chip(
              v-if="filter.selected && filter.selected.length > 0"
              size="x-small"
              color="primary"
              class="ml-2"
            ) {{ filter.selected.length }}
          v-expansion-panel-text
            // Search within the chip list if more than 5 items
            v-text-field(
              v-if="filter.items && filter.items.length > 5"
              v-model="chipFilterSearches[index]"
              :label="searchLabel"
              prepend-inner-icon="mdi-magnify"
              hide-details
              variant="outlined"
              density="compact"
              class="mb-2"
              clearable
            )

            // Scrollable container for chip list
            div(style="max-height: 200px; overflow-y: auto")
              v-chip-group(v-model="filter.selected" multiple column class="filter-chip-group")
                v-chip(
                  v-for="item in getFilteredChipItems(filter.items, index)"
                  :key="getItemValue(item)"
                  filter
                  variant="outlined"
                  @update:model-value="emitFilterChange"
                ) {{ getItemLabel(item) }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Define types for filter items
interface FilterItem {
  id?: string;
  value?: string;
  title?: string;
  name?: string;
  label?: string;
  [key: string]: any;
}

interface SelectFilter {
  title: string;
  items: FilterItem[];
  selected: string | string[];
  multiple?: boolean;
}

interface SwitchFilter {
  title: string;
  selected: boolean;
  color?: string;
}

interface CheckboxFilter {
  title: string;
  items: FilterItem[];
  selected: string[];
}

interface ChipFilter {
  title: string;
  items: FilterItem[];
  selected: string[];
}

interface ProviderAccount {
  id: string;
  name?: string;
  provider: string;
  color?: string;
  icon?: string;
  [key: string]: any;
}

// Props
const props = defineProps({
  // Title for the filter card
  title: {
    type: String,
    required: true
  },

  // For main search functionality
  searchable: {
    type: Boolean,
    default: false
  },
  searchLabel: {
    type: String,
    default: 'Search'
  },

  // Provider accounts
  accounts: {
    type: Array as () => ProviderAccount[],
    default: () => []
  },
  modelValue: {
    type: Array as () => string[],
    default: () => []
  },
  accountsTitle: {
    type: String,
    default: 'Accounts'
  },

  // Different types of filters
  selectFilters: {
    type: Array as () => SelectFilter[],
    default: () => []
  },
  switchFilters: {
    type: Array as () => SwitchFilter[],
    default: () => []
  },
  checkboxFilters: {
    type: Array as () => CheckboxFilter[],
    default: () => []
  },
  chipFilters: {
    type: Array as () => ChipFilter[],
    default: () => []
  }
})

// Emits
const emit = defineEmits([
  'update:modelValue',
  'search-change',
  'filter-change',
  'clear-filters'
])

// Local state
const searchText = ref('')
const filterSearches = ref<Record<number, string>>({})
const chipFilterSearches = ref<Record<number, string>>({})

// Check if a provider is selected
const isProviderSelected = (providerId: string): boolean => {
  return props.modelValue.includes(providerId)
}

// Toggle a provider selection
const toggleProvider = (providerId: string): void => {
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(providerId)

  if (index === -1) {
    newValue.push(providerId)
  } else {
    newValue.splice(index, 1)
  }

  emit('update:modelValue', newValue)
  emitFilterChange()
}

// Computed to determine if any filters are active
const hasFilters = computed(() => {
  // Check search
  if (searchText.value) { return true }

  // Check providers
  if (props.modelValue.length > 0 && props.modelValue.length < props.accounts.length) { return true }

  // Check select filters
  if (props.selectFilters) {
    for (const filter of props.selectFilters) {
      if (filter.multiple && filter.selected && filter.selected.length > 0) { return true }
      if (!filter.multiple && filter.selected) { return true }
    }
  }

  // Check switch filters
  if (props.switchFilters) {
    for (const filter of props.switchFilters) {
      if (filter.selected) { return true }
    }
  }

  // Check checkbox filters
  if (props.checkboxFilters) {
    for (const filter of props.checkboxFilters) {
      if (filter.selected && filter.selected.length > 0) { return true }
    }
  }

  // Check chip filters
  if (props.chipFilters) {
    for (const filter of props.chipFilters) {
      if (filter.selected && filter.selected.length > 0) { return true }
    }
  }

  return false
})

// Helper functions for working with filter items
const getItemKey = (item: FilterItem | string): string => {
  // Handle both simple values and objects
  if (typeof item === 'object' && item !== null) {
    return (item.id || item.value || JSON.stringify(item)) as string
  }
  return String(item)
}

const getItemValue = (item: FilterItem | string): string => {
  // Handle both simple values and objects
  if (typeof item === 'object' && item !== null) {
    return (item.id || item.value || item) as string
  }
  return String(item)
}

const getItemLabel = (item: FilterItem | string): string => {
  // Handle both simple values and objects
  if (typeof item === 'object' && item !== null) {
    return (item.name || item.title || item.label || item.value || JSON.stringify(item)) as string
  }
  return String(item)
}

// Filter items based on search
const getFilteredItems = (items: FilterItem[], index: number): FilterItem[] => {
  if (!items) { return [] }

  const searchTerm = filterSearches.value[index]
  if (!searchTerm) { return items }

  return items.filter((item) => {
    const label = getItemLabel(item).toLowerCase()
    return label.includes(searchTerm.toLowerCase())
  })
}

// Filter chip items based on search
const getFilteredChipItems = (items: FilterItem[], index: number): FilterItem[] => {
  if (!items) { return [] }

  const searchTerm = chipFilterSearches.value[index]
  if (!searchTerm) { return items }

  return items.filter((item) => {
    const label = getItemLabel(item).toLowerCase()
    return label.includes(searchTerm.toLowerCase())
  })
}

// Clear all filters
const clearFilters = () => {
  // Clear search
  searchText.value = ''
  emit('search-change', '')

  // Clear filter searches
  filterSearches.value = {}
  chipFilterSearches.value = {}

  // Emit the clear event for parent to handle
  emit('clear-filters')
}

// Emit filter change event with all current filter values
const emitFilterChange = () => {
  const filterData = {
    providers: props.modelValue,
    selectFilters: props.selectFilters,
    switchFilters: props.switchFilters,
    checkboxFilters: props.checkboxFilters,
    chipFilters: props.chipFilters
  }

  emit('filter-change', filterData)
}

// Initialize search text if passed from parent
watch(() => props.searchable, (newVal) => {
  if (newVal && searchText.value) {
    emit('search-change', searchText.value)
  }
}, { immediate: true })
</script>

<style scoped>
.filter-chip-group {
  flex-wrap: wrap;
}
</style>
