# Design

## Context

See proposal.md for motivation. What exists today and constrains the approach:

- `api.py` lists each student's active courses on every refresh (`courses_user_index_all`) only to get course ids and names, then fetches unsubmitted submissions per course.
- `CanvasCoordinator.data` is `dict[student_id, list[UnsubmittedAssignment]]`; `services.py` flattens it for `get_unsubmitted_assignments`.
- `sensor.py` adds one sensor per student at entry setup and never adds or removes entities afterwards.
- A student device belongs to exactly one config entry (see `docs/known-limitations.md`), so a device identifies both the student and the entry.
- The client's `Course` model has typed `enrollments` (with `computed_current_*` and `current_period_computed_current_*`) and untyped `teachers` (a list of dicts with `display_name`).
- The standard remains Home Assistant's developer documentation, for both the integration and the custom card.

## Goals / Non-Goals

**Goals:**

- No additional Canvas requests per refresh.
- The card updates live when a refresh changes grades or courses.
- Course data is useful without the card (history, automations).
- Installing the integration is enough to get the card; no manual resource registration.

**Non-Goals:**

- A general-purpose Canvas dashboard; the card does the two views in the proposal.
- Changing the existing action's inputs or response.
- A Node.js requirement for people installing the integration.

## Decisions

### 1. Courses are exposed as sensors, not a second action

One grade sensor per student per active course, on the student's device.

- **State**: the current score as a percentage (`%`, `state_class=measurement`), or unknown when Canvas gives none.
- **Attributes**:
  - Identity: `course_id`, `course_name`, `student_id`, `html_url`.
  - People and grade: `teachers` (list of names), `grade` (letter grade or null).
  - Time: `term` (term name), `grading_period` (current grading period title), `start_at`, `end_at` (ISO 8601 in UTC, or null).
  - Counts: `unsubmitted_count`, `missing_count`, computed from the assignments collected for that student and course in the same refresh; null when Canvas refused that course's assignments, so a skipped course is not reported as having nothing owed.
- **Why**: `hass.states` is reactive, so the card re-renders on its own when a refresh lands; grades get history and can drive automations. Per-course attributes are small, so the 16 KB attribute limit that ruled out the assignment list does not apply.
- **Alternative**: a `get_courses` action. Rejected: the card would have to poll or guess when to refetch, and grades would have no history.

### 2. Which grade

Request `include=["teachers", "term", "total_scores", "current_grading_period_scores"]` on the existing course listing. The grading period title comes from the same enrolment as the scores (`current_grading_period_title`), and the term name from the course's `term`. From the course's enrolments, take the one of type student whose `user_id` is the student.

- Use `current_period_computed_current_score` / `_grade` when Canvas supplies them, otherwise `computed_current_score` / `_grade`.
- Canvas omits these when the course hides totals from students; the sensor is then unknown and `grade` is null.
- **Alternative**: always the whole-course total. Rejected: in schools with grading periods it differs from what the student sees in Canvas.

### 3. Data shape

Replace the coordinator's value type with a small frozen dataclass per student holding `courses: list[Course]` and `assignments: list[UnsubmittedAssignment]`, where `Course` is a new dataclass in `api.py` (`id`, `name`, `html_url`, `teachers`, `score`, `grade`, `term`, `grading_period`, `start_at`, `end_at`, `unsubmitted_count`, `missing_count`). The per-course fetch reports whether Canvas refused it, so the counts can be null for a skipped course. `async_get_unsubmitted` becomes a method returning both, built from the one course listing. `services.py` and the existing sensor read `.assignments`.

### 4. Course sensors are added and removed on refresh

A coordinator listener in `sensor.py` compares the set of `(student_id, course_id)` it has created with the set in the latest data: new pairs are added through `async_add_entities`; pairs no longer present are removed from the entity registry.

- **Why now**: courses change every term, and a card that needs a reload each term is not usable. This is the pattern Home Assistant documents for the `dynamic-devices` and `stale-devices` rules, applied to course entities only.
- **Unique id**: `<entry unique id>_<student_id>_course_<course_id>_grade`.
- **Naming**: `translation_key="course_grade"` with the course name as a translation placeholder, so the entity reads "<course> grade" under the student's device.
- **A refused or failed refresh** removes nothing: removal happens only after a successful refresh that no longer lists the course.
- **Student devices** stay as they are; adding and removing students is still the separate follow-up.

### 5. One card with two views

`custom:canvas-lms-courses-card`, configured with a student `device_id` and an optional `title`.

