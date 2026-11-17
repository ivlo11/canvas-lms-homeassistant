# Spec Delta

## MODIFIED Requirements

### Requirement: The sensor counts the student's unsubmitted work in the course
A course grade sensor SHALL expose how many assignments the student has not turned in for that course, and how many of those the integration marks as missing, matching the assignments the integration collected at the same refresh.

#### Scenario: Course with unsubmitted and missing work
- **WHEN** the student has five unsubmitted assignments in a course, two of which the integration marks as missing
- **THEN** the sensor exposes an unsubmitted count of 5 and a missing count of 2

#### Scenario: Missing work graded 0
- **WHEN** the student has one past-due online assignment in a course that was graded 0 without being turned in
- **THEN** the sensor exposes an unsubmitted count of 1 and a missing count of 1

#### Scenario: Course with nothing owed
- **WHEN** the student has no unsubmitted assignments in a course
- **THEN** the sensor exposes an unsubmitted count of 0 and a missing count of 0

#### Scenario: Counts agree with the action
- **WHEN** the assignment list action is called after a refresh
- **THEN** the number of items for that student and course equals the sensor's unsubmitted count, and the number of those marked missing equals its missing count

#### Scenario: Canvas refused the course's assignments
- **WHEN** Canvas refused access to the course's assignments at the latest refresh
- **THEN** the sensor exposes empty counts rather than zero
