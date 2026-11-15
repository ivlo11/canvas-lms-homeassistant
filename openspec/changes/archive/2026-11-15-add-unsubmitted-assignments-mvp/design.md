# Design

## Context

See proposal.md for motivation. Constraints that shape the approach:

- **Standard**: Home Assistant's developer documentation (integration quality scale) defines what a good integration is here. `canvas_hassio` is prior art only, not a pattern to follow.
- **Target tier**: all bronze rules, plus `reauthentication-flow`, `config-entry-unloading`, `entity-unavailable` and `log-when-unavailable` from silver.
- **Client**: `canvas-lms-python-client` is async, typed (pydantic), paginated via `*_all` iterators, and unpublished. It builds its own `aiohttp` session.
- **Home Assistant pins** (dev checkout, 2026-11): Python ≥ 3.14.2, `aiohttp==3.14.5`, `pydantic==2.14.1`, `urllib3>=2.0`. The client requires Python ≥ 3.11, `aiohttp>=3.8.4`, `pydantic>=2.11`, `urllib3>=2.1,<3`, and adds `aiohttp-retry`.
- **Canvas behaviour verified in the fork's controllers**: `user_id="self"` resolves to the token's user; the per-course submissions list defaults to the caller when no student is named and restricts an observer to the students they observe in that course.

## Goals / Non-Goals

**Goals:**

- One code path for student and observer tokens.
- Return what Canvas returns; leave filtering to the Home Assistant admin.
- Keep the full assignment list out of entity attributes.
- Keep the door open for a later move to Home Assistant core.

**Non-Goals:**

- Writing to Canvas. The integration is read-only.
- Changing the client or the `canvas-lms` fork.
- Platinum rules (`inject-websession`, `strict-typing`).

## Decisions

### 1. Repository layout: HACS-style custom component

`custom_components/canvas_lms_edu/` at the repository root, with `hacs.json`, `README.md`, `docs/`, and `tests/` using `pytest-homeassistant-custom-component`.

- **Why**: Home Assistant core does not accept git requirements, and the client is unpublished.
- **Alternative**: continue the scaffold in the `core` checkout. Rejected for the reason above; the code is written to core's rules so a later move is mostly a copy.
- **Domain**: `canvas_lms_edu`, since `canvas` is taken by `canvas_hassio`.

### 2. Manifest

- `integration_type: service`, `iot_class: cloud_polling`, `config_flow: true`, and a `version` (required for custom integrations).
- `requirements`: `canvas_lms_python_client@git+https://github.com/ivlo11/canvas-lms-python-client.git@<commit>`, pinned to a full commit SHA rather than a branch, so installs are reproducible.
- **Alternative**: pin to the branch. Rejected: a branch moves under installed users.

### 3. Identity: `self`, resolved once

The user enters a Canvas URL and a token, nothing else. During setup the integration calls the user-details endpoint with `self` and reads the numeric id and name.

- **Config entry unique id**: normalised Canvas host + resolved user id. This satisfies `unique-config-entry` and lets several accounts, on the same or different Canvas hosts, coexist.
- **Entry title**: the account's name and host.
- **URL normalisation**: scheme required, trailing slash and any path stripped; `https` assumed if the user omits the scheme.

### 4. Student or observer: decided by observees

After resolving `self`, list the account's observees (`user_id="self"`).

- Non-empty → the entry's students are the observees.
- Empty → the entry's one student is the account itself.

The student list is re-read on every poll but, in this MVP, devices and entities are only created at entry setup (see follow-ups).

- **Alternative**: ask the user which role they have. Rejected: Canvas already knows.
- **Trade-off**: an account that both observes students and is itself a student shows only its observees.

### 5. Data source: per-course submissions with `workflow_state=unsubmitted`

Per student, per poll:

1. List the student's courses (`courses_user_index_all`, active enrolments only). This supplies the class name.
2. For each course, list submissions with `student_ids=[student]`, `workflow_state="unsubmitted"`, `include=["assignment"]`, `per_page=100`.

Each row yields one item built from the submission and its embedded assignment.

- **Why**: one call shape covers upcoming and past-due work, works for both token types, and Canvas supplies the `missing` flag itself.
- **Alternatives**:
  - `users_missing_submissions`: one call per student, but past-due only.
  - Assignments list with `bucket=unsubmitted`: the "for user" variant does not expose `bucket` or `include` in the generated client, so observers could not use it without a fork change.
  - Fetch all assignments and all submissions and diff them (what `canvas_hassio` does): more calls and reimplements Canvas's own logic.
- **No filtering**: excused, locked, undated and no-submission-type assignments are all returned, each with the field that identifies it. The only scoping is active enrolments, which is about which courses count rather than about any assignment.
- **Concurrency**: course requests run concurrently behind a small semaphore (5) to stay polite to Canvas.

