# Design

## Context

See proposal.md for why. Today `api.py` lists each course's submissions for the student with `workflow_state=unsubmitted` and `include[]=assignment`, builds one item per submission, copies `missing` from Canvas, and reports `assignment.due_at`. Everything else (count sensor, course sensors, action, card) reads those items.

Canvas's own rules, which this design mirrors, are in canvas-lms:

- `Submission#missing?` (`app/models/submission.rb`): not missing if excused or a custom grade status is set; **not missing if a grader is set and no late policy status is set**; otherwise the late policy status decides if present; otherwise not missing if submitted, not missing unless past due, and missing if the assignment is a new quiz or expects a submission.
- `AbstractAssignment#expects_submission?`: submission types are present and are not exactly one of `on_paper`, `external_tool`, `none`, `not_graded`, `wiki_page`.

Checked against the seeded Canvas with the observer token: every submission row carries `cached_due_date`, `grader_id`, `seconds_late`, `late_policy_status` and `custom_grade_status_id`, and `canvas-lms-python-client`'s `Submission` and `Assignment` models already have these fields and `is_quiz_lti_assignment`.

## Goals / Non-Goals

**Goals:**
- One place in `api.py` that classifies a submission as not turned in, decides missing, and picks the due date, as pure functions that are easy to test case by case.
- Same number of requests per refresh as today.

**Non-Goals:**
- Keeping a previous snapshot or comparing refreshes. That belongs to the change-events follow-up.
- Changing how courses, grades, or refused courses are handled.

## Decisions

### Fetch every submission and classify locally

Drop the `workflow_state` filter and request all of the student's submissions in the course, still with `include[]=assignment`, then keep the ones that are not turned in.

- *Alternative: two requests per course*, one for `unsubmitted` and one for `graded`. Canvas accepts only one `workflow_state` per request, so this doubles requests to find a handful of graded-without-submission rows.
- *Alternative: keep the filter and call the single-submission endpoint for graded assignments.* Needs to know which assignments to ask about, which is the problem being solved.

Submissions with `workflow_state` `deleted` are ignored.

### Not turned in

A submission is not turned in when `submitted_at` is empty and either `workflow_state` is not `graded` or the assignment expects an online submission.

"Expects an online submission" mirrors `expects_submission?`, plus new quizzes as Canvas's `missing?` does: true when `is_quiz_lti_assignment` is set, or when the submission types are non-empty and are not exactly one of `on_paper`, `external_tool`, `none`, `not_graded`, `wiki_page`. Canvas compares the whole type list as a string, so a list naming one of those alongside another type counts as expecting a submission; the integration does the same.

- *Alternative: `submitted_at` empty, nothing else.* Keeps every graded paper worksheet and in-class activity in the list for the rest of the term.
- *Alternative: graded with a score of 0.* Guesses intent from the score; partial credit and late-policy deductions break it.

Ungraded on-paper and no-submission assignments are still listed, as today; only once graded do they drop out.

### Missing, computed by the integration

Canvas's `missing?` without the grader check, in the same order:

1. excused → not missing
2. `custom_grade_status_id` set → not missing
3. `late_policy_status` set → missing only if it is `missing`
4. `submitted_at` set → not missing
5. `seconds_late` not greater than 0 → not missing
6. otherwise → missing if the assignment expects an online submission (as above)

Past due uses Canvas's `seconds_late`, computed by Canvas for the student's own due date at request time, rather than comparing `cached_due_date` with Home Assistant's clock. It is exactly the value Canvas's `past_due?` uses, and it avoids clock differences between the two machines.

Canvas's `missing` field is no longer read.

### Due date is the student's own

`due_at` on each item comes from the submission's `cached_due_date` (the date Canvas applies to that student, including overrides), formatted as today in UTC ISO 8601. An empty `cached_due_date` means the student has no due date; the assignment's general `due_at` is not used as a fallback, because it would contradict what Canvas shows the student. Ordering uses the same value.

The client types `cached_due_date` as a string rather than a timestamp, so it is parsed in `api.py`; an unparseable value is treated as no due date and logged at debug level.

### Two new fields

`graded` (true when `workflow_state` is `graded`) and `score` (the submission's score, empty when Canvas gives none) are added to each item and therefore to the action's response. The card does not display them in this change.

## Risks / Trade-offs

- [Larger responses] Unfiltered listings include every graded submission, so a busy course may need an extra page late in the term. → Still one request per course per page; page size stays 100. Measured in the seed, a course with 52 assignments is one page.
- [Online work handed in on paper] If a student hands in an online assignment on paper and the teacher grades it directly, `submitted_at` stays empty and it remains listed. → Documented in known limitations; the new `graded` and `score` fields let an automation exclude it.
- [Hidden grades] When a course posts grades manually, Canvas may hide the score and grading state of an unposted grade from students and observers. Such an assignment then looks ungraded and stays listed, which is the conservative outcome. → Noted in the docs for `graded` and `score`.
- [Mirroring Canvas rules] If Canvas changes `missing?` or `expects_submission?`, the integration's flag drifts from Canvas's. → The rules are documented here with their source; tests name each branch.
- [Seed coverage] The seed has no on-paper assignment and no per-student due date, so those cases are covered only by unit tests until the seed has them. → Tasks include checking both against the seeded Canvas.
