<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('statistics.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('common.filters') }}
        v-card-text
          v-select(
            v-model="period"
            :items="periodOptions"
            :label="$t('common.period')"
            variant="outlined"
            density="comfortable"
          )
          
          v-select(
            v-model="chartType"
            :items="chartTypeOptions"
            :label="$t('statistics.chartType')"
            variant="outlined"
            density="comfortable"
          )
          
  v-row
    v-col(cols="12" xl="6")
      v-card(class="mb-4")
        v-card-title {{ $t('statistics.timeDistribution') }}
        v-card-text
          v-alert(v-if="loading" type="info") {{ $t('common.loading') }}
          v-alert(v-else-if="!hasData" type="info") {{ $t('statistics.noData') }}
          
          div(
            v-else
            ref="timeDistributionChart"
            style="height: 400px"
          )
            canvas(ref="timeDistributionCanvas")
    
    v-col(cols="12" xl="6")
      v-card(class="mb-4")
        v-card-title {{ $t('statistics.taskCompletion') }}
        v-card-text
          v-alert(v-if="loading" type="info") {{ $t('common.loading') }}
          v-alert(v-else-if="!hasTaskData" type="info") {{ $t('statistics.noTaskData') }}
          
          div(
            v-else
            ref="taskCompletionChart"
            style="height: 400px"
          )
            canvas(ref="taskCompletionCanvas")
  
  v-row
    v-col(cols="12" md="6")
      v-card(class="mb-4")
        v-card-title {{ $t('statistics.projectProgress') }}
        v-card-text
          v-alert(v-if="loading" type="info") {{ $t('common.loading') }}
          v-alert(v-else-if="!hasProjectData" type="info") {{ $t('statistics.noProjectData') }}
          
          div(v-else)
            v-list(v-if="projectStats.length > 0")
              v-list-item(
                v-for="project in projectStats"
                :key="project.id"
              )
                template(v-slot:prepend)
                  v-avatar(size="36" :color="getRandomColor(project.id)")
                    span {{ project.title.charAt(0) }}
                
                v-list-item-title {{ project.title }}
                
                template(v-slot:append)
                  v-chip(
                    :color="getProgressColor(project.progress)"
                    text-color="white"
                  ) {{ project.progress }}%
                
                template(v-slot:subtitle)
                  v-progress-linear(
                    :model-value="project.progress"
                    :color="getProgressColor(project.progress)"
                    height="8"
                    class="mt-1"
                  )
    
    v-col(cols="12" md="6")
      v-card(class="mb-4")
        v-card-title {{ $t('statistics.behaviorsTracking') }}
        v-card-text
          v-alert(v-if="loading" type="info") {{ $t('common.loading') }}
          v-alert(v-else-if="!hasBehaviorData" type="info") {{ $t('statistics.noBehaviorData') }}
          
          div(
            v-else
            ref="behaviorChart"
            style="height: 400px"
          )
            canvas(ref="behaviorCanvas")
  
  v-row
    v-col(cols="12")
      v-card
        v-card-title {{ $t('statistics.timeTracking') }}
        v-tabs(v-model="timeTab")
          v-tab(value="projects") {{ $t('projects.title') }}
          v-tab(value="meetings") {{ $t('meetings.title') }}
          v-tab(value="tasks") {{ $t('tasks.title') }}
        
        v-window(v-model="timeTab")
          v-window-item(value="projects")
            v-card-text
              v-data-table(
                :headers="projectTimeHeaders"
                :items="projectTimeData"
                :sort-by="[{ key: 'timeSpent', order: 'desc' }]"
              )
                template(v-slot:item.timeSpent="{ item }")
                  span {{ formatTime(item.timeSpent) }}
                
                template(v-slot:item.percentage="{ item }")
                  v-progress-linear(
                    :model-value="item.percentage"
                    height="20"
                    :color="getRandomColor(item.id)"
                  )
                    template(v-slot:default="{ value }")
                      span {{ Math.round(value) }}%
          
          v-window-item(value="meetings")
            v-card-text
              v-data-table(
                :headers="meetingTimeHeaders"
                :items="meetingTimeData"
                :sort-by="[{ key: 'timeSpent', order: 'desc' }]"
              )
                template(v-slot:item.timeSpent="{ item }")
                  span {{ formatTime(item.timeSpent) }}
                
                template(v-slot:item.percentage="{ item }")
                  v-progress-linear(
                    :model-value="item.percentage"
                    height="20"
                    :color="getColorForCategory(item.category)"
                  )
                    template(v-slot:default="{ value }")
                      span {{ Math.round(value) }}%
          
          v-window-item(value="tasks")
            v-card-text
              v-data-table(
                :headers="taskTimeHeaders"
                :items="taskTimeData"
                :sort-by="[{ key: 'timeSpent', order: 'desc' }]"
              )
                template(v-slot:item.timeSpent="{ item }")
                  span {{ formatTime(item.timeSpent) }}
                
                template(v-slot:item.status="{ item }")
                  v-chip(
                    :color="getStatusColor(item.status)"
                    text-color="white"
                    size="small"
                  ) {{ item.status }}
                
                template(v-slot:item.percentage="{ item }")
                  v-progress-linear(
                    :model-value="item.percentage"
                    height="20"
                    :color="getPriorityColor(item.priority)"
                  )
                    template(v-slot:default="{ value }")
                      span {{ Math.round(value) }}%
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useMeetingsStore } from '~/stores/meetings'
import type { Project, Task, Behavior, Meeting } from '~/types/models'

