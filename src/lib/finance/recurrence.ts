import {
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import type { RecurrenceUnit, RecurringBill } from "@/lib/domain";

export function nextOccurrence(date: string, recurrence: RecurrenceUnit) {
  const source = parseISO(date);
  const next = {
    weekly: addWeeks(source, 1),
    monthly: addMonths(source, 1),
    quarterly: addQuarters(source, 1),
    semiannual: addMonths(source, 6),
    yearly: addYears(source, 1),
  }[recurrence];
  return next.toISOString().slice(0, 10);
}

export function monthlyEquivalent(amountMinor: number, recurrence: RecurrenceUnit) {
  const factor = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    semiannual: 1 / 6,
    yearly: 1 / 12,
  }[recurrence];
  return Math.round(amountMinor * factor);
}

export function dueLabel(date: string | null, now = new Date()) {
  if (!date) return "Date needs review";
  const days = differenceInCalendarDays(parseISO(date), now);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

export function recurringBurden(bills: RecurringBill[]) {
  return bills
    .filter((bill) => bill.status === "active")
    .reduce((total, bill) => total + monthlyEquivalent(bill.amountMinor, bill.recurrence), 0);
}
