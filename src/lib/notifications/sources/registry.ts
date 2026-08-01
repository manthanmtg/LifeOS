import type { NotificationSource } from "../contracts";
import { recurringExpensesNotificationSource } from "./recurring-expenses";
import { peopleNotificationSource } from "./people";

export const notificationSources: NotificationSource[] = [
  recurringExpensesNotificationSource,
  peopleNotificationSource,
];
