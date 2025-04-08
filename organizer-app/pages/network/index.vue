<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('network.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('network.filter') }}
        v-card-text
          v-select(
            v-model="entityTypes"
            :items="entityTypeOptions"
            :label="$t('common.select')"
            multiple
            chips
            closable-chips
          )
          
          template(v-if="entityTypes.includes('person')")
            v-select(
              v-model="selectedPeople"
              :items="peopleOptions"
              :label="$t('people.title')"
              multiple
              chips
              closable-chips
            )
          
          template(v-if="entityTypes.includes('project')")
            v-select(
              v-model="selectedProjects"
              :items="projectOptions"
              :label="$t('projects.title')"
              multiple
              chips
              closable-chips
            )
          
          template(v-if="entityTypes.includes('task')")
            v-select(
              v-model="selectedTaskStatuses"
              :items="taskStatusOptions"
              :label="$t('tasks.status')"
              multiple
              chips
              closable-chips
            )
          
          template(v-if="entityTypes.includes('behavior')")
            v-select(
              v-model="selectedBehaviorTypes"
              :items="behaviorTypeOptions"
              :label="$t('behaviors.type')"
              multiple
              chips
              closable-chips
            )
          
      v-card
        v-card-title {{ $t('network.focus') }}
        v-card-text
          v-list(lines="two")
            v-list-subheader(v-if="focusedEntity") {{ $t('network.focus') }}: {{ getFocusedEntityName() }}
            v-list-item(
              v-if="focusedEntity"
              :title="getFocusedEntityName()"
              :subtitle="getFocusedEntityType()"
              append-icon="mdi-close"
              @click:append="clearFocus"
            )
              template(v-slot:prepend)
                v-avatar(:color="getFocusedEntityColor()")
                  v-icon(color="white") {{ getFocusedEntityIcon() }}
              
          div(v-if="!focusedEntity")
            p {{ $t('network.view') }}
    
    v-col(cols="12" md="9")
      v-card
        v-card-title
          span {{ $t('network.connections') }}
          v-spacer
          v-btn-group
            v-btn(
              icon
              @click="zoomIn"
              :disabled="zoomLevel >= 2"
            )
              v-icon mdi-magnify-plus-outline
            v-btn(
              icon
              @click="zoomOut"
              :disabled="zoomLevel <= 0.5"
            )
              v-icon mdi-magnify-minus-outline
            v-btn(
              icon
              @click="resetNetwork"
            )
              v-icon mdi-refresh
        
        v-card-text
          v-alert(v-if="loading" type="info") {{ $t('common.loading') }}
          v-alert(v-else-if="networkError" type="error") {{ networkError }}
          v-alert(v-else-if="isEmpty" type="info") 
            | {{ $t('network.noData') }}
            | {{ $t('network.tryFilter') }}
          
          div(
            v-else
            ref="networkContainer"
            style="height: 600px; width: 100%; position: relative;"
          )
            div.empty-state(v-if="!hasNetwork")
              v-progress-circular(indeterminate size="64")
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'
import type { Person, Project, Task, Behavior } from '~/types/models'

// We need to dynamically import vis-network since it's a client-only library
let Network: any = null
let DataSet: any = null

// Initialize stores
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const behaviorsStore = useBehaviorsStore()

// UI state
const loading = ref(true)
const networkError = ref('')
const networkContainer = ref(null)
const networkInstance = ref(null)
const zoomLevel = ref(1)
const nodes = ref([])
const edges = ref([])

// Filter state
const entityTypes = ref(['person', 'project', 'task', 'behavior'])
const selectedPeople = ref([])
const selectedProjects = ref([])
const selectedTaskStatuses = ref([])
const selectedBehaviorTypes = ref([])
const focusedEntity = ref(null)

// Filter options
const entityTypeOptions = [
  { title: 'People', value: 'person' },
  { title: 'Projects', value: 'project' },
  { title: 'Tasks', value: 'task' },
  { title: 'Behaviors', value: 'behavior' }
]

const peopleOptions = computed(() => {
  return peopleStore.people.map(p => ({
    title: `${p.firstName} ${p.lastName}`,
    value: p.id
  }))
})

const projectOptions = computed(() => {
  return projectsStore.projects.map(p => ({
    title: p.title,
    value: p.id
  }))
})

const taskStatusOptions = [
  { title: 'To Do', value: 'todo' },
  { title: 'In Progress', value: 'inProgress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Delegated', value: 'delegated' },
  { title: 'Cancelled', value: 'cancelled' }
]

const behaviorTypeOptions = [
  { title: 'Do Well', value: 'doWell' },
  { title: 'Want To Do Better', value: 'wantToDoBetter' },
  { title: 'Need To Improve', value: 'needToImprove' }
]

// Computed properties
const isEmpty = computed(() => {
  return nodes.value.length === 0
})

const hasNetwork = computed(() => {
  return !!networkInstance.value
})

// Helper functions
const getFocusedEntityName = () => {
  if (!focusedEntity.value) return ''
  
  const { type, id } = focusedEntity.value
  
  switch (type) {
    case 'person':
      const person = peopleStore.getById(id)
      return person ? `${person.firstName} ${person.lastName}` : id
    case 'project':
      const project = projectsStore.getById(id)
      return project ? project.title : id
    case 'task':
      const task = tasksStore.getById(id)
      return task ? task.title : id
    case 'behavior':
      const behavior = behaviorsStore.getBehaviorById(id)
      return behavior ? behavior.title : id
    default:
      return id
  }
}

const getFocusedEntityType = () => {
  if (!focusedEntity.value) return ''
  
  const { type } = focusedEntity.value
  
  switch (type) {
    case 'person': return 'Person'
    case 'project': return 'Project'
    case 'task': return 'Task'
    case 'behavior': return 'Behavior'
    default: return type
  }
}

const getFocusedEntityColor = () => {
  if (!focusedEntity.value) return 'grey'
  
  const { type } = focusedEntity.value
  
  switch (type) {
    case 'person': return 'primary'
    case 'project': return 'success'
    case 'task': return 'info'
    case 'behavior': return 'warning'
    default: return 'grey'
  }
}

const getFocusedEntityIcon = () => {
  if (!focusedEntity.value) return 'mdi-help'
  
  const { type } = focusedEntity.value
  
  switch (type) {
    case 'person': return 'mdi-account'
    case 'project': return 'mdi-folder'
    case 'task': return 'mdi-checkbox-marked-outline'
    case 'behavior': return 'mdi-account-cog'
    default: return 'mdi-help'
  }
}

const clearFocus = () => {
  focusedEntity.value = null
  resetNetwork()
}

// Network functions
const initializeNetwork = async () => {
  if (typeof window === 'undefined') return

  try {
    // Import vis-network dynamically since it's client-only
    const vis = await import('vis-network/standalone')
    Network = vis.Network
    DataSet = vis.DataSet
    
    // Now we can create the network
    createNetwork()
  } catch (error) {
    console.error('Error initializing vis-network:', error)
    networkError.value = 'Failed to load network visualization. Please try again.'
  }
}

const createNetwork = () => {
  if (!networkContainer.value || !Network || !DataSet) return
  
  try {
    // Create a DataSet with nodes
    const nodesDataSet = new DataSet(nodes.value)
    const edgesDataSet = new DataSet(edges.value)
    
    // Create network data
    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet
    }
    
    // Define network options
    const options = {
      nodes: {
        shape: 'dot',
        size: 20,
        font: {
          size: 14,
          face: 'Roboto, sans-serif'
        },
        shadow: true
      },
      edges: {
        width: 2,
        smooth: {
          type: 'continuous'
        }
      },
      physics: {
        stabilization: false,
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.05,
          damping: 0.09
        }
      },
      interaction: {
        navigationButtons: true,
        keyboard: true,
        hover: true
      }
    }
    
    // Create the network
    networkInstance.value = new Network(networkContainer.value, data, options)
    
    // Add event listeners
    networkInstance.value.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const node = nodes.value.find(n => n.id === nodeId)
        if (node) {
          focusedEntity.value = {
            type: node.group,
            id: node.originalId
          }
        }
      }
    })
    
    networkInstance.value.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const node = nodes.value.find(n => n.id === nodeId)
        if (node) {
          // Navigate to the entity page
          const router = useRouter()
          router.push(`/${node.group}s/${node.originalId}`)
        }
      }
    })
  } catch (error) {
    console.error('Error creating network:', error)
    networkError.value = 'Failed to create network visualization. Please try again.'
  }
}

