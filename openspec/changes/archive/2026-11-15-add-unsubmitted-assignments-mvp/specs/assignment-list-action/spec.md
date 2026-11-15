# Spec Delta

## Purpose

Provides an action that returns the full list of a Canvas account's unsubmitted assignments, with every detail and flag, so an admin can display, filter, or automate on them as they choose.

## ADDED Requirements

### Requirement: An action returns an account's unsubmitted assignments
The integration SHALL provide an action that takes a config entry and returns, as response data, every unsubmitted assignment collected for that entry's students at its last successful refresh.

#### Scenario: Entry with unsubmitted assignments
- **WHEN** the action is called for an entry whose students have unsubmitted assignments
- **THEN** the response contains one item per assignment, each with all of its details and flags

#### Scenario: Entry with several students
- **WHEN** the action is called for an observer entry with several students
- **THEN** the response contains every student's assignments, each item naming its student

#### Scenario: Nothing outstanding
- **WHEN** the action is called for an entry whose students have no unsubmitted assignments
- **THEN** the response contains an empty list

### Requirement: The action returns unfiltered data
The action SHALL return every collected assignment, including excused, locked, undated, and nothing-to-submit assignments, and SHALL include the fields needed to filter them.

#### Scenario: Excused and on-paper assignments present
- **WHEN** the entry's collected assignments include an excused assignment and an on-paper assignment
- **THEN** both appear in the response, with the excused flag and submission types set accordingly

### Requirement: The action is always available
The action SHALL be registered whenever the integration is set up, whether or not any entry is currently loaded, so that automations and scripts referring to it remain valid.

#### Scenario: Entry failed to load
- **WHEN** the integration's only entry failed to load at startup
- **THEN** the action still exists

### Requirement: The action explains why it cannot run
The action SHALL fail with a clear validation error when the given config entry does not exist, belongs to another integration, or is not loaded.

#### Scenario: Entry not loaded
- **WHEN** the action is called with an entry that is not loaded
- **THEN** the call fails with a validation error saying the entry is not loaded

#### Scenario: Unknown entry
- **WHEN** the action is called with an entry id that does not exist
- **THEN** the call fails with a validation error saying the entry was not found

### Requirement: The action does not call Canvas
The action SHALL answer from the data of the last successful refresh and SHALL NOT make requests to Canvas.

#### Scenario: Repeated calls
- **WHEN** the action is called several times between two refreshes
- **THEN** every call returns the same data and no request is sent to Canvas
