'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Zod schema for form validation (matches API schema)
const contactFormSchema = z.object({
  producer_name: z.string().min(1, 'Producer name is required'),
  producer_email: z.string().email('Invalid email address'),
  producer_phone: z.string().optional().nullable(),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be 500 characters or less'),
  shoot_dates: z.string().optional().nullable(),
})

type ContactFormData = z.infer<typeof contactFormSchema>

interface ContactFormProps {
  profileSlug: string
}

export function ContactForm({ profileSlug }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      producer_name: '',
      producer_email: '',
      producer_phone: '',
      message: '',
      shoot_dates: '',
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch(`/api/profiles/${profileSlug}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle error response
        const errorMessage =
          result.error?.message || 'Failed to submit contact form. Please try again.'
        setSubmitStatus({ type: 'error', message: errorMessage })
        return
      }

      // Success - reset form and show success message
      reset()
      setSubmitStatus({
        type: 'success',
        message: 'Your message has been sent successfully!',
      })
    } catch (error) {
      // Handle network or other errors
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-card">
      <h2 className="text-2xl font-bold mb-6">Contact This Crew Member</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Producer Name */}
        <div>
          <label
            htmlFor="producer_name"
            className="block text-sm font-medium mb-2"
          >
            Your Name <span className="text-destructive">*</span>
          </label>
          <input
            id="producer_name"
            type="text"
            {...register('producer_name')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.producer_name ? 'true' : 'false'}
            aria-describedby={errors.producer_name ? 'producer_name-error' : undefined}
          />
          {errors.producer_name && (
            <p
              id="producer_name-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.producer_name.message}
            </p>
          )}
        </div>

        {/* Producer Email */}
        <div>
          <label
            htmlFor="producer_email"
            className="block text-sm font-medium mb-2"
          >
            Your Email <span className="text-destructive">*</span>
          </label>
          <input
            id="producer_email"
            type="email"
            {...register('producer_email')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.producer_email ? 'true' : 'false'}
            aria-describedby={errors.producer_email ? 'producer_email-error' : undefined}
          />
          {errors.producer_email && (
            <p
              id="producer_email-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.producer_email.message}
            </p>
          )}
        </div>

        {/* Producer Phone (Optional) */}
        <div>
          <label
            htmlFor="producer_phone"
            className="block text-sm font-medium mb-2"
          >
            Your Phone (Optional)
          </label>
          <input
            id="producer_phone"
            type="tel"
            {...register('producer_phone')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.producer_phone ? 'true' : 'false'}
            aria-describedby={errors.producer_phone ? 'producer_phone-error' : undefined}
          />
          {errors.producer_phone && (
            <p
              id="producer_phone-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.producer_phone.message}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium mb-2"
          >
            Message <span className="text-destructive">*</span>
          </label>
          <textarea
            id="message"
            rows={5}
            {...register('message')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            aria-invalid={errors.message ? 'true' : 'false'}
            aria-describedby={errors.message ? 'message-error' : undefined}
          />
          {errors.message && (
            <p
              id="message-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.message.message}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Maximum 500 characters
          </p>
        </div>

        {/* Shoot Dates (Optional) */}
        <div>
          <label
            htmlFor="shoot_dates"
            className="block text-sm font-medium mb-2"
          >
            Shoot Dates (Optional)
          </label>
          <input
            id="shoot_dates"
            type="text"
            placeholder="e.g., March 15-20, 2024"
            {...register('shoot_dates')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.shoot_dates ? 'true' : 'false'}
            aria-describedby={errors.shoot_dates ? 'shoot_dates-error' : undefined}
          />
          {errors.shoot_dates && (
            <p
              id="shoot_dates-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.shoot_dates.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
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

