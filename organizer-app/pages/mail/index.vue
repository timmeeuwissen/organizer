<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('mail.title') }}
  
  v-row
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
import { ref, computed, onMounted } from 'vue'
import { usePeopleStore } from '~/stores/people'
import type { Person } from '~/types/models'

// Mock email types
interface EmailPerson {
  name: string
  email: string
}

interface EmailAttachment {
  name: string
  size: number
  url: string
}

interface Email {
  id: string
  subject: string
  from: EmailPerson
  to: EmailPerson[]
  cc?: EmailPerson[]
  body: string
  date: Date
  read: boolean
  folder: string
  attachments?: EmailAttachment[]
  labels?: string[]
}

interface MailFolder {
  id: string
  name: string
  icon: string
}

// Stores
const peopleStore = usePeopleStore()

// State
const emails = ref<Email[]>([])
const selectedEmail = ref<Email | null>(null)
const selectedFolder = ref('inbox')
const mailFolders = ref<MailFolder[]>([
  { id: 'inbox', name: 'Inbox', icon: 'mdi-inbox' },
  { id: 'sent', name: 'Sent', icon: 'mdi-send' },
  { id: 'drafts', name: 'Drafts', icon: 'mdi-file-document-outline' },
  { id: 'trash', name: 'Trash', icon: 'mdi-delete' },
  { id: 'spam', name: 'Spam', icon: 'mdi-alert-circle' },
])

// Table config
const emailHeaders = [
  { title: '', key: 'read', sortable: false, width: '40px' },
  { title: 'From', key: 'from', sortable: true },
  { title: 'Subject', key: 'subject', sortable: true },
  { title: 'Date', key: 'date', sortable: true, width: '150px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
]
const itemsPerPage = ref(15)

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
  let result = emails.value.filter(email => email.folder === selectedFolder.value)
  
  if (emailSearch.value) {
    const searchTerm = emailSearch.value.toLowerCase()
    result = result.filter(
      email => 
        email.subject.toLowerCase().includes(searchTerm) ||
        email.from.name.toLowerCase().includes(searchTerm) ||
        email.from.email.toLowerCase().includes(searchTerm) ||
        email.body.toLowerCase().includes(searchTerm)
    )
  }
  
  return result
})

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

// Load mock data
onMounted(async () => {
  await peopleStore.fetchPeople()
  generateMockEmails()
})

const generateMockEmails = () => {
  // Create mock emails from contacts
  const mockEmails: Email[] = []
  
  peopleStore.people.slice(0, 20).forEach((person, index) => {
    // Random emails from each person
    if (!person.email) return
    
    const numEmails = 1 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < numEmails; i++) {
      const id = `email-${index}-${i}`
      const isRead = Math.random() > 0.3
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 14)) // Random date within last 2 weeks
      
      mockEmails.push({
        id,
        subject: `Sample email ${i+1} from ${person.firstName}`,
        from: {
          name: `${person.firstName} ${person.lastName}`,
          email: person.email || `${person.firstName.toLowerCase()}@example.com`
        },
        to: [{
          name: 'Me',
          email: 'me@example.com'
        }],
        body: generateRandomEmailBody(person),
        date,
        read: isRead,
        folder: 'inbox',
        attachments: Math.random() > 0.7 ? [
          {
            name: 'document.pdf',
            size: 1024 * 1024 * (1 + Math.random() * 10), // 1-10MB
            url: '#'
          }
        ] : undefined
      })
    }
  })
  
  // Add sent emails
  for (let i = 0; i < 5; i++) {
    const id = `sent-${i}`
    const randomPerson = peopleStore.people[Math.floor(Math.random() * peopleStore.people.length)]
    if (!randomPerson) continue
    
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 10))
    
    mockEmails.push({
      id,
      subject: `RE: Regarding our meeting on ${formatDate(date)}`,
      from: {
        name: 'Me',
        email: 'me@example.com'
      },
      to: [{
        name: `${randomPerson.firstName} ${randomPerson.lastName}`,
        email: randomPerson.email || `${randomPerson.firstName.toLowerCase()}@example.com`
      }],
      body: "Hi there,<br><br>Thanks for your email. I've reviewed the documents and everything looks good to proceed.<br><br>Best regards,<br>Me",
      date,
      read: true,
      folder: 'sent'
    })
  }
  
  // Add draft emails
  for (let i = 0; i < 2; i++) {
    const id = `draft-${i}`
    const randomPerson = peopleStore.people[Math.floor(Math.random() * peopleStore.people.length)]
    if (!randomPerson) continue
    
    const date = new Date()
    date.setHours(date.getHours() - Math.floor(Math.random() * 12))
    
    mockEmails.push({
      id,
      subject: i === 0 ? 'Project update' : '',
      from: {
        name: 'Me',
        email: 'me@example.com'
      },
      to: [{
        name: `${randomPerson.firstName} ${randomPerson.lastName}`,
        email: randomPerson.email || `${randomPerson.firstName.toLowerCase()}@example.com`
      }],
      body: i === 0 ? "Here's an update on our project status:<br><br>- Task 1: Completed<br>- Task 2: In progress<br>- Task 3: Not started<br><br>Let me know if you have any questions." : "",
      date,
      read: true,
      folder: 'drafts'
    })
  }
  
  // Sort by date
  mockEmails.sort((a, b) => b.date.getTime() - a.date.getTime())
  
  emails.value = mockEmails
}

