# Academy Management System Security Design

## 1. Purpose and Scope

This document defines security requirements for the Academy Management System's Supabase/PostgreSQL database and schema, in alignment with [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [DATABASE_DESIGN.md](DATABASE_DESIGN.md). It covers staff authentication, database authorization, sensitive data, audit history, deployment, and operational safeguards.

This is a security design, not an implementation. It does not create database policies, functions, migrations, or application code. The system must not store real student or payment data until the controls in this document have been implemented and tested.

## 2. Security Objectives

- Only authenticated, active staff can access the application data they need for their role.
- Authorization is enforced in PostgreSQL, not only in React routes or UI controls.
- Student contact information, attendance, and financial data are visible only to authorized roles.
- Payment and attendance records cannot be silently changed or erased.
- Credentials, service-role keys, and other secrets are never exposed to the browser or source control.
- Schema changes and privileged actions are reviewed, auditable, and recoverable.

## 3. Protected Assets and Threats

### Assets

- Student and teacher names, contact details, identifiers, enrollments, and attendance.
- Fee obligations, payments, references, balances, and audit history.
- Staff identities, role assignments, and academy settings.
- Supabase credentials, database access, migrations, and backups.

### Threats to address

- A signed-in user changes a request to read or modify records outside their role or assigned courses.
- A user edits their own role or changes another account's permissions.
- A compromised browser account or exposed service key bypasses expected UI restrictions.
- Concurrent payment operations create an incorrect balance or duplicate allocation.
- A payment, attendance record, or audit event is edited or deleted without trace.
- A Vercel preview or local environment accesses production data unintentionally.
- Sensitive data is exposed through broad queries, logs, exports, error messages, or backups.

## 4. Trust Boundaries

1. **Browser:** untrusted. Every input, identifier, role claim, and requested operation may be manipulated.
2. **Vercel frontend:** serves static application assets. Vite-exposed environment variables are public to browser users.
3. **Supabase Auth:** verifies identity. Authentication alone does not grant access to academy records.
4. **PostgreSQL and RLS:** authoritative data authorization and integrity boundary for direct client access.
5. **Trusted functions/admin operations:** privileged boundary for staff invitations, role changes, payment allocation/reversal, and other multi-record operations. These must validate authorization and input on the server/database side.
6. **Development, preview, and production environments:** separate trust zones; preview and development must not use production student data.

## 5. Authentication and Staff Lifecycle

- Use Supabase Auth for individual staff accounts. Do not use shared staff logins.
- Require a confirmed, active `staff_profiles` record linked to `auth.uid()` before granting application data access.
- Disable access for deactivated profiles, even if the associated Auth identity still has a valid session. Revoke sessions or disable the Auth account as part of the deactivation workflow where appropriate.
- Do not allow users to create their own staff profile or select their own role through public signup or client-side updates.
- Restrict account invitations, activation, deactivation, and role changes to a narrowly authorized administrative workflow.
- Keep staff role assignment in trusted database records. Do not trust a role sent in request parameters, local storage, or an editable user metadata field.
- Use strong password and account recovery settings appropriate for staff. Enable MFA for administrators and privileged finance users when supported by the chosen Supabase plan and workflow.
- Establish a documented process to remove access promptly when staff leave or change responsibilities.

## 6. Database Access Controls

### 6.1 Default-deny posture

- Enable RLS on every application table in exposed schemas, including join tables, audit tables, and future tables.
- Start with no access and add only the required table actions per role. Test `SELECT`, `INSERT`, `UPDATE`, and `DELETE` independently.
- Restrict PostgreSQL grants as well as RLS policies. RLS does not replace schema/table privileges.
- Do not grant application users direct access to Supabase-managed authentication tables or internal schemas.
- Prefer deactivation and controlled state transitions over physical deletion. Deny client-side deletion of financial, audit, attendance, and historical enrollment records.

### 6.2 Identity and policy rules

- Resolve the caller with `auth.uid()` and verify an active `staff_profiles` row in the database.
- Use the database profile as the authoritative source for the single MVP role; clients must not be able to update `role` or `is_active` for themselves or others.
- Teacher policies must check an active teacher profile linked to the caller and an active `course_teachers` assignment for the requested course. Do not infer access from a course ID supplied by the browser.
- Scope each policy to the row and operation needed. Avoid broad policies such as "all authenticated users can access all rows".
- Use `USING` and `WITH CHECK` conditions appropriately so updates cannot move a row into a scope the caller should not control.
- Ensure joins and helper functions used by policies do not accidentally bypass RLS or reveal records through side channels.

