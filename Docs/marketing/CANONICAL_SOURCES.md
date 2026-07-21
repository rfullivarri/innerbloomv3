# Canonical Marketing Sources

This file removes ambiguity from the Innerbloom monthly marketing cycle.

## 1. Strategy memory

**Only source:** `Docs/marketing/strategy-memory.md`

The monthly Action and CMO use this file. It contains the current operating rules and the append-only strategic changelog.

## 2. Final campaign contract

**Only final campaign source for one period:**

`marketing/agent-outputs/<YYYY-MM>/campaign.json`

Requirements:

- schema version: `2.0`;
- campaign status: `review` until a human approves posts;
- one file per period;
- all post copy, schedule, tracking, visual decisions, and production jobs live here;
- Asset Producer must not read `cmo-context.json` or `cmo-strategy.json`.

The CMO context and CMO strategy are upstream evidence. They are not production inputs after `campaign.json` exists.

## 3. Current visual asset source

**Only Drive root:** `Innerbloom Marketing/02 Assets`

**Machine-readable registry:** `marketing/asset-registry/innerbloom-drive-assets-v1.json`

The registry maps a semantic `asset_key` to the real Drive file ID and URL. Code and agents select by `asset_key`, never by guessed filenames.

## 4. Responsibility boundary

| Task | Owner |
| --- | --- |
| Fetch analytics, validate JSON, save files, copy/upload assets, render layouts, import data, upload R2, build CSV | Code |
| Interpret results, define strategy, choose post objective, choose asset/mode/layout, decide whether a new supporting visual is needed | Agent |
| Approve/reject/edit final posts | Human |

## 5. Current 2026-07 reference

The reviewed July campaign is the schema-v2 file on the current marketing cycle branch. It contains 20 posts (12 static, 8 carousel) and 44 production jobs. That count is generated from the campaign; it must not be maintained separately by hand.
