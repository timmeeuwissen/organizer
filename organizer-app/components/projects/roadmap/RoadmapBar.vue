<template lang="pug">
div.roadmap-bar-wrap(
  :style="wrapStyle"
  @mousedown.left.stop="onBodyMousedown"
  @contextmenu.prevent="showMenu = true"
)
  //- Left resize handle
  div.roadmap-bar__handle.roadmap-bar__handle--left(
    @mousedown.left.stop="onHandleMousedown('left', $event)"
  )
  //- Bar body
  div.roadmap-bar__body(:style="{ background: `rgb(var(--v-theme-${color}))` }")
    span.roadmap-bar__label {{ title }}
    v-btn.roadmap-bar__link-badge(
      v-if="links.length"
      icon
      size="x-small"
      variant="tonal"
      :title="$t('roadmap.linkedItems')"
      @click.stop="showLinks = true"
    )
      v-badge(:content="links.length" color="white" text-color="black")
        v-icon(size="small") mdi-link-variant
  //- Right resize handle
  div.roadmap-bar__handle.roadmap-bar__handle--right(
    @mousedown.left.stop="onHandleMousedown('right', $event)"
  )

  //- Context menu (activator="parent" anchors it to the bar in Vuetify 3)
  v-menu(v-model="showMenu" activator="parent")
    v-list(density="compact")
      v-list-item(prepend-icon="mdi-pencil" :title="$t('roadmap.activity.edit')" @click="$emit('edit')")
      v-list-item(prepend-icon="mdi-link-plus" :title="$t('roadmap.linkItem')" @click="$emit('link')")
      v-list-item(prepend-icon="mdi-delete" :title="$t('roadmap.activity.delete')" @click="$emit('delete')")

  //- Links popover
  v-dialog(v-model="showLinks" max-width="360")
    v-card
      v-card-title {{ $t('roadmap.linkedItems') }}
      v-list(density="compact")
        v-list-item(
          v-for="lnk in links"
          :key="lnk.id"
          :prepend-icon="moduleIcon(lnk.module)"
          :title="lnk.title"
          :to="moduleRoute(lnk)"
        )
      v-card-actions
        v-spacer
        v-btn(@click="showLinks = false") {{ $t('common.close') }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RoadmapActivityLink } from '~/types/models/roadmap'

const props = defineProps<{
  title: string
  color: string
  leftPx: number
  widthPx: number
  links: RoadmapActivityLink[]
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  link: []
  dragStart: [mode: 'move' | 'resize-left' | 'resize-right', startX: number]
}>()

const showMenu = ref(false)
const showLinks = ref(false)

const wrapStyle = computed(() => ({
  left: `${props.leftPx}px`,
  width: `${props.widthPx}px`
}))

function onBodyMousedown (e: MouseEvent) {
  emit('dragStart', 'move', e.clientX)
}

function onHandleMousedown (side: 'left' | 'right', e: MouseEvent) {
  emit('dragStart', side === 'left' ? 'resize-left' : 'resize-right', e.clientX)
}

function moduleIcon (module: RoadmapActivityLink['module']): string {
  switch (module) {
    case 'tasks': return 'mdi-checkbox-marked-outline'
    case 'meetings': return 'mdi-account-group-outline'
    case 'notes': return 'mdi-note-outline'
  }
}

function moduleRoute (lnk: RoadmapActivityLink): string {
  switch (lnk.module) {
    case 'tasks': return `/tasks?id=${lnk.id}`
    case 'meetings': return `/meetings/${lnk.id}`
    case 'notes': return '#'
  }
}
</script>

<style lang="sass">
.roadmap-bar-wrap
  position: absolute
  top: 4px
  bottom: 4px
  display: flex
  align-items: stretch
  cursor: grab
  z-index: 1

  &:active
    cursor: grabbing

.roadmap-bar__handle
  width: 6px
  flex-shrink: 0
  cursor: ew-resize
  background: rgba(0,0,0,0.2)
  border-radius: 2px 0 0 2px

  &--right
    border-radius: 0 2px 2px 0

.roadmap-bar__body
  flex: 1
  border-radius: 2px
  display: flex
  align-items: center
  padding: 0 6px
  overflow: hidden
  user-select: none

.roadmap-bar__label
  font-size: 12px
  color: white
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  flex: 1

.roadmap-bar__link-badge
  flex-shrink: 0
  margin-left: 4px
</style>
