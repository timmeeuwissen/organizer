<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('people.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title.d-flex {{ $t('people.filters') }}
          v-spacer
          v-btn(
            icon
            variant="text"
            size="small"
            @click="clearFilters"
            v-if="hasFilters"
          )
            v-icon mdi-filter-remove
            
        v-card-text
          v-text-field(
            v-model="search"
            :label="$t('common.search')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            variant="outlined"
            density="compact"
            class="mb-4"
            clearable
          )
          
          v-expansion-panels(variant="accordion")
            v-expansion-panel
              v-expansion-panel-title {{ $t('people.byOrganization') }}
              v-expansion-panel-text
                v-checkbox(
                  v-for="org in organizations" 
                  :key="org"
                  v-model="selectedOrganizations"
                  :label="org"
                  :value="org"
                  density="compact"
                  hide-details
                )
                
            v-expansion-panel
              v-expansion-panel-title {{ $t('people.byTeam') }}
              v-expansion-panel-text
                v-checkbox(
                  v-for="team in teams" 
                  :key="team"
                  v-model="selectedTeams"
                  :label="team"
                  :value="team"
                  density="compact"
                  hide-details
                )
                
            v-expansion-panel
              v-expansion-panel-title {{ $t('people.byRole') }}
              v-expansion-panel-text
                v-checkbox(
                  v-for="role in roles" 
                  :key="role"
                  v-model="selectedRoles"
                  :label="role"
                  :value="role"
                  density="compact"
                  hide-details
                )
      
      v-card
        v-card-title {{ $t('people.recentlyContacted') }}
        v-card-text(v-if="loading")
          v-skeleton-loader(type="list-item-avatar-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="recentlyContacted.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('people.noPeople') }}
        v-list(v-else)
          v-list-item(
            v-for="person in recentlyContacted"
            :key="person.id"
            :title="`${person.firstName} ${person.lastName}`"
            :subtitle="person.organization || person.role || person.team"
            @click="openPerson(person)"
          )
            template(v-slot:prepend)
              v-avatar(color="primary")
                span {{ getInitials(person) }}
            template(v-slot:append)
              v-chip(
                size="small"
                class="ml-2"
                color="info"
              ) {{ formatDateDistance(person.lastContacted) }}
                
    v-col(cols="12" md="9")
      v-card
        v-card-title.d-flex
          span {{ $t('people.allPeople') }}
          v-spacer
          v-btn(
            color="info"
            prepend-icon="mdi-refresh"
            @click="syncContacts"
            :loading="syncingContacts"
            class="mr-2"
          ) {{ $t('people.syncContacts') }}
          v-btn(
            color="primary"
            prepend-icon="mdi-plus"
            @click="addDialog = true"
          ) {{ $t('people.addPerson') }}
          
        v-card-text(v-if="loading")
          v-skeleton-loader(type="table")
        v-card-text(v-else-if="filteredPeople.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('people.noPeople') }}
        v-card-text(v-else)
          v-data-table(
            :headers="headers"
            :items="filteredPeople"
            :search="search"
            hover
            @click:row="openPerson"
          )
            template(v-slot:item.name="{ item }")
              div.d-flex.align-center
                v-avatar(size="32" color="primary" class="mr-2")
                  span {{ getInitials(item) }}
                span {{ `${item.firstName} ${item.lastName}` }}
                
            template(v-slot:item.lastContacted="{ item }")
              v-chip(
                v-if="item.lastContacted"
                size="small"
                :color="getLastContactedColor(item.lastContacted)"
              ) {{ formatDate(item.lastContacted) }}
              span(v-else) -
              
            template(v-slot:item.actions="{ item }")
              v-btn(
                icon
                variant="text"
                size="small"
                @click.stop="openPerson(item)"
                color="primary"
              )
                v-icon mdi-eye
              v-btn(
                icon
                variant="text"
                size="small"
                @click.stop="contactPerson(item)"
                color="success"
              )
                v-icon mdi-phone

  // View/Edit Dialog
  v-dialog(v-model="personDialog" max-width="600px")
    person-form(
      v-if="personDialog"
      :person="selectedPerson"
      :loading="formLoading"
      :error="formError"
      @submit="updatePerson"
      @delete="deletePerson"
    )
  
  // Add Dialog
  v-dialog(v-model="addDialog" max-width="600px")
    person-form(
      v-if="addDialog"
      :loading="formLoading"
      :error="formError"
      @submit="createPerson"
    )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePeopleStore } from '~/stores/people'
