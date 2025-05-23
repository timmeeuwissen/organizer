<template>
  <v-card
    class="mb-4"
    :class="{ 'border-left': true, [`border-${coaching.color}`]: true }"
    outlined
    hover
    @click="viewDetails"
  >
    <v-card-title class="py-2">
      <div class="d-flex align-center">
        <v-icon :color="coaching.color" class="mr-2">
          {{ coaching.icon || 'mdi-account-heart' }}
        </v-icon>
        <div class="text-subtitle-1 font-weight-bold text-truncate">
          {{ coaching.title }}
        </div>
      </div>
      <v-spacer></v-spacer>
      <v-menu bottom left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            small
            @click.stop="$event.stopPropagation()"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon small>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="$emit('edit')">
            <v-list-item-title>
              <v-icon small class="mr-2">mdi-pencil</v-icon>
              Edit
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('delete')">
            <v-list-item-title class="error--text">
              <v-icon small class="mr-2" color="error">mdi-delete</v-icon>
              Delete
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>

    <v-card-text class="py-2">
      <!-- Person info -->
      <div v-if="person" class="d-flex align-center mb-2">
        <v-avatar size="24" color="primary" class="mr-2">
          <v-icon v-if="!person.avatar" x-small dark>mdi-account</v-icon>
          <v-img v-else :src="person.avatar"></v-img>
        </v-avatar>
        <span class="text-caption">{{ personName }}</span>
      </div>

      <!-- Stats -->
      <div class="d-flex mb-2">
        <v-chip
          x-small
          outlined
          class="mr-1"
          color="success"
        >
          <v-icon x-small left>mdi-flash</v-icon>
          {{ coaching.strengths.length }}
        </v-chip>
        
        <v-chip
          x-small
          outlined
          class="mr-1"
          color="error"
        >
          <v-icon x-small left>mdi-alert</v-icon>
          {{ coaching.weaknesses.length }}
        </v-chip>
        
        <v-chip
          x-small
          outlined
          class="mr-1"
          color="primary"
        >
          <v-icon x-small left>mdi-flag</v-icon>
          {{ coaching.goals.length }}
        </v-chip>
        
        <v-chip
          x-small
          outlined
          class="mr-1"
          color="grey"
        >
          <v-icon x-small left>mdi-timeline</v-icon>
          {{ coaching.timeline.length }}
        </v-chip>
        
        <v-chip
          v-if="coaching.relatedTasks && coaching.relatedTasks.length"
          x-small
          outlined
          class="mr-1"
          color="info"
        >
          <v-icon x-small left>mdi-clipboard-check</v-icon>
          {{ coaching.relatedTasks.length }}
        </v-chip>
      </div>

      <!-- Goal progress -->
      <div v-if="goalProgress.total > 0" class="text-caption d-flex justify-space-between">
        <span>Goals: {{ goalProgress.completed }}/{{ goalProgress.total }}</span>
        <span>{{ goalProgress.percentage }}%</span>
      </div>
      <v-progress-linear
        v-if="goalProgress.total > 0"
        :value="goalProgress.percentage"
        height="4"
        :color="coaching.color"
      ></v-progress-linear>

      <!-- Updated date -->
      <div class="text-caption text-right grey--text mt-1">
        Updated: {{ formatDate(coaching.updatedAt) }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { usePeopleStore } from '~/stores/people'

export default {
  name: 'CoachingCard',
  
  props: {
    coaching: {
      type: Object,
      required: true
    }
  },
  
  computed: {
    peopleStore() {
      return usePeopleStore()
    },
    
    person() {
      return this.peopleStore.getById(this.coaching.personId)
    },
    
    personName() {
      if (!this.person) return 'Unknown Person'
      return `${this.person.firstName} ${this.person.lastName}`
    },
    
    goalProgress() {
      const goals = this.coaching.goals || []
      const total = goals.length
      const completed = goals.filter(goal => goal.status === 'completed').length
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      
      return {
        total,
        completed,
        percentage
      }
    }
  },
  
  methods: {
    formatDate(date) {
      if (!date) return ''
      try {
        return new Date(date).toLocaleDateString()
      } catch (e) {
        return ''
      }
    },
    
    viewDetails() {
      // Emit navigate event instead of directly using router
      this.$emit('navigate', this.coaching)
    }
  }
}
</script>

<style scoped>
.border-left {
  border-left-width: 4px;
  border-left-style: solid;
}

.border-primary {
  border-left-color: var(--v-primary-base);
}

.border-secondary {
  border-left-color: var(--v-secondary-base);
}

.border-success {
  border-left-color: var(--v-success-base);
}

.border-error {
  border-left-color: var(--v-error-base);
}

.border-info {
  border-left-color: var(--v-info-base);
}

.border-warning {
  border-left-color: var(--v-warning-base);
}

.border-grey {
  border-left-color: var(--v-grey-base);
}
</style>
