# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Do a code review after each and every commit. Confidence: 0.85

# code-style
- Keep the codebase modular: types, queries, and mutations in separate folders and files. Confidence: 0.70
- Use existing components from the components folder instead of building from scratch. Confidence: 0.65
- Do not modify anything in components/ui or components/ai-elements. Confidence: 0.70

# routing
- After successful sign-in or sign-up, redirect users to /dashboard. Confidence: 0.70

# tooling
- Use pnpm as the package manager. Confidence: 0.70

# git
- Include "Co-authored-by: CommandCodeBot <noreply@commandcode.ai>" in commit messages. Confidence: 0.60

# database
- Use Turso (libsql) for database. Confidence: 0.60

