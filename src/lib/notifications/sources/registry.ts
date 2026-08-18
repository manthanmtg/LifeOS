import type { NotificationSource } from "../contracts";
import { recurringExpensesNotificationSource } from "./recurring-expenses";
import { peopleNotificationSource } from "./people";
import { healthNotificationSource } from "./health";

export const notificationSources: NotificationSource[] = [
  recurringExpensesNotificationSource,
  peopleNotificationSource,
  healthNotificationSource,
];
