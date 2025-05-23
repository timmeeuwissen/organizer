<template>
  <v-card>
    <v-card-title class="text-h5">
      {{ isEdit ? 'Edit Coaching Record' : 'New Coaching Record' }}
    </v-card-title>

    <v-card-text>
      <v-form ref="form" v-model="valid" lazy-validation>
        <v-row>
          <!-- Person selection -->
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="formData.personId"
              :items="peopleOptions"
              item-text="text"
              item-value="value"
              :rules="rules.required"
              label="Person"
              outlined
              dense
              :disabled="!!personId"
              required
            ></v-autocomplete>
          </v-col>

          <!-- Title -->
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.title"
              :rules="rules.required"
              label="Title"
              outlined
              dense
              required
            ></v-text-field>
          </v-col>

          <!-- Icon & Color -->
          <v-col cols="12" md="6">
            <div class="icon-field">
              <label>Icon</label>
              <icon-selector
                v-model="formData.icon"
                :color="formData.color"
              />
            </div>
          </v-col>

          <!-- Color -->
          <v-col cols="12" md="6">
            <v-select
              v-model="formData.color"
              :items="colorOptions"
              item-title="text"
              item-value="value"
              label="Color"
              prepend-icon="mdi-palette"
              outlined
              dense
            >
              <template v-slot:selection="{ item }">
                <div>
                  <v-avatar :color="item.value" size="24" class="mr-2"></v-avatar>
                  <span>{{ item.text }}</span>
                </div>
              </template>
              <template v-slot:item="{ item, props }">
                <v-list-item
                  v-bind="props"
                  :prepend-avatar="undefined"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="item.raw.value" size="24"></v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- Notes -->
          <v-col cols="12">
            <v-textarea
              v-model="formData.notes"
              label="Notes"
              outlined
              auto-grow
              rows="3"
            ></v-textarea>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn 
        text
        @click="$emit('close')"
      >
        Cancel
      </v-btn>
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!valid"
        @click="save"
      >
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { useCoachingStore } from '~/stores/coaching'
import { usePeopleStore } from '~/stores/people'
import IconSelector from '~/components/common/IconSelector.vue'

export default {
  components: {
    IconSelector
  },
  name: 'CoachingForm',
  
  props: {
    coaching: {
      type: Object,
      default: null
    },
    personId: {
      type: String,
      default: ''
    }
  },
  
  data() {
    return {
      valid: true,
      loading: false,
      formData: {
        personId: this.personId || '',
        title: '',
        notes: '',
        icon: 'mdi-account-heart',
        color: 'primary',
      },
      rules: {
        required: [v => !!v || 'This field is required'],
      }
    }
  },
  
  computed: {
    isEdit() {
      return !!this.coaching
    },
    
    coachingStore() {
      return useCoachingStore()
    },
    
    peopleStore() {
      return usePeopleStore()
    },
    
    peopleOptions() {
      return this.peopleStore.people.map(person => ({
        text: `${person.firstName} ${person.lastName}`,
        value: person.id
      }))
    },
    
    iconOptions() {
      return [
        { text: 'Account Heart', value: 'mdi-account-heart' },
        { text: 'Star', value: 'mdi-star' },
        { text: 'Lightbulb', value: 'mdi-lightbulb' },
        { text: 'Brain', value: 'mdi-brain' },
        { text: 'School', value: 'mdi-school' },
        { text: 'Graph', value: 'mdi-finance' },
        { text: 'Briefcase', value: 'mdi-briefcase' },
        { text: 'Clipboard List', value: 'mdi-clipboard-list' },
        { text: 'Target', value: 'mdi-target' },
        { text: 'Heart', value: 'mdi-heart' },
        { text: 'Flash', value: 'mdi-flash' },
        { text: 'Bookmark', value: 'mdi-bookmark' },
      ]
    },
    
    colorOptions() {
      return [
        { text: 'Primary', value: 'primary' },
        { text: 'Secondary', value: 'secondary' },
        { text: 'Success', value: 'success' },
        { text: 'Info', value: 'info' },
        { text: 'Warning', value: 'warning' },
        { text: 'Error', value: 'error' },
      ]
    }
  },
  
  created() {
    // Initialize the form data from the coaching prop
    if (this.coaching) {
      this.formData = {
        personId: this.coaching.personId,
        title: this.coaching.title,
        notes: this.coaching.notes || '',
        icon: this.coaching.icon,
        color: this.coaching.color
      }
    }
    
    // Load people store if needed
    if (this.peopleStore.people.length === 0) {
      this.peopleStore.fetchPeople()
    }
    
    // Set personId from prop if specified
    if (this.personId && !this.formData.personId) {
      this.formData.personId = this.personId
    }
  },
  
  methods: {
    async save() {
      if (!this.$refs.form.validate()) return
      
      this.loading = true
      
      try {
        let savedRecord
        
        if (this.isEdit) {
          // Update existing record
          savedRecord = await this.coachingStore.updateRecord(this.coaching.id, this.formData)
        } else {
          // Create new record
          savedRecord = await this.coachingStore.createRecord(this.formData)
        }
        
        this.$emit('saved', savedRecord.id)
      } catch (error) {
        console.error('Error saving coaching record:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