- **Finding courses**: entities in `hass.entities` whose `platform` is `canvas_lms_edu`, `device_id` is the configured device, and `translation_key` is `course_grade`; values come from `hass.states`. Rows are ordered by course name.
- **Row layout**: a two-line block on the left (course name; teachers in secondary, smaller text) and the grade right-aligned and vertically centred against both lines. Long names truncate with an ellipsis rather than pushing the grade off the row.
- **Grade text**: the sensor's state (the percentage score as Canvas reports it, without trailing zeros) with a percent sign, or an em dash when the state is unknown or unavailable. The card never shows the letter grade; it remains in the sensor's `grade` attribute.
- **Drill-in**: selecting a row replaces the list with that course's assignments, a back control, and a sort control. View and sort choice are in-memory per card instance and reset on page load.
- **Assignments**: fetched by calling `canvas_lms_edu.get_unsubmitted_assignments` with a response, using the device's config entry id, then filtered in the card to the row's `student_id` and `course_id`. Fetched when a course is opened and again when that course's sensor state object changes while it is open.
- **Sorting** (in the card): due date earliest first with undated last; points highest first with no-points last; name A to Z, case-insensitive using the viewer's locale. Ties fall back to due date, then name.
- **Assignment row**: name, due date in the viewer's locale and time zone, points possible, and a "Missing" marker when Canvas flags it. The row links to the assignment in Canvas in a new tab.
- **Alternative**: two separate cards linked by navigation. Rejected: it needs dashboard-level wiring by the user for something one card can do.

### 6. Card states

- No device configured, or the device no longer exists: the card shows a configuration error, as Home Assistant cards do.
- No course sensors: "No active classes".
- Course with nothing owed: "Nothing to turn in".
- Action call fails (for example the entry is not loaded): an inline error in the drill-in view with a retry control; the class list still works.
- Sensors unavailable: rows remain, grade shows an em dash.

### 7. Card technology and build

Lit and TypeScript, bundled by esbuild into a single ES module at `custom_components/canvas_lms_edu/frontend/canvas-lms-courses-card.js`. Source lives in `frontend/` at the repository root.

- **The bundle is committed**, so HACS and manual installs need no Node.js. A test fails if the committed bundle does not match a fresh build.
- **Why Lit**: it is what Home Assistant's own frontend and its custom-card documentation use; bundling our own copy avoids depending on Home Assistant's internals.
- **Styling** uses Home Assistant's theme CSS variables only, so the card follows light, dark and custom themes.
- **Accessibility**: rows and controls are real buttons and links, keyboard-operable, with visible focus.
- **Visual editor**: a config element using Home Assistant's device selector filtered to this integration, and `window.customCards` registration so the card appears in the picker.

### 8. Serving the card

In `async_setup`, register a static path for the `frontend/` folder with `hass.http.async_register_static_paths`, and add the bundle with `frontend.add_extra_js_url`, using the integration version as a cache-busting query. `manifest.json` gains `"dependencies": ["http", "frontend"]`.

- **Why**: works for both storage-mode and YAML-mode dashboards and needs no user step.
- **Alternative**: registering a Lovelace resource. Rejected: it only works in storage mode and writes to the user's dashboard configuration.
- **Trade-off**: the module loads on every Home Assistant page, so the bundle is kept small (Lit plus the card only).

### 9. Testing

- **Python**: unit tests for the new course mapping (teachers, both grade sources, hidden totals), coordinator data shape, sensor add and remove across refreshes, the action reading the new shape, and static path and JS registration.
- **Frontend**: Vitest with a DOM environment for the sort functions, row rendering, grade text fallbacks, drill-in, and error states, against a fake `hass` object.
- **Manual**: the card on a dashboard against the seeded Docker `canvas-lms` with a student token and an observer token.

## Risks / Trade-offs

- **An observer may not receive the observee's scores from the course listing** (the fork's controller code shows the listing uses the observee's enrolments, but score visibility for observers is not verified) → The first task checks this against the seeded Canvas; if scores are withheld, fall back to the enrolments endpoint for the observee, which costs one request per student.
- **`translation_key` or `platform` may not be present in the frontend's entity registry data** → Verified in the first frontend task; the fallback is to match on the sensor's `course_id` attribute plus device.
- **Entity churn each term** creates and deletes registry entries and ends those sensors' history → Intended: a finished course's grade sensor has nothing more to report.
- **A committed bundle can drift from its source** → The freshness test in the suite.
- **The untyped `teachers` field in the client** could change shape → Read defensively (`display_name`, falling back to `name`), and report an empty list rather than failing the refresh.
- **Loading the module on every page** → Small bundle; revisit if a second card is added.

## Verification results

Recorded while applying the change (2026-11-15).

### Task 1.1 and 1.2: scores in the course listing — verified

