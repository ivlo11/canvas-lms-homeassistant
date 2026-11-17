# Spec Delta

## MODIFIED Requirements

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
