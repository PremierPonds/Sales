import { defineArtifacts } from "@grok/agent-sdk/artifacts";
import * as z from "zod/v4";

export default defineArtifacts({
  kinds: {
    "water-feature-workbook": {
      description: "Excel workbook of merged water-feature homes.",
      schema: z.object({
        rowCount: z.number(),
        updatedAt: z.string(),
      }),
    },
  },
});
