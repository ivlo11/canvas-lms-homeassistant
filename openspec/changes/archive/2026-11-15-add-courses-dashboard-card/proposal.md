# Proposal

## Why

The integration reports how many assignments a student has not turned in, but showing them on a dashboard today means writing templates against the action's response. A student or parent wants to glance at the student's classes and grades and open a class to see what is still owed.

## What Changes

- Add a custom dashboard card, shipped with the integration, that lists one student's active classes. Each class row shows the course name, the teacher's name beneath it in smaller text, and the student's current grade to the right of both lines.
- Selecting a class opens that class's unsubmitted assignments inside the card, which the viewer can sort by due date, points possible, or name.
- Add a grade sensor per active course on each student's device, carrying the course name, teacher names, and the student's current grade, plus the course's Canvas link, term, current grading period, start and end dates, and the student's unsubmitted and missing assignment counts for that course. The card reads these, and they are usable on their own in dashboards, history, and automations.
- Create and remove course sensors as a student's active courses change, without reloading the entry.
- Serve the card's JavaScript from the integration itself so it is available in the dashboard card picker after installation, with no manual resource step.

### Assumptions to confirm

- **One card, two views.** "Dashboard cards" is delivered as a single card type with a class list and a drill-in assignment view; a dashboard uses one card per student.
- **Current grade** is shown as the percentage score, not the letter grade. The letter grade stays available on the course sensor for anyone who wants it. Where the course uses grading periods, the current period's score is shown, matching what Canvas itself shows the student.
- **Several teachers** are shown as a comma-separated list.
- **Sort directions are fixed**: due date earliest first (undated last), points highest first, name A to Z.

### Out of scope

- Unsubmitted counts or badges on the class rows.
- Submitted or graded assignments in the drill-in view.
- Translating the card's own text into languages other than English.
- Dynamic and stale student devices, which remain separate follow-ups.

## Capabilities

### New Capabilities

- `course-grades`: the per-course grade sensors on each student's device — what they report, when they appear and disappear, and how they behave when Canvas withholds a grade.
- `courses-dashboard-card`: the dashboard card — the class list, the drill-in assignment view and its sorting, configuration, and how the card is made available.

### Modified Capabilities

None. The existing `unsubmitted-assignments`, `student-sensor`, `assignment-list-action` and `account-setup` requirements are unchanged; the card consumes the existing action as it is.

## Impact

- **Integration code**: `api.py` (course listing gains teachers and scores), `coordinator.py` (data now holds courses as well as assignments per student), `sensor.py` (new course sensor, added and removed dynamically), `services.py` (reads assignments from the new data shape), `__init__.py` and `manifest.json` (serve and register the card; `http` and `frontend` become dependencies).
- **New frontend code**: a card source tree, a build step producing one bundled JavaScript file committed under `custom_components/canvas_lms_edu/frontend/`, and frontend tests. Node.js becomes a development-time requirement only.
- **Canvas API load**: none added. The course listing already made on each refresh asks for teachers and scores in the same request.
- **Entities**: one new sensor per student per active course; these come and go with enrolments.
- **Documentation**: README and `docs/` gain the card (adding it, configuration, sorting) and the course sensors; known limitations are updated.
