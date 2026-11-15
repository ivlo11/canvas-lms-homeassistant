# Tasks

## 1. Verify the assumptions the design rests on

- [x] 1.1 Against the seeded Docker `canvas-lms`, list an observee's courses with an observer token and `include` of teachers, total scores and current grading period scores, and verify the response carries the observee's student enrolment with scores; record the result in design.md, and if scores are withheld switch decision 2 to the enrolments fallback before continuing
- [x] 1.2 Repeat 1.1 with a student token for their own courses and verify teachers and scores are present
- [x] 1.3 In a running Home Assistant, inspect `hass.entities` in the browser and verify entries expose `platform`, `device_id` and `translation_key`, and `hass.devices` exposes the config entry id; record the result, and if any is absent switch decision 5 to the attribute-matching fallback

## 2. Course data in the Canvas access layer

- [x] 2.1 Add a `Course` dataclass (id, name, teachers, score, grade) and a mapping from the client's course model, and verify with unit tests for one teacher, several teachers, no teachers, and a teacher entry missing `display_name`
- [x] 2.2 Select the student's own student enrolment and prefer current-period score and grade over whole-course values, and verify with unit tests for both sources present, whole-course only, score without letter grade, and no scores (hidden totals)
- [x] 2.3 Carry the course's web link, term name, current grading period title, and start and end dates, and verify with unit tests for all present, no grading periods, no term, and no dates
- [x] 2.4 Request teachers, term and scores on the existing course listing and return courses together with assignments from one method, and verify with a unit test that the number of client calls per student is unchanged
- [x] 2.5 Compute each course's unsubmitted and missing counts from the assignments collected for that student and course, with empty counts when Canvas refused the course, and verify with unit tests for 5 unsubmitted with 2 missing, nothing owed, and a refused course

## 3. Coordinator and action

- [x] 3.1 Change the coordinator's data to a per-student structure holding courses and assignments, and verify the existing coordinator and student-sensor tests pass against the new shape
- [x] 3.2 Update the action to read assignments from the new shape and verify the existing action tests pass unchanged in their expectations

## 4. Course grade sensors

- [x] 4.1 Add the course grade sensor (percent state, measurement state class, `course_grade` translation key with the course name placeholder, stable unique id, on the student's device) with strings and icon, and verify with tests for a score of 91.5, a changed score, and an unknown state when no score is given
- [x] 4.2 Expose course id, course name, student id, teachers and letter grade as attributes, and verify with tests for a letter grade, no letter grade, several teachers and no teachers
- [x] 4.7 Expose web link, term, grading period, start and end dates, unsubmitted count and missing count as attributes, and verify with tests that each matches the course data, that empty values are exposed as empty, and that the unsubmitted count equals the number of items the action returns for that student and course
- [x] 4.3 Add sensors for newly listed courses and remove sensors for courses no longer listed after a successful refresh, and verify with tests for a new course mid-year, a course ending, and two students of one entry sharing a course
- [x] 4.4 Verify with a test that a failed refresh removes no sensor and marks course sensors unavailable, and that they return after a successful refresh
- [x] 4.5 Verify with a test that course sensors keep their entity ids across a reload of the entry
- [x] 4.6 Document the course sensors in `docs/` (state, attributes, when they appear and disappear, hidden grades) and verify the docs test covers the new page

## 5. Frontend project and build

- [x] 5.1 Create `frontend/` with TypeScript, Lit, esbuild and Vitest, and verify `npm run build` writes `custom_components/canvas_lms_edu/frontend/canvas-lms-courses-card.js` and `npm test` runs
- [x] 5.2 Add a check that the committed bundle matches a fresh build, and verify it fails when the source is changed without rebuilding
- [x] 5.3 Document the frontend development workflow in `docs/` and verify the documented commands run as written

## 6. Card: class list

- [x] 6.1 Implement the card element with `setConfig`, `hass`, card size, and `window.customCards` registration, and verify with a test that a missing or unknown device shows a configuration error
- [x] 6.2 Find the student's course sensors and render rows ordered by course name, and verify with tests for four courses in order, no courses showing the empty message, and rows updating when the fake `hass` changes
- [x] 6.3 Lay out each row with course name, teachers beneath in smaller secondary text, and the grade right-aligned beside both lines with truncation for long names, and verify with tests for one teacher, several teachers, no teacher, and a long name leaving the grade visible
- [x] 6.4 Implement the grade text (percentage score, else dash; never the letter grade) and verify with tests for a whole score, a fractional score, a course that also has a letter grade, an unknown state, and an unavailable sensor
- [x] 6.5 Implement the visual editor with a device selector limited to this integration and an optional title, and verify with a test that changing the device emits a config-changed event

## 7. Card: class view

- [x] 7.1 Open a class on row selection, call the action for the device's config entry, filter to the student and course, and provide a back control, and verify with tests for opening, the nothing-to-turn-in message, and returning to the list
- [x] 7.2 Render each assignment with name, localised due date, points possible, a missing marker, and a link to Canvas in a new tab, and verify with tests for a full row, missing due date, missing points, and a missing assignment
- [x] 7.3 Implement the three sort orders with their tie-breaks and a sort control defaulting to due date, and verify with unit tests for each order including undated and no-points items, and that the choice persists when another class is opened
- [x] 7.4 Refetch when the open course's sensor state changes and verify with a test that an assignment turned in disappears after the fake `hass` updates
- [x] 7.5 Show an inline error with retry when the action call fails and verify with tests that the list stays usable and that retry loads the assignments
- [x] 7.6 Make rows and controls keyboard-operable with visible focus and style everything with theme variables, and verify with a test that each control is focusable and activates on Enter, plus a manual check in light and dark themes

## 8. Serving the card

- [x] 8.1 Register the static path and the extra JS URL with a version query in `async_setup`, add `http` and `frontend` to the manifest dependencies, and verify with tests that the URL serves the bundle and is registered once across several entries
- [x] 8.2 Document adding and configuring the card in the README and `docs/` (picker, YAML example, sorting, what the grade shows), update known limitations, and verify the YAML example loads in a dashboard

## 9. Integration check

- [x] 9.1 Run the Python suite, ruff, the frontend tests and the bundle freshness check, and verify all pass
- [x] 9.2 In Home Assistant against the seeded Docker `canvas-lms`, add the card for a student-token entry and an observer-token entry, and verify class rows, grades, drill-in and all three sort orders match Canvas for those students
- [x] 9.3 Verify the card in a YAML-mode dashboard and on a phone-width screen, and record any layout fix applied

## Workflow follow-up

- Archive the change after review.
