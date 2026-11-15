# account-setup Specification

## Purpose
Lets a Home Assistant admin connect a Canvas account using only a Canvas URL and an access token, for a student or an observer, with several accounts per home and a way to replace a token that has stopped working.

## Requirements

### Requirement: Setup asks only for a Canvas URL and a token
The integration SHALL be set up from the Home Assistant UI by entering a Canvas URL and an access token. It SHALL NOT ask for a user id, a role, or any other value.

#### Scenario: Valid URL and token
- **WHEN** the user submits a reachable Canvas URL and a valid token
- **THEN** a config entry is created, titled with the account's name and the Canvas host

#### Scenario: URL entered with a trailing slash or path
- **WHEN** the user submits a Canvas URL with a trailing slash or a path after the host
- **THEN** setup succeeds and the stored URL is the scheme and host only

### Requirement: The account is identified without user input
The integration SHALL identify the account by asking Canvas who the token belongs to, and SHALL use that identity, together with the Canvas host, to recognise the account afterwards.

#### Scenario: Account identity resolved from the token
- **WHEN** setup succeeds
- **THEN** the entry records the Canvas user id and name that Canvas reports for the token

### Requirement: Setup is refused with a specific error when it cannot work
The integration SHALL validate the URL and token against Canvas before creating an entry, and SHALL show a specific error and let the user correct the form when validation fails.

#### Scenario: Invalid token
- **WHEN** Canvas rejects the token as unauthorized
- **THEN** no entry is created and the form shows an invalid-authentication error

#### Scenario: Canvas unreachable
- **WHEN** the Canvas URL cannot be reached or times out
- **THEN** no entry is created and the form shows a cannot-connect error

#### Scenario: Unexpected failure
- **WHEN** validation fails for any other reason
- **THEN** no entry is created, the form shows an unknown-error message, and the failure is logged

#### Scenario: Recovery after an error
- **WHEN** the user corrects the values after an error and submits again
- **THEN** the entry is created

### Requirement: Student and observer accounts are detected automatically
The integration SHALL treat an account that has observees as an observer account whose students are those observees, and SHALL treat an account with no observees as a student account whose only student is the account itself.

#### Scenario: Observer token
- **WHEN** the token belongs to an account linked to one or more observees
- **THEN** the entry's students are those observees

#### Scenario: Student token
- **WHEN** the token belongs to an account with no observees
- **THEN** the entry's only student is the account itself

### Requirement: Each account can be added once
The integration SHALL refuse to add an account that is already configured, where an account is the combination of Canvas host and Canvas user.

#### Scenario: Same account added twice
- **WHEN** the user submits a URL and token that resolve to an already configured account
- **THEN** the flow aborts with an already-configured message and no second entry is created

### Requirement: Several accounts can be configured
The integration SHALL allow more than one account in the same Home Assistant instance, each with its own token and its own Canvas URL.

#### Scenario: Two students on the same Canvas host
- **WHEN** two different students each add an entry with their own token and the same Canvas URL
- **THEN** both entries exist and each reports its own student

#### Scenario: Accounts on different Canvas hosts
- **WHEN** a second entry is added with a different Canvas URL
- **THEN** both entries exist and each talks only to its own Canvas host

#### Scenario: Observer and student entries cover the same student
- **WHEN** an observer entry and that student's own entry are both configured
- **THEN** both entries are accepted

### Requirement: A token that stops working can be replaced
When Canvas rejects an entry's token, the integration SHALL ask the user to reauthenticate, and SHALL accept a new token only if it belongs to the same account.

#### Scenario: Token rejected during operation
- **WHEN** Canvas rejects the entry's token as unauthorized
- **THEN** Home Assistant prompts the user to reauthenticate that entry

#### Scenario: New token for the same account
- **WHEN** the user submits a new valid token that belongs to the same Canvas user
- **THEN** the entry stores the new token and resumes updating, keeping its students and entities

#### Scenario: New token for a different account
- **WHEN** the user submits a token that belongs to a different Canvas user
- **THEN** the flow aborts with a wrong-account message and the entry is unchanged

#### Scenario: New token is invalid
- **WHEN** the user submits a token that Canvas rejects
- **THEN** the form shows an invalid-authentication error and the entry is unchanged

### Requirement: An entry can be removed cleanly
The integration SHALL stop updating and remove its entities when an entry is unloaded or removed.

#### Scenario: Entry removed
- **WHEN** the user removes an entry
- **THEN** its entities are removed and no further requests are made to Canvas for it
