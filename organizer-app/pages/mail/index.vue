<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('mail.title') }}
  
  template(v-if="connectedAccounts.length === 0")
    v-row(justify="center" align="center" class="mt-4")
      v-col(cols="12" md="8")
        v-card
          v-card-text(class="text-center pa-6")
            v-icon(size="x-large" color="primary" class="mb-4") mdi-email-off
            h3.text-h5.mb-4 {{ $t('mail.noEmailIntegrations') }}
            p.text-body-1.mb-4 {{ $t('mail.connectEmailIntegration') }}
            v-btn(
              color="primary"
              :to="'/auth/profile'"
              prepend-icon="mdi-account-cog"
            ) {{ $t('mail.goToProfile') }}
  
  template(v-else-if="mailStore.emails && mailStore.emails.length === 0 && !loading")
    v-row(justify="center" align="center" class="mt-4")
      v-col(cols="12" md="8")
        v-card
          v-card-text(class="text-center pa-6")
            v-icon(size="x-large" color="primary" class="mb-4") mdi-email-search
            h3.text-h5.mb-4 No emails found in connected accounts
            p.text-body-1.mb-4 Your accounts are connected, but no emails were found. This could be because:
            
            ul.text-left.mt-3.mb-4
              li Your email connection needs to be authenticated with proper OAuth permissions
              li The access tokens for your email accounts may have expired
              li You need to complete the OAuth flow for each email provider
            v-divider(class="my-4")
            p.text-body-2
              | For Gmail accounts, you'll need to authorize access with the Google OAuth flow. 
              | For Office 365 and Exchange accounts, you'll need Microsoft OAuth permissions.
            div.d-flex.justify-center.mt-4
              v-btn(
                color="primary"
                @click="refreshEmails"
                prepend-icon="mdi-refresh"
                class="mx-2"
              ) Try Again
              v-btn(
                color="secondary"
                :to="'/auth/profile'"
                prepend-icon="mdi-account-cog"
                class="mx-2"
              ) Manage Email Accounts
  
  v-row(v-else)
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('mail.folders') }}
        v-list(density="compact" nav)
          v-list-item(
            v-for="folder in mailFolders"
            :key="folder.id"
            :prepend-icon="folder.icon"
            :title="folder.name"
            :value="folder.id"
            :active="selectedFolder === folder.id"
            @click="selectedFolder = folder.id"
          )
            template(v-slot:append)
              v-chip(size="x-small" v-if="getUnreadCount(folder.id) > 0") {{ getUnreadCount(folder.id) }}
      
      v-card(class="mb-4" v-if="connectedAccounts.length > 0")
        v-card-title {{ $t('mail.accounts') }}
        v-list(density="compact")
          v-list-item(
            v-for="account in connectedAccounts"
            :key="account.id"
            :title="account.name"
            :subtitle="account.email"
          )
            template(v-slot:prepend)
              v-avatar(size="32" :color="account.color")
                span {{ getInitialsFromString(account.name) }}
            
            template(v-slot:append)
              v-chip(
                size="small"
                :color="getAccountStatusColor(account)"
              ) {{ getAccountStatusMessage(account) }}
      
      v-card
        v-card-title {{ $t('mail.contacts') }}
        v-card-text
          v-text-field(
            v-model="contactSearch"
            :label="$t('common.search')"
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            clearable
          )
        v-list(density="compact" v-if="filteredContacts.length > 0" class="contact-list")
          v-list-item(
            v-for="contact in filteredContacts"
            :key="contact.id"
            :title="`${contact.firstName} ${contact.lastName}`"
            :subtitle="contact.email"
            @click="composeToContact(contact)"
          )
            template(v-slot:prepend)
              v-avatar(size="32" :color="getRandomColor(contact.id)")
                span {{ getContactInitials(contact) }}
    
    v-col(cols="12" md="9")
      v-card
        v-toolbar(density="compact" color="primary")
          template(v-if="!selectedEmail")
            v-btn(icon @click="refreshEmails")
              v-icon mdi-refresh
            v-btn(icon @click="showComposeDialog = true")
              v-icon mdi-pencil
            v-spacer
            v-text-field(
              v-model="emailSearch"
              hide-details
              density="compact"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              :placeholder="$t('common.search')"
              bg-color="primary-lighten-1"
              class="mx-2"
              style="max-width: 300px"
              @keyup.enter="performSearch"
            )
          template(v-else)
            v-btn(icon @click="selectedEmail = null")
              v-icon mdi-arrow-left
            v-spacer
            v-btn(icon @click="replyToEmail")
              v-icon mdi-reply
            v-btn(icon @click="forwardEmail")
              v-icon mdi-forward
            v-btn(icon @click="deleteEmail")
              v-icon mdi-delete
        
        template(v-if="!selectedEmail")
          v-card-title(:class="{ 'pa-0': true }")
            v-data-table-virtual(
              v-model:items-per-page="itemsPerPage"
              :headers="emailHeaders"
              :items="filteredEmails"
              :sort-by="[{ key: 'date', order: 'desc' }]"
              hover
              @click:row="handleEmailClick"
              item-value="id"
            )
              template(v-slot:item.read="{ item }")
                v-icon(
                  :icon="item.read ? 'mdi-email-open' : 'mdi-email'"
                  :color="item.read ? 'gray' : 'primary'"
                  size="small"
                )
              
              template(v-slot:item.from="{ item }")
                span(:class="{ 'font-weight-bold': !item.read }") {{ item.from.name }}
              
              template(v-slot:item.subject="{ item }")
                span(:class="{ 'font-weight-bold': !item.read }") {{ item.subject }}
              
              template(v-slot:item.date="{ item }")
                span(:class="{ 'font-weight-bold': !item.read }") {{ formatDate(item.date) }}
              
              template(v-slot:item.actions="{ item }")
                v-btn(icon variant="text" @click.stop="markAsRead(item)")
                  v-icon(size="small") {{ item.read ? 'mdi-email' : 'mdi-email-open' }}
                v-btn(icon variant="text" @click.stop="deleteEmail(item)")
                  v-icon(size="small") mdi-delete
              
              template(v-slot:bottom)
                div.d-flex.align-center.justify-center.my-3(v-if="mailStore.loading")
                  v-progress-circular(indeterminate color="primary")
                  span.ml-2 Loading emails...
                
                div.d-flex.align-center.justify-space-between.px-4.py-2(v-else)
                  div.text-caption 
                    span Showing {{ filteredEmails.length }} of {{ paginationInfo.totalEmails }} emails
                  
                  div.d-flex.align-center
                    v-btn(
                      variant="text"
                      size="small"
                      :disabled="paginationInfo.currentPage <= 0 || mailStore.loading"
                      @click="loadPreviousPage"
                      prepend-icon="mdi-chevron-left"
                    ) Previous
                    
                    span.mx-2 Page {{ paginationInfo.currentPage + 1 }} of {{ Math.max(1, paginationInfo.totalPages) }}
                    
                    v-btn(
                      variant="text"
                      size="small"
                      :disabled="!paginationInfo.hasMoreEmails || mailStore.loading"
                      @click="loadNextPage"
                      append-icon="mdi-chevron-right"
                    ) Next
        
        template(v-else)
          v-card-text
            v-row
              v-col(cols="12")
                h2.text-h5 {{ selectedEmail.subject }}
                v-divider(class="my-2")
                div.d-flex.align-center.mb-2
                  v-avatar(size="32" :color="getRandomColor(selectedEmail.from.email)")
                    span {{ getInitialsFromEmail(selectedEmail.from) }}
                  div.ml-2
                    div.font-weight-bold {{ selectedEmail.from.name }}
                    div.text-caption {{ selectedEmail.from.email }}
                  v-spacer
                  div.text-body-2 {{ formatDatetime(selectedEmail.date) }}
                
                v-chip.mb-2(
                  v-for="person in selectedEmail.to"
                  :key="person.email"
                  size="small"
                  class="mr-1"
                ) To: {{ person.name }}
                
                template(v-if="selectedEmail.cc && selectedEmail.cc.length > 0")
                  v-chip.mb-2(
                    v-for="person in selectedEmail.cc"
                    :key="person.email"
                    size="small"
                    class="mr-1"
                  ) Cc: {{ person.name }}
                
                div.email-body.mt-4.pa-2(v-html="selectedEmail.body")
                
                v-divider(class="my-4")
                
                template(v-if="selectedEmail.attachments && selectedEmail.attachments.length > 0")
                  h3.text-subtitle-1 {{ $t('mail.attachments') }}
                  div.d-flex.flex-wrap
                    v-chip.ma-1(
                      v-for="attachment in selectedEmail.attachments"
                      :key="attachment.name"
                      prepend-icon="mdi-attachment"
                      link
                      variant="outlined"
                    ) {{ attachment.name }}
      
      // Compose dialog
      v-dialog(v-model="showComposeDialog" max-width="800px")
        v-card
          v-card-title
            span {{ $t('mail.compose') }}
            v-spacer
            v-btn(icon variant="text" @click="showComposeDialog = false")
              v-icon mdi-close
          
          v-divider
          
          v-card-text
            v-form(ref="composeForm")
              v-text-field(
                v-model="composeData.to"
                :label="$t('mail.to')"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                required
              )
              
              v-text-field(
                v-model="composeData.cc"
                :label="$t('mail.cc')"
                variant="outlined"
                density="comfortable"
                class="mb-2"
              )
              
              v-text-field(
                v-model="composeData.subject"
                :label="$t('mail.subject')"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                required
              )
              
              v-textarea(
                v-model="composeData.body"
                :label="$t('mail.body')"
                variant="outlined"
                auto-grow
                rows="10"
                required
              )
              
              v-file-input(
                v-model="composeData.attachments"
                :label="$t('mail.attachments')"
                variant="outlined"
                density="comfortable"
                multiple
                chips
                prepend-icon="mdi-paperclip"
              )
          
          v-divider
          
          v-card-actions
            v-btn(
              color="primary"
              prepend-icon="mdi-send"
              @click="sendEmail"
            ) {{ $t('mail.send') }}
            
            v-btn(
              variant="outlined"
              prepend-icon="mdi-content-save"
              @click="saveDraft"
            ) {{ $t('mail.saveDraft') }}
            
            v-spacer
            
            v-btn(
              variant="text"
              @click="showComposeDialog = false"
            ) {{ $t('common.cancel') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useMailStore } from '~/stores/mail'
import { useAuthStore } from '~/stores/auth'
import type { Person, IntegrationAccount } from '~/types/models'
import type { Email, MailFolder, EmailPerson, EmailAttachment } from '~/stores/mail'
import { getAccountStatusMessage, getAccountStatusColor } from '~/utils/api/emailUtils'

// Stores
const peopleStore = usePeopleStore()
const mailStore = useMailStore()
const authStore = useAuthStore()

// State
const selectedEmail = ref<Email | null>(null)
const selectedFolder = ref('inbox')
const mailFolders = computed(() => mailStore.folders)
const connectedAccounts = computed(() => mailStore.getConnectedAccounts)
const loading = computed(() => mailStore.loading)

// Table config
const emailHeaders = [
  { title: '', key: 'read', sortable: false, width: '40px' },
  { title: 'From', key: 'from', sortable: true },
  { title: 'Subject', key: 'subject', sortable: true },
  { title: 'Date', key: 'date', sortable: true, width: '150px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
]
const itemsPerPage = ref(20) // Match this with store's pageSize for consistency

// Search and filters
const emailSearch = ref('')
const contactSearch = ref('')

// Dialog state
const showComposeDialog = ref(false)
const composeData = ref({
  to: '',
  cc: '',
  subject: '',
  body: '',
  attachments: [],
})
const composeForm = ref(null)

// Computed
const filteredEmails = computed(() => {
  // If there are no emails in the store, return empty array
  if (!mailStore.emails) {
    return []
  }
  
  // Just return the emails from the store - filtering will be done at the provider level
  // when search is performed, so we don't need to filter them again here
  let result = mailStore.emails
  
  // Minimize reactive dependencies in this function
  const count = result.length
  const page = mailStore.currentPage
  const total = mailStore.totalEmails
  
  // Use a non-reactive timer to log so we don't create circular dependencies
  if (count > 0) {
    setTimeout(() => {
      console.log(`Displaying ${count} emails for ${selectedFolder.value} (page ${page + 1}, total: ${total})`)
    }, 0)
  }
  
  return result
})

const paginationInfo = computed(() => mailStore.paginationInfo)

const filteredContacts = computed(() => {
  let result = peopleStore.people
  
  if (contactSearch.value) {
    const searchTerm = contactSearch.value.toLowerCase()
    result = result.filter(
      contact => 
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm))
    )
  }
  
  return result.slice(0, 10) // Limit to 10 for performance
})

