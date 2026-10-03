# Academy Management System

## 1. Document Purpose

This Product Requirements Document (PRD) defines the first release of a simple academy management system. It is intended to guide implementation and validation; it does not prescribe a programming language, framework, or database.

## 2. Product Summary

The system will help a small academy manage its core daily operations in one place: student and teacher records, courses, attendance, fee tracking, and a basic operational dashboard. The first release prioritizes clear workflows and reliable records over advanced automation.

### Assumptions

- The product is a web-based application used by staff at one academy.
- Staff members sign in with individual accounts and receive role-appropriate access.
- A student may enroll in one or more courses; a course may have multiple students and teachers.
- Fee tracking records amounts due and payments received. Online payment processing is out of scope for the first release.
- Dates, currency, and the academy's time zone should be configurable or clearly established before implementation.

## 3. Goals and Success Measures

### Goals

- Keep student, teacher, and course information organized and searchable.
- Let staff record and review attendance by course and date.
- Track course-related fees, payments, and outstanding balances.
- Give staff a quick, trustworthy overview of academy activity.
- Keep common tasks understandable for non-technical staff.

### Success Measures

- Staff can find a student, teacher, or course using a name or identifier.
- Staff can take attendance for a course session and later review or correct the record.
- Staff can record a fee payment and see the updated balance.
- Dashboard totals match the underlying active records and can be refreshed from current data.
- Core workflows can be completed without duplicate records caused by missing validation.

## 4. Users and Access

| Role | Primary needs | Access |
|---|---|---|
| Administrator | Manage academy records, users, courses, fees, and reports | Full access, including user and configuration management |
| Teacher | View assigned courses and students; record attendance | Read access to assigned course/student details and attendance entry for assigned courses |
| Finance staff | Review fee balances and record payments | Student fee summaries, fee records, and payment entry; no user administration |

An administrator may also perform teacher or finance workflows. Access must be enforced by the system, not merely hidden in the interface.

## 5. Scope

### MVP In Scope

- Sign-in and role-based access for staff.
- Create, view, edit, search, and deactivate student records.
- Create, view, edit, search, and deactivate teacher records.
- Create and maintain courses, assign teachers, and enroll students.
- Record and review attendance for a course on a selected date.
- Define course fees or student fee obligations, record payments, and show balances.
- Dashboard with a small set of current operational counts and summaries.
- Basic input validation, useful empty states, and confirmation before destructive actions.

### Out of Scope for MVP

- Student or parent self-service accounts.
- Online payment gateway integration, invoicing, or automated payment reminders.
- Payroll, grading, exams, timetables, learning materials, or messaging.
- Multi-branch management, advanced analytics, and custom report builders.
- Native mobile applications.

## 6. Functional Requirements

### 6.1 Student Management

- Staff with permission can add a student with a unique student identifier, full name, contact details, enrollment date, and status.
- Staff can edit student details, view the student's course enrollments, attendance history, and fee summary, and search/filter the student list.
- A student can be marked inactive or withdrawn without deleting historical attendance or payment records.
- The system validates required fields and prevents duplicate student identifiers.

### 6.2 Teacher Management

- Authorized staff can add and edit a teacher's unique identifier, name, contact details, and active status.
- Staff can view the courses assigned to a teacher and search/filter the teacher list.
- Deactivating a teacher must not remove historical course or attendance information.

### 6.3 Course Management and Enrollment

- Authorized staff can create and edit a course with a unique course identifier, name, description (optional), status, and fee information.
- Staff can assign one or more teachers to a course and enroll or withdraw students.
- The system prevents duplicate active enrollment of the same student in the same course.
- Staff can view a course roster and its assigned teachers.
- Existing attendance and payment history remains available if a course is archived.

### 6.4 Attendance

- A teacher can open an assigned course, choose a date, and record each enrolled student's status as present, absent, or late.
- Authorized staff can review attendance by course, date, or student and correct an entry with appropriate permission.
- The system records who created or changed an attendance entry and when.
- A course must not have multiple attendance entries for the same student and session/date.
- The interface clearly distinguishes an unrecorded session from a session where every student is marked present.

### 6.5 Fees and Payments

- Authorized staff can view a student's fee obligations, payments, and outstanding balance.
- Staff can define or assign a fee amount and due date for a course enrollment or student.
- Staff can record a payment with amount, date, method (for example, cash or bank transfer), and optional reference or note.
- The system prevents a payment amount from being zero or negative and flags payments exceeding the outstanding balance for confirmation or correction.
- Balances are calculated from recorded obligations and payments; they are not independently editable.
- Payment records are retained for audit and are corrected through an adjustment or reversal workflow rather than silent deletion.

