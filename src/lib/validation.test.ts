import { describe, expect, it } from 'vitest'
import { validateImage, validateProject, validateQuoteRequest } from './validation'

describe('portfolio input validation', () => {
  it('accepts a valid completed project with an optional value', () => {
    expect(validateProject({
      title: 'Kitchen renewal',
      category: 'Renovation',
      description: 'A complete kitchen refit.',
      projectValue: '28000',
    })).toBeNull()
  })

  describe('quote request validation', () => {
    const validRequest = {
      customerName: 'Jordan Lee',
      customerEmail: 'jordan@example.com',
      customerPhone: '555-0100',
      projectType: 'Kitchen renovation',
      projectLocation: 'Pune, Maharashtra',
      projectDescription: 'I would like to renovate a small kitchen this spring.',
    }

    it('accepts a complete customer enquiry', () => {
      expect(validateQuoteRequest(validRequest)).toBeNull()
    })

    it('rejects invalid contact information and incomplete project details', () => {
      expect(validateQuoteRequest({ ...validRequest, customerEmail: 'not-an-email' })).toMatch(/valid email/)
      expect(validateQuoteRequest({ ...validRequest, projectDescription: 'Help please' })).toMatch(/20–2,000/)
    })
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
