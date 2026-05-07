# Phase 4

Phase 4 focuses on the local AI stack.

Experiment 4a establishes a read-only Ollama reachability baseline:

- detect whether the Ollama client exists
- check whether the local API is reachable
- list installed model names if the API responds
- collect non-secret service clues when the API is unreachable
- recommend the next minimal manual action without starting or modifying Ollama automatically
