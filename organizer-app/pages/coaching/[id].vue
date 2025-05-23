<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="d-flex justify-center align-center" style="height: 300px;">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
    </div>
    
    <!-- Error state -->
    <v-alert
      v-else-if="error"
      type="error"
      class="mx-4 mt-4"
    >
      {{ error }}
      <div class="mt-4">
        <v-btn color="primary" to="/coaching" text>
          <v-icon left>mdi-arrow-left</v-icon>
          Go Back to Coaching
        </v-btn>
      </div>
    </v-alert>
    
    <!-- Coaching content -->
    <div v-else-if="coaching">
      <!-- Header -->
      <v-card class="mb-4 mx-4" :class="`border-${coaching.color}`">
        <v-card-title class="d-flex align-center">
          <v-icon :color="coaching.color" size="32" class="mr-3">
            {{ coaching.icon || 'mdi-account-heart' }}
          </v-icon>
          <h1 class="text-h4">{{ coaching.title }}</h1>
          <v-spacer></v-spacer>
          
          <v-menu bottom left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="openCoachingDialog">
                <v-list-item-title>
                  <v-icon small class="mr-2">mdi-pencil</v-icon>
                  Edit
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="confirmDeleteCoaching">
                <v-list-item-title class="error--text">
                  <v-icon small class="mr-2" color="error">mdi-delete</v-icon>
                  Delete
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-card-title>
        
        <v-card-text>
          <!-- Person info -->
          <div v-if="person" class="d-flex align-center mb-4">
            <v-avatar size="48" color="primary" class="mr-4">
              <v-icon v-if="!person.avatar" dark>mdi-account</v-icon>
              <v-img v-else :src="person.avatar"></v-img>
            </v-avatar>
            <div>
              <h2 class="text-h6">{{ personName }}</h2>
              <div class="text-subtitle-1 grey--text">{{ person.email || 'No email provided' }}</div>
            </div>
            <v-spacer></v-spacer>
            <v-btn text color="primary" :to="`/people#${person.id}`">
              <v-icon left>mdi-account</v-icon>
              View Profile
            </v-btn>
          </div>
          
          <div v-if="coaching.notes" class="mb-4">
            <div class="text-subtitle-1 font-weight-bold mb-1">Notes</div>
            <div class="text-body-1">{{ coaching.notes }}</div>
          </div>
        </v-card-text>
        
        <v-divider></v-divider>
        
        <v-card-actions>
          <v-btn text to="/coaching">
            <v-icon left>mdi-arrow-left</v-icon>
            Back to Coaching
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn 
            text 
            color="primary" 
            @click="openCoachingDialog"
          >
            <v-icon left>mdi-pencil</v-icon>
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
      
      <!-- Main content -->
      <v-row>
        <!-- Left side - Strengths, Weaknesses, Goals -->
        <v-col cols="12" md="6">
          <!-- Strengths section -->
          <v-card class="mb-4 mx-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="success" class="mr-2">mdi-arm-flex</v-icon>
              <h2 class="text-h6">Strengths</h2>
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                color="success" 
                small
                @click="openStrengthDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-list v-if="coaching.strengths.length > 0">
              <v-list-item
                v-for="strength in coaching.strengths"
                :key="strength.id"
                @click="openStrengthHistoryDialog(strength)"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ strength.description }}</v-list-item-title>
                  <v-list-item-subtitle class="d-flex align-center">
                    <v-rating
                      v-model="strength.intensity"
                      color="amber"
                      background-color="amber lighten-3"
                      half-increments
                      readonly
                      dense
                      size="18"
                      class="mr-2"
                    ></v-rating>
                    <span>{{ Number.isNaN(strength.intensity) ? '0' : strength.intensity }}/5</span>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action class="d-flex">
                  <v-btn 
                    icon 
                    small
                    @click.stop="openStrengthDialog(strength)"
                  >
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn 
                    icon 
                    small
                    @click.stop="deleteStrength(strength.id)"
                  >
                    <v-icon small color="error">mdi-delete</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-card-text v-else class="pa-4 text-center grey--text">
              <v-icon large color="grey lighten-1" class="mb-2">mdi-emoticon-sad-outline</v-icon>
              <div>No strengths added yet</div>
              <v-btn 
                text 
                color="primary" 
                class="mt-2"
                @click="openStrengthDialog"
              >
                Add Strength
              </v-btn>
            </v-card-text>
          </v-card>
          
          <!-- Weaknesses section -->
          <v-card class="mb-4 mx-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="error" class="mr-2">mdi-alert</v-icon>
              <h2 class="text-h6">Weaknesses</h2>
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                color="error" 
                small
                @click="openWeaknessDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-list v-if="coaching.weaknesses.length > 0">
              <v-list-item
                v-for="weakness in coaching.weaknesses"
                :key="weakness.id"
                @click="openWeaknessHistoryDialog(weakness)"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ weakness.description }}</v-list-item-title>
                  <v-list-item-subtitle class="d-flex align-center">
                    <v-rating
                      v-model="weakness.intensity"
                      color="amber"
                      background-color="amber lighten-3"
                      half-increments
                      readonly
                      dense
                      size="18"
                      class="mr-2"
                    ></v-rating>
                    <span>{{ Number.isNaN(weakness.intensity) ? '0' : weakness.intensity }}/5</span>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action class="d-flex">
                  <v-btn 
                    icon 
                    small
                    @click.stop="openWeaknessDialog(weakness)"
                  >
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn 
                    icon 
                    small
                    @click.stop="deleteWeakness(weakness.id)"
                  >
                    <v-icon small color="error">mdi-delete</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-card-text v-else class="pa-4 text-center grey--text">
              <v-icon large color="grey lighten-1" class="mb-2">mdi-emoticon-happy-outline</v-icon>
              <div>No weaknesses added yet</div>
              <v-btn 
                text 
                color="primary" 
                class="mt-2"
                @click="openWeaknessDialog"
              >
                Add Weakness
              </v-btn>
            </v-card-text>
          </v-card>
          
          <!-- Goals section -->
          <v-card class="mb-4 mx-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-flag</v-icon>
              <h2 class="text-h6">Goals</h2>
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                color="primary" 
                small
                @click="openGoalDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-list v-if="coaching.goals.length > 0">
              <v-list-item
                v-for="goal in sortedGoals"
                :key="goal.id"
                @click="openGoalHistoryDialog(goal)"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ goal.title }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      x-small
                      :color="getGoalStatusColor(goal.status)"
                      class="mr-2"
                    >
                      {{ goal.status }}
                    </v-chip>
                    
                    <span v-if="goal.targetDate" class="text-caption">
                      Target: {{ formatDate(goal.targetDate) }}
                    </span>
                  </v-list-item-subtitle>
                  <div class="mt-1 d-flex align-center">
                    <v-progress-linear
                      :value="goal.progression * 20"
                      height="8"
                      class="flex-grow-1 mr-2"
                      :color="getGoalStatusColor(goal.status)"
                    ></v-progress-linear>
                    <span class="text-caption">{{ goal.progression }}/5</span>
                  </div>
                </v-list-item-content>
                <v-list-item-action class="d-flex">
                  <v-btn 
                    icon 
                    small
                    @click.stop="openGoalDialog(goal)"
                  >
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn 
                    icon 
                    small
                    @click.stop="deleteGoal(goal.id)"
                  >
                    <v-icon small color="error">mdi-delete</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-card-text v-else class="pa-4 text-center grey--text">
              <v-icon large color="grey lighten-1" class="mb-2">mdi-flag-outline</v-icon>
              <div>No goals added yet</div>
              <v-btn 
                text 
                color="primary" 
                class="mt-2"
                @click="openGoalDialog"
              >
                Add Goal
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
        
        <!-- Right side - Timeline -->
        <v-col cols="12" md="6">
          <!-- Timeline section -->
          <v-card class="mb-4 mx-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="grey darken-1" class="mr-2">mdi-timeline</v-icon>
              <h2 class="text-h6">Timeline</h2>
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                color="primary" 
                small
                @click="openTimelineEntryDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-card-text v-if="coaching.timeline.length > 0" class="pa-0">
              <v-timeline dense>
                <v-timeline-item
                  v-for="entry in sortedTimelineEntries"
                  :key="entry.id"
                  :color="entry.relatedGoals.length ? 'primary' : 'grey'"
                  small
                >
                  <div class="d-flex justify-space-between mb-1">
                    <strong>{{ formatDate(entry.date) }}</strong>
                    <div>
                      <v-btn 
                        icon 
                        x-small
                        @click="openTimelineEntryDialog(entry)"
                      >
                        <v-icon x-small>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn 
                        icon 
                        x-small
                        @click="deleteTimelineEntry(entry.id)"
                      >
                        <v-icon x-small color="error">mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                  
                  <div>{{ entry.notes }}</div>
                  
                  <!-- Related items -->
                  <div v-if="entry.relatedGoals.length || entry.relatedStrengthsWeaknesses.length" class="mt-2">
                    <v-chip
                      v-for="goalId in entry.relatedGoals"
                      :key="`goal-${goalId}`"
                      x-small
                      class="mr-1 mb-1"
                      color="primary"
                      outlined
                    >
                      {{ getGoalTitle(goalId) }}
                    </v-chip>
                    
                    <v-chip
                      v-for="swId in entry.relatedStrengthsWeaknesses"
                      :key="`sw-${swId}`"
                      x-small
                      class="mr-1 mb-1"
                      :color="getStrengthWeaknessType(swId) === 'strength' ? 'success' : 'error'"
                      outlined
                    >
                      {{ getStrengthWeaknessDesc(swId) }}
                    </v-chip>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
            
            <v-card-text v-else class="pa-4 text-center grey--text">
              <v-icon large color="grey lighten-1" class="mb-2">mdi-timeline-outline</v-icon>
              <div>No timeline entries added yet</div>
              <v-btn 
                text 
                color="primary" 
                class="mt-2"
                @click="openTimelineEntryDialog"
              >
                Add Timeline Entry
              </v-btn>
            </v-card-text>
          </v-card>
          
          <!-- Related Tasks -->
          <v-card class="mb-4 mx-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="info" class="mr-2">mdi-clipboard-check</v-icon>
              <h2 class="text-h6">Related Tasks</h2>
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                color="primary" 
                small
                @click="openAddTaskDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-list v-if="relatedTasks.length > 0">
              <v-list-item
                v-for="task in relatedTasks"
                :key="task.id"
                :to="`/tasks?task=${task.id}`"
              >
                <v-list-item-content>
                  <v-list-item-title>
                    <v-icon small :color="task.completed ? 'success' : 'grey'">
                      {{ task.completed ? 'mdi-checkbox-marked-outline' : 'mdi-checkbox-blank-outline' }}
                    </v-icon>
                    <span :class="{ 'text-decoration-line-through': task.completed }">{{ task.title }}</span>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span v-if="task.dueDate" class="mr-2">Due: {{ formatDate(task.dueDate) }}</span>
                    <v-chip x-small :color="getPriorityColor(task.priority)" class="mr-1">{{ task.priority }}</v-chip>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn 
                    icon 
                    x-small
                    @click.stop="removeRelatedTask(task.id)"
                  >
                    <v-icon x-small>mdi-close</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-card-text v-else class="pa-4 text-center grey--text">
              <v-icon large color="grey lighten-1" class="mb-2">mdi-clipboard-check-outline</v-icon>
              <div>No related tasks added yet</div>
              <v-btn 
                text 
                color="primary" 
                class="mt-2"
                @click="openAddTaskDialog"
              >
                Add Related Task
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
    
    <!-- Dialogs -->
    <v-dialog v-model="coachingDialogOpen" max-width="900px" scrollable>
      <coaching-form
        v-if="coachingDialogOpen"
        :coaching="coaching"
        @close="coachingDialogOpen = false"
        @saved="onCoachingSaved"
      ></coaching-form>
    </v-dialog>
    
    <v-dialog v-model="deleteDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Delete Coaching Record</v-card-title>
        <v-card-text>
          Are you sure you want to delete this coaching record? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" text :loading="loading" @click="deleteCoaching">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Strength Dialog -->
    <v-dialog v-model="strengthDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>{{ isEditingStrength ? 'Edit Strength' : 'Add Strength' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="currentStrength.description"
                label="Description"
                outlined
                dense
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="currentStrength.notes"
                label="Notes"
                outlined
                auto-grow
                rows="2"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <label>Intensity</label>
              <v-rating
                v-model="currentStrength.intensity"
                color="amber"
                half-increments
                hover
              ></v-rating>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="strengthDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="saveStrength">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Weakness Dialog -->
    <v-dialog v-model="weaknessDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>{{ isEditingWeakness ? 'Edit Weakness' : 'Add Weakness' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="currentWeakness.description"
                label="Description"
                outlined
                dense
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="currentWeakness.notes"
                label="Notes"
                outlined
                auto-grow
                rows="2"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <label>Intensity</label>
              <v-rating
                v-model="currentWeakness.intensity"
                color="amber"
                half-increments
                hover
              ></v-rating>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="weaknessDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="saveWeakness">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Goal Dialog -->
    <v-dialog v-model="goalDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>{{ isEditingGoal ? 'Edit Goal' : 'Add Goal' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="currentGoal.title"
                label="Title"
                outlined
                dense
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="currentGoal.description"
                label="Description"
                outlined
                auto-grow
                rows="2"
              ></v-textarea>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="currentGoal.status"
                :items="goalStatusOptions"
                item-text="text"
                item-value="value"
                label="Status"
                outlined
                dense
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-menu
                ref="targetDateMenu"
                v-model="targetDateMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="formattedTargetDate"
                    label="Target Date"
                    readonly
                    outlined
                    dense
                    clearable
                    v-bind="attrs"
                    v-on="on"
                    @click:clear="currentGoal.targetDate = null"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="currentGoal.targetDate"
                  @input="targetDateMenu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>
            <v-col cols="12">
              <label>Progression</label>
              <v-rating
                v-model="currentGoal.progression"
                color="amber"
                hover
              ></v-rating>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="currentGoal.historyLogNote"
                label="Progress Note (optional)"
                outlined
                auto-grow
                rows="2"
                hint="This will be added to the goal's history log"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="goalDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="saveGoal">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Timeline Entry Dialog -->
    <v-dialog v-model="timelineEntryDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>{{ isEditingTimelineEntry ? 'Edit Timeline Entry' : 'Add Timeline Entry' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-menu
                ref="dateMenu"
                v-model="dateMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="formattedEntryDate"
                    label="Date"
                    readonly
                    outlined
                    dense
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="currentTimelineEntry.date"
                  @input="dateMenu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="currentTimelineEntry.notes"
                label="Notes"
                outlined
                auto-grow
                rows="3"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <v-autocomplete
                v-model="currentTimelineEntry.relatedGoals"
                :items="goalOptions"
                label="Related Goals"
                multiple
                chips
                outlined
                dense
              ></v-autocomplete>
            </v-col>
            <v-col cols="12">
              <v-autocomplete
                v-model="currentTimelineEntry.relatedStrengthsWeaknesses"
                :items="strengthWeaknessOptions"
                label="Related Strengths & Weaknesses"
                multiple
                chips
                outlined
                dense
              ></v-autocomplete>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="timelineEntryDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="saveTimelineEntry">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- History Dialogs -->
    <v-dialog v-model="historyEntryDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>
          {{ historyEntryIndex === null ? 'Add' : 'Edit' }} History Entry
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-menu
                v-model="historyDateMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="currentHistoryEntry.date"
                    label="Date"
                    readonly
                    outlined
                    dense
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="currentHistoryEntry.date"
                  @input="historyDateMenu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>
            
            <template v-if="historyType === 'strength' || historyType === 'weakness'">
              <v-col cols="12">
                <label>Intensity</label>
                <v-rating
                  v-model="currentHistoryEntry.intensity"
                  color="amber"
                  half-increments
                  hover
                ></v-rating>
              </v-col>
            </template>
            
            <template v-if="historyType === 'goal'">
              <v-col cols="12" md="6">
                <v-select
                  v-model="currentHistoryEntry.status"
                  :items="goalStatusOptions"
                  item-text="text"
                  item-value="value"
                  label="Status"
                  outlined
                  dense
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <label>Progression</label>
                <v-rating
                  v-model="currentHistoryEntry.progression"
                  color="amber"
                  hover
                ></v-rating>
              </v-col>
            </template>
            
            <v-col cols="12">
              <v-textarea
                v-model="currentHistoryEntry.notes"
                label="Notes"
                outlined
                auto-grow
                rows="3"
                hint="Explain rationale for the change"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="historyEntryDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="saveHistoryEntry">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-dialog v-model="deleteHistoryEntryDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Delete History Entry</v-card-title>
        <v-card-text>
          Are you sure you want to delete this history entry? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteHistoryEntryDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" text @click="deleteHistoryEntry">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-dialog v-model="historyDialogOpen" max-width="600px">
      <v-card>
        <v-card-title>
          <span v-if="historyType === 'strength'">Strength History: {{ currentItemForHistory?.description }}</span>
          <span v-else-if="historyType === 'weakness'">Weakness History: {{ currentItemForHistory?.description }}</span>
          <span v-else-if="historyType === 'goal'">Goal History: {{ currentItemForHistory?.title }}</span>
          <v-spacer></v-spacer>
          <v-btn 
            color="primary" 
            small 
            @click="openAddHistoryEntryDialog"
          >
            <v-icon left small>mdi-plus</v-icon>
            Add Entry
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-timeline dense>
            <v-timeline-item
              v-for="(entry, index) in sortedHistoryLogs"
              :key="index"
              small
              :color="historyType === 'goal' ? getGoalStatusColor(entry.status) : (historyType === 'strength' ? 'success' : 'error')"
            >
              <div class="d-flex justify-space-between">
                <strong>{{ formatDate(entry.date) }}</strong>
                <div>
                  <v-btn 
                    icon 
                    x-small 
                    @click="openEditHistoryEntryDialog(entry, index)"
                  >
                    <v-icon x-small>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn 
                    icon 
                    x-small 
                    @click="confirmDeleteHistoryEntry(index)"
                  >
                    <v-icon x-small color="error">mdi-delete</v-icon>
                  </v-btn>
                </div>
              </div>
              
              <div v-if="historyType === 'strength' || historyType === 'weakness'" class="d-flex align-center my-1">
                <span class="mr-2">Intensity:</span>
                <v-rating
                  :value="entry.intensity"
                  color="amber"
                  readonly
                  dense
                  size="14"
                  half-increments
                ></v-rating>
                <span class="ml-1">{{ Number.isNaN(entry.intensity) ? '0' : entry.intensity }}/5</span>
              </div>
              
              <div v-if="historyType === 'goal'" class="d-flex align-center my-1">
                <v-chip x-small :color="getGoalStatusColor(entry.status)" class="mr-2">
                  {{ entry.status }}
                </v-chip>
                <span class="mr-2">Progression:</span>
                <v-rating
                  :value="entry.progression"
                  color="amber"
                  readonly
                  dense
                  size="14"
                ></v-rating>
                <span class="ml-1">{{ entry.progression }}/5</span>
              </div>
              
              <div v-if="entry.notes" class="text-caption mt-1">
                {{ entry.notes }}
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="historyDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Add Task Dialog -->
    <v-dialog v-model="addTaskDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Add Related Task</v-card-title>
        <v-card-text>
          <v-autocomplete
            v-model="selectedTaskIds"
            :items="availableTasks"
            item-text="title"
            item-value="id"
            label="Select Tasks"
            multiple
            chips
            outlined
          ></v-autocomplete>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="addTaskDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" text @click="addRelatedTasks">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid'