// Watch for folder changes to reload emails
watch(selectedFolder, (newFolder) => {
  // Reset pagination and fetch emails for the new folder
  mailStore.fetchEmails({ folder: newFolder })
})

// Load data
onMounted(async () => {
  // Load people data
  await peopleStore.fetchPeople();
  
  // First load folder counts (faster) to populate sidebar with unread counts
  console.log('Loading folder counts for sidebar...');
  await mailStore.loadFolderCounts();
  
  // Then fetch the actual emails for the current folder
  console.log('Fetching emails for current folder...');
  await mailStore.fetchEmails({ folder: selectedFolder.value });
  
  // Display integrated accounts info if available
  if (connectedAccounts.value.length > 0) {
    console.log(`Connected to ${connectedAccounts.value.length} mail account(s)`);
  }
});

// Refresh unread counts periodically but less frequently
const refreshUnreadCountsTimer = setInterval(() => {
  if (connectedAccounts.value.length > 0) {
    // Use setTimeout to prevent Vue from tracking this as a reactive dependency
    setTimeout(async () => {
      console.log('Refreshing unread counts...');
      await mailStore.loadFolderCounts();
    }, 0);
  }
}, 300000); // refresh every 5 minutes instead of every minute

// Clean up timer on component unmount
onUnmounted(() => {
  clearInterval(refreshUnreadCountsTimer);
});