let Chart: any

// Stores
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const behaviorsStore = useBehaviorsStore()
const meetingsStore = useMeetingsStore()

// UI state
const loading = ref(true)
const period = ref('month')
const chartType = ref('bar')
const timeTab = ref('projects')

// Chart refs
const timeDistributionCanvas = ref(null)
const taskCompletionCanvas = ref(null)
const behaviorCanvas = ref(null)

// Charts
const timeDistributionChart = ref(null)
const taskCompletionChart = ref(null)
const behaviorChart = ref(null)

// Options
const periodOptions = [
  { title: 'Last Week', value: 'week' },
  { title: 'Last Month', value: 'month' },
  { title: 'Last 3 Months', value: 'quarter' },
  { title: 'Last Year', value: 'year' },
  { title: 'All Time', value: 'all' }
]

const chartTypeOptions = [
  { title: 'Bar Chart', value: 'bar' },
  { title: 'Pie Chart', value: 'pie' },
  { title: 'Line Chart', value: 'line' },
  { title: 'Radar Chart', value: 'radar' }
]

// Table headers
const projectTimeHeaders = [
  { title: 'Project', key: 'title', sortable: true },
  { title: 'Time Spent', key: 'timeSpent', sortable: true },
  { title: 'Tasks Completed', key: 'tasksCompleted', sortable: true },
  { title: 'Percentage', key: 'percentage', sortable: true }
]

const meetingTimeHeaders = [
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Count', key: 'count', sortable: true },
  { title: 'Time Spent', key: 'timeSpent', sortable: true },
  { title: 'Percentage', key: 'percentage', sortable: true }
]

