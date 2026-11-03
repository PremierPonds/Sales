import { defineSchedule } from "@grok/agent-sdk/schedules";

// Monday 12:00 UTC. That is 7:00 AM Eastern Standard Time and 8:00 AM Eastern Daylight Time.
export default defineSchedule({
  cron: "0 12 * * 1",
  async run({ callTool }) {
    const outcome = await callTool("scan_listings", { status: "active", maxQueries: 57 });
    if (outcome.isError) {
      throw new Error(outcome.errorMessage ?? "Active listing scan failed.");
    }
  },
});