// Methods
const getUnreadCount = (folderId: string) => {
  // Don't log here - this method is called frequently from the template
  // and can cause reactive update issues
  return mailStore.getUnreadCountByFolder(folderId);
}

const formatDate = (date: Date) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const emailDate = new Date(date)
  const emailDay = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate())
  
  if (emailDay.getTime() === today.getTime()) {
    return emailDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } else if (emailDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else if (now.getFullYear() === emailDate.getFullYear()) {
    return emailDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } else {
    return emailDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

const formatDatetime = (date: Date) => {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleEmailClick = (event: any, { item }: { item: Email }) => {
  selectedEmail.value = item
  
  // Mark as read
  if (!item.read) {
    markAsRead(item)
  }
}

const markAsRead = (email: Email) => {
  mailStore.markEmailAsRead(email.id, !email.read)
  
  // Update selectedEmail if it's the same email
  if (selectedEmail.value?.id === email.id) {
    selectedEmail.value = { ...selectedEmail.value, read: !selectedEmail.value.read }
  }
}

const deleteEmail = (email?: Email) => {
  const emailToDelete = email || selectedEmail.value
  if (!emailToDelete) return
  
  mailStore.deleteEmail(emailToDelete.id)
  
  if (selectedEmail.value?.id === emailToDelete.id) {
    selectedEmail.value = null
  }
}

const refreshEmails = async () => {
  // Reset to page 0 and refresh emails
  await mailStore.fetchEmails({ folder: selectedFolder.value })
}

const loadNextPage = async () => {
  console.log("Loading next page...")
  selectedEmail.value = null // Clear selection before page change
  await mailStore.fetchNextPage()
  console.log(`After fetchNextPage: page ${mailStore.currentPage + 1}, ${mailStore.emails.length} emails`)
}

const loadPreviousPage = async () => {
  if (mailStore.currentPage <= 0) return
  
  console.log("Loading previous page...")
  selectedEmail.value = null // Clear selection before page change
  const prevPage = mailStore.currentPage - 1
  await mailStore.fetchEmails(
    mailStore.currentQuery || { folder: selectedFolder.value },
    { page: prevPage, pageSize: mailStore.pageSize }
  )
  console.log(`After loadPreviousPage: page ${mailStore.currentPage + 1}, ${mailStore.emails.length} emails`)
}

const performSearch = async () => {
  // Build search query
  const query = {
    folder: selectedFolder.value,
    query: emailSearch.value || undefined
  }
  
  console.log('Performing search at provider level:', query)
  
  // Reset to page 0 with the search query
  await mailStore.fetchEmails(query)
}

const getContactInitials = (contact: Person) => {
  return `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`
}

const getInitialsFromString = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
  }
  return name.substring(0, 2).toUpperCase()
}

const getInitialsFromEmail = (emailPerson: EmailPerson) => {
  const parts = emailPerson.name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
  }
  return emailPerson.name.substring(0, 2).toUpperCase()
}

