import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "A catalog question reads saved rows and does not start a search.",
  async test(t) {
    await t.send(
      "How many water-feature homes are saved so far? Check the catalog only. Do not start a new search.",
    );
    t.succeeded();
    t.calledTool("list_matches");
    t.notCalledTool("scan_listings");
    t.notCalledTool("save_listings");
  },
});
