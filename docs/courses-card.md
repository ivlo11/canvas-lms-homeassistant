# Courses card

A dashboard card that lists one student's active classes with the teacher and current grade. Selecting a class shows the assignments the student has not turned in for it.

The card comes with the integration, and you don't add a dashboard resource yourself. The integration copies the card to `config/www/canvas_lms_edu/` and adds it to the dashboard resources, which every dashboard loads, whether it's managed in the UI or written in YAML. That way the card also shows on pages opened while Home Assistant is still starting, such as a wall tablet on the default dashboard.

If the card doesn't appear right after installing, reload the browser page. If your `config` folder had no `www` folder, the integration creates one, and the card shows during startup from the next restart on.

## Adding the card

1. Open a dashboard, choose **Edit dashboard**, then **Add card**.
2. Search for **Canvas LMS courses** and select it.
3. Choose the **Student**. Only students from this integration are offered.
4. Optionally enter a **Title**. Without one, the card is titled with the student's name.

Use one card per student. Two cards with different students show each student's own classes.

## YAML

```yaml
type: custom:canvas-lms-courses-card
device_id: 0123456789abcdef0123456789abcdef
title: Alice's classes
```

| Option | Required | Description |
|---|---|---|
| `type` | yes | `custom:canvas-lms-courses-card` |
| `device_id` | yes | The student's device. Find the id in the device page's URL, or choose the student in the visual editor and switch to the code editor. |
| `title` | no | The card's title. Defaults to the student's name. |

The card works in dashboards managed in the UI and in dashboards defined in YAML.

### Resources kept in YAML

If your `configuration.yaml` keeps dashboard resources in YAML (`lovelace: resource_mode: yaml`), the integration can't add the resource. The card still loads once Home Assistant has started. For it to load on pages opened during startup, add it to your resources:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /local/canvas_lms_edu/canvas-lms-courses-card.js
      type: module
```

After an update, reload the page with the cache disabled if the card looks out of date.

## The class list

One row per active course, in alphabetical order by course name. Each row shows:

- the course name;
- beneath it, in smaller text, the teacher, or all teachers separated by commas;
- to the right, the student's current grade.

### What the grade shows

The grade is the student's current score as a percentage, for example `91.5%`. It is the value of the course's [grade sensor](sensors.md#course-grade): the current grading period's score where the course uses grading periods, otherwise the score for the whole course.

The card shows a dash (—) when Canvas gives no score, such as when nothing has been graded yet or the course hides totals, and while the data is unavailable.

The card never shows the letter grade. It is in the sensor's `grade` attribute if you want it elsewhere.

The list updates on its own when a refresh changes a grade or the student's courses.

## A class's assignments

Selecting a class shows that course's unsubmitted assignments for the student, with a back control to return to the list. Each assignment shows its name, the student's own due date in your language and time zone, and its points possible. Assignments the integration marks as missing, including work graded 0 that the student never turned in, are marked **Missing**. See [how `missing` is decided](actions.md#how-missing-is-decided). Selecting an assignment opens it in Canvas in a new tab.

A class with nothing owed shows *Nothing to turn in*.

### Sorting

| Sort by | Order |
|---|---|
| **Due date** (default) | Earliest first; assignments with no due date last. |
| **Points** | Most points first; assignments with no points last. |
| **Name** | A to Z, ignoring case. |

Assignments that tie are ordered by due date, then name. The directions are fixed. The choice stays while you move between classes and resets to due date when the page is reloaded.

The assignments come from the integration's most recent refresh and update if a refresh happens while a class is open. If they cannot be loaded, for example because the Canvas account's entry is not loaded, the card says so and offers **Try again**; the class list keeps working.

## Messages

| Message | Meaning |
|---|---|
| *Choose a student in the card's settings.* | The card has no student configured. |
| *The student this card was set up for no longer exists.* | The student's device was deleted. Choose a student again. |
| *No active classes* | The student has no active courses. |
| *Nothing to turn in* | The class has no unsubmitted assignments. |
| *Could not load this class's assignments.* | The integration could not be asked. Use **Try again**. |