const buildNetworkData = () => {
  const newNodes = []
  const newEdges = []
  const nodeIds = new Set()
  
  // Helper to add a node only once
  const addNode = (id, label, group, originalId) => {
    const nodeId = `${group}-${id}`
    if (!nodeIds.has(nodeId)) {
      nodeIds.add(nodeId)
      newNodes.push({
        id: nodeId,
        label,
        group,
        originalId: id
      })
    }
    return nodeId
  }
  
  // Helper to add an edge
  const addEdge = (from, to, label) => {
    const edgeId = `${from}-${to}`
    newEdges.push({
      id: edgeId,
      from,
      to,
      label: label || ''
    })
  }
  
  // Add people nodes if selected
  if (entityTypes.value.includes('person')) {
    peopleStore.people.forEach(person => {
      // Skip if specific people are selected and this person is not among them
      if (selectedPeople.value.length > 0 && !selectedPeople.value.includes(person.id)) {
        return
      }
      
      const personNodeId = addNode(
        person.id, 
        `${person.firstName} ${person.lastName}`, 
        'person',
        person.id
      )
      
      // Add connections to projects
      if (entityTypes.value.includes('project') && person.relatedProjects) {
        person.relatedProjects.forEach(projectId => {
          const project = projectsStore.getById(projectId)
          if (project && (!selectedProjects.value.length || selectedProjects.value.includes(project.id))) {
            const projectNodeId = addNode(
              project.id,
              project.title,
              'project',
              project.id
            )
            addEdge(personNodeId, projectNodeId, 'Member')
          }
        })
      }
      
      // Add connections to tasks
      if (entityTypes.value.includes('task')) {
        const personTasks = tasksStore.getByAssignee(person.id)
        personTasks.forEach(task => {
          if (!selectedTaskStatuses.value.length || selectedTaskStatuses.value.includes(task.status)) {
            const taskNodeId = addNode(
              task.id,
              task.title,
              'task',
              task.id
            )
            addEdge(personNodeId, taskNodeId, 'Assigned')
          }
        })
      }
    })
  }
  
  // Add project nodes and their connections
  if (entityTypes.value.includes('project')) {
    projectsStore.projects.forEach(project => {
      // Skip if specific projects are selected and this project is not among them
      if (selectedProjects.value.length > 0 && !selectedProjects.value.includes(project.id)) {
        return
      }
      
      const projectNodeId = addNode(
        project.id,
        project.title,
        'project',
        project.id
      )
      
      // Add connections to tasks
      if (entityTypes.value.includes('task') && project.tasks) {
        project.tasks.forEach(taskId => {
          const task = tasksStore.getById(taskId)
          if (task && (!selectedTaskStatuses.value.length || selectedTaskStatuses.value.includes(task.status))) {
            const taskNodeId = addNode(
              task.id,
              task.title,
              'task',
              task.id
            )
            addEdge(projectNodeId, taskNodeId, 'Contains')
          }
        })
      }
    })
  }
  
  // Add behavior nodes and their connections
  if (entityTypes.value.includes('behavior')) {
    behaviorsStore.behaviors.forEach(behavior => {
      // Skip if specific behavior types are selected and this behavior is not among them
      if (selectedBehaviorTypes.value.length > 0 && !selectedBehaviorTypes.value.includes(behavior.type)) {
        return
      }
      
      const behaviorNodeId = addNode(
        behavior.id,
        behavior.title,
        'behavior',
        behavior.id
      )
      
      // Add connections to tasks via action plans
      if (entityTypes.value.includes('task') && behavior.actionPlans) {
        behavior.actionPlans.forEach(plan => {
          plan.tasks.forEach(taskId => {
            const task = tasksStore.getById(taskId)
            if (task && (!selectedTaskStatuses.value.length || selectedTaskStatuses.value.includes(task.status))) {
              const taskNodeId = addNode(
                task.id,
                task.title,
                'task',
                task.id
              )
              addEdge(behaviorNodeId, taskNodeId, 'Action Plan')
            }
          })
        })
      }
    })
  }
  
  nodes.value = newNodes
  edges.value = newEdges
}

