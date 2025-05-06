<template lang="pug">
div
  v-list(v-if="entities.length > 0", variant="flat")
    entity-item(
      v-for="(entity, index) in entities"
      :key="index"
      :entity="entity"
      :entity-type="entityType"
      :entity-color="entityColor"
      :entity-icon="entityIcon"
      :available-items="availableItems"
      :item-title-prop="itemTitleProp"
      :action="entityActions[index] || 'ignore'"
      :relation="entityRelations[index] || null"
      :invalid="isItemInvalid(index)"
      @update:action="(action) => updateEntityAction(index, action)"
      @update:relation="(relation) => updateEntityRelation(index, relation)"
      @edit="(entity) => $emit('edit', entity)"
    )
      template(#details-form="{ entity, onChange }")
        slot(name="details-form" :entity="entity" :onChange="onChange")
  
  // Empty state    
  v-alert(v-else type="info" variant="tonal") {{ emptyMessage }}
</template>

<script setup>
import { computed } from 'vue';
import EntityItem from './EntityItem.vue';

const props = defineProps({
  entities: {
    type: Array,
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
  itemTitleProp: {
    type: String,
    default: 'name'
  },
  emptyMessage: {
    type: String,
    required: true
  },
  entityActions: {
    type: Object,
    required: true
  },
  entityRelations: {
    type: Object,
    required: true
  },
  selectedItemDetails: {
    type: Object,
    default: null
  },
  invalids: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:actions', 'update:relations', 'edit']);

function updateEntityAction(entityIndex, action) {
  console.log(`updating ${entityIndex} for action ${action}`)
  const newActions = { ...props.entityActions, [entityIndex]: action };
  emit('update:actions', newActions);
}

function updateEntityRelation(entityIndex, relation) {
  const newRelations = { ...props.entityRelations, [entityIndex]: relation };
  emit('update:relations', newRelations);
}

function isItemInvalid(entityIndex) {
  return props.invalids.includes(entityIndex);
}
</script>
