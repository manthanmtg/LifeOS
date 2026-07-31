import { runNotificationDispatch } from "../../src/lib/notifications/dispatcher";

const notificationsDispatch = async () => {
  try {
    const summary = await runNotificationDispatch({ batchSize: 10 });
    console.info("[Notifications] Scheduled dispatch complete", summary);
  } catch (error) {
    console.error("[Notifications] Scheduled dispatch failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default notificationsDispatch;