const taskTimeHeaders = [
  { title: 'Task', key: 'title', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Time Spent', key: 'timeSpent', sortable: true },
  { title: 'Percentage', key: 'percentage', sortable: true }
]

// Computed data
const hasData = computed(() => {
  return projectTimeData.value.length > 0 || meetingTimeData.value.length > 0 || taskTimeData.value.length > 0
})

const hasProjectData = computed(() => {
  return projectTimeData.value.length > 0
})

const hasTaskData = computed(() => {
  return taskTimeData.value.length > 0
})

const hasBehaviorData = computed(() => {
  return behaviorStats.value.length > 0
})

const projectStats = computed(() => {
  return projectsStore.projects.map(project => ({
    id: project.id,
    title: project.title,
    progress: project.progress,
    timeSpent: getProjectTimeSpent(project.id)
  }))
})

const behaviorStats = computed(() => {
  return behaviorsStore.behaviors.map(behavior => ({
    id: behavior.id,
    title: behavior.title,
    type: behavior.type,
    count: getBehaviorCount(behavior.id)
  }))
})

// Generate mock time data
const projectTimeData = computed(() => {
  const projects = projectsStore.projects.map(project => {
    // Generate mock time spent (1-20 hours in minutes)
    const timeSpent = Math.round((1 + Math.random() * 19) * 60)
    
    return {
      id: project.id,
      title: project.title,
      timeSpent,
      tasksCompleted: Math.floor(Math.random() * 10),
      percentage: 0 // Will be calculated below
    }
  })
  
  // Calculate percentages
  const totalTime = projects.reduce((sum, project) => sum + project.timeSpent, 0)
  return projects.map(project => ({
    ...project,
    percentage: totalTime > 0 ? (project.timeSpent / totalTime) * 100 : 0
  }))
})

const meetingTimeData = computed(() => {
  // Group meetings by category
  const categories = {}
  
  meetingsStore.meetings.forEach(meeting => {
    const category = meeting.category || 'uncategorized'
    
    if (!categories[category]) {
      categories[category] = {
        category,
        count: 0,
        timeSpent: 0
      }
    }
    
    categories[category].count++
    
    // Calculate meeting duration in minutes
    if (meeting.startTime && meeting.endTime) {
      const duration = Math.round((meeting.endTime.getTime() - meeting.startTime.getTime()) / (60 * 1000))
      categories[category].timeSpent += duration
    } else {
      // Default to 1 hour if no times
      categories[category].timeSpent += 60
    }
  })
  
  const result = Object.values(categories)
  
  // Calculate percentages
  const totalTime = result.reduce((sum: number, cat: any) => sum + cat.timeSpent, 0)
  return result.map((cat: any) => ({
    ...cat,
    percentage: totalTime > 0 ? (cat.timeSpent / totalTime) * 100 : 0
  }))
})

const taskTimeData = computed(() => {
  const tasks = tasksStore.tasks.map(task => {
    // Generate mock time spent (15min - 4 hours in minutes)
    const timeSpent = Math.round((0.25 + Math.random() * 3.75) * 60)
    
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      timeSpent,
      percentage: 0 // Will be calculated below
    }
  })
  
  // Calculate percentages
  const totalTime = tasks.reduce((sum, task) => sum + task.timeSpent, 0)
  return tasks.map(task => ({
    ...task,
    percentage: totalTime > 0 ? (task.timeSpent / totalTime) * 100 : 0
  }))
})

// Helper functions
const getRandomColor = (id: string) => {
  // Generate deterministic color based on ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

const getColorForCategory = (category: string) => {
  const categoryColors = {
    standup: '#4CAF50',
    planning: '#2196F3',
    review: '#FF9800',
    retrospective: '#9C27B0',
    one_on_one: '#607D8B',
    client_meeting: '#F44336',
    workshop: '#009688',
    interview: '#795548',
    demo: '#3F51B5',
    brainstorming: '#FF5722',
    uncategorized: '#9E9E9E'
  }
  
  return categoryColors[category] || getRandomColor(category)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return 'grey'
    case 'inProgress': return 'info'
    case 'completed': return 'success'
    case 'delegated': return 'warning'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'success'
    case 'medium': return 'info'
    case 'high': return 'warning'
    case 'urgent': return 'error'
    default: return 'grey'
  }
}

const getProgressColor = (progress: number) => {
  if (progress < 25) return 'error'
  if (progress < 50) return 'warning'
  if (progress < 75) return 'info'
  return 'success'
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}

// Mock data generators
const getProjectTimeSpent = (projectId: string) => {
  const projectItem = projectTimeData.value.find(p => p.id === projectId)
  return projectItem ? projectItem.timeSpent : 0
}

const getBehaviorCount = (behaviorId: string) => {
  // Generate a random count (1-20)
  return Math.floor(1 + Math.random() * 19)
}

