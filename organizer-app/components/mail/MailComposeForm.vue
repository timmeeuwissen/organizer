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
        v-model="accountId"
        :items="availableAccounts"
        :label="$t('mail.sendFrom')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-account"
        :rules="[rules.required]"
        required
        class="mb-2"
      )

      v-select(
        v-model="bodyFormat"
        :items="bodyFormatOptions"
        :label="$t('mail.bodyFormat')"
        item-title="label"
        item-value="value"
        prepend-icon="mdi-format-text"
        class="mb-2"
      )

      v-select(
        v-model="signatureId"
        :items="signatureOptions"
        :label="$t('mail.signature')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-draw-pen"
        clearable
        class="mb-2"
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
        @click="saveDraft"
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
import { useAuthStore } from '~/stores/auth'
import type { EmailPerson } from '~/stores/mail'
import type { MailComposeSettings } from '~/types/models'

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

const { setNavigationDirty } = useUnsavedChanges()

const peopleStore = usePeopleStore()
const authStore = useAuthStore()

const form = ref(null)
const valid = ref(false)

// Form fields
const composeSettings = computed<MailComposeSettings>(() => authStore.currentUser?.settings?.mailCompose || {})
const connectedAccounts = computed(() => {
  const accounts = authStore.currentUser?.settings?.integrationAccounts || []
  return accounts.filter(account => account.oauthData.connected && account.syncMail && account.showInMail)
})
const availableAccounts = computed(() =>
  connectedAccounts.value.map(account => ({
    id: account.id,
    name: account.oauthData.name || account.oauthData.email
  }))
)
const signatureOptions = computed(() => composeSettings.value.signatures || [])

const accountId = ref(props.email?.accountId || composeSettings.value.defaultAccountId || connectedAccounts.value[0]?.id || '')
const to = ref(parsePersons(props.email?.to))
const cc = ref(parsePersons(props.email?.cc))
const bcc = ref(parsePersons(props.email?.bcc))
const subject = ref(props.email?.subject || '')
const body = ref(props.email?.body || '')
const bodyFormat = ref(props.email?.bodyFormat || composeSettings.value.defaultBodyFormat || 'html')
const signatureId = ref(props.email?.signatureId || composeSettings.value.defaultSignatureId || null)

const bodyFormatOptions = computed(() => [
  { label: String(t('mail.richText')), value: 'html' },
  { label: String(t('mail.plainText')), value: 'plain' }
])

// Mark dirty when any form field changes
watch(
  [accountId, to, cc, bcc, subject, body, bodyFormat, signatureId],
  () => { setNavigationDirty(true) },
  { deep: true }
)

// Validation rules
const rules = {
  required: v => !!v || 'This field is required',
  email: v => /.+@.+\..+/.test(v) || 'E-mail must be valid'
}
const { t } = useI18n()

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
  if (!valid.value) { return }

  const emailData = {
    to: to.value,
    cc: cc.value,
    bcc: bcc.value,
    subject: subject.value,
    body: body.value,
    accountId: accountId.value,
    bodyFormat: bodyFormat.value,
    signatureId: signatureId.value || undefined,
    date: new Date()
  }

  emit('submit', emailData)
}

const saveDraft = () => {
  const emailData = {
    to: to.value,
    cc: cc.value,
    bcc: bcc.value,
    subject: subject.value,
    body: body.value,
    accountId: accountId.value,
    bodyFormat: bodyFormat.value,
    signatureId: signatureId.value || undefined,
    date: new Date()
  }
  emit('save-draft', emailData)
}

// Load data
onMounted(async () => {
  if (!accountId.value && connectedAccounts.value[0]) {
    accountId.value = connectedAccounts.value[0].id
  }
  // Load people for contacts
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
})

function parsePersons (raw: unknown): EmailPerson[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((entry: any) => {
      if (typeof entry === 'string') {
        const email = entry.trim()
        if (!email) { return null }
        return { name: email, email }
      }
      const email = String(entry?.email || '').trim()
      if (!email) { return null }
      return { name: String(entry?.name || email), email }
    })
    .filter((entry): entry is EmailPerson => !!entry)
}
</script>
