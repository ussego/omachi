# Omachi

Omachi is an analytics dashboard for the Omarchy plugin catalog: engagement stats, leaderboards, ecosystem health, and embeddable badges/charts.

## Language

**Plugin**:
An entry in the Omarchy catalog — an installable customization — identified by a stable Plugin ID, with metadata (name, author, category, license, tags) and current engagement counters.

**Catalog**:
The upstream list of all Plugins and their metadata, published by Omarchy Plugins.
_Avoid_: catalog.json (that's the transport file, not the concept)

**Snapshot**:
A point-in-time capture of one Plugin's engagement counters (views, copies, hearts) and verification/version state, recorded by a Heavy Poll.

**Heavy Poll**:
The full catalog refresh: upserts every Plugin's metadata, records a new Snapshot per Plugin, and diffs against each Plugin's prior Snapshot to produce Verification Events and Update Events. Runs on a schedule via GitHub Actions calling an admin endpoint.
_Avoid_: snapshot poll, cron job

**Light Poll**:
A cheap, frequent refresh that only detects newly-added Plugins — no Snapshot, no per-plugin diffing — keeping the live Plugin count fresh between Heavy Polls.
_Avoid_: quick poll

**Verification Event**:
A recorded change in a Plugin's verification status, produced by comparing consecutive Snapshots during a Heavy Poll.

**Update Event**:
A recorded change in a Plugin's upstream repository state (e.g. a new version), produced the same way as a Verification Event.

**Author**:
The maintainer of one or more Plugins, identified by their upstream (GitHub) login.

**Leaderboard**:
A ranking of Plugins or Authors by a chosen metric (views, copies, hearts, or a derived score).

**Badge**:
A single embeddable stat for one Plugin or Author (e.g. heart count), rendered as an image by an external renderer; Omachi serves only the underlying JSON value.

**Chart Series**:
A time-bucketed sequence of counts for one metric (e.g. a Plugin's hearts over time), consumed by an external chart renderer.
