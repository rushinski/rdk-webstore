# Modules

`src/modules/**` contains business-capability slices for the modular monolith.

Each module owns its:

- domain rules
- application orchestration
- infrastructure adapters
- presentation helpers and components

New domain-specific code should be added here by default.

During migration, legacy paths under `src/services/**`, `src/repositories/**`, and `src/components/**` may re-export module-owned code.
