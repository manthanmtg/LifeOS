import type { NotificationSource } from "../contracts";
import { recurringExpensesNotificationSource } from "./recurring-expenses";
import { peopleNotificationSource } from "./people";
import { healthNotificationSource } from "./health";
import { warrantyNotificationSource } from "./warranty";

export const notificationSources: NotificationSource[] = [
  recurringExpensesNotificationSource,
  peopleNotificationSource,
  healthNotificationSource,
  warrantyNotificationSource,
];
