import { format, isToday, isBefore, addDays, addMinutes } from "date-fns";

export function formatDate(dateString: string): string {
  return format(new Date(dateString), "MMM d, yyyy");
}

export function isDueToday(dateString: string): boolean {
  const date = new Date(dateString);
  return isToday(date) || isBefore(date, new Date());
}

export function addDaysToNow(days: number): string {
  return addDays(new Date(), days).toISOString();
}

export function addMinutesToNow(minutes: number): string {
  return addMinutes(new Date(), minutes).toISOString();
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Đến hạn";
  if (diffDays === 1) return "Ngày mai";
  if (diffDays < 7) return `Sau ${diffDays} ngày`;
  if (diffDays < 30) return `Sau ${Math.ceil(diffDays / 7)} tuần`;
  return formatDate(dateString);
}
