# Spec Delta

## Purpose

Defines which Canvas assignments count as not turned in for each student, what information each one carries, how often the data is refreshed, and how the integration behaves when Canvas cannot be read.

## ADDED Requirements

### Requirement: Unsubmitted assignments are collected per student
For each student of an entry, the integration SHALL collect every assignment in the student's active courses for which Canvas reports the student's submission as unsubmitted.

#### Scenario: Student with unsubmitted work in several courses
- **WHEN** a student has unsubmitted assignments in more than one active course
- **THEN** the assignments from every such course are collected for that student

#### Scenario: Submitted or graded work
- **WHEN** a student's submission for an assignment is submitted, graded, or pending review
- **THEN** that assignment is not collected

#### Scenario: Concluded course
- **WHEN** a student has unsubmitted assignments in a course whose enrolment is no longer active
- **THEN** those assignments are not collected

#### Scenario: More results than one page
- **WHEN** a course has more unsubmitted assignments than Canvas returns in one page
- **THEN** the assignments from every page are collected, with no duplicates

### Requirement: Upcoming and past-due assignments are both included
The integration SHALL include unsubmitted assignments regardless of due date: not yet due, past due, and with no due date.

#### Scenario: Assignment not yet due
- **WHEN** an unsubmitted assignment is due in the future
- **THEN** it is collected

#### Scenario: Assignment past due
- **WHEN** an unsubmitted assignment's due date has passed
- **THEN** it is collected and marked as missing when Canvas reports it as missing

#### Scenario: Assignment with no due date
- **WHEN** an unsubmitted assignment has no due date
- **THEN** it is collected with an empty due date

### Requirement: The integration does not filter assignments
The integration SHALL NOT drop an unsubmitted assignment because it is excused, locked, or has nothing to submit online. It SHALL instead report the fields that let an admin filter such assignments.

#### Scenario: Excused assignment
- **WHEN** an unsubmitted assignment is excused for the student
- **THEN** it is collected and reported as excused

#### Scenario: Assignment with nothing to submit online
- **WHEN** an unsubmitted assignment's submission types are none, not graded, or on paper
- **THEN** it is collected and its submission types are reported

#### Scenario: Locked assignment
- **WHEN** an unsubmitted assignment is locked for the student
- **THEN** it is collected and reported as locked

### Requirement: Each assignment carries its details
Each collected assignment SHALL carry the student's id and name, the course's id and name, the assignment's id, name, due date, points possible, web link, and submission types, and whether it is missing, excused, and locked for the student.

#### Scenario: Fully populated assignment
- **WHEN** Canvas provides all details for an unsubmitted assignment
- **THEN** every listed field holds the value Canvas sent, with the due date as an ISO 8601 timestamp

#### Scenario: Assignment without points
- **WHEN** Canvas provides no points possible for an assignment
- **THEN** the assignment is collected with empty points possible

### Requirement: Assignments are ordered by due date
The integration SHALL order each student's assignments by due date, earliest first, with assignments that have no due date last.

#### Scenario: Mixed due dates
- **WHEN** a student has past-due, upcoming, and undated unsubmitted assignments
- **THEN** they are ordered past-due first, then upcoming, then undated

### Requirement: Works with a student token or an observer token
The integration SHALL collect the same assignments for a student whether it is using that student's own token or the token of an observer linked to that student.

#### Scenario: Student token
- **WHEN** the entry uses a student's own token
- **THEN** that student's unsubmitted assignments are collected

#### Scenario: Observer token with several students
- **WHEN** the entry uses an observer's token linked to several students
- **THEN** each student's unsubmitted assignments are collected and attributed to that student

### Requirement: Data is refreshed on a fixed interval
The integration SHALL refresh each entry's assignments every 30 minutes, and SHALL NOT offer a setting for the interval.

#### Scenario: Scheduled refresh
- **WHEN** 30 minutes have passed since the last refresh
- **THEN** the entry's assignments are read from Canvas again

#### Scenario: Assignment turned in between refreshes
- **WHEN** a student turns in an assignment and the next refresh runs
- **THEN** that assignment is no longer collected

### Requirement: Failures to read Canvas are visible and recoverable
When Canvas cannot be read, the integration SHALL keep the entry, mark its data unavailable, log the failure once, and recover on a later refresh without user action.

#### Scenario: Canvas unreachable at startup
- **WHEN** Canvas cannot be reached while an entry is being set up
- **THEN** setup is retried later and no error requires user action

#### Scenario: Canvas unreachable during operation
- **WHEN** a refresh fails because Canvas is unreachable or returns a server error
- **THEN** the entry's data is unavailable and the failure is logged once

#### Scenario: Canvas reachable again
- **WHEN** a refresh succeeds after earlier failures
- **THEN** the entry's data is available again and the recovery is logged once

### Requirement: One refused course does not fail the account
When Canvas refuses access to a single course, the integration SHALL skip that course for that refresh and still collect assignments from the student's other courses.

#### Scenario: One course forbidden
- **WHEN** Canvas returns a forbidden response for one of a student's courses
- **THEN** assignments from the student's other courses are collected and the refresh succeeds

### Requirement: The integration only reads from Canvas
The integration SHALL NOT create, change, or delete anything in Canvas.

#### Scenario: Refresh
- **WHEN** a refresh runs
- **THEN** only read requests are sent to Canvas
