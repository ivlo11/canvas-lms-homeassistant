# Canvas LMS for Home Assistant

A Home Assistant custom integration that shows which Canvas assignments a student has not turned in yet.

## What it does

For each student, the integration reads from Canvas every assignment in the student's active courses that has not been turned in: not yet due, past due, and with no due date.

- **A device per student**, with a sensor, *Unsubmitted assignments*, whose state is the number of those assignments.
- **An action**, `canvas_lms_edu.get_unsubmitted_assignments`, that returns the full list with the student, class, assignment name, due date, points, link and status flags. See [docs/actions.md](docs/actions.md).
- **A grade sensor per course** on each student's device, with the student's current score and the course's teachers, letter grade, term, dates and unsubmitted counts. They appear and disappear as the student's courses change. See [docs/sensors.md](docs/sensors.md).
- **A dashboard card**, *Canvas LMS courses*, that lists a student's classes with teacher and current grade, and opens a class to show what has not been turned in. See [docs/courses-card.md](docs/courses-card.md).

It works with a student's own access token or with an observer's (for example a parent's). An observer account gets a device for each student it observes. Several accounts, on the same or different Canvas sites, can be set up side by side.

The integration only reads from Canvas. It refreshes every 30 minutes; to refresh at another time, call `homeassistant.update_entity` on a sensor from an automation.

Nothing is filtered out. Excused, locked and on-paper assignments are all returned with the fields that identify them, so you decide what to show.

## Installation

Requires Home Assistant 2026.10 or later.

### HACS

1. In HACS, open the menu and choose **Custom repositories**.
2. Add `https://github.com/ivlo11/canvas-lms-homeassistant` with type **Integration**.
3. Find **Canvas LMS** in HACS and download it.
4. Restart Home Assistant.

### Manual

1. Copy the `custom_components/canvas_lms_edu` folder from this repository into the `custom_components` folder of your Home Assistant configuration directory.
2. Restart Home Assistant.

## Creating a Canvas access token

1. Sign in to Canvas as the student or the observer.
2. Open **Account** > **Settings**.
3. Under **Approved integrations**, choose **New access token**.
4. Give it a purpose such as "Home Assistant", leave the expiry empty or pick a date, and generate it.
5. Copy the token now. Canvas does not show it again.

Some schools turn off access tokens for students. An observer's token works in that case, if observers are allowed to create one.

## Setup

1. Go to **Settings** > **Devices & services** > **Add integration** and choose **Canvas LMS**.
2. Enter:
   - **Canvas URL**: the web address of your Canvas site, for example `https://school.instructure.com`.
   - **Access token**: the token you created.
3. Submit. The integration asks Canvas who the token belongs to and creates the entry.

Repeat for each account you want to add. The same account cannot be added twice.

If Canvas stops accepting a token (it expired or was deleted), Home Assistant asks you to reauthenticate. Enter a new token for the same Canvas account.

## Courses card

The card is installed with the integration; there is no resource to add. Edit a dashboard, choose **Add card**, pick **Canvas LMS courses**, and choose a student. Or in YAML:

```yaml
type: custom:canvas-lms-courses-card
device_id: 0123456789abcdef0123456789abcdef
```

Each class row shows the course, its teacher, and the student's current grade as a percentage. Select a class to see its unsubmitted assignments, sorted by due date, points, or name. See [docs/courses-card.md](docs/courses-card.md) for configuration, sorting, and what the grade shows.

## Removal

1. Go to **Settings** > **Devices & services** and open **Canvas LMS**.
2. On the entry, open the menu and choose **Delete**.
3. To uninstall, remove the integration in HACS or delete the `custom_components/canvas_lms_edu` folder, then restart Home Assistant.
4. Optionally delete the access token in Canvas under **Account** > **Settings**.

## Known limitations

See [docs/known-limitations.md](docs/known-limitations.md).

## Development

```bash
uv sync
```

```bash
uv run pytest --cov
```

```bash
uv run ruff check . && uv run ruff format --check .
```

The dashboard card has its own source and tests in `frontend/`; see [docs/frontend-development.md](docs/frontend-development.md). End-to-end tests run the integration in Home Assistant containers; see [docs/e2e-tests.md](docs/e2e-tests.md).