Run against the seeded Docker `canvas-lms` through the integration's own Canvas layer, with the include list of decision 2.

- **Observer token** (observing one student): the listing for the observee returned the observee's own enrolment of type `student`, with `computed_current_score` 80.0, the teacher, the term, and `current_grading_period_title` "Second Half". Scores are not withheld from an observer, so decision 2 stands and the enrolments fallback is not needed.
- **Student token**: the listing for the student's own courses returned the teacher, the term, `computed_current_score` 80.0, `computed_current_grade` "B-", and the current period's score and title.

This agrees with the fork's code: `CoursesController#courses_for_user` lists the *listed user's* enrolments, and `Api::V1::CourseJson#enrollment_hash` adds scores to every student enrolment without checking the caller's role.

Two details seen in the live responses and handled in the mapping:

- The listing did not include `html_url`, so the course link is built as `<Canvas URL>/courses/<id>`.
- The observee's course has a current grading period but a null score for it (no graded work in the period yet). The mapping then uses the whole-course score, as decision 2 says ("when Canvas supplies them"). Canvas itself would show that student no grade for the period. Decided on review (2026-11-15): keep the whole-course score in this case.

### Task 1.3: entity and device registry data in the frontend — verified

Checked in the browser against a running Home Assistant 2026.10.4 with an observer entry and a student entry:

- Every entry of `hass.entities` for this integration has `platform` (`canvas_lms_edu`), `device_id` and `translation_key` (`course_grade` on the course sensors).
- Each student device in `hass.devices` has `primary_config_entry`, and also `config_entry_id` and `config_entries`. The card reads them in that order.

Decision 5 stands; the attribute-matching fallback is not needed.

### Tasks 8.2, 9.2 and 9.3: the card in Home Assistant — verified

In the same Home Assistant, with a YAML-mode dashboard holding one card per student (an observer-token entry and a student-token entry) and one card with an unknown device:

- Home Assistant loaded `/canvas_lms_edu/frontend/canvas-lms-courses-card.js?v=0.1.0` on its own and the card type from the documented YAML rendered, with no dashboard resource.
- Each card showed its own student's class with the teacher and `80%`, matching the Canvas listing. The card without a title was titled with the student's name; the card with an unknown device showed the configuration error.
- Opening the class showed 49 assignments for the observee and 50 for the student, equal to the sensor's `unsubmitted_count`, the action's items for that student and course, and a direct Canvas query. The Missing markers (35 and 40) equalled `missing_count`.
- Due date, points and name order each matched an independent sort of the action's response. Assignment rows link to the assignment in Canvas in a new tab.
- At 375 px wide nothing overflowed and points stayed inside their rows. No layout fix was applied.

Not exercised: adding the card through the card picker and the visual editor in a UI-managed dashboard. The card's registration with the picker (`window.customCards`) was confirmed in the running frontend, and the editor is covered by the frontend tests.

One environment note: on this Mac, `canvas.docker` resolves through `/etc/resolver`, which the DNS resolver Home Assistant installs for aiohttp does not read, so the check ran Home Assistant with aiohttp's threaded resolver. This affects only this development setup.

### Additions made while implementing

- **Card title**: without a `title`, the card is titled with the student device's name, so two cards on one dashboard can be told apart.
- **Stub configuration**: a card added from the picker starts on the first student device of this integration.
- **Unavailable sensors**: an unavailable sensor has no attributes, so the card keeps the name, teachers and ids it last saw for each row. For a sensor unavailable since the page loaded, the name is taken from the friendly name and the class cannot be opened until data returns (the class view shows the load error with retry).
- **Leftover sensors**: on setup, course sensors left in the registry by an earlier run whose course is no longer listed are removed, so a course that ended while Home Assistant was stopped does not linger.
- **Students fixed at setup**: course sensors are created only for the students the entry had at setup, in keeping with student devices needing a reload.
- **Open class removed**: if the open class stops being an active course, the card returns to the class list.
- **Tests and the frontend component**: the Python tests stand in for Home Assistant's `frontend` component, whose built assets are not installed for tests; `http` is the real one.
- **Bundle check**: the freshness check is a Vitest test, so `npm test` covers it, and is also available as `npm run check:bundle`.

### Layout check on a harness

Before the check in Home Assistant, the built bundle was also checked against a fake `hass` and Home Assistant's theme variable names, in light and dark, at desktop width and at 375 px, with long course, teacher and assignment names. Names truncate and the grade and points stay fully visible.

## Open Questions

- Whether the class row should later show a count of unsubmitted or missing assignments. It does not affect this change; the counts are already on each course sensor.