const generateRandomEmailBody = (person: Person) => {
  const templates = [
    `<p>Hello,</p><p>I wanted to follow up on our previous conversation about the project. We're making good progress, but there are a few things I'd like to discuss.</p><p>Could we schedule a meeting sometime this week?</p><p>Best regards,<br>${person.firstName}</p>`,
    
    `<p>Hi there,</p><p>I'm reaching out to share some updates on the ${Math.random() > 0.5 ? 'marketing' : 'development'} initiative we discussed. The team has been working hard, and we've made significant progress.</p><p>I've attached some documents for your review.</p><p>Looking forward to your feedback,<br>${person.firstName} ${person.lastName}</p>`,
    
    `<p>Greetings,</p><p>Just a quick note to confirm our meeting on ${new Date(Date.now() + 86400000 * Math.floor(Math.random() * 7)).toLocaleDateString()} at ${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '00' : '30'} ${Math.random() > 0.5 ? 'AM' : 'PM'}.</p><p>Please let me know if you need to reschedule.</p><p>Regards,<br>${person.firstName}</p>`,
    
    `<p>Dear Team,</p><p>I'm pleased to announce that we've reached a major milestone in our project. The client has approved our proposal and we're ready to move forward with the next phase.</p><p>Thank you all for your hard work and dedication.</p><p>Sincerely,<br>${person.firstName} ${person.lastName}<br>${person.role || 'Team Lead'}</p>`
  ]
  
  return templates[Math.floor(Math.random() * templates.length)]
}

// Methods
const getUnreadCount = (folderId: string) => {
  return emails.value.filter(email => email.folder === folderId && !email.read).length
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
  const index = emails.value.findIndex(e => e.id === email.id)
  if (index !== -1) {
    emails.value[index].read = !emails.value[index].read
  }
}

const deleteEmail = (email?: Email) => {
  const emailToDelete = email || selectedEmail.value
  if (!emailToDelete) return
  
  const index = emails.value.findIndex(e => e.id === emailToDelete.id)
  if (index !== -1) {
    // Move to trash or permanently delete from trash
    if (emailToDelete.folder === 'trash') {
      emails.value.splice(index, 1)
    } else {
      emails.value[index].folder = 'trash'
    }
    
    if (selectedEmail.value?.id === emailToDelete.id) {
      selectedEmail.value = null
    }
  }
}

const refreshEmails = () => {
  // In a real app, this would fetch emails from the server
  // For demo purposes, just regenerate mock emails
  generateMockEmails()
}

const getContactInitials = (contact: Person) => {
  return `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`
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
  // In a real app, this would send the email to the server
  // For demo purposes, add it to the sent folder
  
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
    body: composeData.value.body,
    date: new Date(),
    read: true,
    folder: 'sent'
  }
  
  emails.value.unshift(newEmail)
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
  // In a real app, this would save the draft to the server
  // For demo purposes, add it to the drafts folder
  
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
    body: composeData.value.body,
    date: new Date(),
    read: true,
    folder: 'drafts'
  }
  
  emails.value.unshift(newEmail)
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
