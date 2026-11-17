# Actions

## `canvas_lms_edu.get_unsubmitted_assignments`

Returns every assignment the students of one Canvas account have not turned in, as of the last refresh. It answers from data the integration already holds and does not contact Canvas, so it is cheap to call from templates and automations.

### What counts as not turned in

An assignment is not turned in when Canvas has no submission time for the student, and either:

- it has not been graded, or
- it was meant to be turned in online.

So an online assignment a teacher graded 0 because the student never turned it in stays in the list, marked missing and graded. Work that is not turned in online, such as an on-paper worksheet, leaves the list once it is graded. Until then it is listed like any other assignment.

"Meant to be turned in online" follows Canvas's own rule. It covers new quizzes and any assignment whose submission types are not just one of `on_paper`, `external_tool`, `none`, `not_graded` or `wiki_page`.

### How `missing` is decided

The integration decides `missing` itself, using Canvas's rules with one difference: grading work the student never turned in does not clear `missing`. In order:

1. Excused work is not missing.
2. Work with a custom grade status is not missing.
3. If a teacher set a late status, the assignment is missing only if that status is *missing*. Setting it to *none* clears missing.
4. Work with a submission time is not missing.
5. Work not yet past the student's due date is not missing.
6. Otherwise it is missing if it was meant to be turned in online.

### Input

| Field | Required | Description |
|---|---|---|
| `config_entry_id` | yes | The Canvas account. Pick it from the list in the UI; in YAML, use the entry's id. |

The action fails with a validation error if the entry does not exist, belongs to another integration, or is not loaded.

### Response

```yaml
assignments:
  - student_id: 21
    student_name: Alice Student
    course_id: 101
    course_name: Algebra
    assignment_id: 2
    name: Chapter 4 problems
    due_at: "2026-11-01T23:59:00+00:00"
    points_possible: 10.0
    html_url: https://school.instructure.com/courses/101/assignments/2
    submission_types:
      - online_upload
    locked_for_user: false
    missing: true
    excused: false
    graded: true
    score: 0.0
```

| Field | Description |
|---|---|
| `student_id`, `student_name` | The student the assignment is for. |
| `course_id`, `course_name` | The class. |
| `assignment_id`, `name` | The assignment. |
| `due_at` | The student's own due date as an ISO 8601 timestamp in UTC, including extensions and section dates, or `null` if the student has no due date. |
| `points_possible` | Points, or `null` if the assignment has none. |
| `html_url` | Link to the assignment in Canvas. |
| `submission_types` | How the assignment is turned in, for example `online_upload`, `online_quiz`, `on_paper`, `none`, `not_graded`. |
| `locked_for_user` | `true` if the student cannot currently open or submit it. |
| `missing` | `true` if the integration marks it missing; see [How `missing` is decided](#how-missing-is-decided). |
| `excused` | `true` if the student is excused from it. |
| `graded` | `true` if the student's submission has been graded, even though it was not turned in. |
| `score` | The student's score, or `null` if Canvas gives none. |

When a course posts grades manually, Canvas hides an unposted grade from students and observers. Until the grade is posted, the assignment shows `graded: false` and `score: null`.

Each student's assignments are ordered by their own due date, earliest first, with undated assignments last. For an observer account, the students follow one another.

### Examples

Nothing is filtered by the integration. These templates show how to filter the response yourself. Each assumes the response was stored in a variable named `canvas`:

```yaml
actions:
  - action: canvas_lms_edu.get_unsubmitted_assignments
    data:
      config_entry_id: 01JEXAMPLEENTRYID
    response_variable: canvas
```

Leave out excused work and work with nothing to turn in online:

```jinja
{% set offline = ['on_paper', 'none', 'not_graded'] %}
{% for a in canvas.assignments
   if not a.excused and a.submission_types | reject('in', offline) | list %}
- {{ a.student_name }}: {{ a.name }} ({{ a.course_name }})
{% endfor %}
```

Count what is missing for one student:

```jinja
{{ canvas.assignments
   | selectattr('student_name', 'eq', 'Alice Student')
   | selectattr('missing')
   | list | count }}
```

List what is due in the next seven days:

```jinja
{% set soon = (now() + timedelta(days=7)).isoformat() %}
{% for a in canvas.assignments
   if a.due_at and now().isoformat() <= a.due_at <= soon %}
- {{ a.name }}, due {{ as_datetime(a.due_at) | as_local }}
{% endfor %}
```