const updateNetworkData = () => {
  if (!networkInstance.value || !DataSet) return
  
  buildNetworkData()
  
  const nodesDataSet = new DataSet(nodes.value)
  const edgesDataSet = new DataSet(edges.value)
  
  networkInstance.value.setData({
    nodes: nodesDataSet,
    edges: edgesDataSet
  })
}

const resetNetwork = () => {
  if (!networkInstance.value) return
  
  networkInstance.value.fit({
    animation: true
  })
  
  zoomLevel.value = 1
}

const zoomIn = () => {
  if (!networkInstance.value) return
  
  zoomLevel.value += 0.25
  networkInstance.value.moveTo({
    scale: zoomLevel.value,
    animation: true
  })
}

const zoomOut = () => {
  if (!networkInstance.value) return
  
  zoomLevel.value -= 0.25
  networkInstance.value.moveTo({
    scale: zoomLevel.value,
    animation: true
  })
}

// Load data and initialize network
onMounted(async () => {
  try {
    // Load all data
    await Promise.all([
      peopleStore.fetchPeople(),
      projectsStore.fetchProjects(),
      tasksStore.fetchTasks(),
      behaviorsStore.fetchBehaviors()
    ])
    
    // Build network data
    buildNetworkData()
    
    // Initialize network visualization
    await nextTick()
    await initializeNetwork()
  } catch (error) {
    console.error('Error loading data:', error)
    networkError.value = 'Failed to load data. Please try again.'
  } finally {
    loading.value = false
  }
})

// Watch for changes in filters
watch([
  entityTypes,
  selectedPeople,
  selectedProjects,
  selectedTaskStatuses,
  selectedBehaviorTypes,
  focusedEntity
], () => {
  if (loading.value) return
  
  updateNetworkData()
}, { deep: true })
</script>

<style scoped>
.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
