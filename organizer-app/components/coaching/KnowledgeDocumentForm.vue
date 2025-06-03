<template>
  <v-card>
    <v-card-title class="d-flex">
      <span>{{ isNew ? 'New Knowledge Document' : 'Edit Knowledge Document' }}</span>
      <v-spacer></v-spacer>
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    
    <v-divider></v-divider>
    
    <v-card-text>
      <v-form
        ref="form"
        @submit.prevent="saveDocument"
      >
        <!-- Title -->
        <v-text-field
          v-model="title"
          label="Title"
          :rules="[v => !!v || 'Title is required']"
          required
          outlined
          dense
          class="mb-4"
        ></v-text-field>
        
        <!-- Description -->
        <v-textarea
          v-model="description"
          label="Short Description"
          hint="A brief summary of this document"
          outlined
          dense
          auto-grow
          rows="2"
          class="mb-4"
        ></v-textarea>
        
        <!-- Tags -->
        <v-combobox
          v-model="tags"
          label="Tags"
          hint="Press enter or comma to add a tag"
          multiple
          small-chips
          outlined
          dense
          class="mb-4"
          :delimiters="[',', ' ']"
        ></v-combobox>
        
        <!-- Content (Markdown Editor) -->
        <div class="mb-4">
          <label class="v-label theme--light">Content</label>
          <div class="editor-wrapper">
            <md-editor 
              v-model="content"
              :preview="previewMode"
              @onPreviewStateChanged="previewMode = $event"
              language="en-US"
            />
          </div>
        </div>
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
        @click="saveDocument"
      >
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { useCoachingStore } from '~/stores/coaching'
import { ref, computed, onMounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

export default {
  name: 'KnowledgeDocumentForm',
  
  components: {
    MdEditor
  },
  
  props: {
    document: {
      type: Object,
      default: null
    }
  },
  
  emits: ['close', 'saved'],
  
  setup(props, { emit }) {
    const coachingStore = useCoachingStore()
    const form = ref(null)
    const loading = ref(false)
    const previewMode = ref(false)
    
    // Form fields
    const title = ref('')
    const description = ref('')
    const tags = ref([])
    const content = ref('')
    
    const isNew = computed(() => !props.document)
    
    onMounted(() => {
      if (props.document) {
        // Populate form with existing document data
        title.value = props.document.title || ''
        description.value = props.document.description || ''
        tags.value = [...(props.document.tags || [])]
        content.value = props.document.content || ''
      }
    })
    
    const validateForm = () => {
      if (!form.value) return false
      return form.value.validate()
    }
    
    const saveDocument = async () => {
      if (!validateForm()) return
      
      loading.value = true
      
      try {
        const documentData = {
          title: title.value,
          description: description.value,
          tags: tags.value.map(tag => typeof tag === 'string' ? tag : tag.text || '').filter(Boolean),
          content: content.value
        }
        
        let savedId
        
        if (isNew.value) {
          // Create new document
          const newDocument = {
            ...documentData,
            // Don't generate ID here, let Firestore do it
            id: '' 
          }
          
          savedId = await coachingStore.saveKnowledgeDocument(newDocument)
        } else {
          // Update existing document
          const updatedDocument = {
            ...props.document,
            ...documentData
          }
          
          savedId = await coachingStore.saveKnowledgeDocument(updatedDocument)
        }
        
        emit('saved', savedId)
      } catch (error) {
        console.error('Error saving knowledge document:', error)
      } finally {
        loading.value = false
      }
    }
    
    return {
      form,
      loading,
      previewMode,
      title,
      description,
      tags,
      content,
      isNew,
      saveDocument
    }
  }
}
</script>

<style scoped>
.editor-wrapper {
  border: 1px solid rgba(0, 0, 0, 0.23);
  border-radius: 4px;
}

/* Adjust editor height */
:deep(.md-editor) {
  height: 400px;
}

/* Remove border from the editor itself since we're adding our own */
:deep(.md-editor) {
  border: none !important;
}
</style>
