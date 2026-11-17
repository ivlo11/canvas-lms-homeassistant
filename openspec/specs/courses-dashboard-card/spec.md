# courses-dashboard-card Specification

## Purpose
Provides a dashboard card that shows one student's active classes with teacher and current grade, and lets the viewer open a class to see and sort the assignments the student has not turned in.

## Requirements

### Requirement: The card is available after installing the integration
The integration SHALL make the courses card available to dashboards, including in the card picker, without the user registering a dashboard resource unless they keep dashboard resources in YAML. The card SHALL render after a cold reload on every Home Assistant release the integration supports, on dashboards opened while Home Assistant is starting when dashboard resources are kept in storage, and on the older phone and tablet WebViews used by the Home Assistant mobile apps.

#### Scenario: Adding the card from the picker
- **WHEN** a user with the integration installed opens the dashboard card picker
- **THEN** the courses card is listed and can be added

#### Scenario: Dashboard defined in YAML
- **WHEN** a YAML-mode dashboard uses the courses card type
- **THEN** the card renders

#### Scenario: Dashboard opened while Home Assistant is starting
- **WHEN** a dashboard with the courses card, managed in the UI or defined in YAML, is opened after Home Assistant's frontend is up but before the integration is set up, dashboard resources are kept in storage, and `config/www` existed when Home Assistant last started
- **THEN** the card renders without a reload

#### Scenario: Resources kept in YAML
- **WHEN** `configuration.yaml` keeps dashboard resources in YAML
- **THEN** the integration writes no resource, the card still loads once Home Assistant has started, and pages opened during startup load it if the user has added the card's resource line

#### Scenario: First start without a config/www folder
- **WHEN** the integration is set up and `config/www` doesn't exist
- **THEN** the folder is created, the card still loads once Home Assistant has started, and pages opened during startup load it from the next restart on

#### Scenario: Integration updated
- **WHEN** Home Assistant restarts with a new version of the integration
- **THEN** pages load the new card, and the dashboard resources still list the card once

#### Scenario: Cold reload on Home Assistant 2026.8 to 2026.10
- **WHEN** a dashboard with the courses card is reloaded without the browser cache, and the card's module runs before the dashboard's custom element registry is installed
- **THEN** the card renders without a further reload, and its visual editor opens

#### Scenario: Card loaded twice
- **WHEN** a page loads the card both as a dashboard resource and as an extra module
- **THEN** the card renders once and nothing is logged as an error

#### Scenario: Release without the registry race
- **WHEN** the dashboard loads on Home Assistant 2026.11 or later
- **THEN** the card renders and nothing about its registration is logged

#### Scenario: Older phone WebView
- **WHEN** the dashboard is opened in a WebView that cannot parse syntax newer than ES2019
- **THEN** the card renders

### Requirement: The card is configured with one student
The card SHALL be configured by choosing one student device from this integration, with an optional title, and SHALL offer a visual editor for both.

#### Scenario: Choosing a student in the editor
- **WHEN** the user opens the card's visual editor
- **THEN** only student devices from this integration can be chosen

#### Scenario: Two students on one dashboard
- **WHEN** a dashboard has two courses cards configured with different students
- **THEN** each card shows only its own student's classes

#### Scenario: Student not configured or no longer present
- **WHEN** the card has no student configured, or the configured student device no longer exists
- **THEN** the card shows a configuration error instead of a class list

### Requirement: The card lists the student's active classes
The card SHALL show one row for each of the student's active courses, ordered by course name.

#### Scenario: Student with several classes
- **WHEN** the student has four active courses
- **THEN** the card shows four rows in alphabetical order by course name

#### Scenario: Student with no active classes
- **WHEN** the student has no active courses
- **THEN** the card shows a message that there are no active classes

#### Scenario: Classes change
- **WHEN** a refresh adds or removes one of the student's active courses
- **THEN** the card's rows update without the page being reloaded

### Requirement: Each class row shows course, teacher, and grade
Each row SHALL show the course name, the teacher's name beneath it in smaller text, and the student's current grade to the right of both lines.

#### Scenario: Row layout
- **WHEN** a course row is displayed
- **THEN** the course name is on the first line, the teacher's name is on the second line in a smaller font, and the current grade is right-aligned beside both lines

#### Scenario: Several teachers
- **WHEN** a course has more than one teacher
- **THEN** the second line shows all teacher names separated by commas

#### Scenario: No teacher listed
- **WHEN** a course has no teacher listed
- **THEN** the second line is empty and the row keeps its layout

#### Scenario: Long course name
- **WHEN** a course name is too long for the row
- **THEN** the name is truncated and the grade remains fully visible

### Requirement: The grade shown is the percentage score
The card SHALL show the student's current grade as the percentage score Canvas reports, and SHALL show a dash when Canvas provides no score. It SHALL NOT show the letter grade.