// Chart initialization
const initCharts = async () => {
  if (!Chart) {
    try {
      // Try to dynamically import Chart.js
      const chartJs = await import('chart.js/auto')
      Chart = chartJs.default
    } catch (error) {
      console.error('Failed to load Chart.js:', error)
      // Create a mock Chart object for demo purposes
      Chart = {
        register: () => {},
        defaults: {},
      }
    }
  }
  
  await nextTick()
  
  // Initialize time distribution chart
  if (timeDistributionCanvas.value && hasData.value) {
    if (timeDistributionChart.value) {
      timeDistributionChart.value.destroy()
    }
    
    const ctx = timeDistributionCanvas.value.getContext('2d')
    
    const labels = period.value === 'week' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : period.value === 'month'
        ? Array.from({ length: 30 }, (_, i) => (i + 1).toString())
        : period.value === 'quarter'
          ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, 3)
          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const projectData = labels.map(() => Math.floor(Math.random() * 5 * 60)) // 0-5 hours in minutes
    const meetingData = labels.map(() => Math.floor(Math.random() * 3 * 60)) // 0-3 hours in minutes
    const taskData = labels.map(() => Math.floor(Math.random() * 4 * 60)) // 0-4 hours in minutes
    
    timeDistributionChart.value = new Chart(ctx, {
      type: chartType.value,
      data: {
        labels,
        datasets: [
          {
            label: 'Projects',
            data: projectData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Meetings',
            data: meetingData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'Tasks',
            data: taskData,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: chartType.value === 'bar' || chartType.value === 'line' ? {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatTime(Number(value))
              }
            }
          }
        } : undefined
      }
    })
  }
  
  // Initialize task completion chart
  if (taskCompletionCanvas.value && hasTaskData.value) {
    if (taskCompletionChart.value) {
      taskCompletionChart.value.destroy()
    }
    
    const ctx = taskCompletionCanvas.value.getContext('2d')
    
    // Group tasks by status
    const statusGroups = {}
    tasksStore.tasks.forEach(task => {
      if (!statusGroups[task.status]) {
        statusGroups[task.status] = 0
      }
      statusGroups[task.status]++
    })
    
    const labels = Object.keys(statusGroups)
    const data = Object.values(statusGroups)
    const backgroundColors = labels.map(status => {
      const color = getStatusColor(status)
      return color === 'info' ? '#2196F3' : 
             color === 'success' ? '#4CAF50' : 
             color === 'warning' ? '#FF9800' : 
             color === 'error' ? '#F44336' : '#9E9E9E'
    })
    
    taskCompletionChart.value = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: backgroundColors,
            borderColor: 'white',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    })
  }
  
  // Initialize behavior chart
  if (behaviorCanvas.value && hasBehaviorData.value) {
    if (behaviorChart.value) {
      behaviorChart.value.destroy()
    }
    
    const ctx = behaviorCanvas.value.getContext('2d')
    
    // Group behaviors by type
    const behaviorsByType = {
      'doWell': [],
      'wantToDoBetter': [],
      'needToImprove': []
    }
    
    behaviorsStore.behaviors.forEach(behavior => {
      if (behaviorsByType[behavior.type]) {
        behaviorsByType[behavior.type].push(behavior)
      }
    })
    
    const labels = Object.keys(behaviorsByType).map(type => {
      switch (type) {
        case 'doWell': return 'Doing Well'
        case 'wantToDoBetter': return 'Want to Do Better'
        case 'needToImprove': return 'Need to Improve'
        default: return type
      }
    })
    
    const data = Object.values(behaviorsByType).map(behaviors => behaviors.length)
    const backgroundColors = [
      'rgba(76, 175, 80, 0.5)', // green for doWell
      'rgba(33, 150, 243, 0.5)', // blue for wantToDoBetter
      'rgba(255, 152, 0, 0.5)'  // orange for needToImprove
    ]
    
    behaviorChart.value = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Number of Behaviors',
            data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    })
  }
}

// Load data
onMounted(async () => {
  try {
    await Promise.all([
      projectsStore.fetchProjects(),
      tasksStore.fetchTasks(),
      behaviorsStore.fetchBehaviors(),
      meetingsStore.fetchMeetings()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
    initCharts()
  }
})

// Watch for changes in period or chart type
watch([period, chartType], () => {
  initCharts()
})
</script>
