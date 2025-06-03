<template>
  <v-card>
    <v-card-title class="d-flex">
      <span>Knowledge Base</span>
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
      v-if="loading"
      type="card, card, card"
      class="mt-4 px-4"
    ></v-skeleton-loader>
    
    <!-- Empty state -->
    <v-card-text
      v-else-if="!filteredDocuments.length"
      class="text-center py-8 cursor-pointer"
      @click="openDocumentDialog()"
    >
      <v-icon size="64" color="grey lighten-1" class="mb-4" @click.stop="openDocumentDialog()">mdi-book-open-page-variant</v-icon>
      <h3 class="text-h5 mb-2">No knowledge documents found</h3>
      <p class="mb-4">Start building your knowledge base by adding your first document.</p>
      <v-btn
        color="primary"
        @click.stop="openDocumentDialog()"
      >
        <v-icon left>mdi-plus</v-icon>
        Add Document
      </v-btn>
    </v-card-text>
    
    <!-- Documents list -->
    <v-card-text v-else>
      <v-row>
        <v-col 
          v-for="document in filteredDocuments" 
          :key="document.id"
          cols="12" sm="6" md="4"
        >
          <v-card outlined hover class="knowledge-document-card cursor-pointer" @click="viewDocument(document)">
            <v-card-title class="py-2">
              <div class="d-flex align-center text-truncate">
                <v-icon color="primary" class="mr-2">mdi-file-document-outline</v-icon>
                <span class="text-truncate">{{ document.title }}</span>
              </div>
              <v-spacer></v-spacer>
              <v-menu bottom left>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    @click.stop
                  >
                    <v-icon small>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item @click="viewDocument(document)">
                    <v-list-item-title>
                      <v-icon small class="mr-2">mdi-eye</v-icon>
                      View
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="openDocumentDialog(document)">
                    <v-list-item-title>
                      <v-icon small class="mr-2">mdi-pencil</v-icon>
                      Edit
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="printDocument(document)">
                    <v-list-item-title>
                      <v-icon small class="mr-2">mdi-printer</v-icon>
                      Print
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="confirmDeleteDocument(document)">
                    <v-list-item-title class="error--text">
                      <v-icon small class="mr-2" color="error">mdi-delete</v-icon>
                      Delete
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-title>
            <v-card-text class="py-2">
              <p class="text-caption text-truncate mb-2">{{ document.description }}</p>
              <div class="mb-2">
                <v-chip
                  v-for="(tag, index) in document.tags"
                  :key="index"
                  x-small
                  outlined
                  class="mr-1 mb-1"
                >
                  {{ tag }}
                </v-chip>
              </div>
              <div class="text-caption text-right grey--text mt-1">
                Updated: {{ formatDate(document.updatedAt) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
    
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        @click.stop="openDocumentDialog()"
      >
        <v-icon left>mdi-plus</v-icon>
        Add Document
      </v-btn>
    </v-card-actions>
    
    <!-- Document Dialog -->
    <v-dialog
      v-model="documentDialogOpen"
      max-width="900px"
      scrollable
    >
      <knowledge-document-form
        v-if="documentDialogOpen"
        :document="currentDocument"
        @close="documentDialogOpen = false"
        @saved="onDocumentSaved"
      ></knowledge-document-form>
    </v-dialog>
    
    <!-- View Document Dialog -->
    <v-dialog
      v-model="viewDialogOpen"
      max-width="900px"
      scrollable
    >
      <v-card v-if="viewDialogOpen && currentDocument">
        <v-card-title class="d-flex">
          <span>{{ currentDocument.title }}</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="viewDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <p class="text-subtitle-1 mb-4">{{ currentDocument.description }}</p>
          <div class="mb-4">
            <v-chip
              v-for="(tag, index) in currentDocument.tags"
              :key="index"
              small
              outlined
              class="mr-1 mb-1"
            >
              {{ tag }}
            </v-chip>
          </div>
          <div v-html="renderedMarkdown" class="markdown-content mt-4"></div>
        </v-card-text>
        <v-card-actions>
          <v-btn text color="error" @click="confirmDeleteDocument(currentDocument)">
            <v-icon left>mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn text @click="printDocument(currentDocument)">
            <v-icon left>mdi-printer</v-icon>
            Print
          </v-btn>
          <v-btn color="primary" @click="openDocumentDialog(currentDocument)">
            <v-icon left>mdi-pencil</v-icon>
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="deleteDialogOpen"
      max-width="500px"
    >
      <v-card>
        <v-card-title>Delete Knowledge Document</v-card-title>
        <v-card-text>
          Are you sure you want to delete this knowledge document? This action cannot be undone.
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
            :loading="loading"
            @click="deleteDocument"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Print iframe -->
    <iframe
      ref="printFrame"
      style="display: none;"
    ></iframe>
  </v-card>
</template>

<script>
import { useCoachingStore } from '~/stores/coaching'
import { ref, computed, markRaw, onMounted } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import KnowledgeDocumentForm from './KnowledgeDocumentForm.vue'

export default {
  name: 'KnowledgeBase',
  
  components: {
    KnowledgeDocumentForm,
    MdPreview
  },
  
  setup() {
    const coachingStore = useCoachingStore()
    const searchQuery = ref('')
    const documentDialogOpen = ref(false)
    const viewDialogOpen = ref(false)
    const deleteDialogOpen = ref(false)
    const currentDocument = ref(null)
    const documentToDelete = ref(null)
    const loading = ref(false)
    const printFrame = ref(null)
    
    const filteredDocuments = computed(() => {
      let docs = coachingStore.knowledgeDocuments || []
      
      // Apply search filter if query exists
      if (searchQuery.value.trim()) {
        const searchLower = searchQuery.value.toLowerCase().trim()
        docs = docs.filter(doc => {
          // Search by title
          if (doc.title.toLowerCase().includes(searchLower)) {
            return true
          }
          
          // Search by description
          if (doc.description && doc.description.toLowerCase().includes(searchLower)) {
            return true
          }
          
          // Search by tags
          if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
            return true
          }
          
          // Search by content
          if (doc.content && doc.content.toLowerCase().includes(searchLower)) {
            return true
          }
          
          return false
        })
      }
      
      // Sort by updated date (newest first)
      return [...docs].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    })
    
    const renderedMarkdown = computed(() => {
      if (!currentDocument.value?.content) return ''
      // Use direct MD-Editor-V3 component for rendering
      // We'll rely on the v-html directive to render the content
      return currentDocument.value.content
    })
    
    const openDocumentDialog = (document = null) => {
      currentDocument.value = document
      documentDialogOpen.value = true
    }
    
    const viewDocument = (document) => {
      currentDocument.value = document
      viewDialogOpen.value = true
    }
    
    const confirmDeleteDocument = (document) => {
      documentToDelete.value = document
      deleteDialogOpen.value = true
    }
    
    const deleteDocument = async () => {
      if (!documentToDelete.value) return
      
      loading.value = true
      try {
        await coachingStore.deleteKnowledgeDocument(documentToDelete.value.id)
        
        // Close all dialogs
        deleteDialogOpen.value = false
        documentDialogOpen.value = false
        viewDialogOpen.value = false
        
        // Reset document references
        documentToDelete.value = null
        currentDocument.value = null
      } catch (error) {
        console.error('Error deleting knowledge document:', error)
      } finally {
        loading.value = false
      }
    }
    
    const onDocumentSaved = () => {
      documentDialogOpen.value = false
      currentDocument.value = null
    }
    
    const formatDate = (date) => {
      if (!date) return ''
      try {
        return new Date(date).toLocaleDateString()
      } catch (e) {
        return ''
      }
    }
    
    const printDocument = (document) => {
      if (!document || !printFrame.value) return
      
      // Build HTML strings in parts to avoid template literal issues
      const docTitle = document.title
      const docDescription = document.description || ''
      const docContent = document.content || ''
      
      // Generate tags HTML
      let tagsHtml = ''
      if (document.tags && document.tags.length) {
        document.tags.forEach(tag => {
          tagsHtml += '<span class="tag">' + tag + '</span>'
        })
      }
      
      // Just use the raw content for now, as we'll replace this with a proper markdown renderer later
      const renderedContent = docContent
      
      // Build HTML with methods that avoid template parsing issues
      let printContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>' + docTitle + '</title>',
        '<style>',
        'body{font-family:Arial,sans-serif;margin:20px}',
        'h1{margin-bottom:5px}',
        '.description{color:#666;margin-bottom:15px}',
        '.tags{margin-bottom:20px}',
        '.tag{display:inline-block;background-color:#f1f1f1;padding:3px 8px;border-radius:12px;margin-right:5px;font-size:12px}',
        '.content{margin-top:20px}',
        '@media print{.no-print{display:none}}',
        '</style>',
        '</head>',
        '<body>',
        '<h1>' + docTitle + '</h1>',
        '<div class="description">' + docDescription + '</div>',
        '<div class="tags">' + tagsHtml + '</div>',
        '<hr />',
        '<div class="content">' + renderedContent + '</div>'
      ].join('')
      
      // Add the print script using DOM methods instead of HTML string to avoid Vue template parsing issues
      const iframe = printFrame.value
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      
      iframeDoc.open()
      iframeDoc.write(printContent)
      
      // Add script element programmatically
      const scriptElement = iframeDoc.createElement('script')
      scriptElement.textContent = 'window.onload = function() { window.print(); }'
      iframeDoc.body.appendChild(scriptElement)
      
      iframeDoc.close()
    }
    
    // Fetch knowledge documents on component mount
    onMounted(async () => {
      loading.value = true
      try {
        await coachingStore.fetchKnowledgeDocuments()
      } catch (error) {
        console.error('Error fetching knowledge documents:', error)
      } finally {
        loading.value = false
      }
    })

    return {
      searchQuery,
      documentDialogOpen,
      viewDialogOpen,
      deleteDialogOpen,
      currentDocument,
      documentToDelete,
      loading,
      printFrame,
      filteredDocuments,
      renderedMarkdown,
      openDocumentDialog,
      viewDocument,
      confirmDeleteDocument,
      deleteDocument,
      onDocumentSaved,
      formatDate,
      printDocument
    }
  }
}
</script>

<style scoped>
.knowledge-document-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cursor-pointer {
  cursor: pointer;
}

.markdown-content {
  max-height: 500px;
  overflow-y: auto;
}

:deep(.markdown-content img) {
  max-width: 100%;
  height: auto;
}

:deep(.markdown-content pre) {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}

:deep(.markdown-content code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
}

:deep(.markdown-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

:deep(.markdown-content th),
:deep(.markdown-content td) {
  padding: 8px;
  border: 1px solid #ddd;
}

:deep(.markdown-content th) {
  background-color: #f5f5f5;
  font-weight: bold;
  text-align: left;
}
</style>
