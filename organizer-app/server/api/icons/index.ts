import { defineEventHandler } from 'h3'
import { loadIcons } from '../../../data/yamlLoader'

export default defineEventHandler(async (event) => {
  try {
    // Load icons data from YAML file
    const iconsData = loadIcons()
    
    // Return the icons data
    return {
      success: true,
      data: iconsData.icons
    }
  } catch (error) {
    console.error('Error loading icons:', error)
    return {
      success: false,
      error: 'Failed to load icons data'
    }
  }
})
