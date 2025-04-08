<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('behaviors.edit') : $t('behaviors.add') }}
    
    v-card-text
      v-alert(
        v-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-select(
        v-model="type"
        :items="behaviorTypes"
        :label="$t('behaviors.type')"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        required
      )
      
      v-text-field(
        v-model="title"
        :label="$t('behaviors.title')"
        :rules="[rules.required]"
        required
      )
      
      v-textarea(
        v-model="rationale"
        :label="$t('behaviors.rationale')"
        :rules="[rules.required]"
        required
        rows="3"
      )
      
      v-combobox(
        v-model="examples"
        :label="$t('behaviors.examples')"
        chips
        multiple
        closable-chips
        hint="Enter examples and press Enter"
        persistent-hint
      )
      
      v-combobox(
        v-model="categories"
        :label="$t('behaviors.category')"
        chips
        multiple
        closable-chips
        hint="Enter categories and press Enter"
        persistent-hint
      )
    
    v-card-actions
      v-spacer
      v-btn(
        v-if="isEdit"
        color="error"
        variant="text"
        :loading="loading"
        @click="$emit('delete')"
      ) {{ $t('common.delete') }}
      v-btn(
        color="primary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="submit"
      ) {{ isEdit ? $t('common.update') : $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Behavior } from '~/types/models'

const props = defineProps({
  behavior: {
    type: Object as () => Behavior | null,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit', 'delete'])

const form = ref(null)
const valid = ref(false)

// Form fields
const type = ref(props.behavior?.type || 'wantToDoBetter')
const title = ref(props.behavior?.title || '')
const rationale = ref(props.behavior?.rationale || '')
const examples = ref(props.behavior?.examples || [])
const categories = ref(props.behavior?.categories || [])

// Behavior types
const behaviorTypes = [
  { label: 'What I do well', value: 'doWell' },
  { label: 'Want to do better', value: 'wantToDoBetter' },
  { label: 'Need to improve', value: 'needToImprove' }
]

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required'
}

// Compute if we're editing or creating
const isEdit = computed(() => !!props.behavior)

// Submit function
const submit = () => {
  if (!valid.value) return
  
  const behaviorData: Partial<Behavior> = {
    type: type.value as 'doWell' | 'wantToDoBetter' | 'needToImprove',
    title: title.value,
    rationale: rationale.value,
    examples: examples.value,
    categories: categories.value
  }
  
  emit('submit', behaviorData)
}

// When behavior changes, update form values
onMounted(() => {
  if (props.behavior) {
    type.value = props.behavior.type
    title.value = props.behavior.title
    rationale.value = props.behavior.rationale
    examples.value = [...props.behavior.examples]
    categories.value = [...props.behavior.categories]
  }
})
</script>