### 6.3 Intended permissions

| Data | Administrator | Teacher | Finance |
|---|---|---|---|
| `staff_profiles` | Manage through trusted staff workflow | Read own permitted profile fields | Read own permitted profile fields |
| `academy_settings` | Manage | No access unless a specific read field is needed | No access unless a specific read field is needed |
| `students` | Create, read, update, deactivate | Read minimum student fields for assigned active courses | Read minimum fields needed for fee operations |
| `teachers`, `courses`, `course_teachers` | Manage | Read assigned courses and relevant teacher details | Read only references needed for fee workflows |
| `enrollments` | Manage | Read rosters for assigned courses | Read only when needed to explain an obligation |
| `attendance_sessions`, `attendance_entries` | Read and correct | Read and record for assigned courses; corrections only as explicitly permitted | No access by default |
| `fee_obligations` | Manage | No access by default | Read and manage |
| `payments`, `payment_allocations` | Read and manage or explicitly delegate | No access | Read and record; reversal requires explicit permission |
| `audit_events` | Read, append only through trusted operations | No direct access | No direct access by default |

Access to student fields should be minimized by role. If teachers or finance staff need only a subset of student information, expose a carefully scoped view or query rather than granting broad access to all columns. Verify that views preserve the intended caller permissions and RLS behavior.

## 7. Sensitive and Financial Data

- Collect only fields necessary for academy operations. Do not store government identifiers, medical information, or other highly sensitive data without a documented need and protection plan.
- Avoid storing attendance notes containing health or disciplinary details. If such data becomes necessary, define stricter permissions, retention, and audit requirements first.
- Limit visibility of contact details, payment references, and financial history by role and purpose.
- Never store card numbers, CVV values, passwords, or authentication secrets in academy tables. Online payment processing is out of MVP scope.
- Use `numeric` for amounts and validate positive values in the database. Do not use floating-point types for money.
- Do not store a mutable balance. Derive balances from obligations, posted payment allocations, and reversals/adjustments.
- Do not permit client-side edits or deletes to posted payment amounts, allocations, or reversal history.
- For allocation and reversal operations, use an atomic database operation with authorization, student/obligation matching, remaining-balance checks, and concurrency protection.
- Reject or explicitly handle overpayments; do not silently create an unallocated amount. If student credit is introduced, model it as a separate auditable ledger concept.

## 8. Privileged Functions and Database Code

Use a narrowly scoped database function or trusted server operation for actions that need atomicity or privilege, including staff role changes, account provisioning, attendance batch saves, payment allocations, and payment reversals.

- Prefer invoker permissions. If a function must run with elevated privileges, justify it, restrict who can execute it, validate the caller inside it, and expose only the minimum operation.
- For `SECURITY DEFINER` functions, set a fixed safe `search_path`, schema-qualify referenced objects, avoid dynamic SQL where possible, and revoke default execution from `PUBLIC` unless explicitly required.
- Never accept an actor ID or role from the client as proof of authority; derive the actor from the authenticated database session.
- Validate all inputs at the database boundary, even if the React form also validates them.
- Keep transaction scope small and ensure failures roll back all related writes.
- Prevent race conditions in balance checks by locking or otherwise serializing updates to the affected obligations.
- Review functions and triggers for recursion, privilege escalation, unintended RLS bypass, and information leakage.

## 9. Audit, Integrity, and Retention

- Set `created_by`, `updated_by`, and event timestamps from trusted database context wherever possible. Do not trust browser-provided actor fields.
- Keep `audit_events` append-only for application roles. Only trusted triggers/functions may write audit events; ordinary users cannot update or delete them.
- Record actor, entity, action, time, and a minimal change summary for sensitive attendance and financial operations. Redact credentials and unnecessary personal data.
- Preserve attribution when a staff account is deactivated. Avoid deleting an Auth/profile identity in a way that erases historical actor references.
- Use explicit reversal/adjustment records for financial corrections. Keep sufficient history to reconstruct the balance at a point in time.
- Define retention and deletion rules before production. Where privacy law requires deletion, determine how to remove or anonymize personal data without corrupting required financial/audit records; obtain appropriate legal guidance.
- Audit logs are not a substitute for backups and are not inherently tamper-proof against database administrators. Restrict administrative access and rely on provider backups/controls for recovery.