import { useCoachingStore } from '~/stores/coaching'
import { usePeopleStore } from '~/stores/people'
import { useTasksStore } from '~/stores/tasks'
import { useCalendarHelpers } from '~/composables/useCalendarHelpers'
import CoachingForm from '~/components/coaching/CoachingForm.vue'

export default {
  name: 'CoachingDetailPage',
  
  components: {
    CoachingForm
  },
  
  data() {
    return {
      loading: true,
      error: null,
      coaching: null,
      
      // Dialogs
      coachingDialogOpen: false,
      deleteDialogOpen: false,
      strengthDialogOpen: false,
      weaknessDialogOpen: false,
      goalDialogOpen: false,
      timelineEntryDialogOpen: false,
      historyDialogOpen: false,
      addTaskDialogOpen: false,
      
      // Current items for editing
      currentStrength: this.createEmptyStrength(),
      currentWeakness: this.createEmptyWeakness(),
      currentGoal: this.createEmptyGoal(),
      currentTimelineEntry: this.createEmptyTimelineEntry(),
      
      // History view
      historyType: '',  // 'strength', 'weakness', or 'goal'
      currentItemForHistory: null,
      currentHistoryEntry: null,
      historyEntryIndex: null,
      historyEntryDialogOpen: false,
      deleteHistoryEntryDialogOpen: false,
      
      // Date pickers
      targetDateMenu: false,
      dateMenu: false,
      historyDateMenu: false,
      
      // Tasks
      selectedTaskIds: []
    }
  },
  
  computed: {
    coachingStore() {
      return useCoachingStore()
    },
    
    peopleStore() {
      return usePeopleStore()
    },
    
    tasksStore() {
      return useTasksStore()
    },
    
    person() {
      return this.coaching ? this.peopleStore.getById(this.coaching.personId) : null
    },
    
    personName() {
      if (!this.person) return 'Unknown Person'
      return `${this.person.firstName} ${this.person.lastName}`
    },
    
    sortedGoals() {
      if (!this.coaching?.goals) return []
      
      return [...this.coaching.goals].sort((a, b) => {
        // Sort by status priority (in progress, not started, completed, cancelled)
        const statusOrder = {
          'inProgress': 0,
          'notStarted': 1,
          'completed': 2,
          'cancelled': 3
        }
        
        const statusDiff = statusOrder[a.status] - statusOrder[b.status]
        if (statusDiff !== 0) return statusDiff
        
        // If same status, sort by progression (descending)
        const progressDiff = b.progression - a.progression
        if (progressDiff !== 0) return progressDiff
        
        // If same progression, sort by target date (closest first)
        if (a.targetDate && b.targetDate) {
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        } else if (a.targetDate) {
          return -1
        } else if (b.targetDate) {
          return 1
        }
        
        // Default sort by title
        return a.title.localeCompare(b.title)
      })
    },
    
    sortedTimelineEntries() {
      if (!this.coaching?.timeline) return []
      
      return [...this.coaching.timeline].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    },
    
    sortedHistoryLogs() {
      if (!this.currentItemForHistory?.historyLog) return []
      
      return [...this.currentItemForHistory.historyLog].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    },
    
    formattedTargetDate() {
      if (!this.currentGoal.targetDate) return ''
      const date = new Date(this.currentGoal.targetDate)
      return date.toISOString().substring(0, 10) // Format as YYYY-MM-DD
    },
    
    formattedEntryDate() {
      if (!this.currentTimelineEntry.date) return ''
      const date = new Date(this.currentTimelineEntry.date)
      return date.toISOString().substring(0, 10) // Format as YYYY-MM-DD
    },
    
    goalOptions() {
      if (!this.coaching?.goals) return []
      
      return this.coaching.goals.map(goal => ({
        text: goal.title,
        value: goal.id
      }))
    },
    
    strengthWeaknessOptions() {
      if (!this.coaching) return []
      
      const strengths = this.coaching.strengths.map(strength => ({
        text: `Strength: ${strength.description}`,
        value: strength.id
      }))
      
      const weaknesses = this.coaching.weaknesses.map(weakness => ({
        text: `Weakness: ${weakness.description}`,
        value: weakness.id
      }))
      
      return [...strengths, ...weaknesses]
    },
    
    goalStatusOptions() {
      return [
        { text: 'Not Started', value: 'notStarted' },
        { text: 'In Progress', value: 'inProgress' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' }
      ]
    },
    
    relatedTasks() {
      if (!this.coaching?.relatedTasks || !this.coaching.relatedTasks.length) return []
      
      return this.tasksStore.tasks.filter(task => 
        this.coaching.relatedTasks.includes(task.id)
      ).sort((a, b) => {
        // Sort by completed status
        if (!a.completed && b.completed) return -1
        if (a.completed && !b.completed) return 1
        
        // Then by due date (if exists)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        
        return 0
      })
    },
    
    availableTasks() {
      if (!this.coaching?.relatedTasks) return []
      
      // Filter out tasks that are already related
      return this.tasksStore.tasks
        .filter(task => !this.coaching.relatedTasks.includes(task.id))
        .map(task => ({
          text: task.title,
          value: task.id
        }))
    },
    
    isEditingStrength() {
      return !!this.currentStrength.id
    },
    
    isEditingWeakness() {
      return !!this.currentWeakness.id
    },
    
    isEditingGoal() {
      return !!this.currentGoal.id
    },
    
    isEditingTimelineEntry() {
      return !!this.currentTimelineEntry.id
    }
  },
  
  async mounted() {
    await this.fetchData()
  },
  
  methods: {
    async fetchData() {
      try {
        this.loading = true
        this.error = null
        
        // Load people if not already loaded
        if (this.peopleStore.people.length === 0) {
          await this.peopleStore.fetchPeople()
        }
        
        // Load tasks if not already loaded
        if (this.tasksStore.tasks.length === 0) {
          await this.tasksStore.fetchTasks()
        }
        
        // Load coaching record
        const id = this.$route.params.id
        const record = await this.coachingStore.fetchRecord(id)
        
        if (!record) {
          this.error = 'Coaching record not found'
          return
        }
        
        this.coaching = record
      } catch (error) {
        console.error('Error fetching data:', error)
        this.error = error.message || 'Failed to load coaching record'
      } finally {
        this.loading = false
      }
    },
    
    openCoachingDialog() {
      this.coachingDialogOpen = true
    },
    
    async onCoachingSaved(id) {
      this.coachingDialogOpen = false
      await this.fetchData()
    },
    
    confirmDeleteCoaching() {
      this.deleteDialogOpen = true
    },
    
    async deleteCoaching() {
      try {
        this.loading = true
        await this.coachingStore.deleteRecord(this.coaching.id)
        this.deleteDialogOpen = false
        this.$router.push('/coaching')
      } catch (error) {
        console.error('Error deleting coaching record:', error)
      } finally {
        this.loading = false
      }
    },
    
    // Strength methods
    createEmptyStrength() {
      return {
        id: '',
        type: 'strength',
        description: '',
        intensity: 3,
        notes: '',
        historyLog: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    
    openStrengthDialog(strength = null) {
      if (strength) {
        // Make sure historyLog is initialized
        this.currentStrength = { 
          ...strength,
          historyLog: strength.historyLog || []
        }
      } else {
        this.currentStrength = this.createEmptyStrength()
      }
      this.strengthDialogOpen = true
    },
    
    async saveStrength() {
      if (!this.currentStrength.description) return
      
      const now = new Date()
      
      try {
        // Create a clean serializable copy
        const strengthToSave = {
          id: this.currentStrength.id || uuidv4(),
          type: 'strength',
          description: this.currentStrength.description,
          intensity: Number(this.currentStrength.intensity),
          notes: this.currentStrength.notes,
          historyLog: [...(this.currentStrength.historyLog || [])],
          createdAt: this.currentStrength.createdAt || now,
          updatedAt: now
        }
        
        if (this.isEditingStrength) {
          // Update existing strength
          const index = this.coaching.strengths.findIndex(s => s.id === strengthToSave.id)
          
          // Add to history log if intensity has changed
          const originalStrength = this.coaching.strengths[index]
          if (originalStrength.intensity !== strengthToSave.intensity) {
            strengthToSave.historyLog.push({
              date: now,
              intensity: strengthToSave.intensity,
              notes: `Intensity changed from ${originalStrength.intensity} to ${strengthToSave.intensity}`
            })
          }
          
          if (index !== -1) {
            this.coaching.strengths.splice(index, 1, strengthToSave)
          }
        } else {
          // Add new strength
          strengthToSave.historyLog.push({
            date: now,
            intensity: strengthToSave.intensity,
            notes: 'Initial assessment'
          })
          this.coaching.strengths.push(strengthToSave)
        }
        
        // Create a clean copy of the coaching record with only the strengths array, ensuring no undefined values
        const update = {
          strengths: this.coaching.strengths.map(strength => ({
            id: strength.id || uuidv4(),
            type: strength.type || 'strength',
            description: strength.description || '',
            intensity: Number(strength.intensity || 3),
            notes: strength.notes || '',
            historyLog: (strength.historyLog || []).map(log => ({
              date: log.date || new Date(),
              intensity: Number(log.intensity || 0),
              notes: log.notes || ''
            })),
            createdAt: strength.createdAt || new Date(),
            updatedAt: strength.updatedAt || new Date()
          }))
        }
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, update)
        
        this.strengthDialogOpen = false
      } catch (error) {
        console.error('Error saving strength:', error)
      }
    },
    
    openStrengthHistoryDialog(strength) {
      this.historyType = 'strength'
      // Make sure historyLog is initialized
      this.currentItemForHistory = {
        ...strength,
        historyLog: strength.historyLog || []
      }
      this.historyDialogOpen = true
    },
    
    // Weakness methods
    createEmptyWeakness() {
      return {
        id: '',
        type: 'weakness',
        description: '',
        intensity: 3,
        notes: '',
        historyLog: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    
    openWeaknessDialog(weakness = null) {
      if (weakness) {
        // Make sure historyLog is initialized
        this.currentWeakness = { 
          ...weakness,
          historyLog: weakness.historyLog || []
        }
      } else {
        this.currentWeakness = this.createEmptyWeakness()
      }
      this.weaknessDialogOpen = true
    },
    
    async saveWeakness() {
      if (!this.currentWeakness.description) return
      
      const now = new Date()
      
      try {
        // Create a clean serializable copy
        const weaknessToSave = {
          id: this.currentWeakness.id || uuidv4(),
          type: 'weakness',
          description: this.currentWeakness.description,
          intensity: Number(this.currentWeakness.intensity),
          notes: this.currentWeakness.notes,
          historyLog: [...(this.currentWeakness.historyLog || [])],
          createdAt: this.currentWeakness.createdAt || now,
          updatedAt: now
        }
        
        if (this.isEditingWeakness) {
          // Update existing weakness
          const index = this.coaching.weaknesses.findIndex(w => w.id === weaknessToSave.id)
          
          // Add to history log if intensity has changed
          const originalWeakness = this.coaching.weaknesses[index]
          if (originalWeakness.intensity !== weaknessToSave.intensity) {
            weaknessToSave.historyLog.push({
              date: now,
              intensity: weaknessToSave.intensity,
              notes: `Intensity changed from ${originalWeakness.intensity} to ${weaknessToSave.intensity}`
            })
          }
          
          if (index !== -1) {
            this.coaching.weaknesses.splice(index, 1, weaknessToSave)
          }
        } else {
          // Add new weakness
          weaknessToSave.historyLog.push({
            date: now,
            intensity: weaknessToSave.intensity,
            notes: 'Initial assessment'
          })
          this.coaching.weaknesses.push(weaknessToSave)
        }
        
        // Create a clean copy of the coaching record with only the weaknesses array, ensuring no undefined values
        const update = {
          weaknesses: this.coaching.weaknesses.map(weakness => ({
            id: weakness.id || uuidv4(),
            type: weakness.type || 'weakness',
            description: weakness.description || '',
            intensity: Number(weakness.intensity || 3),
            notes: weakness.notes || '',
            historyLog: (weakness.historyLog || []).map(log => ({
              date: log.date || new Date(),
              intensity: Number(log.intensity || 0),
              notes: log.notes || ''
            })),
            createdAt: weakness.createdAt || new Date(),
            updatedAt: weakness.updatedAt || new Date()
          }))
        }
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, update)
        
        this.weaknessDialogOpen = false
      } catch (error) {
        console.error('Error saving weakness:', error)
      }
    },
    
    openWeaknessHistoryDialog(weakness) {
      this.historyType = 'weakness'
      this.currentItemForHistory = {
        ...weakness,
        historyLog: weakness.historyLog || []
      }
      this.historyDialogOpen = true
    },
    
    // Goal methods
    createEmptyGoal() {
      return {
        id: '',
        title: '',
        description: '',
        status: 'notStarted',
        progression: 0,
        targetDate: null,
        completedDate: null,
        historyLog: [],
        historyLogNote: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    
    openGoalDialog(goal = null) {
      if (goal) {
        this.currentGoal = { 
          ...goal,
          historyLogNote: '',
          historyLog: goal.historyLog || [],
          targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().substring(0, 10) : null,
          originalStatus: goal.status,
          originalProgression: goal.progression
        }
      } else {
        this.currentGoal = this.createEmptyGoal()
      }
      this.goalDialogOpen = true
    },
    
    async saveGoal() {
      if (!this.currentGoal.title) return
      
      const now = new Date()
      
      try {
        // Create a clean serializable copy
        const goalToSave = {
          id: this.currentGoal.id || uuidv4(),
          title: this.currentGoal.title,
          description: this.currentGoal.description,
          status: this.currentGoal.status,
          progression: Number(this.currentGoal.progression),
          targetDate: this.currentGoal.targetDate ? new Date(this.currentGoal.targetDate) : null,
          completedDate: this.currentGoal.completedDate,
          historyLog: [...(this.currentGoal.historyLog || [])],
          createdAt: this.currentGoal.createdAt || now,
          updatedAt: now
        }
        
        if (this.isEditingGoal) {
          // Update existing goal
          const index = this.coaching.goals.findIndex(g => g.id === goalToSave.id)
          
          // Add to history log if progression or status has changed
          const originalGoal = this.coaching.goals[index]
          let logNote = ''
          
          if (originalGoal.progression !== goalToSave.progression) {
            logNote += `Progression changed from ${originalGoal.progression} to ${goalToSave.progression}. `
          }
          
          if (originalGoal.status !== goalToSave.status) {
            logNote += `Status changed from ${originalGoal.status} to ${goalToSave.status}. `
          }
          
          if (logNote || this.currentGoal.historyLogNote) {
            goalToSave.historyLog.push({
              date: now,
              progression: goalToSave.progression,
              status: goalToSave.status,
              notes: this.currentGoal.historyLogNote || logNote.trim()
            })
          }
          
          // Update completed date if status changed to completed
          if (goalToSave.status === 'completed' && originalGoal.status !== 'completed') {
            goalToSave.completedDate = now
          } else if (goalToSave.status !== 'completed') {
            goalToSave.completedDate = null
          }
          
          if (index !== -1) {
            this.coaching.goals.splice(index, 1, goalToSave)
          }
        } else {
          // Add new goal
          if (goalToSave.progression > 0 || this.currentGoal.historyLogNote) {
            goalToSave.historyLog.push({
              date: now,
              progression: goalToSave.progression,
              status: goalToSave.status,
              notes: this.currentGoal.historyLogNote || 'Initial assessment'
            })
          }
          
          if (goalToSave.status === 'completed') {
            goalToSave.completedDate = now
          }
          
          this.coaching.goals.push(goalToSave)
        }
        
        // Create a clean copy of the coaching record with only the goals array, ensuring no undefined values
        const update = {
          goals: this.coaching.goals.map(goal => ({
            id: goal.id || uuidv4(),
            title: goal.title || '',
            description: goal.description || '',
            status: goal.status || 'notStarted',
            progression: Number(goal.progression || 0),
            targetDate: goal.targetDate || null,
            completedDate: goal.completedDate || null,
            historyLog: (goal.historyLog || []).map(log => ({
              date: log.date || new Date(),
              progression: Number(log.progression || 0),
              status: log.status || 'notStarted',
              notes: log.notes || ''
            })),
            createdAt: goal.createdAt || new Date(),
            updatedAt: goal.updatedAt || new Date()
          }))
        }
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, update)
        
        this.goalDialogOpen = false
      } catch (error) {
        console.error('Error saving goal:', error)
      }
    },
    
    openGoalHistoryDialog(goal) {
      this.historyType = 'goal'
      this.currentItemForHistory = {
        ...goal,
        historyLog: goal.historyLog || []
      }
      this.historyDialogOpen = true
    },
    
    // History entry methods
    openAddHistoryEntryDialog() {
      // Initialize a new history entry based on type
      if (this.historyType === 'strength' || this.historyType === 'weakness') {
        this.currentHistoryEntry = {
          date: new Date().toISOString().substr(0, 10),
          intensity: this.currentItemForHistory.intensity || 3,
          notes: ''
        }
      } else if (this.historyType === 'goal') {
        this.currentHistoryEntry = {
          date: new Date().toISOString().substr(0, 10),
          progression: this.currentItemForHistory.progression || 0,
          status: this.currentItemForHistory.status || 'notStarted',
          notes: ''
        }
      }
      
      this.historyEntryIndex = null // Indicates adding a new entry
      this.historyEntryDialogOpen = true
    },
    
    openEditHistoryEntryDialog(entry, index) {
      // Create a copy of the entry for editing
      this.currentHistoryEntry = { ...entry }
      
      // Format date string for v-date-picker
      if (typeof this.currentHistoryEntry.date === 'object') {
        this.currentHistoryEntry.date = new Date(this.currentHistoryEntry.date).toISOString().substring(0, 10)
      }
      
      this.historyEntryIndex = index
      this.historyEntryDialogOpen = true
    },
    
    confirmDeleteHistoryEntry(index) {
      this.historyEntryIndex = index
      this.deleteHistoryEntryDialogOpen = true
    },
    
    async saveHistoryEntry() {
      if (!this.currentHistoryEntry) return
      
      try {
        // Create a clean copy of the entry
        const entryToSave = {
          ...this.currentHistoryEntry,
          date: new Date(this.currentHistoryEntry.date)
        }
        
        // Add or update in the history log
        if (this.historyEntryIndex === null) {
          // Adding new entry
          this.currentItemForHistory.historyLog.push(entryToSave)
        } else {
          // Updating existing entry
          this.currentItemForHistory.historyLog[this.historyEntryIndex] = entryToSave
        }
        
        // Update in the appropriate array
        await this.updateItemWithHistory()
        
        this.historyEntryDialogOpen = false
      } catch (error) {
        console.error('Error saving history entry:', error)
      }
    },
    
    async deleteHistoryEntry() {
      if (this.historyEntryIndex === null) return
      
      try {
        // Remove the entry from history log
        this.currentItemForHistory.historyLog.splice(this.historyEntryIndex, 1)
        
        // Update in the appropriate array
        await this.updateItemWithHistory()
        
        this.deleteHistoryEntryDialogOpen = false
      } catch (error) {
        console.error('Error deleting history entry:', error)
      }
    },
    
    async updateItemWithHistory() {
      // Based on the history type, update the appropriate item and save to Firestore
      if (this.historyType === 'strength') {
        const index = this.coaching.strengths.findIndex(s => s.id === this.currentItemForHistory.id)
        if (index !== -1) {
          this.coaching.strengths[index].historyLog = this.currentItemForHistory.historyLog
          
          const update = {
            strengths: this.coaching.strengths.map(strength => ({
              id: strength.id || uuidv4(),
              type: strength.type || 'strength',
              description: strength.description || '',
              intensity: Number(strength.intensity || 3),
              notes: strength.notes || '',
              historyLog: (strength.historyLog || []).map(log => ({
                date: log.date || new Date(),
                intensity: Number(log.intensity || 0),
                notes: log.notes || ''
              })),
              createdAt: strength.createdAt || new Date(),
              updatedAt: strength.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      } else if (this.historyType === 'weakness') {
        const index = this.coaching.weaknesses.findIndex(w => w.id === this.currentItemForHistory.id)
        if (index !== -1) {
          this.coaching.weaknesses[index].historyLog = this.currentItemForHistory.historyLog
          
          const update = {
            weaknesses: this.coaching.weaknesses.map(weakness => ({
              id: weakness.id || uuidv4(),
              type: weakness.type || 'weakness',
              description: weakness.description || '',
              intensity: Number(weakness.intensity || 3),
              notes: weakness.notes || '',
              historyLog: (weakness.historyLog || []).map(log => ({
                date: log.date || new Date(),
                intensity: Number(log.intensity || 0),
                notes: log.notes || ''
              })),
              createdAt: weakness.createdAt || new Date(),
              updatedAt: weakness.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      } else if (this.historyType === 'goal') {
        const index = this.coaching.goals.findIndex(g => g.id === this.currentItemForHistory.id)
        if (index !== -1) {
          this.coaching.goals[index].historyLog = this.currentItemForHistory.historyLog
          
          const update = {
            goals: this.coaching.goals.map(goal => ({
              id: goal.id || uuidv4(),
              title: goal.title || '',
              description: goal.description || '',
              status: goal.status || 'notStarted',
              progression: Number(goal.progression || 0),
              targetDate: goal.targetDate || null,
              completedDate: goal.completedDate || null,
              historyLog: (goal.historyLog || []).map(log => ({
                date: log.date || new Date(),
                progression: Number(log.progression || 0),
                status: log.status || 'notStarted',
                notes: log.notes || ''
              })),
              createdAt: goal.createdAt || new Date(),
              updatedAt: goal.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      }
    },
    
    async deleteStrength(id) {
      try {
        const index = this.coaching.strengths.findIndex(s => s.id === id)
        
        if (index !== -1) {
          this.coaching.strengths.splice(index, 1)
          
          // Update coaching record with clean data
          const update = {
            strengths: this.coaching.strengths.map(strength => ({
              id: strength.id || uuidv4(),
              type: strength.type || 'strength',
              description: strength.description || '',
              intensity: Number(strength.intensity || 3),
              notes: strength.notes || '',
              historyLog: (strength.historyLog || []).map(log => ({
                date: log.date || new Date(),
                intensity: Number(log.intensity || 0),
                notes: log.notes || ''
              })),
              createdAt: strength.createdAt || new Date(),
              updatedAt: strength.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      } catch (error) {
        console.error('Error deleting strength:', error)
      }
    },
    
    async deleteWeakness(id) {
      try {
        const index = this.coaching.weaknesses.findIndex(w => w.id === id)
        
        if (index !== -1) {
          this.coaching.weaknesses.splice(index, 1)
          
          // Update coaching record with clean data
          const update = {
            weaknesses: this.coaching.weaknesses.map(weakness => ({
              id: weakness.id || uuidv4(),
              type: weakness.type || 'weakness',
              description: weakness.description || '',
              intensity: Number(weakness.intensity || 3),
              notes: weakness.notes || '',
              historyLog: (weakness.historyLog || []).map(log => ({
                date: log.date || new Date(),
                intensity: Number(log.intensity || 0),
                notes: log.notes || ''
              })),
              createdAt: weakness.createdAt || new Date(),
              updatedAt: weakness.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      } catch (error) {
        console.error('Error deleting weakness:', error)
      }
    },
    
    async deleteGoal(id) {
      try {
        const index = this.coaching.goals.findIndex(g => g.id === id)
        
        if (index !== -1) {
          this.coaching.goals.splice(index, 1)
          
          // Update coaching record with clean data
          const update = {
            goals: this.coaching.goals.map(goal => ({
              id: goal.id || uuidv4(),
              title: goal.title || '',
              description: goal.description || '',
              status: goal.status || 'notStarted',
              progression: Number(goal.progression || 0),
              targetDate: goal.targetDate || null,
              completedDate: goal.completedDate || null,
              historyLog: (goal.historyLog || []).map(log => ({
                date: log.date || new Date(),
                progression: Number(log.progression || 0),
                status: log.status || 'notStarted',
                notes: log.notes || ''
              })),
              createdAt: goal.createdAt || new Date(),
              updatedAt: goal.updatedAt || new Date()
            }))
          }
          
          await this.coachingStore.updateRecord(this.coaching.id, update)
        }
      } catch (error) {
        console.error('Error deleting goal:', error)
      }
    },
    
    // Timeline entry methods
    createEmptyTimelineEntry() {
      return {
        id: '',
        date: new Date().toISOString().substr(0, 10),
        notes: '',
        relatedGoals: [],
        relatedStrengthsWeaknesses: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    
    openTimelineEntryDialog(entry = null) {
      if (entry) {
        this.currentTimelineEntry = { ...entry }
        if (typeof this.currentTimelineEntry.date === 'object') {
          this.currentTimelineEntry.date = new Date(this.currentTimelineEntry.date).toISOString().substring(0, 10)
        }
      } else {
        this.currentTimelineEntry = this.createEmptyTimelineEntry()
      }
      this.timelineEntryDialogOpen = true
    },
    
    async saveTimelineEntry() {
      if (!this.currentTimelineEntry.notes) return
      
      const now = new Date()
      
      try {
        // Create a clean serializable copy
        const entryToSave = {
          id: this.currentTimelineEntry.id || uuidv4(),
          date: new Date(this.currentTimelineEntry.date),
          notes: this.currentTimelineEntry.notes,
          relatedGoals: [...(this.currentTimelineEntry.relatedGoals || [])],
          relatedStrengthsWeaknesses: [...(this.currentTimelineEntry.relatedStrengthsWeaknesses || [])],
          createdAt: this.currentTimelineEntry.createdAt || now,
          updatedAt: now
        }
        
        if (this.isEditingTimelineEntry) {
          // Update existing entry
          const index = this.coaching.timeline.findIndex(e => e.id === entryToSave.id)
          
          if (index !== -1) {
            this.coaching.timeline.splice(index, 1, entryToSave)
          }
        } else {
          // Add new entry
          this.coaching.timeline.push(entryToSave)
        }
        
        // Create a clean copy of the coaching record with only the timeline array, ensuring no undefined values
        const update = {
          timeline: this.coaching.timeline.map(entry => ({
            id: entry.id || uuidv4(),
            date: entry.date || new Date(),
            notes: entry.notes || '',
            relatedGoals: [...(entry.relatedGoals || [])],
            relatedStrengthsWeaknesses: [...(entry.relatedStrengthsWeaknesses || [])],
            createdAt: entry.createdAt || new Date(),
            updatedAt: entry.updatedAt || new Date()
          }))
        }
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, update)
        
        this.timelineEntryDialogOpen = false
      } catch (error) {
        console.error('Error saving timeline entry:', error)
      }
    },
    
    async deleteTimelineEntry(id) {
      try {
        const index = this.coaching.timeline.findIndex(e => e.id === id)
        
        if (index !== -1) {
          this.coaching.timeline.splice(index, 1)
          
          // Update coaching record
          await this.coachingStore.updateRecord(this.coaching.id, {
            timeline: this.coaching.timeline
          })
        }
      } catch (error) {
        console.error('Error deleting timeline entry:', error)
      }
    },
    
    // Related tasks methods
    openAddTaskDialog() {
      this.selectedTaskIds = []
      this.addTaskDialogOpen = true
    },
    
    async addRelatedTasks() {
      if (!this.selectedTaskIds.length) {
        this.addTaskDialogOpen = false
        return
      }
      
      try {
        // Add selected tasks to related tasks
        const updatedRelatedTasks = [
          ...(this.coaching.relatedTasks || []),
          ...this.selectedTaskIds
        ]
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, {
          relatedTasks: updatedRelatedTasks
        })
        
        // Update local state
        this.coaching.relatedTasks = updatedRelatedTasks
        
        this.addTaskDialogOpen = false
      } catch (error) {
        console.error('Error adding related tasks:', error)
      }
    },
    
    async removeRelatedTask(taskId) {
      try {
        // Remove task from related tasks
        const updatedRelatedTasks = this.coaching.relatedTasks.filter(id => id !== taskId)
        
        // Update coaching record
        await this.coachingStore.updateRecord(this.coaching.id, {
          relatedTasks: updatedRelatedTasks
        })
        
        // Update local state
        this.coaching.relatedTasks = updatedRelatedTasks
      } catch (error) {
        console.error('Error removing related task:', error)
      }
    },
    
    // Helper methods
    formatDate(date) {
      if (!date) return ''
      // Use calendar helpers composable for date formatting
      const { formatDate: formatDateHelper } = useCalendarHelpers()
      try {
        // Format the date in MM/dd/yyyy format
        return new Date(date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      } catch (e) {
        return ''
      }
    },
    
    getGoalStatusColor(status) {
      switch (status) {
        case 'notStarted':
          return 'grey'
        case 'inProgress':
          return 'primary'
        case 'completed':
          return 'success'
        case 'cancelled':
          return 'error'
        default:
          return 'grey'
      }
    },
    
    getPriorityColor(priority) {
      switch (priority) {
        case 'high':
          return 'error'
        case 'medium':
          return 'warning'
        case 'low':
          return 'info'
        default:
          return 'grey'
      }
    },
    
    getGoalTitle(goalId) {
      const goal = this.coaching.goals.find(g => g.id === goalId)
      return goal ? goal.title : 'Unknown Goal'
    },
    
    getStrengthWeaknessDesc(swId) {
      const strength = this.coaching.strengths.find(s => s.id === swId)
      if (strength) return strength.description
      
      const weakness = this.coaching.weaknesses.find(w => w.id === swId)
      if (weakness) return weakness.description
      
      return 'Unknown'
    },
    
    getStrengthWeaknessType(swId) {
      const strength = this.coaching.strengths.find(s => s.id === swId)
      if (strength) return 'strength'
      
      const weakness = this.coaching.weaknesses.find(w => w.id === swId)
      if (weakness) return 'weakness'
      
      return ''
    }
  }
}
</script>

<style scoped>
.border-primary {
  border-left: 4px solid var(--v-primary-base);
}
.border-secondary {
  border-left: 4px solid var(--v-secondary-base);
}
.border-success {
  border-left: 4px solid var(--v-success-base);
}
.border-info {
  border-left: 4px solid var(--v-info-base);
}
.border-warning {
  border-left: 4px solid var(--v-warning-base);
}
.border-error {
  border-left: 4px solid var(--v-error-base);
}
</style>
