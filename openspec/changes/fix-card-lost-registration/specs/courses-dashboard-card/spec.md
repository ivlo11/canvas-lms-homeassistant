# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: The card's files are removed with the integration
When the last Canvas LMS entry is removed, the integration SHALL remove the card's dashboard resource and the files it copied into `config/www`.

#### Scenario: Removing the last entry
- **WHEN** the user removes the only Canvas LMS entry
- **THEN** the dashboard resources no longer list the card and `config/www/canvas_lms_edu/` no longer exists

#### Scenario: Removing one of several entries
- **WHEN** the user removes one Canvas LMS entry while another remains
- **THEN** the dashboard resource and the copied files stay
