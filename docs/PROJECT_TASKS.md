# Project Task Breakdown

## Tasks

### Phase 1 - Setup
- [ ] Create the React + Vite project structure
- [ ] Install dependencies for React, Tailwind CSS, routing, and validation
- [ ] Configure Tailwind design system and base app layout
- [ ] Set up the project folder structure for modules and shared components
- [ ] Create environment variables for Supabase local development
- [ ] Connect the app to Supabase Auth and database client
- [ ] Confirm project naming conventions and default academy settings

### Phase 2 - Authentication and Access
- [ ] Create sign-in and sign-out pages
- [ ] Create protected route guards for authenticated users
- [ ] Build staff profile creation flow linked to Supabase Auth users
- [ ] Define roles: administrator, teacher, and finance staff
- [ ] Implement role-based access checks in UI and database policies
- [ ] Add account deactivation and reactivation flow for staff
- [ ] Test access restrictions for unauthorized users

### Phase 3 - Staff Profiles and Admin Setup (demo prototype)
- [x] Create admin dashboard shell and navigation
- [x] Build staff list view with search and status filters
- [x] Implement create and edit staff profile forms
- [x] Add basic validation for required staff fields
- [x] Add ability to assign roles to staff accounts
- [x] Add status management for active and inactive staff
- [x] Confirm audit metadata for created/updated records

### Phase 4 - Students
- [ ] Build student listing page with search and filtering
- [ ] Implement create student form with validation
- [ ] Add edit student form and update flow
- [ ] Add student detail page with enrollment and fee summary
- [ ] Add soft delete or inactive status handling without removing history
- [ ] Prevent duplicate student identifiers
- [ ] Add student status badges and accurate inactive/active behavior

### Phase 5 - Teachers
- [ ] Build teacher listing page with search and filtering
- [ ] Create teacher create/edit form
- [ ] Add teacher status management for active/inactive records
- [ ] Connect teachers to assigned courses
- [ ] Build teacher detail view with assigned course list
- [ ] Prevent duplicate teacher identifiers
- [ ] Ensure historical course data remains visible after deactivation

### Phase 6 - Courses and Enrollment
- [ ] Build course list and search page
- [ ] Implement create and edit course form
- [ ] Add course status options such as active or archived
- [ ] Add teacher assignment to courses
- [ ] Add student enrollment management
- [ ] Prevent duplicate active enrollment in the same course
- [ ] Build course roster view with assigned teachers and enrolled students
- [ ] Preserve historical records when a course is archived or inactive

### Phase 7 - Attendance Management
- [ ] Create attendance dashboard for assigned courses
- [ ] Build session date selection and course roster loading
- [ ] Implement attendance marking for present, absent, and late
- [ ] Prevent duplicate attendance entries for a student/session
- [ ] Add attendance review and correction flow for authorized staff
- [ ] Record actor and timestamp for each attendance change
- [ ] Add status for unrecorded sessions vs. fully marked sessions
- [ ] Test role restrictions for teacher-only attendance entry

### Phase 8 - Fees and Payments
- [ ] Build fee obligation creation flow for students or enrollments
- [ ] Add payment entry form with amount, date, method, and reference
- [ ] Validate payment values and prevent invalid amounts
- [ ] Calculate outstanding balances from obligations minus payments
- [ ] Display balance summary and payment history on student records
- [ ] Add payment correction or reversal workflow for audit-safe changes
- [ ] Flag payments exceeding current outstanding balance for review
- [ ] Protect financial records by role-based access rules

### Phase 9 - Dashboard and Reporting
- [ ] Create dashboard layout with key operational summary cards
- [ ] Show active students, teachers, and courses counts
- [ ] Display today's attendance summary with empty-state handling
- [ ] Show total outstanding fees and overdue balance indicators
- [ ] Add quick navigation to filtered student, teacher, and payment views
- [ ] Ensure dashboard values reflect current saved records only
- [ ] Add loading and error states for dashboard data

### Phase 10 - Quality, Security, and Deployment
- [ ] Add form validation and user-friendly error messages across all modules
- [ ] Add loading, empty, success, and error states to key screens
- [ ] Review Supabase Row Level Security policies for every table
- [ ] Test role-based restrictions and unauthorized data access attempts
- [ ] Add unit and component tests for validation and core business logic
- [ ] Add integration checks for attendance and payment workflows
- [ ] Configure Vercel deployment workflow for frontend
- [ ] Configure separate Supabase projects for development and production
- [ ] Set environment variables for preview and production
- [ ] Finalize backup, restore, and privacy process before launch
- [ ] Perform MVP QA, regression checks, and final deployment validation

## Recommended Delivery Order

1. Setup and authentication
2. Staff profiles and admin access
3. Students, teachers, and courses
4. Attendance and fee workflows
5. Dashboard and reporting
6. Testing, security validation, and deployment

## Definition of Done for MVP

- A staff user can sign in and access only the data allowed by role
- Students, teachers, courses, and enrollments can be managed reliably
- Attendance can be recorded for assigned courses without duplicate entries
- Payments and obligations update financial summaries accurately
- Dashboard reflects live academy activity with consistent totals
- Core workflows are tested and the app is ready for staging deployment

## Notes

This task breakdown is based on the current Academy Management System PRD and architecture proposal. It keeps the scope focused on the MVP while staying aligned with the technology direction: React + Tailwind + Supabase + Vercel.

The frontend now uses Supabase Auth and Supabase tables for academy records. Apply the versioned migration and deploy the trusted staff invitation function by following [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before using the app. Payment reversals remain intentionally blocked until the audited reversal workflow is implemented.
