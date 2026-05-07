# Artifact Hygiene Review

## Purpose

Classify `user_lab` artifacts into:

- keep in Git
- consider ignoring
- keep if valuable

## High-Level Read

`user_lab` is mostly valuable product and experiment documentation.

What creates noise is much narrower:

- timestamped generated JSON
- Python bytecode caches
- some large sets of repeated run reports

## Keep In Git

These are high-value project records and should stay versioned:

- phase summaries
- experiment results
- decision records
- README files
- prompts
- specs
- contracts
- copy docs
- implementation plans
- product journey docs
- UX maps
- final phase closeout documents
- curated scripts that reproduce experiments
- stable config files such as `user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`

Examples:

- `user_lab/phase1/*.md`
- `user_lab/phase2/*.md`
- `user_lab/phase5/*.md`
- `user_lab/phase3/scripts/*.py`
- `user_lab/phase3/scripts/*.sh`
- `user_lab/phase4/scripts/*.py`
- `user_lab/phase4/scripts/*.sh`

## Consider Ignoring

These are noisy, generated, and timestamp-heavy:

- `user_lab/phase3/benchmarks/*.json`
- `user_lab/phase3/profiles/*.json`
- `user_lab/phase4/benchmarks/*.json`
- `user_lab/phase4/handshake_runs/*.json`
- `user_lab/phase4/profiles/*.json`
- `user_lab/phase4/prototype_runs/*.json`
- `user_lab/phase4/status/*.json`
- `user_lab/phase4/validation/*.json`
- `__pycache__/`
- `*.pyc`

These are useful as local evidence during experiments, but poor as default source-control payload.

## Keep If Valuable

Generated markdown reports need a more selective policy.

Current state:

- `user_lab/phase3/reports`: `5` markdown reports
- `user_lab/phase4/reports`: `53` markdown reports

Recommendation:

- keep curated result/summary markdown that explains decisions
- keep a limited set of representative generated reports if they are directly referenced in experiment results
- avoid treating every timestamped generated report as permanent source-of-truth documentation

For now:

- no new ignore rule was added for markdown reports
- this remains a human curation decision because some reports are clearly useful evidence

## `.gitignore` Recommendation

This review made a low-risk `.gitignore` update for:

- `.codex/`
- `__pycache__/`
- `*.pyc`
- noisy generated JSON under `user_lab/phase3` and `user_lab/phase4`

## Suggested Longer-Term Cleanup

Not executed in this phase, but recommended later:

1. Decide whether `user_lab/phase4/reports/validation_run_*.md` should remain versioned.
2. Decide whether handshake/prototype markdown reports should be reduced to representative samples plus summary docs.
3. Consider a small archival convention for repeated timestamped reports, such as:
   - `reports/kept/`
   - `reports/generated-local/`

## Bottom Line

The artifact problem is real but manageable.

Paperclip should keep:

- its reasoning
- its product specs
- its decision history

Paperclip should generally ignore:

- machine-generated timestamped JSON
- local caches

Paperclip should review carefully before keeping large sets of repeated timestamped markdown reports.
