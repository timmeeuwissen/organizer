import { defineEventHandler } from 'h3'
import { 
  loadIcons, 
  IconData, 
  CategoryData, 
  Translations,
  IconsYamlData
} from '../../../data/yamlLoader'

export default defineEventHandler(async (event) => {
  try {
    // Load icons data from YAML file using the new structure
    const iconsData = loadIcons()
    
    // The new structure has categories as the top-level object
    const categoriesObj = iconsData.categories
    
    // Extract category names and translations
    const categoryTranslations: { [key: string]: Translations } = {}
    
    // Collect all icons with their category as a property
    const allIcons: (IconData & { category: string })[] = []
    
    // Process each category
    for (const categoryKey in categoriesObj) {
      const category = categoriesObj[categoryKey]
      
      // Store category translations
      categoryTranslations[categoryKey] = category.translations
      
      // Add all icons from this category with the category marked
      if (Array.isArray(category.icons)) {
        category.icons.forEach(icon => {
          allIcons.push({
            ...icon,
            category: categoryKey
          })
        })
      }
    }
    
    // Return the structured data
    return {
      success: true,
      data: allIcons,
      categories: categoryTranslations
    }
  } catch (error) {
    console.error('Error loading icons:', error)
    return {
      success: false,
      error: 'Failed to load icons data'
    }
  }
})
