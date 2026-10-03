# Academy Management System UI and Frontend Specification

## 1. Purpose

This document defines the MVP user interface and frontend behavior for the Academy Management System. It is based on [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_DESIGN.md](DATABASE_DESIGN.md), and [SECURITY.md](SECURITY.md).

The attached screenshot is treated as an example of a concise UI-spec format only. The product is an academy operations workspace, not a social feed. This document is a design specification; it does not add frontend code.

## 2. Product UI Principles

- **Operational first:** make student lookup, attendance, and fee tasks direct and predictable.
- **Clear hierarchy:** page title, primary action, filters, and results should be easy to scan.
- **Role-aware:** show only navigation and actions relevant to the signed-in staff member, while relying on database authorization for actual security.
- **Data confidence:** communicate loading, empty, saved, and failed states; make balances and attendance dates unambiguous.
- **Responsive by default:** common workflows remain usable on phones, tablets, and desktop screens.
- **Accessible:** target WCAG 2.2 AA, keyboard operation, visible focus, and screen-reader-friendly form and status feedback.

## 3. Visual Direction

Use a calm, contemporary administrative interface: light neutral page surfaces, dark readable text, a restrained teal primary accent, and distinct semantic colors for success, warning, and error. The interface should feel dependable and efficient rather than decorative.

### Design tokens

Define semantic tokens as CSS variables and map Tailwind utilities to them. Avoid scattering raw colors throughout feature components.

| Token role | Intended use |
|---|---|
| `background` | Main application canvas |
| `surface` | Navigation, tables, forms, and dialogs |
| `surface-muted` | Subtle grouping and secondary information |
| `text-primary` | Headings and primary content |
| `text-secondary` | Labels, helper text, and metadata |
| `border` | Dividers and control outlines |
| `primary` | Main actions, links, selected navigation |
| `success` | Paid, present, active, and successful save states |
| `warning` | Due soon, late, pending, and confirmation states |
| `danger` | Validation errors, overdue balances, and destructive actions |

Use a highly legible sans-serif typeface such as Source Sans 3 with a system fallback. Reserve larger type for page titles; tables, forms, and dashboard summaries use compact but readable sizing. Use an 8px spacing rhythm, consistent control heights, and restrained borders. Avoid heavy shadows, decorative gradients, and nested cards.

### Status presentation

Status text must accompany color; do not communicate meaning through color alone. Use consistent labels and styles for active/inactive, present/absent/late, open/paid/overdue, and draft/archived states.

## 4. Application Shell and Navigation

### Desktop

- Persistent left navigation rail with the academy name and role-appropriate destinations.
- Main content area with page title, optional breadcrumb, and page-specific primary action.
- Compact top area for the current page context and account menu (profile, password/sign-out actions).
- Use the content width efficiently for searchable tables and detail layouts; avoid oversized marketing-style headers.

### Mobile and tablet

- Replace the persistent navigation with an accessible menu/drawer; preserve the current page and return focus when it closes.
- Use a single-column page layout with forms and summary sections stacked vertically.
- Keep primary actions reachable without horizontal scrolling; move secondary actions into a clearly labeled menu when needed.
- Tables may scroll horizontally as a last resort, but prioritize a compact row/card presentation for small screens and preserve key identifiers and actions.

### Navigation by role

| Destination | Administrator | Teacher | Finance |
|---|---|---|---|
| Dashboard | Yes | Yes, limited to permitted teaching summaries | Yes, focused on permitted fee summaries |
| Students | Manage | Assigned-course students, minimum fields | Student details needed for fee tasks |
| Teachers | Manage | Relevant teacher details only | Hidden unless needed |
| Courses | Manage and assign | Assigned courses | Reference information as needed |
| Attendance | Review and correct | Take attendance for assigned courses | Hidden by default |
| Fees | Manage and review | Hidden by default | Manage obligations and payments |
| Staff settings | Yes | No | No |

Navigation visibility improves usability only. Every request remains subject to Supabase RLS and server/database authorization.

## 5. Pages and Routes

Exact route syntax may be adjusted during implementation, but keep route names predictable and feature-oriented.

| Page | Suggested route | Purpose |
|---|---|---|
| Sign in | `/login` | Staff authentication |
| Password recovery | `/forgot-password` | Request account recovery |
| Dashboard | `/dashboard` | Role-appropriate operational overview |
| Student list | `/students` | Search, filter, and open students |
| Create student | `/students/new` | Add a student |
| Student detail | `/students/:studentId` | Profile, enrollments, attendance, and permitted fee summary |
| Teacher list/detail | `/teachers`, `/teachers/:teacherId` | Find and manage teachers and assignments |
| Course list/detail | `/courses`, `/courses/:courseId` | Manage courses, teachers, roster, and related activity |
| Attendance | `/attendance` | Select assigned course/session and review attendance |
| Take attendance | `/attendance/:courseId/:sessionId` | Mark roster statuses and save a session |
| Fees | `/fees` | Search obligations, balances, and overdue accounts |
| Student fees | `/students/:studentId/fees` | Review obligations and payment history; record payment when authorized |
| Staff management | `/settings/staff` | Administrator manages staff profiles and roles |
| Not found / denied | `*` / access state | Explain unavailable route without exposing protected record details |

