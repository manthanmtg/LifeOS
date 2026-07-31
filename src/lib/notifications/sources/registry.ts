import type { NotificationSource } from "../contracts";
import { recurringExpensesNotificationSource } from "./recurring-expenses";

export const notificationSources: NotificationSource[] = [
  recurringExpensesNotificationSource,
];
