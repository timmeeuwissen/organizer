/**
 * Helper function to revive dates from JSON
 * This solves the problem of date objects being converted to strings during JSON serialization
 */
export function dateReviver(key: string, value: any): any {
  // Check if the value is a string and looks like an ISO date
  if (typeof value === 'string' && 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}

/**
 * Process an entire object to revive dates
 */
export function reviveDates(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => reviveDates(item));
  }
  
  // Handle objects
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    // Special handling for known date fields
    if (['startTime', 'endTime', 'createdAt', 'updatedAt', 'date', 'lastContacted'].includes(key) && 
        typeof value === 'string') {
      result[key] = new Date(value);
    } 
    // Recursively process nested objects
    else if (typeof value === 'object' && value !== null) {
      result[key] = reviveDates(value);
    } 
    // Pass through other values
    else {
      result[key] = value;
    }
  }
  
  return result;
}
