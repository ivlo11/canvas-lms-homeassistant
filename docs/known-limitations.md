# Known limitations

## New or removed students need a reload

An observer entry creates a device for each student it observes when the entry is set up. If a student is linked to the observer afterwards, reload the entry (**Settings** > **Devices & services** > **Canvas LMS** > the entry's menu > **Reload**) to get their device and sensor.

If a student is no longer linked to the observer, their sensor becomes unavailable. Their device stays until you delete it.

## Courses Canvas refuses are skipped

Canvas sometimes refuses to list a single course, for example one outside its access dates, while the rest of the account works. The integration skips such a course for that refresh, so its assignments are not counted or returned. The skip is written to the log at debug level; turn on debug logging for the integration to see which course was skipped.

## An account that observes students shows only those students

If a Canvas account both observes other students and is enrolled as a student itself, the integration shows the observed students only. To see the account's own assignments as well, there is no setting; they are not available from that entry.

## The same student from two entries has two devices

A parent's observer entry and the student's own entry can both be set up. Home Assistant gives a device to one entry only, so the student appears as two devices with the same name, each with its own sensor.

## Only active courses count

Assignments in courses the student is no longer actively enrolled in, such as last term's, are not collected.

## The refresh interval is fixed

Data is refreshed every 30 minutes and there is no setting for it. To refresh at another time, call `homeassistant.update_entity` on one of the entry's sensors.

## The Canvas client is installed from GitHub

`canvas-lms-python-client` is not on PyPI yet. Home Assistant installs it from a pinned commit on GitHub, so the machine running Home Assistant needs `git` and access to github.com when the integration is first installed or updated.