### 6. Item shape

A frozen dataclass per assignment, converted to a plain dict for the action response:

| Field | Source |
|---|---|
| `student_id`, `student_name` | the student (observee or self) |
| `course_id`, `course_name` | the course listing |
| `assignment_id`, `name`, `due_at`, `points_possible`, `html_url`, `submission_types`, `locked_for_user` | embedded assignment |
| `missing`, `excused` | submission |

`due_at` is an ISO 8601 string or null. Items are ordered by `due_at` ascending with undated items last, then by assignment id.

### 7. Coordinator and polling

One `DataUpdateCoordinator` per config entry, stored on `entry.runtime_data`, with a fixed 30-minute interval.

- **Why 30 minutes**: assignment lists change a few times a day at most, and each poll costs one request per course per student. The `appropriate-polling` rule forbids a user-set interval; users who want another cadence can trigger `homeassistant.update_entity` from an automation.
- **Errors**:
  - 401 from Canvas → `ConfigEntryAuthFailed`, which starts reauthentication.
  - Connection errors, timeouts, 5xx → `UpdateFailed`; entities become unavailable and the failure is logged once, with one log line on recovery.
  - 403 on a single course → that course is skipped for the poll and logged at debug level. Canvas refuses individual courses (for example outside their access dates) while the rest of the account works, and one such course must not take the whole account down.
- **First refresh** uses `async_config_entry_first_refresh`, so a failure at startup retries setup (`test-before-setup`).

### 8. Entities

- **Device**: one per student, `entry_type=SERVICE`, identifiers `(DOMAIN, "<host>_<student_id>")`, named after the student.
- **Sensor**: "Unsubmitted assignments", `has_entity_name`, translated name, state = number of items for that student, `state_class=measurement`, unit `assignments`.
- **Sensor unique id**: `<entry unique id>_<student_id>_unsubmitted`.
- **Overlapping entries**: a parent's observer entry and the student's own entry may cover the same student. Both are allowed; each entry gets its own device for the student, with the same identifiers and name, and its own sensor.
  - **Why not one shared device**: Home Assistant (2026.10) gives a device to exactly one config entry, so two entries cannot attach to the same device. Found while implementing; the original design assumed they could.
  - **Alternative**: refuse the second entry. Rejected: both people may reasonably want their own token.
- **No list in attributes**: Home Assistant stops recording attributes over 16 KB, and a term of assignments can exceed that.

### 9. Action: `canvas_lms_edu.get_unsubmitted_assignments`

- Registered in `async_setup` from `services.py` (`action-setup`), response-only.
- Input: `config_entry_id` (required).
- Output: `{"assignments": [item, ...]}` from the coordinator's last successful poll; it does not call Canvas.
- An unknown or unloaded entry raises a `ServiceValidationError` via `service.async_get_config_entry`.
- **Why no student or status filter inputs**: the admin filters the response in templates; adding inputs later is not a breaking change.

### 10. Reauthentication

`async_step_reauth` → a form asking only for a new token. The new token is validated with the same `self` lookup; if it resolves to a different user id the flow aborts with a "wrong account" message, otherwise the entry is updated and reloaded.

### 11. Testing

- Unit tests mock the client's API classes; no network.
- Config flow: 100% coverage including every error and abort path (`config-flow-test-coverage`).
- Coordinator, sensor and action tests use captured-shape fixtures for courses and submissions.
- A manual check against the seeded Docker `canvas-lms`, with a student token and an observer token, before the change is archived.

## Risks / Trade-offs

- **Client dependency conflicts with Home Assistant's pins** → Verify in the first task group by installing the client into a Home Assistant environment before writing integration code; if a pin conflicts, fix the bound in the client first.
- **Client does blocking work in the event loop** (for example creating an SSL context when it builds its session) → Home Assistant logs these; check the log during the manual run and, if it appears, create the client in an executor job.
- **Client is unpublished and pinned by commit** → Updating the client means bumping the SHA in the manifest; acceptable until it is on PyPI.
- **Request volume for large households** → 30-minute interval, semaphore of 5, `per_page=100`.
- **Skipping a 403 course hides its assignments** → Logged at debug level and listed under known limitations in the docs.
- **New observees or removed students are not picked up until reload** → Documented limitation; dynamic and stale devices are the named follow-ups.
- **Tokens are stored in the config entry**, as Home Assistant does for all token-based integrations → The token is never logged, and diagnostics are not part of this change.

## Open Questions

- Which git tag or commit of the client to pin once its current branch lands. This does not change the design; the SHA is filled in during the first task group.
