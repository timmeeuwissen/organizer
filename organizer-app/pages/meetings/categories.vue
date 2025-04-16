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
import DialogForm from '~/components/common/DialogForm.vue'
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  where,
  getFirestore,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'

// Store access
const meetingsStore = useMeetingsStore()
const authStore = useAuthStore()
const db = getFirestore()

// State
const categories = ref([])
const categoriesLoading = ref(true)
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

// Load categories
const fetchCategories = async () => {
  if (!authStore.user) return
  
  categoriesLoading.value = true
  try {
    const categoriesRef = collection(db, 'meetingCategories')
    const q = query(categoriesRef, where('userId', '==', authStore.user.id))
    const querySnapshot = await getDocs(q)
    
    categories.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching categories:', error)
  } finally {
    categoriesLoading.value = false
  }
}

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
      icon: editedCategory.value.icon || 'mdi-calendar',
      userId: authStore.user.id,
      updatedAt: serverTimestamp()
    }
    
    if (isEditing.value) {
      // Update existing category
      const categoryRef = doc(db, 'meetingCategories', editedCategory.value.id)
      await updateDoc(categoryRef, categoryData)
      
      // Update the local array
      const index = categories.value.findIndex(c => c.id === editedCategory.value.id)
      if (index !== -1) {
        categories.value[index] = {
          ...categoryData,
          id: editedCategory.value.id,
          updatedAt: new Date() // For local display, serverTimestamp() is not a real Date
        }
      }
    } else {
      // Create new category
      categoryData.createdAt = serverTimestamp()
      const categoriesRef = collection(db, 'meetingCategories')
      const docRef = await addDoc(categoriesRef, categoryData)
      
      // Add to the local array
      categories.value.push({
        ...categoryData,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
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
    const categoryRef = doc(db, 'meetingCategories', selectedCategoryId.value)
    await deleteDoc(categoryRef)
    
    // Update meetings that were using this category
    const affectedMeetings = meetingsStore.meetings.filter(
      meeting => meeting.category === selectedCategoryId.value
    )
    
    for (const meeting of affectedMeetings) {
      await meetingsStore.updateMeeting(meeting.id, { category: null })
    }
    
    // Update the local array
    categories.value = categories.value.filter(c => c.id !== selectedCategoryId.value)
    
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
    fetchCategories(),
    meetingsStore.fetchMeetings()
  ])
})
</script>

<style scoped>
.v-color-picker {
  max-width: 100%;
  margin-bottom: 16px;
}
</style>
