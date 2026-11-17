# Tasks

## 1. Test fixtures

- [x] 1.1 Extend `submission()` in `tests/conftest.py` with `workflow_state`, `submitted_at`, `grader_id`, `score`, `late_policy_status`, `custom_grade_status_id`, `cached_due_date` (defaulting to the assignment's `due_at`), `seconds_late`, and the assignment's `is_quiz_lti_assignment`, keeping today's defaults for an ungraded, unsubmitted, online submission; verify `uv run pytest` still passes unchanged
- [x] 1.2 Change the fake `submissions_api_for_students_all` to assert that no `workflow_state` is sent and to yield every submission it holds; verify the tests that relied on the filter fail only where the spec changes them

## 2. Not turned in and missing

- [x] 2.1 Add a function in `api.py` deciding whether an assignment expects an online submission (new quiz, or non-empty types that are not exactly one of `on_paper`, `external_tool`, `none`, `not_graded`, `wiki_page`); verify a parametrised test covers each excluded type, an empty list, a new quiz, and a list combining `on_paper` with an online type
- [x] 2.2 Add the not-turned-in rule from design.md and drop `deleted` submissions; verify tests for submitted, pending review, graded with a submission time, online graded 0 without one, on-paper graded without one, ungraded on-paper, a new quiz graded without being taken, and deleted
- [x] 2.3 Add the integration's missing rule, in the order given in design.md, using `seconds_late` for past due and no longer reading Canvas's `missing`; verify one test per branch, including graded 0 without being turned in (missing), late status `none` (not missing), late status `missing` before the due date (missing), excused, custom grade status, not yet due, and ungraded past-due on-paper (not missing)
- [x] 2.4 Remove the `workflow_state` filter from the submissions request and apply 2.2 and 2.3 when building items; verify tests that a graded-0 online assignment is collected and missing, submitted work is not collected, only read requests are made, and the request count for five courses is unchanged
- [x] 2.5 Update `docs/actions.md` for what counts as not turned in and how `missing` is decided, and add the online-work-handed-in-on-paper case to `docs/known-limitations.md`; verify `tests/test_docs.py` passes with any example templates adjusted

## 3. Due date and new fields

- [x] 3.1 Take each item's `due_at` from `cached_due_date`, formatted as UTC ISO 8601, with no fallback to the assignment's general due date and an unparseable value treated as empty and logged at debug level; verify tests for an extension, an empty `cached_due_date` with a general due date, and an unparseable value
- [x] 3.2 Verify ordering uses the student's due date with a test where an extension moves one assignment after another
- [x] 3.3 Add `graded` and `score` to each item; verify `test_item_carries_every_field` covers both, and tests for graded 0 without being turned in and for not graded yet
- [x] 3.4 Document `due_at` as the student's own due date and the new `graded` and `score` fields in `docs/actions.md`, including that unposted grades can appear as not graded; verify `tests/test_docs.py` passes

## 4. Sensors, action and card

- [x] 4.1 Verify the course sensors' `missing_count` follows the new flag with a `tests/test_course_sensor.py` case for a course whose only assignment was graded 0 without being turned in (counts 1 and 1), and update the `missing_count` row in `docs/sensors.md`
- [x] 4.2 Verify the action returns `graded`, `score` and the student's due date, and that its item and missing counts per course equal the course sensor's, with tests in `tests/test_services.py`
- [x] 4.3 Add `graded` and `score` to the frontend `Assignment` type and a card test showing a graded-0 assignment marked missing; verify `npm test` in `frontend/` passes and the rebuilt bundle matches the committed one (`tests/test_frontend.py`)
- [x] 4.4 Change "Assignments Canvas reports as missing" in `docs/courses-card.md` to describe the integration's missing flag; verify the doc reads correctly against the card's behaviour from 4.3

## 5. Check against the seeded Canvas

- [x] 5.1 In the local Docker Canvas, using the admin token, add to an observed student's course an on-paper assignment graded without a submission, a past-due online assignment with a per-student due date override, and a past-due assignment with late status `none`; do not change or commit the seed script
- [x] 5.2 Run `CanvasClient.async_get_student_data` against the local Canvas with the observer token from a scratch script; verify assignment 54 for student 168 is collected as missing, graded, score 0; the graded on-paper assignment is absent; the override's due date is reported; and the late-status-`none` assignment is not missing
- [x] 5.3 Run `uv run pytest --cov`, `uv run ruff check . && uv run ruff format --check .`, and the frontend tests; verify all pass

## Workflow follow-up

- Sync the delta specs and archive the change after review.
