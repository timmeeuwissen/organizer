<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ $t('mail.compose') }}
    
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
      
      v-combobox(
        v-model="to"
        :label="$t('mail.to')"
        :items="availableContacts"
        item-title="email"
        item-value="email"
        prepend-icon="mdi-email-outline"
        multiple
        chips
        closable-chips
        :rules="[rules.required]"
        required
      )
      
      v-combobox(
        v-model="cc"
        :label="$t('mail.cc')"
        :items="availableContacts"
        item-title="email"
        item-value="email"
        prepend-icon="mdi-email-multiple-outline"
        multiple
        chips
        closable-chips
      )
      
      v-combobox(
        v-model="bcc"
        :label="$t('mail.bcc')"
        :items="availableContacts"
        item-title="email"
        item-value="email"
        prepend-icon="mdi-email-lock"
        multiple
        chips
        closable-chips
      )
      
      v-text-field(
        v-model="subject"
        :label="$t('mail.subject')"
        prepend-icon="mdi-format-title"
        :rules="[rules.required]"
        required
      )
      
      v-textarea(
        v-model="body"
        :label="$t('mail.body')"
        rows="10"
        prepend-icon="mdi-text-box"
        :rules="[rules.required]"
        required
      )
      
      v-expansion-panels(variant="accordion")
        v-expansion-panel
          v-expansion-panel-title {{ $t('mail.attachments') }}
          v-expansion-panel-text
            p {{ $t('mail.attachmentsNotSupported') }}
    
    v-card-actions
      v-btn(
        color="secondary"
        variant="text"
        @click="$emit('save-draft')"
      ) {{ $t('mail.saveDraft') }}
      v-spacer
      v-btn(
        color="error"
        variant="text"
        @click="$emit('close')"
      ) {{ $t('common.cancel') }}
      v-btn(
        color="primary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="submit"
      ) {{ $t('mail.send') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useIntegrationProviders } from '~/composables/useIntegrationProviders'

const props = defineProps({
  email: {
    type: Object,
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

const emit = defineEmits(['submit', 'save-draft', 'close'])

const peopleStore = usePeopleStore()

const form = ref(null)
const valid = ref(false)

// Form fields
const storageProvider = ref(props.email?.storageProvider || 'organizer') // Default to storing in Organizer
const to = ref(props.email?.to || [])
const cc = ref(props.email?.cc || [])
const bcc = ref(props.email?.bcc || [])
const subject = ref(props.email?.subject || '')
const body = ref(props.email?.body || '')

// Get available storage providers
const { mailProviders } = useIntegrationProviders()
const availableProviders = computed(() => mailProviders.value)

// Validation rules
const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) => /.+@.+\..+/.test(v) || 'E-mail must be valid'
}

// Computed values
const availableContacts = computed(() => {
  return peopleStore.people
    .filter(person => person.email)
    .map(person => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email
    }))
})

// Submit function
const submit = () => {
  if (!valid.value) return
  
  const emailData = {
    storageProvider: storageProvider.value,
    to: to.value,
    cc: cc.value,
    bcc: bcc.value,
    subject: subject.value,
    body: body.value,
    date: new Date()
  }
  
  emit('submit', emailData)
}

// Load data
onMounted(async () => {
  // Load people for contacts
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
})
</script>
