import fs from 'fs'
import { parse } from 'yaml'

/**
 * Loads YAML data from a file
 * @param path Path to the YAML file
 * @returns Parsed YAML data
 */
export function loadYamlFile<T>(path: string): T {
  try {
    const fileContents = fs.readFileSync(path, 'utf8')
    return parse(fileContents) as T
  } catch (error) {
    console.error(`Error loading YAML file ${path}:`, error)
    throw error
  }
}

/**
 * Loads meeting categories from YAML
 * @returns Meeting categories data
 */
export function loadMeetingCategories() {
  return loadYamlFile<{
    categories: Array<{
      id: string
      name: string
      description: string
      color: string
      icon: string
    }>
  }>('data/meetingCategories.yaml')
}

/**
 * Interface for icon data with translations
 */
export interface IconData {
  icon: string
  translations: {
    [key: string]: string
  }
}

/**
 * Loads icons with translations from YAML
 * @returns Icons data with translations
 */
export function loadIcons() {
  return loadYamlFile<{
    icons: IconData[]
  }>('data/icons.yaml')
}
