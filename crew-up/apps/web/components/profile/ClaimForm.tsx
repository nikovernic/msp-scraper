'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

// Zod schema for form validation (matches API schema)
const claimFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
})

type ClaimFormData = z.infer<typeof claimFormSchema>

interface ClaimFormProps {
  token: string
  profileName: string
}

export function ClaimForm({ token, profileName }: ClaimFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle error response
        let errorMessage = 'Failed to claim profile. Please try again.'

        if (result.error?.code === 'INVALID_TOKEN') {
          errorMessage = 'Invalid or expired claim token. Please request a new invitation.'
        } else if (result.error?.code === 'EXPIRED_TOKEN') {
          errorMessage = 'This claim token has expired. Please request a new invitation.'
        } else if (result.error?.code === 'ALREADY_CLAIMED') {
          errorMessage = 'This profile has already been claimed.'
        } else if (result.error?.code === 'EMAIL_EXISTS') {
          errorMessage = 'An account with this email already exists. Please use a different email or sign in.'
        } else if (result.error?.message) {
          errorMessage = result.error.message
        }

        setSubmitStatus({ type: 'error', message: errorMessage })
        return
      }

      // Success - redirect to profile edit page
      if (result.redirectUrl) {
        router.push(result.redirectUrl)
      } else {
        setSubmitStatus({
          type: 'success',
          message: 'Profile claimed successfully! Redirecting...',
        })
        // Fallback redirect after a delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
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
      <h2 className="text-2xl font-bold mb-6">Claim Your Profile</h2>
      
      <p className="text-muted-foreground mb-6">
        Create an account to claim and manage your profile: <strong>{profileName}</strong>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2"
          >
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoComplete="email"
          />
          {errors.email && (
            <p
              id="email-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-2"
          >
            Password <span className="text-destructive">*</span>
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            autoComplete="new-password"
          />
          {errors.password && (
            <p
              id="password-error"
              className="mt-1 text-sm text-destructive"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Must be at least 8 characters with uppercase, lowercase, and a number
          </p>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Claiming Profile...' : 'Claim Profile'}
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

