# Spec Delta

## Purpose

Gives each student a device in Home Assistant with a sensor showing how many assignments they have not turned in, for use on dashboards and in automations.

## ADDED Requirements

### Requirement: Each student is a device
The integration SHALL create one device per student of an entry, named after the student.

#### Scenario: Observer entry with two students
- **WHEN** an observer entry with two students is set up
- **THEN** two devices exist, each named after one student

#### Scenario: Student entry
- **WHEN** a student entry is set up
- **THEN** one device exists, named after that student

#### Scenario: Same student from two entries
- **WHEN** an observer entry and the student's own entry both cover the same student on the same Canvas host
- **THEN** each entry has its own device for the student, and both devices are named after the student

### Requirement: Each student has an unsubmitted-assignments sensor
Each student device SHALL have a sensor whose state is the number of that student's unsubmitted assignments, measured in assignments.

#### Scenario: Student with unsubmitted assignments
- **WHEN** a student has five unsubmitted assignments after a refresh
- **THEN** the student's sensor state is 5

#### Scenario: Student with nothing outstanding
- **WHEN** a student has no unsubmitted assignments after a refresh
- **THEN** the student's sensor state is 0

#### Scenario: Count changes after a refresh
- **WHEN** a refresh collects a different number of unsubmitted assignments for a student
- **THEN** the student's sensor state changes to the new number

### Requirement: Sensors are stable and named from the student
Each sensor SHALL have a unique id that stays the same across restarts and reloads, and SHALL take its name from its device with a translated entity name.

#### Scenario: Restart
- **WHEN** Home Assistant restarts
- **THEN** each sensor keeps its entity id, history, and any customisation the user made

#### Scenario: Same student from two entries
- **WHEN** two entries cover the same student
- **THEN** each entry provides its own sensor on its own device for the student, and both can coexist

### Requirement: Sensors show when data is unavailable
A sensor SHALL be unavailable while its entry's data cannot be read from Canvas, and SHALL return to a number when data is available again.

#### Scenario: Refresh fails
- **WHEN** an entry's refresh fails
- **THEN** that entry's sensors are unavailable

#### Scenario: Refresh recovers
- **WHEN** a later refresh succeeds
- **THEN** that entry's sensors show their counts again

### Requirement: The assignment list is not stored in sensor attributes
The sensor SHALL NOT expose the list of assignments as state attributes.

#### Scenario: Student with many assignments
- **WHEN** a student has a large number of unsubmitted assignments
- **THEN** the sensor's state attributes do not contain the assignment list
