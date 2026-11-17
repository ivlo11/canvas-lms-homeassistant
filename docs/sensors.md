# Sensors

Each student is a device. Every sensor below is on the student's device.

## Unsubmitted assignments

One per student. Its state is the number of assignments the student has not turned in across their active courses. The list itself comes from the [`get_unsubmitted_assignments` action](actions.md).

## Course grade

One per student per active course, named after the course, for example *Algebra grade*.

The state is the student's current score in the course as a percentage, as Canvas reports it for that student. Where the course uses grading periods and Canvas reports a score for the current period, that score is used, which is what the student sees in Canvas; otherwise it is the score for the whole course.

The state is **unknown** when Canvas gives no score: nothing has been graded yet, or the course hides grade totals from students. The sensor still exists and its other attributes are filled in.

### Attributes

```yaml
course_id: 101
course_name: Algebra
student_id: 21
html_url: https://school.instructure.com/courses/101
teachers:
  - Ms Rivera
grade: A-
term: Fall 2026
grading_period: Quarter 2
start_at: "2026-08-20T14:00:00+00:00"
end_at: "2026-12-18T00:00:00+00:00"
unsubmitted_count: 5
missing_count: 2
```

| Attribute | Description |
|---|---|
| `course_id`, `course_name` | The class. |
| `student_id` | The student the grade belongs to. |
| `html_url` | Link to the course in Canvas. |
| `teachers` | The names of the course's teachers; an empty list if Canvas lists none. |
| `grade` | The letter grade that goes with the score, or `null` if the course has no letter grades or Canvas withholds the grade. |
| `term` | The name of the course's term, or `null`. |
| `grading_period` | The title of the current grading period, or `null` if the course does not use grading periods. |
| `start_at`, `end_at` | The course's start and end dates as ISO 8601 timestamps in UTC, or `null` if the course has none. |
| `unsubmitted_count` | How many assignments the student has not turned in for this course. It equals the number of items the action returns for this student and course. |
| `missing_count` | How many of those the integration marks missing, as described for the [action's `missing` field](actions.md#how-missing-is-decided). Work graded 0 without being turned in counts as missing. |

`unsubmitted_count` and `missing_count` are `null`, not `0`, when [Canvas refused the course's assignments](known-limitations.md#courses-canvas-refuses-are-skipped) at the last refresh, so a skipped course is not shown as having nothing owed.

### When course sensors appear and disappear

Course sensors follow the student's active enrolments at every refresh, without reloading the entry:

- A course that becomes active for the student gets a sensor at the next refresh.
- A course that is no longer active, such as one that ended with the term, loses its sensor at the next successful refresh, along with that sensor's history.
- A refresh that fails removes nothing. The sensors are unavailable until a refresh succeeds.

A sensor keeps its entity id, history and any customisation for as long as the student stays enrolled, across restarts and reloads.

### Example

Show a student's lowest current score:

```jinja
{{ states.sensor
   | selectattr('attributes.course_id', 'defined')
   | selectattr('attributes.student_id', 'eq', 21)
   | rejectattr('state', 'in', ['unknown', 'unavailable'])
   | map(attribute='state') | map('float') | min }}
```
