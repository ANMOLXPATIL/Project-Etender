import { describe, expect, it } from 'vitest'
import { validateImage, validateProject } from './validation'

describe('portfolio input validation', () => {
  it('accepts a valid completed project with an optional value', () => {
    expect(validateProject({
      title: 'Kitchen renewal',
      category: 'Renovation',
      description: 'A complete kitchen refit.',
      projectValue: '28000',
    })).toBeNull()
  })

  it('rejects short required fields, oversized text, and negative values', () => {
    expect(validateProject({ title: 'x', category: 'Repair', description: '', projectValue: '' })).toMatch(/title/)
    expect(validateProject({ title: 'Project title', category: 'x', description: '', projectValue: '' })).toMatch(/Category/)
    expect(validateProject({ title: 'Project title', category: 'Repair', description: 'a'.repeat(2001), projectValue: '' })).toMatch(/Description/)
    expect(validateProject({ title: 'Project title', category: 'Repair', description: '', projectValue: '-1' })).toMatch(/non-negative/)
  })

  it('restricts portfolio images to supported types and 5 MB', () => {
    expect(validateImage(new File(['image'], 'project.webp', { type: 'image/webp' }))).toBeNull()
    expect(validateImage(new File(['image'], 'project.svg', { type: 'image/svg+xml' }))).toMatch(/JPG, PNG, or WebP/)
    expect(validateImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))).toMatch(/5 MB/)
  })
})