### 6.6 Dashboard

- The dashboard shows the number of active students, active teachers, and active courses.
- It shows today's attendance summary when attendance has been recorded, and clearly indicates when it has not.
- It shows total outstanding fees and a short list or count of overdue balances.
- Dashboard figures respect the user's access permissions and reflect the latest saved records.
- Selecting a summary item opens the related filtered list where practical.

### 6.7 Account and Audit Basics

- Staff sign in using individual accounts; administrators can create, deactivate, and assign roles to staff accounts.
- The system records the creator and last updater, with timestamps, for important records and records changes to attendance and payments.
- Deactivated accounts cannot sign in, while their historical actions remain attributable to them.

## 7. Key Workflows

1. **Set up a course:** Administrator creates a course, assigns a teacher, sets fee details, and enrolls students.
2. **Take attendance:** Teacher selects an assigned course and date, marks each enrolled student, and saves the session.
3. **Record a payment:** Finance staff finds a student, reviews the balance, enters payment details, and confirms the updated balance.
4. **Review academy status:** Staff opens the dashboard, checks counts and outstanding fees, and navigates to the relevant records.

## 8. Data and Business Rules

Core records include staff accounts, students, teachers, courses, course assignments, student enrollments, attendance sessions/entries, fee obligations, and payments.

- Each primary record has a stable unique identifier and created/updated timestamps.
- Historical records must remain understandable after a student, teacher, or course becomes inactive.
- Attendance applies to an enrolled student in a course on a specific session/date.
- Outstanding balance equals the total applicable fee obligations minus valid recorded payments and adjustments.
- Monetary values use a single configured currency in the MVP and must be stored with appropriate decimal precision.
- Personal and financial information is visible only to staff whose role requires it.

## 9. Non-Functional Requirements

- **Usability:** Common staff workflows use clear labels, consistent navigation, and actionable validation messages.
- **Security:** Require authentication; enforce role-based authorization; protect credentials and sensitive data; use secure transport in deployment.
- **Privacy:** Collect only information needed for academy operations and restrict access to personal and financial records.
- **Reliability:** Confirm successful saves, surface failures without losing entered data where possible, and avoid partial or duplicate submissions.
- **Performance:** Typical lists and dashboard summaries should load within a few seconds on a normal academy internet connection.
- **Accessibility:** Support keyboard navigation, visible focus, readable contrast, and labels associated with form controls.
- **Maintainability:** Keep the implementation modular, document setup and backup procedures, and use automated tests for core business rules.
- **Backup and recovery:** Define a regular backup and restore process before real student or payment data is used.

## 10. Acceptance Criteria

- An administrator can create and update student, teacher, and course records, and search for them.
- A course can have assigned teachers and enrolled students, with duplicate active enrollments rejected.
- A teacher can record attendance for an assigned course; an unauthorized user cannot do so.
- Staff can view attendance by course/date and identify sessions that have not yet been recorded.
- Finance staff can assign a fee, record a payment, and see an accurate remaining balance.
- The dashboard displays the defined counts and financial summaries, with totals consistent with the source records.
- Inactive records retain related history, and payment/attendance changes remain attributable to a staff account.
- Invalid required fields, duplicate identifiers, and invalid payment amounts are clearly rejected.

## 11. Risks and Open Decisions

- Confirm whether the academy uses terms/semesters and whether courses repeat across terms.
- Confirm the fee model: one-time course fee, recurring fee, installments, or a combination.
- Confirm whether a course session needs a distinct start time in addition to its date.
- Confirm currency, time zone, student identifiers, and any locally required data-retention practices.
- Define who can correct or reverse a payment and what evidence/audit detail is required.
- Select the technology stack and hosting approach before implementation; this PRD intentionally remains stack-neutral.

## 12. Suggested Project Structure

Keep the first implementation small and group code by responsibility. Adapt names to the selected framework rather than creating empty directories before they are needed.

```text
academy-management-system/
|-- docs/
|   `-- PRD.md
|-- src/
|   |-- modules/
|   |   |-- students/
|   |   |-- teachers/
|   |   |-- courses/
|   |   |-- attendance/
|   |   |-- fees/
|   |   `-- dashboard/
|   |-- shared/
|   `-- app entry point
|-- tests/
|-- README.md
|-- .gitignore
`-- project configuration files
```

This structure is a starting point, not a requirement to create all folders up front. Keep domain rules close to their module, and avoid splitting into separate services until the project has a concrete need.