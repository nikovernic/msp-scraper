import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { reminderProcessor } from '@/lib/services/reminderProcessor'
import { handleError } from '@/lib/utils/errorHandler'

/**
 * POST /api/admin/reminders/process
 * Process and send reminder emails for all eligible profiles
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    // Process reminders
    const result = await reminderProcessor.processReminders()

    return NextResponse.json(
      {
        success: true,
        result: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          errors: result.errors,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return handleError(error)
  }
}