import type { Person } from '~/types/models'
import PersonForm from '~/components/people/PersonForm.vue'

const peopleStore = usePeopleStore()

// UI state
const loading = ref(true)
const formLoading = ref(false)
const formError = ref('')
const personDialog = ref(false)
const addDialog = ref(false)
const selectedPerson = ref<Person | null>(null)
const search = ref('')
const syncingContacts = ref(false)

// Filters
const selectedOrganizations = ref<string[]>([])
const selectedTeams = ref<string[]>([])
const selectedRoles = ref<string[]>([])

// Table headers
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Organization', key: 'organization', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Team', key: 'team', sortable: true },
  { title: 'Last Contacted', key: 'lastContacted', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Initialize data
onMounted(async () => {
  try {
    await peopleStore.fetchPeople()
  } catch (error: any) {
    formError.value = error.message || 'Failed to load people'
  } finally {
    loading.value = false
  }
})

// Computed properties
const organizations = computed(() => {
  return [...new Set(peopleStore.people
    .filter(p => p.organization)
    .map(p => p.organization))]
})

const teams = computed(() => {
  return [...new Set(peopleStore.people
    .filter(p => p.team)
    .map(p => p.team))]
})

const roles = computed(() => {
  return [...new Set(peopleStore.people
    .filter(p => p.role)
    .map(p => p.role))]
})

const recentlyContacted = computed(() => {
  return peopleStore.getRecentlyContacted(5)
})

const hasFilters = computed(() => {
  return selectedOrganizations.value.length > 0 ||
    selectedTeams.value.length > 0 ||
    selectedRoles.value.length > 0
})

const filteredPeople = computed(() => {
  let result = [...peopleStore.people]
  
  if (selectedOrganizations.value.length > 0) {
    result = result.filter(p => 
      p.organization && selectedOrganizations.value.includes(p.organization)
    )
  }
  
  if (selectedTeams.value.length > 0) {
    result = result.filter(p => 
      p.team && selectedTeams.value.includes(p.team)
    )
  }
  
  if (selectedRoles.value.length > 0) {
    result = result.filter(p => 
      p.role && selectedRoles.value.includes(p.role)
    )
  }
  
  return result
})

// Helper functions
const getInitials = (person: Person) => {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

const formatDateDistance = (date: Date | null) => {
  if (!date) return ''
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

const getLastContactedColor = (date: Date | null) => {
  if (!date) return 'grey'
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days < 7) return 'success'
  if (days < 30) return 'info'
  if (days < 90) return 'warning'
  return 'error'
}

const clearFilters = () => {
  selectedOrganizations.value = []
  selectedTeams.value = []
  selectedRoles.value = []
}

// Dialog functions
const openPerson = (person: Person) => {
  selectedPerson.value = person
  personDialog.value = true
}

// CRUD operations
const createPerson = async (personData: Partial<Person>) => {
  formLoading.value = true
  formError.value = ''
  
  try {
    await peopleStore.createPerson(personData)
    addDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to create person'
  } finally {
    formLoading.value = false
  }
}

const updatePerson = async (personData: Partial<Person>) => {
  if (!selectedPerson.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await peopleStore.updatePerson(selectedPerson.value.id, personData)
    personDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update person'
  } finally {
    formLoading.value = false
  }
}

const deletePerson = async () => {
  if (!selectedPerson.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await peopleStore.deletePerson(selectedPerson.value.id)
    personDialog.value = false
    selectedPerson.value = null
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete person'
  } finally {
    formLoading.value = false
  }
}

const contactPerson = async (person: Person) => {
  await peopleStore.updateLastContactDate(person.id)
}

// Sync contacts from all providers
const syncContacts = async () => {
  syncingContacts.value = true
  try {
    await peopleStore.syncContactsFromAllProviders()
    // Show success notification
    // This assumes you have a notification system
    // If not, you can use alert or another method
    alert('All contacts have been successfully synchronized')
  } catch (error: any) {
    console.error('Error syncing contacts:', error)
    alert(`Error syncing contacts: ${error.message || 'Unknown error'}`)
  } finally {
    syncingContacts.value = false
  }
}
</script>
