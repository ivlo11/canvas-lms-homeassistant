# course-grades Specification

## Purpose
Gives each student a grade sensor for every active course, carrying the course name, teacher names, and current grade, for use by the courses dashboard card and in dashboards, history, and automations.

## Requirements

### Requirement: Each active course has a grade sensor
For each student of an entry, the integration SHALL provide one sensor per course in which the student is actively enrolled, on that student's device, named after the course.

#### Scenario: Student with several active courses
- **WHEN** a student is actively enrolled in four courses after a refresh
- **THEN** the student's device has four course grade sensors, one named after each course

#### Scenario: Concluded course
- **WHEN** a student's enrolment in a course is no longer active
- **THEN** the student has no grade sensor for that course

#### Scenario: Observer entry with two students in the same course
- **WHEN** two students of an observer entry are enrolled in the same course
- **THEN** each student's device has its own grade sensor for that course

### Requirement: The sensor reports the student's current score
A course grade sensor's state SHALL be the student's current score in that course as a percentage, as Canvas reports it for that student.

#### Scenario: Course with a score
- **WHEN** Canvas reports a current score of 91.5 for the student in a course
- **THEN** that course's sensor state is 91.5 with a percent unit

#### Scenario: Score changes
- **WHEN** a refresh reads a different current score for the student
- **THEN** the sensor state changes to the new score

#### Scenario: Course with no graded work yet
- **WHEN** Canvas reports no current score for the student in a course
- **THEN** that course's sensor state is unknown

### Requirement: The current grading period's grade is preferred
Where Canvas reports a grade for the current grading period, the sensor SHALL use it; otherwise it SHALL use the grade for the whole course.

#### Scenario: Course with grading periods
- **WHEN** Canvas reports both a current-period score and a whole-course score for the student
- **THEN** the sensor reports the current-period score and letter grade

#### Scenario: Course without grading periods
- **WHEN** Canvas reports only a whole-course score for the student
- **THEN** the sensor reports the whole-course score and letter grade

### Requirement: The sensor carries the course's details
A course grade sensor SHALL expose the course id, the course name, the student id, the names of the course's teachers, and the student's current letter grade.

#### Scenario: Course with a letter grading scheme
- **WHEN** Canvas reports a letter grade of "A-" for the student in a course taught by one teacher
- **THEN** the sensor exposes that letter grade, that teacher's name, the course name, the course id, and the student id

#### Scenario: Course without a letter grade
- **WHEN** Canvas reports a score but no letter grade for the student
- **THEN** the sensor exposes an empty letter grade and still reports the score

#### Scenario: Course with several teachers
- **WHEN** a course has more than one teacher
- **THEN** the sensor exposes every teacher's name

#### Scenario: Course with no teacher listed
- **WHEN** Canvas lists no teachers for a course
- **THEN** the sensor exposes an empty list of teachers and the refresh succeeds

### Requirement: The sensor carries the course's link, term, and dates
A course grade sensor SHALL expose the course's Canvas web link, the name of its term, the title of the current grading period, and the course's start and end dates, each as Canvas reports it and empty when Canvas provides none.

#### Scenario: Course with all of them
- **WHEN** Canvas reports a web link, a term named "Fall 2026", a current grading period titled "Quarter 2", and start and end dates for a course
- **THEN** the sensor exposes each of those values, with the dates as ISO 8601 timestamps

#### Scenario: Course without grading periods
- **WHEN** a course does not use grading periods
- **THEN** the sensor exposes an empty grading period

#### Scenario: Course without dates
- **WHEN** Canvas reports no start or end date for a course
- **THEN** the sensor exposes empty start and end dates

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

### Requirement: Withheld grades are shown as unknown
When Canvas does not provide the student's grade for a course, the integration SHALL report the sensor's state as unknown and the letter grade as empty, and SHALL NOT fail the refresh or drop the course.

#### Scenario: Course hides totals from students
- **WHEN** a course is set to hide grade totals and Canvas omits the student's score
- **THEN** the course's sensor exists with an unknown state and an empty letter grade

### Requirement: Sensors follow the student's enrolments without a reload
The integration SHALL add a grade sensor when a refresh first lists a course as active for a student, and SHALL remove the sensor when a successful refresh no longer lists it, without the entry being reloaded.

#### Scenario: New course mid-year
- **WHEN** a refresh lists an active course the student did not have before
- **THEN** a grade sensor for that course appears on the student's device

#### Scenario: Course ends
- **WHEN** a successful refresh no longer lists a course as active for the student
- **THEN** that course's grade sensor is removed

#### Scenario: Refresh fails
- **WHEN** a refresh fails
- **THEN** no grade sensor is removed, and the existing grade sensors are unavailable until a refresh succeeds

### Requirement: Course sensors are stable
Each course grade sensor SHALL have a unique id that stays the same across restarts, reloads, and refreshes for as long as the student is actively enrolled in the course.

#### Scenario: Restart
- **WHEN** Home Assistant restarts
- **THEN** each course grade sensor keeps its entity id, history, and any customisation the user made

### Requirement: Course data adds no Canvas requests
Collecting course names, teachers, and grades SHALL NOT increase the number of requests the integration sends to Canvas per refresh.

#### Scenario: Refresh for a student with five courses
- **WHEN** a refresh runs for a student with five active courses
- **THEN** the number of requests sent to Canvas is the same as before course grades were collected

### Requirement: Works with a student token or an observer token
The integration SHALL report the same course grade sensors for a student whether it is using that student's own token or the token of an observer linked to that student.

#### Scenario: Observer token
- **WHEN** the entry uses an observer's token
- **THEN** each observed student's course grade sensors report that student's own grades