#### Scenario: Course with a letter grade and a score
- **WHEN** the course reports a letter grade of "B+" and a score of 88
- **THEN** the row shows "88%"

#### Scenario: Fractional score
- **WHEN** the course reports a score of 91.5
- **THEN** the row shows "91.5%"

#### Scenario: Grade withheld or unavailable
- **WHEN** the course reports no score, or its data is unavailable
- **THEN** the row shows a dash

#### Scenario: Grade changes
- **WHEN** a refresh changes the student's grade in a course
- **THEN** the row shows the new grade without the page being reloaded

### Requirement: Selecting a class shows its unsubmitted assignments
Selecting a class row SHALL show, within the card, the assignments the student has not turned in for that course, with a way back to the class list.

#### Scenario: Opening a class
- **WHEN** the viewer selects a class row
- **THEN** the card shows the course name and that student's unsubmitted assignments for that course only

#### Scenario: Returning to the list
- **WHEN** the viewer uses the back control
- **THEN** the card shows the class list again

#### Scenario: Class with nothing owed
- **WHEN** the viewer opens a class with no unsubmitted assignments
- **THEN** the card shows a message that there is nothing to turn in

#### Scenario: Keyboard use
- **WHEN** the viewer navigates the card with the keyboard
- **THEN** class rows, the back control, and the sort control can each be focused and activated

### Requirement: Each assignment shows its details
Each assignment in the class view SHALL show its name, the student's due date, and points possible, SHALL mark assignments the integration marks as missing, and SHALL link to the assignment in Canvas.

#### Scenario: Assignment with all details
- **WHEN** an assignment has a name, a due date, and points possible
- **THEN** the row shows all three, with the due date in the viewer's locale and time zone

#### Scenario: Assignment with no due date or points
- **WHEN** an assignment has no due date or no points possible
- **THEN** the row shows the assignment without that value

#### Scenario: Missing assignment
- **WHEN** the integration marks an assignment as missing
- **THEN** the row is marked as missing

#### Scenario: Missing assignment graded 0
- **WHEN** an assignment was graded 0 without being turned in and the integration marks it missing
- **THEN** the row is shown and marked as missing

#### Scenario: Opening an assignment
- **WHEN** the viewer selects an assignment
- **THEN** the assignment's Canvas page opens in a new tab

### Requirement: Assignments can be sorted three ways
The class view SHALL let the viewer sort the assignments by due date, by points possible, or alphabetically by name, and SHALL sort by due date by default.

#### Scenario: Default order
- **WHEN** the viewer opens a class
- **THEN** assignments are ordered by due date, earliest first, with undated assignments last

#### Scenario: Sort by points possible
- **WHEN** the viewer chooses to sort by points possible
- **THEN** assignments are ordered from most points to fewest, with assignments without points last

#### Scenario: Sort by name
- **WHEN** the viewer chooses to sort by name
- **THEN** assignments are ordered alphabetically by name, ignoring case

#### Scenario: Sort choice kept while browsing
- **WHEN** the viewer chooses a sort order, returns to the class list, and opens another class
- **THEN** the chosen sort order is still applied

### Requirement: The class view reflects the latest data
The class view SHALL show the assignments from the integration's most recent refresh when a class is opened, and SHALL update if a refresh occurs while the class is open.

#### Scenario: Assignment turned in
- **WHEN** an assignment is turned in and a refresh runs while its class is open
- **THEN** the assignment disappears from the class view without the page being reloaded

### Requirement: Failures are shown without breaking the card
When the assignments cannot be loaded, the class view SHALL show an error with a way to retry, and the class list SHALL remain usable.

#### Scenario: Assignments cannot be loaded
- **WHEN** the viewer opens a class and loading its assignments fails
- **THEN** the class view shows an error and a retry control, and the viewer can return to the class list

#### Scenario: Retry succeeds
- **WHEN** the viewer retries after the cause is resolved
- **THEN** the class's assignments are shown

### Requirement: The card follows the dashboard's theme
The card SHALL use the active Home Assistant theme's colours and typography.

#### Scenario: Dark theme
- **WHEN** the dashboard uses a dark theme
- **THEN** the card's background, text, and secondary text use that theme's colours

### Requirement: The card's files are removed with the integration
When the last Canvas LMS entry is removed, the integration SHALL remove the card's dashboard resource and the files it copied into `config/www`.

#### Scenario: Removing the last entry
- **WHEN** the user removes the only Canvas LMS entry
- **THEN** the dashboard resources no longer list the card and `config/www/canvas_lms_edu/` no longer exists

#### Scenario: Removing one of several entries
- **WHEN** the user removes one Canvas LMS entry while another remains
- **THEN** the dashboard resource and the copied files stay
