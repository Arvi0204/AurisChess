/**
 * Central API configuration.
 * Set VITE_API_URL in your .env file for production/staging deployments.
 * Falls back to localhost:3000 for local development.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
