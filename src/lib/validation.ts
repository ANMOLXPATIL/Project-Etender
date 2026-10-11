export function validateProject(input: {
  title: string
  category: string
  description: string
  projectValue: string
}): string | null {
  const title = input.title.trim()
  const category = input.category.trim()
  const value = input.projectValue.trim()
  if (title.length < 2 || title.length > 140) return 'Project title must be between 2 and 140 characters.'
  if (category.length < 2 || category.length > 80) return 'Category must be between 2 and 80 characters.'
  if (input.description.length > 2000) return 'Description must be 2,000 characters or fewer.'
  if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) return 'Project value must be a non-negative number.'
  return null
}

export function validateImage(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) return 'Choose a JPG, PNG, or WebP image.'
  if (file.size > 5 * 1024 * 1024) return 'Image must be 5 MB or smaller.'
  return null
}
