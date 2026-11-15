# Proposal

## Why

A household using Canvas has no well-maintained way to see in Home Assistant which assignments a student still has to turn in. The existing community integration (`canvas_hassio`) is not well maintained and depends on a hand-written client; `canvas-lms-python-client` now provides typed, paginated access to the same data and can back a new integration built to Home Assistant's integration quality scale.

## What Changes

- Add a new Home Assistant custom integration, domain `canvas_lms_edu`, in this repository under `custom_components/canvas_lms_edu/`.
- Set up from the UI with only a Canvas URL and an access token. The token may belong to a student or to an observer (for example, a parent); the integration works out which, and never asks for a user id.
- Allow several accounts in one home: each student or observer adds their own entry with their own token, and each entry may use a different Canvas URL.
- Fetch, per student, every assignment that has not been turned in — upcoming and past due — in the student's active courses. Nothing is filtered out by the integration; each assignment carries the fields an admin needs to filter it themselves.
- Expose one sensor per student with the count of unsubmitted assignments.
- Expose an action that returns the full list of unsubmitted assignments with student, class name, assignment name, due date, points possible, link, and status flags.
- Add a reauthentication flow for expired or revoked tokens.
- Depend on `canvas-lms-python-client` for all Canvas access.

### Out of scope (follow-ups)

- **Dynamic devices**: picking up a newly linked observee without reloading the entry.
- **Stale devices**: removing a student's device when the observer link or the student's enrolments go away.
- To-do list or calendar entities.
- Options for filtering (for example a "due within N days" horizon).
- Sharing Home Assistant's web session with the client (`inject-websession`).
- Inclusion in Home Assistant core, which requires the client to be published on PyPI.

## Capabilities

### New Capabilities

- `account-setup`: adding a Canvas account from the UI with a URL and token, detecting student or observer, keeping entries unique, supporting several accounts, and reauthenticating.
- `unsubmitted-assignments`: which assignments count as not turned in for each student, what data each one carries, how often it is refreshed, and what happens when Canvas cannot be reached.
- `student-sensor`: the per-student device and its unsubmitted-assignment count sensor.
- `assignment-list-action`: the action that returns the full list of unsubmitted assignments for an account.

### Modified Capabilities

None. This is the first change in this repository.

## Impact

- **New code**: `custom_components/canvas_lms_edu/` (manifest, config flow, coordinator, sensor platform, action, translations) and its tests.
- **Dependency**: `canvas-lms-python-client`, unpublished, pinned in the manifest to a git commit. Its own dependencies (`aiohttp`, `aiohttp-retry`, `pydantic`, `urllib3`) must be compatible with the versions Home Assistant pins.
- **Canvas API load**: per poll and per student, one course listing plus one submissions listing per active course.
- **Other repositories**: no change is required in `canvas-lms-python-client` or the `canvas-lms` fork for this MVP. The scaffold at `core/homeassistant/components/canvas_lms_edu/` is superseded and is not used.
- **Documentation**: a README and `docs/` folder in this repository covering installation, configuration, the action, removal, and known limitations.
