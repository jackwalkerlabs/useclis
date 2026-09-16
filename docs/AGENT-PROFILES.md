# Reviewed agent profiles

Editorial capability records in src/data/agent-profiles.json are reviewed separately from automatic GitHub statistics. Each capability, setup instruction and expected-result claim carries an official source and a checked date. Profiles currently cover ripgrep and agent-browser; absent records are explicitly unreviewed, and source-list workflow markings remain provenance rather than compatibility ratings.

The tool page, JSON catalog and full text catalog use the same records. Reviewed examples override source-list examples without rewriting the imported source catalog. Documentation review is not execution testing; update the verification label only with recorded execution evidence. The copyable prompt names the task, setup, local context, exact commands and sources, and keeps the agent within the user's existing permissions.

To extend coverage, verify current official documentation, add dated claims plus a bounded useful workflow, and inspect both profile rendering and catalog output. Never infer authentication or platform support solely from repository popularity or a source-list label.
