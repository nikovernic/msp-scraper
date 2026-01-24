/**
 * Configuration module for environment variables
 * Centralizes all environment variable access per coding standards
 */

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  resendApiKey: process.env.RESEND_API_KEY,
} as const