const getRandomColor = (id: string) => {
  // Generate deterministic color based on ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

const composeToContact = (contact: Person) => {
  if (!contact.email) return
  
  composeData.value.to = `${contact.firstName} ${contact.lastName} <${contact.email}>`
  composeData.value.subject = ''
  composeData.value.body = ''
  composeData.value.cc = ''
  composeData.value.attachments = []
  
  showComposeDialog.value = true
}

const replyToEmail = () => {
  if (!selectedEmail.value) return
  
  composeData.value.to = `${selectedEmail.value.from.name} <${selectedEmail.value.from.email}>`
  composeData.value.subject = `RE: ${selectedEmail.value.subject}`
  composeData.value.body = `<br><br>On ${formatDatetime(selectedEmail.value.date)}, ${selectedEmail.value.from.name} wrote:<br><blockquote style="padding-left: 1em; border-left: 4px solid #ccc">${selectedEmail.value.body}</blockquote>`
  composeData.value.cc = ''
  composeData.value.attachments = []
  
  showComposeDialog.value = true
}

const forwardEmail = () => {
  if (!selectedEmail.value) return
  
  composeData.value.to = ''
  composeData.value.subject = `FW: ${selectedEmail.value.subject}`
  composeData.value.body = `<br><br>---------- Forwarded message ----------<br>From: ${selectedEmail.value.from.name} <${selectedEmail.value.from.email}><br>Date: ${formatDatetime(selectedEmail.value.date)}<br>Subject: ${selectedEmail.value.subject}<br><br>${selectedEmail.value.body}`
  composeData.value.cc = ''
  composeData.value.attachments = []
  
  showComposeDialog.value = true
}

const sendEmail = () => {
  // Create email from form data
  const newEmail: Email = {
    id: `sent-${Date.now()}`,
    subject: composeData.value.subject || '(No subject)',
    from: {
      name: 'Me',
      email: 'me@example.com'
    },
    to: composeData.value.to.split(',').map(recipient => {
      const match = recipient.match(/(.*)<(.*)>/)
      if (match) {
        return {
          name: match[1].trim(),
          email: match[2].trim()
        }
      }
      return {
        name: recipient.trim(),
        email: recipient.trim()
      }
    }),
    body: composeData.value.body || '',
    date: new Date(),
    read: true,
    folder: 'sent'
  }
  
  // Use mail store to send the email
  mailStore.sendEmail(newEmail)
  showComposeDialog.value = false
  
  // Reset compose data
  composeData.value = {
    to: '',
    cc: '',
    subject: '',
    body: '',
    attachments: []
  }
}

const saveDraft = () => {
  // Create draft email from form data
  const newEmail: Email = {
    id: `draft-${Date.now()}`,
    subject: composeData.value.subject || '(No subject)',
    from: {
      name: 'Me',
      email: 'me@example.com'
    },
    to: composeData.value.to.split(',').map(recipient => {
      const match = recipient.match(/(.*)<(.*)>/)
      if (match) {
        return {
          name: match[1].trim(),
          email: match[2].trim()
        }
      }
      return {
        name: recipient.trim(),
        email: recipient.trim()
      }
    }),
    body: composeData.value.body || '',
    date: new Date(),
    read: true,
    folder: 'drafts'
  }
  
  // Use mail store to save the draft
  mailStore.saveDraft(newEmail)
  showComposeDialog.value = false
  
  // Reset compose data
  composeData.value = {
    to: '',
    cc: '',
    subject: '',
    body: '',
    attachments: []
  }
}
</script>

<style lang="scss" scoped>
.contact-list {
  max-height: 300px;
  overflow-y: auto;
}

.email-body {
  min-height: 200px;
  background-color: #f9f9f9;
  border-radius: 4px;
}
</style>
