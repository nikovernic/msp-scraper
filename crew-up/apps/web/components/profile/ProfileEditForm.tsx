'use client'

import { useState } from 'react'
import { useForm, useFieldArray, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Profile, Credit } from '@crew-up/shared'
import Image from 'next/image'

// Zod schema for form validation (matches API schema)
const profileEditFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  primary_role: z.string().min(1, 'Primary role is required'),
  primary_location_city: z.string().min(1, 'City is required'),
  primary_location_state: z.string().length(2, 'State must be 2-letter code'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional().nullable(),
  bio: z.string().max(250, 'Bio must be 250 characters or less').optional().nullable(),
  portfolio_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  website: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  instagram_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  vimeo_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  union_status: z.enum(['union', 'non-union', 'either']).optional().nullable(),
  years_experience: z.number().int().positive().optional().nullable(),
  secondary_roles: z.array(z.string()).optional().nullable(),
  additional_markets: z
    .array(
      z.object({
        city: z.string().min(1, 'City is required'),
        state: z.string().length(2, 'State must be 2-letter code'),
      })
    )
    .optional()
    .nullable(),
  photo_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
})

type ProfileEditFormData = z.infer<typeof profileEditFormSchema>

interface ProfileEditFormProps {
  profile: Profile & { credits?: Credit[] }
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.photo_url)
  const [credits, setCredits] = useState<Credit[]>(profile.credits || [])
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null)
  const [isAddingCredit, setIsAddingCredit] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: profile.name,
      primary_role: profile.primary_role,
      primary_location_city: profile.primary_location_city,
      primary_location_state: profile.primary_location_state,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone || '',
      bio: profile.bio || '',
      portfolio_url: profile.portfolio_url || '',
      website: profile.website || '',
      instagram_url: profile.instagram_url || '',
      vimeo_url: profile.vimeo_url || '',
      union_status: profile.union_status,
      years_experience: profile.years_experience,
      secondary_roles: profile.secondary_roles || [],
      additional_markets: profile.additional_markets || [],
      photo_url: profile.photo_url || '',
    },
  })

  // Use explicit generic types and type assertions to help TypeScript infer the correct field paths
  // TypeScript can get confused with multiple useFieldArray calls, so we use type assertions
  const { fields: secondaryRoleFields, append: appendSecondaryRole, remove: removeSecondaryRole } = useFieldArray({
    control,
    name: 'secondary_roles' as any,
  })

  const { fields: additionalMarketFields, append: appendAdditionalMarket, remove: removeAdditionalMarket } = useFieldArray({
    control,
    name: 'additional_markets' as any,
  })

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setSubmitStatus({
        type: 'error',
        message: 'Invalid file type. Only JPG, PNG, and WebP images are allowed.',
      })
      return
    }

    // Validate file size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setSubmitStatus({
        type: 'error',
        message: 'File size exceeds 5MB limit.',
      })
      return
    }

    setIsUploadingPhoto(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to API
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch('/api/profiles/me/photo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error?.message || 'Failed to upload photo. Please try again.'
        setSubmitStatus({ type: 'error', message: errorMessage })
        setIsUploadingPhoto(false)
        return
      }

      // Update form with new photo URL
      setValue('photo_url', result.photo_url)
      setSubmitStatus({
        type: 'success',
        message: 'Photo uploaded successfully!',
      })
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred while uploading the photo. Please try again.',
      })
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // Clean up empty strings to null for optional fields
      const cleanedData = {
        ...data,
        contact_phone: data.contact_phone || null,
        bio: data.bio || null,
        portfolio_url: data.portfolio_url || null,
        website: data.website || null,
        instagram_url: data.instagram_url || null,
        vimeo_url: data.vimeo_url || null,
        union_status: data.union_status || null,
        years_experience: data.years_experience || null,
        secondary_roles: data.secondary_roles && data.secondary_roles.length > 0 ? data.secondary_roles : null,
        additional_markets: data.additional_markets && data.additional_markets.length > 0 ? data.additional_markets : null,
        photo_url: data.photo_url || null,
      }

      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error?.message || 'Failed to update profile. Please try again.'
        setSubmitStatus({ type: 'error', message: errorMessage })
        return
      }

      setSubmitStatus({
        type: 'success',
        message: 'Profile updated successfully!',
      })
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Photo Upload */}
        <div className="border rounded-lg p-6 bg-card">
          <label className="block text-sm font-medium mb-2">Profile Photo</label>
          <div className="flex items-start gap-4">
            {photoPreview && (
              <div className="flex-shrink-0">
                <Image
                  src={photoPreview}
                  alt="Profile preview"
                  width={150}
                  height={150}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload profile photo"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                JPG, PNG, or WebP. Max 5MB.
              </p>
              {isUploadingPhoto && (
                <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Primary Role */}
          <div>
            <label htmlFor="primary_role" className="block text-sm font-medium mb-2">
              Primary Role <span className="text-destructive">*</span>
            </label>
            <input
              id="primary_role"
              type="text"
              {...register('primary_role')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={errors.primary_role ? 'true' : 'false'}
              aria-describedby={errors.primary_role ? 'primary_role-error' : undefined}
            />
            {errors.primary_role && (
              <p id="primary_role-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.primary_role.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="primary_location_city" className="block text-sm font-medium mb-2">
                City <span className="text-destructive">*</span>
              </label>
              <input
                id="primary_location_city"
                type="text"
                {...register('primary_location_city')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                aria-invalid={errors.primary_location_city ? 'true' : 'false'}
                aria-describedby={errors.primary_location_city ? 'primary_location_city-error' : undefined}
              />
              {errors.primary_location_city && (
                <p id="primary_location_city-error" className="mt-1 text-sm text-destructive" role="alert">
                  {errors.primary_location_city.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="primary_location_state" className="block text-sm font-medium mb-2">
                State <span className="text-destructive">*</span>
              </label>
              <input
                id="primary_location_state"
                type="text"
                maxLength={2}
                {...register('primary_location_state')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                aria-invalid={errors.primary_location_state ? 'true' : 'false'}
                aria-describedby={errors.primary_location_state ? 'primary_location_state-error' : undefined}
              />
              {errors.primary_location_state && (
                <p id="primary_location_state-error" className="mt-1 text-sm text-destructive" role="alert">
                  {errors.primary_location_state.message}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              {...register('bio')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              aria-invalid={errors.bio ? 'true' : 'false'}
              aria-describedby={errors.bio ? 'bio-error' : undefined}
            />
            {errors.bio && (
              <p id="bio-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.bio.message}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Maximum 250 characters ({watch('bio')?.length || 0}/250)
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

          {/* Contact Email */}
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium mb-2">
              Contact Email <span className="text-destructive">*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              {...register('contact_email')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={errors.contact_email ? 'true' : 'false'}
              aria-describedby={errors.contact_email ? 'contact_email-error' : undefined}
            />
            {errors.contact_email && (
              <p id="contact_email-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.contact_email.message}
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium mb-2">
              Contact Phone
            </label>
            <input
              id="contact_phone"
              type="tel"
              {...register('contact_phone')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={errors.contact_phone ? 'true' : 'false'}
              aria-describedby={errors.contact_phone ? 'contact_phone-error' : undefined}
            />
            {errors.contact_phone && (
              <p id="contact_phone-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.contact_phone.message}
              </p>
            )}
          </div>
        </div>

        {/* Professional Details */}
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Professional Details</h2>

          {/* Union Status */}
          <div>
            <label htmlFor="union_status" className="block text-sm font-medium mb-2">
              Union Status
            </label>
            <select
              id="union_status"
              {...register('union_status')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select union status</option>
              <option value="union">Union</option>
              <option value="non-union">Non-Union</option>
              <option value="either">Either</option>
            </select>
          </div>

          {/* Years Experience */}
          <div>
            <label htmlFor="years_experience" className="block text-sm font-medium mb-2">
              Years of Experience
            </label>
            <input
              id="years_experience"
              type="number"
              min="0"
              {...register('years_experience', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={errors.years_experience ? 'true' : 'false'}
              aria-describedby={errors.years_experience ? 'years_experience-error' : undefined}
            />
            {errors.years_experience && (
              <p id="years_experience-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.years_experience.message}
              </p>
            )}
          </div>

          {/* Secondary Roles */}
          <div>
            <label className="block text-sm font-medium mb-2">Secondary Roles</label>
            {secondaryRoleFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <input
                  type="text"
                  {...register(`secondary_roles.${index}`)}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Secondary role"
                />
                <button
                  type="button"
                  onClick={() => removeSecondaryRole(index)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendSecondaryRole('')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Add Secondary Role
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Links</h2>

          {/* Portfolio URL */}
          <div>
            <label htmlFor="portfolio_url" className="block text-sm font-medium mb-2">
              Portfolio URL
            </label>
            <input
              id="portfolio_url"
              type="url"
              {...register('portfolio_url')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com/portfolio"
              aria-invalid={errors.portfolio_url ? 'true' : 'false'}
              aria-describedby={errors.portfolio_url ? 'portfolio_url-error' : undefined}
            />
            {errors.portfolio_url && (
              <p id="portfolio_url-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.portfolio_url.message}
              </p>
            )}
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium mb-2">
              Website
            </label>
            <input
              id="website"
              type="url"
              {...register('website')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com"
              aria-invalid={errors.website ? 'true' : 'false'}
              aria-describedby={errors.website ? 'website-error' : undefined}
            />
            {errors.website && (
              <p id="website-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.website.message}
              </p>
            )}
          </div>

          {/* Instagram URL */}
          <div>
            <label htmlFor="instagram_url" className="block text-sm font-medium mb-2">
              Instagram URL
            </label>
            <input
              id="instagram_url"
              type="url"
              {...register('instagram_url')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://instagram.com/username"
              aria-invalid={errors.instagram_url ? 'true' : 'false'}
              aria-describedby={errors.instagram_url ? 'instagram_url-error' : undefined}
            />
            {errors.instagram_url && (
              <p id="instagram_url-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.instagram_url.message}
              </p>
            )}
          </div>

          {/* Vimeo URL */}
          <div>
            <label htmlFor="vimeo_url" className="block text-sm font-medium mb-2">
              Vimeo URL
            </label>
            <input
              id="vimeo_url"
              type="url"
              {...register('vimeo_url')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://vimeo.com/username"
              aria-invalid={errors.vimeo_url ? 'true' : 'false'}
              aria-describedby={errors.vimeo_url ? 'vimeo_url-error' : undefined}
            />
            {errors.vimeo_url && (
              <p id="vimeo_url-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.vimeo_url.message}
              </p>
            )}
          </div>
        </div>

        {/* Additional Markets */}
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold mb-4">Additional Markets</h2>
          {additionalMarketFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                {...register(`additional_markets.${index}.city`)}
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="City"
              />
              <input
                type="text"
                maxLength={2}
                {...register(`additional_markets.${index}.state`)}
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                placeholder="State"
              />
              <button
                type="button"
                onClick={() => removeAdditionalMarket(index)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendAdditionalMarket({ city: '', state: '' })}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Add Market
          </button>
        </div>

        {/* Credits Management */}
        <CreditsManagementSection
          credits={credits}
          setCredits={setCredits}
          editingCreditId={editingCreditId}
          setEditingCreditId={setEditingCreditId}
          isAddingCredit={isAddingCredit}
          setIsAddingCredit={setIsAddingCredit}
        />

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Status Messages */}
        {submitStatus.type === 'success' && (
          <div
            className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800"
            role="alert"
          >
            {submitStatus.message}
          </div>
        )}

        {submitStatus.type === 'error' && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800"
            role="alert"
          >
            {submitStatus.message}
          </div>
        )}
      </form>
    </div>
  )
}

// Credits Management Component
interface CreditsManagementSectionProps {
  credits: Credit[]
  setCredits: React.Dispatch<React.SetStateAction<Credit[]>>
  editingCreditId: string | null
  setEditingCreditId: React.Dispatch<React.SetStateAction<string | null>>
  isAddingCredit: boolean
  setIsAddingCredit: React.Dispatch<React.SetStateAction<boolean>>
}

function CreditsManagementSection({
  credits,
  setCredits,
  editingCreditId,
  setEditingCreditId,
  isAddingCredit,
  setIsAddingCredit,
}: CreditsManagementSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteCredit = async (creditId: string) => {
    if (!confirm('Are you sure you want to delete this credit?')) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/me/credits/${creditId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to delete credit')
      }

      setCredits(credits.filter((c) => c.id !== creditId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credit')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCredit = async (data: {
    project_title: string
    role: string
    project_type: Credit['project_type']
    year: number
    production_company?: string | null
    director?: string | null
    display_order?: number
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/profiles/me/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to create credit')
      }

      const newCredit = await response.json()
      setCredits([...credits, newCredit])
      setIsAddingCredit(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create credit')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCredit = async (
    creditId: string,
    data: Partial<{
      project_title: string
      role: string
      project_type: Credit['project_type']
      year: number
      production_company?: string | null
      director?: string | null
      display_order?: number
    }>
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/me/credits/${creditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Failed to update credit')
      }

      const updatedCredit = await response.json()
      setCredits(credits.map((c) => (c.id === creditId ? updatedCredit : c)))
      setEditingCreditId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credit')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-card space-y-4">
      <h2 className="text-xl font-semibold mb-4">Credits</h2>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Existing Credits */}
      <div className="space-y-4">
        {credits.map((credit) => (
          <CreditItem
            key={credit.id}
            credit={credit}
            isEditing={editingCreditId === credit.id}
            onEdit={() => setEditingCreditId(credit.id)}
            onCancel={() => setEditingCreditId(null)}
            onSave={(data) => handleUpdateCredit(credit.id, data)}
            onDelete={() => handleDeleteCredit(credit.id)}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Add Credit Form */}
      {isAddingCredit ? (
        <CreditForm
          onSave={(data) => handleAddCredit(data)}
          onCancel={() => setIsAddingCredit(false)}
          isLoading={isLoading}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCredit(true)}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Add Credit
        </button>
      )}
    </div>
  )
}

// Credit Item Component
interface CreditItemProps {
  credit: Credit
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (data: Partial<Credit>) => void
  onDelete: () => void
  isLoading: boolean
}

function CreditItem({
  credit,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  isLoading,
}: CreditItemProps) {
  const [formData, setFormData] = useState({
    project_title: credit.project_title,
    role: credit.role,
    project_type: credit.project_type,
    year: credit.year,
    production_company: credit.production_company || '',
    director: credit.director || '',
    display_order: credit.display_order,
  })

  if (isEditing) {
    return (
      <div className="border-l-4 border-primary pl-4 space-y-2">
        <input
          type="text"
          value={formData.project_title}
          onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
          placeholder="Project Title"
          className="w-full px-3 py-2 border rounded-md"
        />
        <input
          type="text"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Role"
          className="w-full px-3 py-2 border rounded-md"
        />
        <select
          value={formData.project_type}
          onChange={(e) => setFormData({ ...formData, project_type: e.target.value as Credit['project_type'] })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="commercial">Commercial</option>
          <option value="feature_film">Feature Film</option>
          <option value="documentary">Documentary</option>
          <option value="music_video">Music Video</option>
          <option value="tv">TV</option>
          <option value="corporate">Corporate</option>
          <option value="other">Other</option>
        </select>
        <input
          type="number"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
          placeholder="Year"
          className="w-full px-3 py-2 border rounded-md"
        />
        <input
          type="text"
          value={formData.production_company}
          onChange={(e) => setFormData({ ...formData, production_company: e.target.value })}
          placeholder="Production Company (optional)"
          className="w-full px-3 py-2 border rounded-md"
        />
        <input
          type="text"
          value={formData.director}
          onChange={(e) => setFormData({ ...formData, director: e.target.value })}
          placeholder="Director (optional)"
          className="w-full px-3 py-2 border rounded-md"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave(formData)}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-l-4 border-primary pl-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{credit.project_title}</h3>
          <p className="text-muted-foreground">
            {credit.role} • {credit.project_type} • {credit.year}
          </p>
          {credit.production_company && (
            <p className="text-sm text-muted-foreground">{credit.production_company}</p>
          )}
          {credit.director && (
            <p className="text-sm text-muted-foreground">Director: {credit.director}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Credit Form Component (for adding new credits)
interface CreditFormProps {
  onSave: (data: {
    project_title: string
    role: string
    project_type: Credit['project_type']
    year: number
    production_company?: string | null
    director?: string | null
    display_order?: number
  }) => void
  onCancel: () => void
  isLoading: boolean
}

function CreditForm({ onSave, onCancel, isLoading }: CreditFormProps) {
  const [formData, setFormData] = useState({
    project_title: '',
    role: '',
    project_type: 'commercial' as Credit['project_type'],
    year: new Date().getFullYear(),
    production_company: '',
    director: '',
    display_order: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      production_company: formData.production_company || null,
      director: formData.director || null,
    })
    setFormData({
      project_title: '',
      role: '',
      project_type: 'commercial',
      year: new Date().getFullYear(),
      production_company: '',
      director: '',
      display_order: 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border-l-4 border-primary pl-4 space-y-2">
      <input
        type="text"
        value={formData.project_title}
        onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
        placeholder="Project Title *"
        required
        className="w-full px-3 py-2 border rounded-md"
      />
      <input
        type="text"
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        placeholder="Role *"
        required
        className="w-full px-3 py-2 border rounded-md"
      />
      <select
        value={formData.project_type}
        onChange={(e) => setFormData({ ...formData, project_type: e.target.value as Credit['project_type'] })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="commercial">Commercial</option>
        <option value="feature_film">Feature Film</option>
        <option value="documentary">Documentary</option>
        <option value="music_video">Music Video</option>
        <option value="tv">TV</option>
        <option value="corporate">Corporate</option>
        <option value="other">Other</option>
      </select>
      <input
        type="number"
        value={formData.year}
        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
        placeholder="Year *"
        required
        min="1900"
        max={new Date().getFullYear() + 1}
        className="w-full px-3 py-2 border rounded-md"
      />
      <input
        type="text"
        value={formData.production_company}
        onChange={(e) => setFormData({ ...formData, production_company: e.target.value })}
        placeholder="Production Company (optional)"
        className="w-full px-3 py-2 border rounded-md"
      />
      <input
        type="text"
        value={formData.director}
        onChange={(e) => setFormData({ ...formData, director: e.target.value })}
        placeholder="Director (optional)"
        className="w-full px-3 py-2 border rounded-md"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          Add Credit
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

