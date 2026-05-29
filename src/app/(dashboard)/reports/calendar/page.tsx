import { auth } from "@/lib/auth"
import { getCalendarData } from "@/lib/services/weekly-profit"
import { WeeklyCalendar } from "@/components/reports/weekly-calendar"

export default async function CalendarPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  // Fetch initial data for SSR
  const calendarData = await getCalendarData(session.user.id, 6)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">周收益日历</h1>
      </div>

      <WeeklyCalendar initialData={calendarData} />
    </div>
  )
}
