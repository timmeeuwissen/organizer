<template>
  <div>
    <v-row class="px-4 py-2">
      <v-col cols="12">
        <div class="d-flex align-center">
          <h1 class="text-h4">Coaching</h1>
          <v-spacer></v-spacer>
          
          <v-btn
            color="primary"
            @click="openCoachingDialog()"
          >
            <v-icon left>mdi-plus</v-icon>
            New Coaching
          </v-btn>
        </div>
      </v-col>
    </v-row>
    
    <v-row class="px-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex">
            <span>Coaching Records</span>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="searchQuery"
              append-icon="mdi-magnify"
              label="Search"
              hide-details
              dense
              outlined
              class="mr-4"
              style="max-width: 300px;"
            ></v-text-field>
          </v-card-title>
          
          <!-- Loading state -->
          <v-skeleton-loader
            v-if="coachingStore.loading && !coachingStore.records.length"
            type="card, card, card"
            class="mt-4 px-4"
          ></v-skeleton-loader>
          
          <!-- Error state -->
          <v-alert
            v-else-if="coachingStore.error"
            type="error"
            class="mt-4 mx-4"
          >
            {{ coachingStore.error }}
          </v-alert>
          
          <!-- Empty state -->
          <v-card-text
            v-else-if="!filteredRecords.length"
            class="text-center py-8"
          >
            <v-icon size="64" color="grey lighten-1" class="mb-4">mdi-account-heart</v-icon>
            <h3 class="text-h5 mb-2">No coaching records found</h3>
            <p class="mb-4">Get started by creating your first coaching record.</p>
            <v-btn
              color="primary"
              @click="openCoachingDialog()"
            >
              <v-icon left>mdi-plus</v-icon>
              New Coaching
            </v-btn>
          </v-card-text>
          
          <!-- Records grid -->
          <v-card-text v-else class="px-2">
            <div class="coaching-grid">
              <coaching-card
                v-for="record in filteredRecords"
                :key="record.id"
                :coaching="record"
                class="coaching-card-item"
                @navigate="navigateToCoaching"
                @edit="openCoachingDialog(record)"
                @delete="confirmDeleteCoaching(record)"
              ></coaching-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Dialogs -->
    <v-dialog
      v-model="coachingDialogOpen"
      max-width="900px"
      scrollable
    >
      <coaching-form
        v-if="coachingDialogOpen"
        :coaching="currentCoaching"
        :person-id="selectedPersonId"
        @close="coachingDialogOpen = false"
        @saved="onCoachingSaved"
      ></coaching-form>
    </v-dialog>
    
    <v-dialog
      v-model="deleteDialogOpen"
      max-width="500px"
    >
      <v-card>
        <v-card-title>Delete Coaching Record</v-card-title>
        <v-card-text>
          Are you sure you want to delete this coaching record? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="deleteDialogOpen = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            text
            :loading="coachingStore.loading"
            @click="deleteCoaching"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useCoachingStore } from '~/stores/coaching'
import { usePeopleStore } from '~/stores/people'
import CoachingCard from '~/components/coaching/CoachingCard.vue'
import CoachingForm from '~/components/coaching/CoachingForm.vue'

export default {
  name: 'CoachingIndexPage',
  
  components: {
    CoachingCard,
    CoachingForm
  },
  
  data() {
    return {
      activeTab: 'all',
      coachingDialogOpen: false,
      deleteDialogOpen: false,
      currentCoaching: null,
      selectedPersonId: '',
      coachingToDelete: null,
      searchQuery: '',
    }
  },
  
  computed: {
    coachingStore() {
      return useCoachingStore()
    },
    
    peopleStore() {
      return usePeopleStore()
    },
    
    filteredRecords() {
      let records = this.coachingStore.getSortedByDate;
      
      // Apply search filter if query exists
      if (this.searchQuery.trim()) {
        const searchLower = this.searchQuery.toLowerCase().trim();
        records = records.filter(record => {
          // Search by title
          if (record.title.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          // Search by person name
          const person = this.peopleStore.getById(record.personId);
          if (person) {
            const personName = `${person.firstName} ${person.lastName}`.toLowerCase();
            if (personName.includes(searchLower)) {
              return true;
            }
          }
          
          // Search by notes
          if (record.notes && record.notes.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          return false;
        });
      }
      
      return records;
    },
    
    peopleWithCoaching() {
      return this.peopleStore.people.map(person => {
        const coachingRecords = this.coachingStore.getByPerson(person.id)
        return {
          ...person,
          coachingRecords
        }
      }).sort((a, b) => {
        // Sort by number of coaching records (descending)
        return b.coachingRecords.length - a.coachingRecords.length
      })
    }
  },
  
  async mounted() {
    await this.fetchData()
  },
  
  methods: {
    async fetchData() {
      try {
        // Load people if not already loaded
        if (this.peopleStore.people.length === 0) {
          await this.peopleStore.fetchPeople()
        }
        
        await this.coachingStore.fetchRecords()
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    },
    
    openCoachingDialog(coaching = null, personId = '') {
      this.currentCoaching = coaching
      this.selectedPersonId = personId
      this.coachingDialogOpen = true
    },
    
    async onCoachingSaved(id) {
      this.coachingDialogOpen = false
      
      // Navigate to the coaching detail page
      if (id) {
        this.$router.push(`/coaching/${id}`)
      }
    },
    
    confirmDeleteCoaching(coaching) {
      this.coachingToDelete = coaching
      this.deleteDialogOpen = true
    },
    
    navigateToCoaching(coaching) {
      // Navigate to the coaching detail page
      this.$router.push(`/coaching/${coaching.id}`)
    },
    
    async deleteCoaching() {
      if (!this.coachingToDelete) return
      
      try {
        await this.coachingStore.deleteRecord(this.coachingToDelete.id)
        this.deleteDialogOpen = false
        this.coachingToDelete = null
      } catch (error) {
        console.error('Error deleting coaching record:', error)
      }
    }
  }
}
</script>

<style scoped>
.coaching-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.coaching-card-item {
  margin-bottom: 0;
}
</style>