Only implement password recovery and staff-invitation flows consistent with the configured Supabase Auth workflow. Public student/parent registration is out of MVP scope.

## 6. Page Requirements

### 6.1 Sign-in and recovery

- Provide labeled email and password inputs, show/hide password control, submit state, and actionable authentication errors.
- Do not disclose whether an arbitrary email belongs to an account in a way that enables account enumeration.
- Keep recovery confirmation generic and provide a route back to sign-in.
- After authentication, load the active staff profile before rendering protected content. Inactive or missing profiles receive an access-denied/sign-out path.

### 6.2 Dashboard

- Show active student, teacher, and course counts only where the role is permitted to see them.
- Show today's attendance status/summary and distinguish clearly between “not recorded” and “all present.”
- Show outstanding and overdue fee summaries only to authorized finance/admin users.
- Allow summary items to link to the corresponding filtered list.
- Provide a useful first-use empty state, not fabricated sample data.
- Use compact summary regions and a short actionable list; avoid decorative charts unless they answer a real operational question.

### 6.3 Student and teacher lists

- Provide search by name and unique identifier, with clear status filters and result counts.
- Keep the primary action obvious to authorized roles (for example, “Add student”).
- Show the key fields needed to distinguish records; avoid exposing unnecessary contact details in dense lists.
- Provide pagination or incremental loading before result sets become unwieldy; preserve filters when opening and returning from a detail page.
- Offer edit/deactivate actions only to authorized roles and confirm consequential status changes.

### 6.4 Student detail

- Present identity and status first, then course enrollments, attendance history, and the fee summary only when the current role may access each section.
- Use sections or tabs if content becomes long; keep the current student context visible.
- Preserve historical records after withdrawal/inactivation and label their status clearly.
- Do not expose payment data to teachers or attendance data to finance staff unless policy explicitly allows it.

### 6.5 Courses and enrollment

- Course detail shows course code, name, status, assigned teachers, active roster, and applicable course fee information.
- Enrollment workflows search for an existing student rather than encouraging duplicate student creation.
- Prevent duplicate active enrollments with clear feedback from the database constraint.
- When withdrawing a student or archiving a course, explain that historical attendance and payment records remain.

### 6.6 Attendance

- Let a teacher select only courses assigned to them and an available session/date.
- Show the course, session date/time in the academy time zone, roster, and each student's current attendance status.
- Provide clear present/absent/late controls that are keyboard accessible and do not rely on color alone.
- Distinguish an unsaved draft, a saved session, and a session not yet recorded.
- Save the session and entries as one operation; prevent accidental duplicate submissions and report failure without implying that the save succeeded.
- Confirm before leaving with unsaved changes. Corrections should display the saved state and follow the configured permission rules.

### 6.7 Fees and payments

- Search by student identifier/name and show fee obligation, due date, payment history, and derived remaining balance.
- Record a payment with amount, date, method, optional reference/note, and an explicit review/confirmation step.
- Show the resulting allocation and balance after successful save; handle overpayment according to the product's confirmed policy.
- Provide a deliberate reversal flow with reason and clear permission limits. Never present a destructive delete action for a posted payment.
- Keep currency consistent with academy settings and format amounts using locale-aware formatting without changing stored precision.

### 6.8 Staff settings

- Administrators can invite/create staff accounts, assign one supported role, deactivate accounts, and review status.
- Clearly distinguish staff profiles from teacher records; link them where a teacher signs in.
- Never provide self-service role changes. Account provisioning must use the trusted workflow described in the security design.

## 7. Shared Components

Build reusable components only where they improve consistency across features:

- `AppShell`, `Sidebar`/mobile navigation, `PageHeader`, and `Breadcrumbs`.
- `Button`, `IconButton` with accessible name/tooltip, `Input`, `Select`, `DatePicker`, `Textarea`, and `FormField`.
- `DataTable` or responsive list, `SearchField`, `FilterBar`, `Pagination`, and `StatusBadge`.
- `SummaryMetric` for dashboard counts; avoid presenting every section as a card.
- `EmptyState`, `LoadingState`/skeleton, `InlineError`, `Toast`/status announcement, and `ConfirmDialog`.
- `StudentPicker`, `CoursePicker`, and `PaymentForm` only when shared workflow patterns are established.