## 10. Secrets, Application, and Deployment

- The Supabase project URL and public/publishable key may be used by the frontend only when RLS and grants are correctly configured.
- Never expose the Supabase service-role/secret key, database password, access tokens, or signing secrets in Vite `VITE_*` variables, browser code, logs, screenshots, or source control.
- Store server-side secrets only in the appropriate Supabase/Vercel secret configuration and rotate them after suspected exposure.
- Keep local, preview, and production Supabase projects and credentials separate. Do not point Vercel preview builds at production data by default.
- Restrict Supabase Auth redirect URLs to expected local and deployed domains. Review preview deployment authentication behavior before enabling it.
- Require HTTPS in deployed environments. Apply suitable security headers through Vercel configuration and avoid permissive cross-origin settings.
- Do not log full student records, payment references, access tokens, or request payloads containing personal data. Return user-safe errors while keeping sensitive diagnostics out of the browser.
- Protect developer machines and CI credentials; use least-privilege tokens and avoid long-lived credentials where possible.

## 11. Schema Changes and Administrative Access

- Keep schema, grants, RLS policies, functions, and triggers in reviewed, version-controlled migrations.
- Apply and test migrations in development before production. Treat policy changes as security-sensitive code requiring review.
- Do not modify production schema manually except under a documented emergency process followed by a migration that captures the change.
- Limit Supabase dashboard, SQL editor, project owner, and Vercel project access to named maintainers who need it. Use MFA and remove access when no longer needed.
- Never place production data in seed files, test fixtures, issue reports, or pull requests.
- Use synthetic data for development and RLS tests.

## 12. Backups and Incident Response

- Configure backups according to the selected Supabase plan and business recovery needs; verify retention limits and recovery point objectives.
- Perform a restore test before real data is entered and periodically thereafter. A backup that has never been restored is unverified.
- Document who can initiate restoration and how to validate record counts, constraints, and application access afterward.
- For suspected compromise: revoke affected sessions/keys, disable affected accounts, rotate secrets, review Auth and database logs, preserve evidence, assess accessed data, restore from a known-good state if needed, and follow applicable notification obligations.
- Record incident owner, timeline, affected data, remediation, and follow-up controls. Do not use a broad service-role key in the browser as an emergency workaround.

## 13. Security Verification Checklist

Before accepting real academy data, verify all of the following:

- [ ] RLS is enabled on every exposed application table and there are no unintended public grants.
- [ ] Unauthenticated requests cannot read or change academy data.
- [ ] Inactive staff cannot access data, even with an existing session where policy requires immediate deactivation.
- [ ] Teachers can access only assigned courses and permitted student/attendance fields.
- [ ] Finance users cannot access attendance or administer staff unless explicitly authorized.
- [ ] Users cannot change their own role, status, audit data, or another user's permissions.
- [ ] Cross-course attendance entries, duplicate enrollments, invalid statuses, and invalid amounts are rejected by the database.
- [ ] Concurrent payment allocations cannot exceed payment or obligation balances.
- [ ] Posted payments and audit records cannot be silently edited or deleted by application users.
- [ ] Privileged functions have restricted execution grants, safe search paths, and server/database-side authorization checks.
- [ ] Views, dashboard queries, exports, and error paths do not bypass or disclose data beyond role permissions.
- [ ] No service-role key or other secret is present in built frontend assets, repository history, or Vercel preview configuration.
- [ ] Development and preview environments use separate projects and synthetic data.
- [ ] Backup restoration and staff offboarding procedures have been exercised.

Run automated positive and negative RLS tests as part of CI whenever schema or policy migrations change. Review policies using representative administrator, teacher, finance, inactive, and unauthenticated identities.

## 14. Open Security Decisions

1. What jurisdiction and privacy/data-retention requirements apply to student records?
2. Which student fields can teachers and finance staff see, and are different field-level views required?
3. Should finance reversal privileges be limited to administrators or assigned finance approvers?
4. Is MFA required for all staff or only privileged roles?
5. What backup retention, recovery point, and recovery time are required?
6. Will multiple branches or academies be added? If so, tenant/branch isolation must be designed before data is entered.

Review this document when roles, schema, deployment environments, or data collection change. Security depends on the implemented policies and tests, not the document alone.