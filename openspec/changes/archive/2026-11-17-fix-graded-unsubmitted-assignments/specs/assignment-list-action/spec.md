# Spec Delta

## MODIFIED Requirements

### Requirement: The action returns unfiltered data
The action SHALL return every collected assignment, including excused, locked, undated, nothing-to-submit, and graded-without-being-turned-in assignments, and SHALL include the fields needed to filter them.

#### Scenario: Excused and on-paper assignments present
- **WHEN** the entry's collected assignments include an excused assignment and an ungraded on-paper assignment
- **THEN** both appear in the response, with the excused flag and submission types set accordingly

#### Scenario: Assignment graded without being turned in
- **WHEN** the entry's collected assignments include an online assignment graded 0 that the student never turned in
- **THEN** it appears in the response marked missing and graded, with a score of 0

#### Scenario: Student with an extension
- **WHEN** a collected assignment has a due date extended for the student
- **THEN** its due date in the response is the extended date
