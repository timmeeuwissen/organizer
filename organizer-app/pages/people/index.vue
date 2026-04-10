<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('people.title') }}

  v-row
    v-col(cols="12" md="3")
      ModuleIntegrationAccountFilter(
        module-segment="people"
        v-model="selectedProviders"
        :title="$t('people.accounts')"
        class="mb-4"
      )
      FilterContainer(
        :title="$t('people.filters')"
        :searchable="true"
        :searchLabel="$t('common.search')"
        :checkboxFilters="checkboxFilters"
        @search-change="search = $event"
        @filter-change="handleFilterChange"
        @clear-filters="clearFilters"
      )

      v-card(class="mb-4" v-if="recentlyContacted.length > 0 || loading")
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
                div.position-relative.d-flex.align-center
                  div.account-indicator(:style="{ backgroundColor: getProviderColor(item) }")
                  v-avatar(
                    size="32"
                    :color="getProviderColor(item)"
                    class="ml-2 mr-2"
                  )
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
                :to="`/people/${item.id}`"
                color="info"
              )
                v-icon mdi-open-in-new
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

  AdminCard(:items="filteredPeople" class="mt-2")

  DeleteWithReferencesDialog(
    v-model="deleteConfirmDialog"
    :references="deleteReferences"
    @confirm="confirmDeletePerson"
  )

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
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePeopleStore } from '~/stores/people'
import { useDeleteWithReferences } from '~/composables/useDeleteWithReferences'
import type { Person } from '~/types/models'
import PersonForm from '~/components/people/PersonForm.vue'
import ModuleIntegrationAccountFilter from '~/components/integrations/ModuleIntegrationAccountFilter.vue'
import FilterContainer from '~/components/common/FilterContainer.vue'
import { useModuleIntegrationAccounts } from '~/composables/useModuleIntegrationAccounts'

const peopleStore = usePeopleStore()
const route = useRoute()

// UI state
const loading = ref(true)
const formLoading = ref(false)
const formError = ref('')
const personDialog = ref(false)
const addDialog = ref(false)
const selectedPerson = ref<Person | null>(null)
const search = ref('')
const syncingContacts = ref(false)

// Provider filters
const selectedProviders = ref<string[]>([])

// Filters
const selectedOrganizations = ref<string[]>([])
const selectedTeams = ref<string[]>([])
const selectedRoles = ref<string[]>([])

// FilterContainer configuration
// Note: In a real app, we would use the i18n translation function here
// but for simplicity and to avoid TypeScript issues, we're using direct strings
const checkboxFilters = computed(() => [
  {
    title: 'Organization', // Would normally be $t('people.byOrganization')
    items: organizations.value.map(org => ({ value: org })),
    selected: selectedOrganizations.value
  },
  {
    title: 'Team', // Would normally be $t('people.byTeam')
    items: teams.value.map(team => ({ value: team })),
    selected: selectedTeams.value
  },
  {
    title: 'Role', // Would normally be $t('people.byRole')
    items: roles.value.map(role => ({ value: role })),
    selected: selectedRoles.value
  }
])

// Handle filter changes from FilterContainer
const handleFilterChange = (filters: any) => {
  // No need to manually update the selectedOrganizations, selectedTeams, etc.
  // as they are bound via v-model and will update automatically
  console.log('Filter change:', filters)
}

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

const { accounts: connectedAccounts } = useModuleIntegrationAccounts('people')

const openPerson = (person: Person) => {
  selectedPerson.value = person
  personDialog.value = true
}

function tryOpenPersonFromRoute () {
  const pid = route.query.person
  if (typeof pid !== 'string' || !pid.trim()) {
    return
  }
  const found = peopleStore.people.find(p => p.id === pid.trim())
  if (found) {
    openPerson(found)
  }
}

watch(
  () => route.query.person,
  () => {
    if (loading.value) {
      return
    }
    tryOpenPersonFromRoute()
  }
)

// Initialize data
onMounted(async () => {
  const q = route.query.search
  if (typeof q === 'string' && q.trim()) {
    search.value = q.trim()
  }
  try {
    await peopleStore.fetchPeople()
    tryOpenPersonFromRoute()
  } catch (error: any) {
    formError.value = error.message || 'Failed to load people'
  } finally {
    loading.value = false
  }
  nextTick(() => {
    selectedProviders.value = connectedAccounts.value.map(account => account.id)
  })
})

// Watch for changes in selectedProviders
watch(selectedProviders, (newProviders) => {
  console.log('Provider filter changed:', newProviders)
  // The filteredPeople computed property will automatically update
})

// Helper functions for accounts
const getInitialsFromString = (name: string) => {
  if (!name) { return '' }
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
  }
  return name.substring(0, 2).toUpperCase()
}

// Get the provider color based on the account ID
const getProviderColor = (person: Person) => {
  if (!person.providerAccountId) { return 'primary' }

  const account = connectedAccounts.value.find(acc => acc.id === person.providerAccountId)
  if (!account) { return 'primary' }

  // Check if the account has a predefined color
  if (account.color) {
    return account.color
  }

  // Generate deterministic color based on account ID
  let hash = 0
  const id = account.id
  for (let i = 0; i < id.length; i++) {
    // Simple hash calculation for TypeScript compatibility
    hash = Math.imul(hash, 31) + id.charCodeAt(i)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

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
    selectedRoles.value.length > 0 ||
    // Add provider filter check
    (selectedProviders.value.length > 0 &&
     selectedProviders.value.length < connectedAccounts.value.length)
})

const filteredPeople = computed(() => {
  let result = [...peopleStore.people]

  // Filter by provider accounts
  if (selectedProviders.value.length === 0) {
    // If no providers are selected, only show records without a provider
    result = result.filter(p => !p.providerAccountId)
  } else if (connectedAccounts.value.length > 0) {
    result = result.filter(p =>
      !p.providerAccountId || // Include records without provider
      selectedProviders.value.includes(p.providerAccountId)
    )
  }

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
  if (!date) { return '-' }
  return new Date(date).toLocaleDateString()
}

const formatDateDistance = (date: Date | null) => {
  if (!date) { return '' }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) { return 'Today' }
  if (days === 1) { return 'Yesterday' }
  if (days < 7) { return `${days} days ago` }
  if (days < 30) { return `${Math.floor(days / 7)} weeks ago` }
  if (days < 365) { return `${Math.floor(days / 30)} months ago` }
  return `${Math.floor(days / 365)} years ago`
}

const getLastContactedColor = (date: Date | null) => {
  if (!date) { return 'grey' }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days < 7) { return 'success' }
  if (days < 30) { return 'info' }
  if (days < 90) { return 'warning' }
  return 'error'
}

const clearFilters = () => {
  selectedOrganizations.value = []
  selectedTeams.value = []
  selectedRoles.value = []
  // Reset providers to select all
  selectedProviders.value = connectedAccounts.value.map(account => account.id)
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
  if (!selectedPerson.value) { return }

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

const { getReferences } = useDeleteWithReferences()
const deleteConfirmDialog = ref(false)
const deleteReferences = ref<ReturnType<typeof getReferences>>([])

const deletePerson = () => {
  if (!selectedPerson.value) { return }
  deleteReferences.value = getReferences('person', selectedPerson.value.id)
  deleteConfirmDialog.value = true
}

const confirmDeletePerson = async () => {
  if (!selectedPerson.value) { return }

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

<style>
.account-indicator {
  position: absolute;
  left: 0;
  height: 100%;
  width: 4px;
  border-radius: 2px 0 0 2px;
}
</style>
