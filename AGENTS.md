# AI Engineering Rules

## General
- Read the docs / folder before making changes.
- Do not change architecture without approval.
- Do not install dependencies unless necessary.
- Do not rewrite working code unnecessarily.
- Prefer small, focused changes.
- Reuse existing components.
- Do not duplicate logic.
- Keep the implementation aligned with the project PRD and architecture documents.

## Project Context
This repository is an Academy Management System MVP built for a small academy. The system should support staff authentication, user roles, student management, teacher management, course enrollment, attendance tracking, fee/payment tracking, and a dashboard summary.

The current project direction is:
- React + TypeScript + Vite frontend
- Tailwind CSS for styling
- Supabase for authentication, database, and access control
- Vercel for frontend deployment

Relevant design documents:
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/PROJECT_TASKS.md

## React
- Use functional components.
- Use hooks where appropriate.
- Keep components focused.
- Avoid unnecessary state.
- Use meaningful component names.
- Prefer composition over large monolithic components.
- Keep UI behavior consistent with the existing design patterns.

## Supabase
- Follow Supabase documentation and best practices.
- Never expose service-role keys.
- Every exposed table must use Row Level Security (RLS).
- Never bypass RLS for convenience.
- Use migrations for database changes.
- Keep security and data integrity as first-class requirements.
- Do not put secrets in frontend environment variables.

## Security
- Never hardcode secrets.
- Validate user input.
- Check authorization at the database level.
- Never trust frontend authorization.
- Enforce least-privilege access for administrator, teacher, and finance roles.
- Protect sensitive personal and financial data.
- Preserve audit metadata for attendance and payment changes.

## Architecture and Scope Rules
- Keep the MVP small and focused.
- Follow the requested product scope and avoid expanding beyond the approved requirements without discussion.
- Keep feature modules organized around domain responsibilities such as students, teachers, courses, attendance, fees, and dashboard.
- Keep business rules close to the modules that own them.
- Do not create unnecessary services, folders, or abstractions before they are justified by actual need.

## Database and Business Rules
- Historical records must remain visible even when a student, teacher, or course becomes inactive.
- Prevent duplicate identifiers and duplicate active enrollments.
- Attendance must be unique per student per session/date.
- Payment amounts must be validated and cannot be zero or negative.
- Balance must be derived from obligations and payments, not independently editable.
- Use transaction-safe operations for multi-step writes when needed.

## Testing and Quality
- Run lint before finishing a task.
- Run tests before finishing a task.
- Check for console errors.
- Review changed files before completion.
- Explain what changed and why.
- Prefer verifying behavior with real project logic instead of mock-only checks.
- Add tests for core business rules, access control, and validation.

## Before Finishing a Task
- Run lint.
- Run tests.
- Check for console errors.
- Review changed files.
- Explain what changed.
- Ensure the change matches the project requirements and architecture.

## Working Style
- Prefer the smallest correct change.
- Keep updates incremental and easy to review.
- Follow the repository’s docs and patterns before introducing new conventions.
- If a decision affects architecture, data model, or security, document it and seek approval before proceeding.

## Summary
The project should remain a disciplined MVP: secure, role-aware, domain-focused, and aligned with the Academy Management System requirements in the project documentation. Changes must be minimal, well-justified, and consistent with the existing architecture.
