<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('meetings.categoriesTitle') }}
      p.text-subtitle-1 {{ $t('meetings.categoriesManage') }}
  
  v-row
    v-col(cols="12")
      v-card
        v-card-title.d-flex
          span {{ $t('meetings.categories') }}
          v-spacer
          v-btn(color="primary" @click="createCategory")
            v-icon(start) mdi-plus
            span {{ $t('meetings.createCategory') }}
        
        v-divider
        
        v-card-text
          v-data-table(
            :headers="headers"
            :items="categories"
            :loading="categoriesLoading"
          )
            template(v-slot:item.color="{ item }")
              v-avatar(:color="item.color" :size="30")
                v-icon(color="white" :icon="item.icon")
            
            template(v-slot:item.name="{ item }")
              span {{ item.name }}
              v-tooltip(location="right")
                template(v-slot:activator="{ props }")
                  v-icon.ml-2(
                    v-bind="props"
                    size="small"
                    color="grey-lighten-1"
                    icon="mdi-information-outline"
                  )
                span {{ item.description || $t('meetings.noCategoriesYet') }}
            
            template(v-slot:item.meetingsCount="{ item }")
              span {{ getMeetingsCountForCategory(item.id) }}
            
            template(v-slot:item.actions="{ item }")
              v-btn(icon variant="text" @click="editCategory(item)")
                v-icon(size="small") mdi-pencil
              v-btn(icon variant="text" @click="confirmDeleteCategory(item)" :disabled="getMeetingsCountForCategory(item.id) === 0")
                v-icon(size="small") mdi-delete
  
  // Category form dialog
  dialog-form(v-model="categoryDialog" :title="isEditing ? $t('meetings.editCategory') : $t('meetings.createCategory')")
    v-card
      v-card-text
        v-form(ref="form" @submit.prevent="submitCategory")
          v-text-field(
            v-model="editedCategory.name"
            :label="$t('meetings.categoryName')"
            required
            outlined
            :rules="[v => !!v || $t('validation.required')]"
          )
          
          v-textarea(
            v-model="editedCategory.description"
            :label="$t('meetings.categoryDescription')"
            outlined
            rows="3"
          )
          
          v-color-picker(
            v-model="editedCategory.color"
            mode="hex"
            swatches-max-height="200"
            show-swatches
          )
          
          v-text-field(
            v-model="editedCategory.icon"
            :label="$t('meetings.categoryIcon')"
            outlined
            :hint="'Example: mdi-calendar'"
            persistent-hint
          )
        
      v-card-actions
        v-spacer
        v-btn(
          color="primary"
          @click="submitCategory"
          :loading="saving"
        ) {{ $t('common.save') }}
        v-btn(
          color="grey"
          @click="categoryDialog = false"
          :disabled="saving"
        ) {{ $t('common.cancel') }}
  
  // Delete confirmation dialog
  v-dialog(v-model="deleteDialog" max-width="500px")
    v-card
      v-card-title {{ $t('meetings.removeConfirmation') }}
      v-card-text
        p {{ $t('meetings.removeWarning') }}
        p 
          strong {{ $t('meetings.meetingsInCategory') }}: {{ getMeetingsCountForCategory(selectedCategoryId) }}
        
        v-text-field(
          v-model="confirmationText"
          :label="$t('meetings.typeAgreed')"
          outlined
          :error-messages="confirmationError"
        )
      
      v-card-actions
        v-btn(
          color="success"
          @click="deleteDialog = false"
          :disabled="deleting"
        ) {{ $t('meetings.cancelRemove') }}
        v-btn(
          color="error"
          @click="deleteCategory"
          :disabled="confirmationText !== 'agreed' || deleting"
          :loading="deleting"
        ) {{ $t('meetings.confirmRemove') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMeetingsStore } from '~/stores/meetings'
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'
import DialogForm from '~/components/common/DialogForm.vue'
import { useAuthStore } from '~/stores/auth'

// Store access
const meetingsStore = useMeetingsStore()
const categoriesStore = useMeetingCategoriesStore()
const authStore = useAuthStore()

// State
const categories = computed(() => categoriesStore.categories)
const categoriesLoading = computed(() => categoriesStore.loading)
const categoryDialog = ref(false)
const isEditing = ref(false)
const editedCategory = ref({
  id: null,
  name: '',
  description: '',
  color: '#4CAF50',
  icon: 'mdi-calendar'
})
const saving = ref(false)
const deleteDialog = ref(false)
const selectedCategoryId = ref(null)
const confirmationText = ref('')
const confirmationError = ref('')
const deleting = ref(false)

// Table headers
const headers = [
  { title: '', key: 'color', sortable: false, align: 'center', width: '50px' },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Meetings', key: 'meetingsCount', sortable: false, align: 'center', width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120px' },
]


// Get count of meetings for a specific category
const getMeetingsCountForCategory = (categoryId) => {
  if (!categoryId) return 0
  return meetingsStore.meetings.filter(meeting => meeting.category === categoryId).length
}

// Add/Edit
const createCategory = () => {
  isEditing.value = false
  editedCategory.value = {
    id: null,
    name: '',
    description: '',
    color: '#4CAF50',
    icon: 'mdi-calendar'
  }
  categoryDialog.value = true
}

const editCategory = (item) => {
  isEditing.value = true
  editedCategory.value = { ...item }
  categoryDialog.value = true
}

const submitCategory = async () => {
  saving.value = true
  try {
    const categoryData = {
      name: editedCategory.value.name,
      description: editedCategory.value.description || '',
      color: editedCategory.value.color,
      icon: editedCategory.value.icon || 'mdi-calendar'
    }
    
    if (isEditing.value) {
      // Update existing category
      await categoriesStore.updateCategory(editedCategory.value.id, categoryData)
    } else {
      // Create new category
      await categoriesStore.createCategory(categoryData)
    }
    
    categoryDialog.value = false
  } catch (error) {
    console.error('Error saving category:', error)
  } finally {
    saving.value = false
  }
}

// Delete
const confirmDeleteCategory = (item) => {
  selectedCategoryId.value = item.id
  confirmationText.value = ''
  confirmationError.value = ''
  deleteDialog.value = true
}

const deleteCategory = async () => {
  if (confirmationText.value !== 'agreed') {
    confirmationError.value = 'Please type "agreed" to confirm deletion'
    return
  }
  
  if (!selectedCategoryId.value) return
  
  deleting.value = true
  try {
    // Delete the category
    await categoriesStore.deleteCategory(selectedCategoryId.value)
    
    // Update meetings that were using this category
    const affectedMeetings = meetingsStore.meetings.filter(
      meeting => meeting.category === selectedCategoryId.value
    )
    
    for (const meeting of affectedMeetings) {
      await meetingsStore.updateMeeting(meeting.id, { category: null })
    }
    
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting category:', error)
  } finally {
    deleting.value = false
  }
}

// Load data on mount
onMounted(async () => {
  await Promise.all([
    categoriesStore.fetchCategories(),
    meetingsStore.fetchMeetings()
  ])
  
  // If no categories exist, seed from the YAML file
  if (categories.value.length === 0) {
    await categoriesStore.seedDefaultCategories()
  }
})
</script>

<style scoped>
.v-color-picker {
  max-width: 100%;
  margin-bottom: 16px;
}
</style>
