<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('people.edit') : $t('people.addPerson') }}
    
    v-card-text
      v-alert(
        v-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-select(
        v-model="storageProvider"
        :items="availableProviders"
        :label="$t('common.storageLocation')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-server"
        :rules="[rules.required]"
        required
      )
      
      v-row
        v-col(cols="12" sm="6")
          v-text-field(
            v-model="firstName"
            :label="$t('people.firstName')"
            :rules="[rules.required]"
            required
            prepend-icon="mdi-account"
          )
        
        v-col(cols="12" sm="6")
          v-text-field(
            v-model="lastName"
            :label="$t('people.lastName')"
            :rules="[rules.required]"
            required
            prepend-icon="mdi-account"
          )
      
      v-text-field(
        v-model="email"
        :label="$t('people.email')"
        :rules="[rules.email]"
        prepend-icon="mdi-email"
        type="email"
      )
      
      v-text-field(
        v-model="phone"
        :label="$t('people.phone')"
        prepend-icon="mdi-phone"
      )
      
      v-text-field(
        v-model="organization"
        :label="$t('people.organization')"
        prepend-icon="mdi-domain"
      )
      
      v-text-field(
        v-model="role"
        :label="$t('people.role')"
        prepend-icon="mdi-briefcase"
      )
      
      v-text-field(
        v-model="team"
        :label="$t('people.team')"
        prepend-icon="mdi-account-group"
      )
      
      v-slider(
        v-if="contactFrequency !== null"
        v-model="contactFrequency"
        :label="$t('people.contactFrequency')"
        min="1"
        max="90"
        thumb-label
        :hint="contactFrequencyHint"
        persistent-hint
      )
      
      v-textarea(
        v-model="notes"
        :label="$t('people.notes')"
        rows="3"
        prepend-icon="mdi-note-text"
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
import { useIntegrationProviders } from '~/composables/useIntegrationProviders'
import type { Person } from '~/types/models'

const props = defineProps({
  person: {
    type: Object as () => Person | null,
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
const storageProvider = ref(props.person?.storageProvider || 'organizer') // Default to storing in Organizer
const firstName = ref(props.person?.firstName || '')
const lastName = ref(props.person?.lastName || '')
const email = ref(props.person?.email || '')
const phone = ref(props.person?.phone || '')
const organization = ref(props.person?.organization || '')
const role = ref(props.person?.role || '')
const team = ref(props.person?.team || '')
const contactFrequency = ref(props.person?.contactFrequency || null)
const notes = ref(props.person?.notes || '')

// Get available storage providers
const { contactProviders } = useIntegrationProviders()
const availableProviders = computed(() => contactProviders.value)

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail must be valid'
}

// Compute if we're editing or creating
const isEdit = computed(() => !!props.person)

// Contact frequency hint
const contactFrequencyHint = computed(() => {
  if (contactFrequency.value === null || contactFrequency.value === 0) {
    return ''
  }
  
  if (contactFrequency.value === 1) {
    return 'Every day'
  } else if (contactFrequency.value === 7) {
    return 'Every week'
  } else if (contactFrequency.value === 14) {
    return 'Every two weeks'
  } else if (contactFrequency.value === 30) {
    return 'Every month'
  } else if (contactFrequency.value === 90) {
    return 'Every quarter'
  } else {
    return `Every ${contactFrequency.value} days`
  }
})

// Submit function
const submit = () => {
  if (!valid.value) return
  
  const personData: Partial<Person> = {
    storageProvider: storageProvider.value,
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value || undefined,
    phone: phone.value || undefined,
    organization: organization.value || undefined,
    role: role.value || undefined,
    team: team.value || undefined,
    contactFrequency: contactFrequency.value || undefined,
    notes: notes.value || undefined
  }
  
  emit('submit', personData)
}

// When person changes, update form values
onMounted(() => {
  if (props.person) {
    firstName.value = props.person.firstName
    lastName.value = props.person.lastName
    email.value = props.person.email || ''
    phone.value = props.person.phone || ''
    organization.value = props.person.organization || ''
    role.value = props.person.role || ''
    team.value = props.person.team || ''
    contactFrequency.value = props.person.contactFrequency || null
    notes.value = props.person.notes || ''
  }
})
</script>