Use text labels for commands where icon meaning is not immediately clear. Icon-only controls need accessible names and tooltips. Dialogs must trap focus, close predictably, and return focus to the trigger.

## 8. Forms and Interaction Rules

- Mark required fields in text and associate errors/help text with their inputs.
- Validate at the field/form level for fast feedback, then display database validation errors without losing entered values.
- Preserve entered values after recoverable network errors. Disable repeat submission while a write is pending.
- Use explicit confirmation for deactivation, withdrawal, course archival, and payment reversal; ordinary edits should not require unnecessary confirmation.
- Keep date/time display consistent with the academy time zone. Avoid ambiguous numeric-only date formats.
- Use accessible status announcements for save success, errors, and asynchronous updates.
- Ensure keyboard users can reach, operate, and understand all controls without a pointer.

## 9. Responsive and Accessibility Requirements

- Use mobile-first layout rules and content-driven breakpoints; test at phone, tablet, and desktop widths.
- No page should require horizontal scrolling except a clearly bounded data region when a compact mobile representation is impractical.
- Maintain readable text, adequate target size, visible focus, semantic headings, and sufficient contrast (WCAG 2.2 AA target).
- Provide table headers and row/column relationships; responsive alternatives must retain labels for values.
- Respect `prefers-reduced-motion`; use motion only to communicate state or navigation and keep it brief.
- Do not rely on hover as the only way to expose an action or explanation.

## 10. Frontend Architecture and Data Boundaries

Follow the feature-oriented structure in [ARCHITECTURE.md](ARCHITECTURE.md):

```text
src/
  app/                 # Routes, layouts, session/profile loading
  shared/              # UI primitives, common form and state components
  lib/                 # Supabase client and shared infrastructure
  modules/
    students/
    teachers/
    courses/
    attendance/
    fees/
    dashboard/
```

- Keep page rendering and feature workflows out of the Supabase client setup.
- Centralize typed data access by feature; do not scatter raw query logic through unrelated UI components.
- Use TypeScript and runtime validation at form/data boundaries. Generated Supabase database types may be used once migrations exist.
- Use React Router for navigation. Use the Supabase client for requests; add a query/cache library only when it provides clear value for invalidation and loading states.
- Load the authenticated user and active staff profile once in the app shell, then refresh/clear protected state appropriately on sign-out or profile deactivation.
- Treat client-side role checks as presentation only. RLS and trusted operations remain the authorization boundary.
- Do not put the Supabase service-role key or other secrets in frontend environment variables or bundles.
- Keep Vercel preview configuration pointed to non-production Supabase environments and synthetic data.

## 11. UI States and Error Handling

Every data-driven page must handle:

- Initial loading, including a restrained skeleton where layout stability helps.
- Empty dataset and empty search results as distinct states.
- Successful load with filtered results.
- Validation errors and rejected database constraints.
- Network/service failure with a retry path that does not discard form input.
- Expired session or missing/inactive staff profile, with a safe sign-out/re-authentication path.
- Access denied or missing record without exposing whether another user's protected record exists.
- Pending mutation, success confirmation, and duplicate-submission prevention.

Avoid displaying raw database or stack-trace errors to users. Use useful plain-language messages and keep diagnostic details out of the UI when they could contain sensitive data.

## 12. Frontend Testing and Definition of Done

### Testing

- Component tests for navigation, form validation, loading/empty/error states, and role-dependent presentation.
- Workflow tests for creating a student/course, recording attendance, and recording a payment.
- Accessibility checks for keyboard navigation, labels, focus handling, dialogs, and status announcements.
- Responsive checks for mobile, tablet, and desktop layouts.
- Integration/security tests must verify RLS independently; hiding a menu item is not evidence of authorization.

### Definition of done for a UI feature

- The authorized user can complete the workflow from the UI and receives clear saved/error feedback.
- Unauthorized actions are absent from the presentation and rejected by backend/database policy.
- Loading, empty, validation, service-error, and success states are implemented.
- The flow works at supported viewport sizes and with keyboard navigation.
- Sensitive data is not displayed, logged, or cached beyond what the role needs.
- Automated tests cover the important behavior and no secret is included in the frontend build.

## 13. MVP Exclusions

- Student or parent portals, public registration, messaging, and social feeds.
- Online payment checkout, invoices, and automated reminders.
- Timetabling, grading, exams, payroll, and advanced analytics.
- Native mobile apps and multi-branch administration.
- Complex theming or user-configurable dashboard builders.

Revisit this specification when roles, fee rules, course terms, or data-access requirements change. The visible UI must remain consistent with the implemented RLS policies and the security design.