# Tasks

## 1. Repository and dependency setup

- [x] 1.1 Create the repository skeleton (`custom_components/canvas_lms_edu/`, `tests/`, `docs/`, `hacs.json`, `pyproject.toml`, `.gitignore`) and verify the expected files are present
- [x] 1.2 Add a dev environment with `pytest-homeassistant-custom-component` and ruff, and verify `pytest` runs and collects zero tests without error
- [x] 1.3 Install `canvas-lms-python-client` at a chosen commit into that environment and verify `pip check` reports no conflict with Home Assistant's pinned `aiohttp`, `pydantic` and `urllib3`; if it does, stop and fix the bound in the client first
- [x] 1.4 Write `manifest.json` (domain, name, version, `integration_type: service`, `iot_class: cloud_polling`, `config_flow: true`, codeowner, documentation and issue-tracker URLs, client requirement pinned to the full commit SHA from 1.3) and verify it passes `hassfest`-style validation via the test harness loading the integration
- [x] 1.5 Add `quality_scale.yaml` listing every bronze rule plus the four silver rules in design.md, each marked todo, and verify it lists dynamic-devices and stale-devices as todo with a follow-up comment

## 2. Canvas access layer

- [x] 2.1 Add a thin wrapper that builds the client from a URL and token and resolves the account (`self` → id and name), and verify with unit tests for success, unauthorized, and connection failure
- [x] 2.2 Add URL normalisation (scheme default, strip path and trailing slash) and verify with unit tests covering each input form in the account-setup spec
- [x] 2.3 Add student resolution (observees if any, otherwise the account itself) and verify with unit tests for an observer with two observees and a student with none
- [x] 2.4 Add the item dataclass and the mapping from a submission with embedded assignment plus course and student, and verify with unit tests that every field in the unsubmitted-assignments spec is carried, including empty due date and empty points
- [x] 2.5 Add per-student collection (active courses, then unsubmitted submissions per course with the assignment included, all pages, bounded concurrency) and verify with unit tests for multiple courses, multiple pages, and a concluded course being excluded
- [x] 2.6 Add ordering by due date with undated last and verify with a unit test over past-due, upcoming and undated items
- [x] 2.7 Skip a single course that Canvas forbids and verify with a unit test that the other courses' items are still returned and the skip is logged at debug level

## 3. Config flow and reauthentication

- [x] 3.1 Implement the user step (URL and token only), validation against Canvas, and entry creation titled with account name and host, and verify with a config-flow test for the success path
- [x] 3.2 Map failures to `invalid_auth`, `cannot_connect` and `unknown`, and verify with tests that each error shows on the form and that a corrected resubmission creates the entry
- [x] 3.3 Set the unique id from host and resolved user id and abort when already configured, and verify with tests for a duplicate account, two students on one host, and accounts on two hosts
- [x] 3.4 Implement the reauthentication step (token only) and verify with tests for same-account success, wrong-account abort, and invalid-token error leaving the entry unchanged
- [x] 3.5 Write `strings.json` and `translations/en.json` for all steps, errors and aborts, and verify the tests pass with translation validation enabled
- [x] 3.6 Verify config-flow test coverage is 100% with a coverage run over `config_flow.py`

## 4. Coordinator and entry lifecycle

- [x] 4.1 Implement the coordinator (30-minute interval, data keyed by student) stored on `entry.runtime_data`, and verify with a test that a refresh populates each student's items
- [x] 4.2 Raise `ConfigEntryAuthFailed` on unauthorized and `UpdateFailed` on connection, timeout and server errors, and verify with tests that unauthorized starts a reauth flow and other failures mark the update failed
- [x] 4.3 Implement `async_setup_entry` with a first refresh and `async_unload_entry`, and verify with tests that a failing first refresh leaves the entry in setup-retry and that unload closes the client
- [x] 4.4 Verify with a test that a failed refresh logs once and a later success logs recovery once

## 5. Sensor platform

- [x] 5.1 Create one service-type device per student with host-and-student identifiers, and verify with a test for an observer entry with two students
- [x] 5.2 Add the unsubmitted-assignments sensor (count state, unit, state class, translated name, stable unique id) and verify with tests for counts of 5 and 0 and for a count change after refresh
- [x] 5.3 Verify with a test that sensors are unavailable after a failed refresh and return after a successful one
- [x] 5.4 Verify with a test that an observer entry and a student entry covering the same student each get a device named after the student and each provide a sensor
- [x] 5.5 Verify with a test that the sensor's state attributes do not contain the assignment list

## 6. Action

- [x] 6.1 Register `get_unsubmitted_assignments` in `async_setup` from `services.py` as response-only with a required `config_entry_id`, add `services.yaml` and its strings, and verify with a test that the action exists when no entry is loaded
- [x] 6.2 Return the entry's items as `{"assignments": [...]}` from coordinator data and verify with tests for several students, an empty list, and excused and on-paper items being present with their flags
- [x] 6.3 Verify with tests that an unknown entry and an unloaded entry each raise a validation error, and that calling the action sends no request to Canvas

## 7. Documentation

- [x] 7.1 Write `README.md` covering what the integration does, HACS and manual installation, creating a Canvas access token, setup, and removal, and verify each quality-scale docs rule at bronze has a matching section
- [x] 7.2 Write `docs/` pages for the action (inputs, response fields, example templates that filter out excused or on-paper work) and for known limitations (reload needed for new or removed students, skipped forbidden courses, one account showing only observees), and verify the example templates run against a sample response
- [x] 7.3 Update `quality_scale.yaml` to mark completed rules done and verify dynamic-devices and stale-devices remain todo as named follow-ups

## 8. Integration check

- [x] 8.1 Run the full test suite and ruff, and verify both pass
- [x] 8.2 Install the integration into a Home Assistant instance pointed at the seeded Docker `canvas-lms`, add a student token and an observer token, and verify sensor counts and the action response match what Canvas shows for those students
- [x] 8.3 During that run, check the Home Assistant log for blocking-call warnings from the client and verify none appear, or record the fix applied

## Workflow follow-up

- Propose a follow-up change for dynamic devices (pick up newly linked observees without a reload).
- Propose a follow-up change for stale devices (remove devices for students no longer linked or enrolled).
- Archive this change after review.
