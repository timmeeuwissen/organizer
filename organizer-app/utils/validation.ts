export function hasTrimmedText (value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : !!value
}

export function requiredTrimmed (
  value: unknown,
  message: string
): true | string {
  return hasTrimmedText(value) ? true : message
}
