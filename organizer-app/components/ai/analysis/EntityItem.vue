<template lang="pug">
div
  v-list-item(
    :title="entity.name"
    :subtitle="`${$t('ai.confidence')}: ${Math.round(entity.confidence * 100)}%`"
  )
    template(v-slot:prepend)
      v-avatar(:color="entityColor" size="36")
        v-icon(color="white") {{ entityIcon }}
    
    template(v-slot:append)
      v-btn-group
        v-btn(
          variant="text"
          :color="getActionButtonColor('add')"
          @click="selectAction('add')"
          :title="$t('ai.createNew')"
        )
          v-icon mdi-plus
        
        // Edit icon appears next to "create new" when "add" is selected
        template(v-if="action === 'add'")
          v-btn(
            variant="text"
            :color="isEdited ? 'primary' : ''" 
            @click="toggleEdit"
            :title="$t('common.edit')"
          )
            v-icon(
              :color="isEdited ? 'primary' : 'grey'"
            ) mdi-pencil
            // Validation error icon
            v-icon(
              v-if="invalid"
              size="small"
              color="error"
              class="validation-error-icon"
            ) mdi-alert-circle
        
        v-btn(
          variant="text"
          :color="getActionButtonColor('relate')"
          @click="selectAction('relate')"
          :title="$t('ai.relateExisting')"
        )
          v-icon mdi-link
        
        v-btn(
          variant="text"
          :color="getActionButtonColor('ignore')"
          @click="selectAction('ignore')"
          :title="$t('ai.ignore')"
        )
          v-icon mdi-close
    
    // Select dropdown appears when "relate" is selected
    template(v-if="action === 'relate'")
      v-autocomplete(
        :modelValue="relation"
        :items="availableItems"
        :item-title="itemTitle"
        :label="`Search ${entityType}`"
        class="ml-2 entity-search-field"
        density="compact"
        variant="outlined"
        return-object
        hide-details
        :error="invalid"
        @update:modelValue="$emit('update:relation', $event)"
      )
        template(v-slot:item="{ item, props: slotProps }")
          v-list-item(v-bind="slotProps" :title="getItemTitle(item.raw)")
        
        template(v-slot:selection="{ item }")
          span {{ getItemTitle(item) }}
  
  // Entity details editor appears indented under the list item when editing
  v-expand-transition
    v-sheet(
      v-if="isEditing && action === 'add'"
      class="ml-12 mt-2 mb-3 pa-3"
      color="background"
      rounded
    )
      slot(name="details-form" :entity="entity" :onChange="markAsEdited")
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  entity: {
    type: Object,
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityColor: {
    type: String,
    required: true
  },
  entityIcon: {
    type: String,
    required: true
  },
  availableItems: {
    type: Array,
    required: true
  },
  itemTitle: {
    type: String,
    default: 'name'
  },
  action: {
    type: String,
    default: 'ignore'
  },
  relation: {
    type: Object,
    default: null
  },
  invalid: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:action', 'update:relation', 'edit']);

// Create a computed property to access the action prop more directly
const action = computed(() => props.action);

// State for editing
const isEditing = ref(false);
const isEdited = ref(false);

// Watch for action changes
watch(() => props.action, () => {
  console.log('Action changed:', props.action);
  // If action changes, reset editing state
  if (props.action !== 'add') {
    isEditing.value = false;
    isEdited.value = false;
  }
});

// Methods
function selectAction(action) {
  emit('update:action', action);
  
  // If changing away from 'relate', clear relation
  if (action !== 'relate') {
    emit('update:relation', null);
  }
  
  // If switching to 'add', start editing by default
  if (action === 'add') {
    isEditing.value = true;
  }
}

function toggleEdit() {
  isEditing.value = !isEditing.value;
  // If starting to edit, emit edit event
  if (isEditing.value) {
    emit('edit', props.entity);
  }
}

function markAsEdited() {
  isEdited.value = true;
}

function getActionButtonColor(action) {
  if (props.action === action) {
    return action === 'ignore' ? 'error' : 'primary';
  } else {
    return 'default';
  }
}

function getItemTitle(item) {
  return item && item[props.itemTitle] ? item[props.itemTitle] : '';
}
</script>

<style scoped>
.validation-error-icon {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(30%, -30%);
}
</style>
