# Experiment 3a Privacy Notes

This profiler is designed for local-only baseline measurement.

## Collected

- macOS, hardware, and developer-tool version summaries
- current repo path classification
- boolean presence of LLM-related environment variables
- safe local AI stack presence and version/model summaries where available
- Paperclip runtime signals derived from existing lab artifacts under `user_lab/`

## Explicitly Not Collected

- API key values
- token values
- prompt contents
- source file contents
- personal document contents
- browser data
- email or calendar data
- SSH keys or credential files
- full home directory listings

## Path Handling

- The current repo path may be recorded because it is directly relevant to the known workspace path-class issue.
- Paths outside the repo are avoided where practical.
- When external tools or apps are detected, the profiler stores booleans or sanitized labels rather than full external paths.

## External Sharing Guidance

- Treat generated JSON and markdown as local diagnostic artifacts.
- If the results need to be shared externally, prepare a sanitized summary that removes the exact repo path and any local machine naming details.
