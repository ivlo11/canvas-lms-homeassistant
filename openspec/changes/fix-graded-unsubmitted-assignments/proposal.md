# Proposal

## Why

When a teacher enters a grade for work the student never turned in, most often a 0 for a missing assignment, Canvas moves the submission from `unsubmitted` to `graded` and clears its `missing` flag, though `submitted_at` stays empty. The integration asks Canvas only for `unsubmitted` submissions and reports Canvas's `missing` flag, so that assignment disappears from the count, the action, and the card, exactly when a parent most needs to see it. This was reproduced against the seeded Canvas: a past-due, missing assignment graded 0 by an admin left the `workflow_state=unsubmitted` listing and came back with `missing: false` and `submitted_at: null`.

The integration also reports and sorts by the assignment's general due date, not the date that applies to the student. A student with an extension or a section-specific date sees a different due date in Canvas than in Home Assistant.

Fixing what "not turned in" and "missing" mean comes before change events, which will be built on the same definitions.

## What Changes

- An assignment counts as **not turned in** when the student's submission has no submission time, and either it has not been graded or the assignment expects an online submission. Graded online work that was never turned in, such as a 0 for missing work, is now collected. Graded work that was never meant to be turned in online, such as an on-paper worksheet the teacher graded, is not.
- **Missing** is decided by the integration instead of copied from Canvas. It follows Canvas's own rule except that entering a grade does not clear it: a teacher's explicit missing or "none" status still wins, excused work and work with a custom grade status are never missing, and otherwise an assignment is missing when it is past the student's due date, not turned in, and expects an online submission.
- Each assignment's **due date** is the student's own due date, including extensions and section dates, and assignments are ordered by it.
- Each assignment gains whether it has been **graded** and its **score**, so "graded 0, never turned in" can be told apart from "not graded yet".
- The course grade sensors' `missing_count` and the courses card's missing mark follow the new missing flag.
- **BREAKING** for automations and templates that read the action: the meaning of `missing` and `due_at` changes, and items that used to disappear on grading now remain.

### Out of scope

- Change events (newly missing, added, turned in, graded). They are a follow-up change built on these definitions.
- Listing submitted or graded work that was turned in.
- Any setting to choose between the old and new definitions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `unsubmitted-assignments`: what counts as not turned in, how missing is decided, which due date is reported and used for ordering, and the new graded and score fields.
- `assignment-list-action`: the response carries the new fields, and items graded without being turned in are included.
- `course-grades`: `missing_count` counts assignments the integration reports as missing.
- `courses-dashboard-card`: the missing mark follows the integration's missing flag rather than Canvas's.

## Impact

- **Integration code**: `api.py` (submission listing no longer filtered by workflow state; classification, missing, due date and new fields computed per submission), and tests for each case. `coordinator.py`, `sensor.py`, `services.py` and the card read the same data shape with two added fields.
- **Canvas API load**: still one paginated submissions request per course per student, but each now returns all of the student's submissions in the course rather than only unsubmitted ones, so busy courses may take an extra page late in the term.
- **Other repositories**: none. `canvas-lms-python-client` already models every submission and assignment field used.
- **Test data**: the seeded Canvas needs an on-paper assignment graded without a submission and an assignment with a per-student due date, so both cases can be checked end to end.
- **Documentation**: `docs/actions.md` (field meanings and new fields), `docs/sensors.md` (`missing_count`), `docs/courses-card.md` if it describes the missing mark, and known limitations (online work handed in on paper and graded directly stays listed).
