# Hydra

## Design Comps / User-Interface Prototype

Version 1.0

### Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 31 October 2026 | 1.0 | First version: the screens and page states of the implemented interface on the `feature/ui-redesign` branch. | Sema Cakir |

### Table of Contents

1. [Introduction](#1-introduction)
   1. [Purpose](#11-purpose)
   2. [Scope](#12-scope)
   3. [Definitions, Acronyms and Abbreviations](#13-definitions-acronyms-and-abbreviations)
   4. [References](#14-references)
2. [Overview](#2-overview)
3. [Screen 1: Landing page](#3-screen-1-landing-page)
4. [Screen 2: Sign in](#4-screen-2-sign-in)
5. [Screen 3: Projects](#5-screen-3-projects)
6. [Screen 4: Create a project and import a repository](#6-screen-4-create-a-project-and-import-a-repository)
7. [Screen 5: Project overview](#7-screen-5-project-overview)
8. [Screen 6: Topology](#8-screen-6-topology)
9. [Screen 7: Boards](#9-screen-7-boards)
10. [Screen 8: Components](#10-screen-8-components)
11. [Screen 9: Environments](#11-screen-9-environments)
12. [Screen 10: Compare environments](#12-screen-10-compare-environments)
13. [Screen 11: Events](#13-screen-11-events)
14. [Screen 12: Deployments](#14-screen-12-deployments)
15. [Screen 13: Integrations](#15-screen-13-integrations)
16. [Screen 14: Settings](#16-screen-14-settings)
17. [Other Screens](#other-screens)

---

## 1. Introduction

### 1.1 Purpose

Design comps are graphic examples of the basic screens of a website. This document shows the screens of Hydra and the states each screen can be in, so the team, the users and the reviewers can see the interface before reading any code, and so a new page can be checked against the existing ones.

In RUP terms it is also the **User-Interface Prototype**: the result of the activity "Prototype the User-Interface" (design, implement, get feedback). Hydra's prototype is executable: every figure is a screenshot of the working frontend, not a drawing of it.

### 1.2 Scope

The document covers every screen people see in Hydra (the public landing page, sign-in, and the signed-in workspace) at desktop size (1440 px wide) and on a phone (390 px), in Light and Dark, and the states a screen can be in: empty, loading, slow, failed, offline, no results, no access, session expired, a mistake in a form, and success. The visual rules behind the screens are in the [Creative Design Brief](creative-design-brief.md).

It describes the interface as implemented on 31 October 2026. Screens of planned features are not shown.

### 1.3 Definitions, Acronyms and Abbreviations

The terms are defined in the [Creative Design Brief, section 1.3](creative-design-brief.md#13-definitions-acronyms-and-abbreviations). In addition:

| Term | Meaning |
| --- | --- |
| Comp | A full-size picture of one screen, as people will see it. |
| Commerce Demo | The sample project in every figure: 8 components and 7 dependencies, a Development and a Production environment, and a Payment Service that is degraded in Production. It is the same data as the backend's development seed. |
| State | One condition of a screen (for example "loading" or "no results") with its own design. |

### 1.4 References

| Document | Where |
| --- | --- |
| Creative Design Brief | [creative-design-brief.md](creative-design-brief.md) |
| Vision | [vision.md](../vision.md) |
| Design system | [design-system.md](../design-system.md) |
| Landing page | [landing.md](../landing.md) |
| Topology | [topology.md](../topology.md), [topology-v2.md](../topology-v2.md) |
| Boards and work items | [boards.md](../boards.md), [work-items.md](../work-items.md) |
| Repository discovery | [discovery.md](../discovery.md) |
| RUP example: Collegiate Sports Paging System, Design Comps (the template of this document) | <https://files.defcon.no/RUP/examples/csports/ex_descmp.htm> |
| RUP activity: Prototype the User-Interface | <https://files.defcon.no/RUP/process/activity/ac_uip.htm> |
| RUP artifact: User-Interface Prototype | <https://files.defcon.no/RUP/process/artifact/ar_uiprt.htm> |

## 2. Overview

The comps are screenshots of the real pages. The pages were rendered in Chromium, with the sample data of the Commerce Demo project, at 1440 × 900 px (1440 × 1000 px for the topology) and at 390 × 844 px for phones. Times are shown in UTC.

The screens and the questions from the [Vision](../vision.md) that each one answers:

| Screen | Route | Answers |
| --- | --- | --- |
| 1 Landing page | `/` | What is Hydra, and why would I use it? |
| 2 Sign in | `/signin` | How do I get in? |
| 3 Projects | `/projects` | Which systems can I open? |
| 4 Create a project, import a repository | `/projects/new`, `/projects/import` | How do I start a new system? |
| 5 Project overview | `/projects/{id}` | How is this system doing, and what changed recently? |
| 6 Topology | `…/topology` | What components exist, how are they connected, how healthy are they, and what may be affected if one fails? |
| 7 Boards | `…/boards` | What work is planned, and which components does it touch? |
| 8 Components | `…/components` | What are the parts of the system, and what depends on what? |
| 9 Environments | `…/environments` | Where does the system run, and how healthy is each place? |
| 10 Compare environments | `…/comparison` | Which version is deployed where? |
| 11 Events | `…/events` | What happened recently? |
| 12 Deployments | `…/deployments` | Which version of what was deployed, when, and how did it go? |
| 13 Integrations | `…/settings/integrations` | What did a repository scan find? |
| 14 Settings | `…/settings` | Who can open the project, and what is it called? |

How the screens connect:

```mermaid
flowchart LR
  landing["Landing page<br/>/"] --> signin["Sign in<br/>/signin"]
  signin --> keycloak["Keycloak login<br/>hydra theme"]
  keycloak --> projects["Projects<br/>/projects"]
  landing -- "Open workspace" --> projects
  projects --> newp["Create a project<br/>/projects/new"]
  projects --> importp["Import a repository<br/>/projects/import"]
  projects -- "open a project" --> tabs
  newp --> tabs
  importp --> tabs
  tabs["<b>A project</b><br/>Overview<br/>Plan: Boards<br/>Model: Components, Environments<br/>Operate: Topology, Compare, Events, Deployments<br/>Connect: Integrations<br/>Admin: Settings"]
```

*Figure 1: The navigation map.*

Every project page shares the same frame: the header, the breadcrumb, the tab bar and the page head (see the [page anatomy](creative-design-brief.md#63-page-layout)). The descriptions below cover what is particular to each screen.

The prototype went through several rounds of feedback before these versions: among others the landing page's motion, the sign-in page and the overview's live map were redesigned after review. The screens shown here are the chosen versions.

## 3. Screen 1: Landing page

![The landing page hero in Light](images/landing-hero-light.png)

*Figure 2: The hero, Light.*

![The landing page hero in Dark](images/landing-hero-dark.png)

*Figure 3: The hero, Dark.*

The public front page explains Hydra to someone who has never seen it and leads them to the workspace. It calls no API and needs no account.

- **Hero.** The claim "Know what a failure reaches." with one sentence, the actions "Open workspace" and "Explore the demo", and the promise "Read-only. Your code is never executed." On the right, three plates in light 3D play the product in a 12-second loop: a compose file is read, Hydra draws the map, one service fails and recovers. A line under the plates says in words what is happening ("8 services and 7 dependencies saved"), labelled as a sample system. A "Pause animations" button stops all motion.
- **Ribbon.** Two slow rows of what a project brings together (services, dependencies, runtime health, deployments, environments).

![How it works: four steps next to a product window that plays the step being read](images/landing-how.png)

*Figure 4: How it works.*

- **How it works.** Four steps, from "Start with the file you already have" to the failure that travels back along the dependencies. The window next to them stays in view and plays the step being read.

![Capabilities: tiles with a small moving figure each](images/landing-capabilities.png)

*Figure 5: Capabilities.*

- **Capabilities.** Seven tiles, each with a small loop that shows one capability: the live topology, impact analysis, runtime health, events, environment comparison, read-only scanning and the board.

![The impact explorer: a sample graph where a selected service shows what it could reach](images/landing-explorer.png)

*Figure 6: The impact explorer, Dark.*

- **Impact explorer.** The visitor clicks any service of the sample graph and sees which services are potentially affected, directly and indirectly, and the longest path.

![Get started: three linked steps, then the closing panel](images/landing-start.png)

*Figure 7: Get started and the closing panel.*

- **Get started and closing.** Three steps (sign in, import a repository, open the topology), then a dark panel with the two actions next to services orbiting Hydra.

## 4. Screen 2: Sign in

![The sign-in page in Light](images/signin-light.png)

*Figure 8: Sign in, Light.*

![The sign-in page in Dark](images/signin-dark.png)

*Figure 9: Sign in, Dark.*

The sign-in page has one action: "Continue with Keycloak". It says where the password is typed ("You enter your password on Keycloak. Hydra never sees it.") and how to get an account. The picture on the right is the orbit from the landing page: services around Hydra, all OK, labelled as a sample system. When something is wrong (the session expired, Keycloak cannot be reached, access was denied), a notice above the button says what happened and what to do; see [Session expired](#8-session-expired). After Keycloak, the visitor lands on the page they wanted.

## 5. Screen 3: Projects

![The project list: three project cards, the actions to create or import, and the large example offer](images/projects.png)

*Figure 10: Projects.*

The first page of the workspace lists the projects you are a member of. Each card shows the project's initial, name, visibility, description and slug, and the whole card opens the project. Hovering over a card, or focusing it with the keyboard, already fetches the project's first data, so the overview opens without a wait.

The page actions are "Import a repository" and "New project". In demo mode, a card under the list offers a large example project (Northstar Marketplace) and shows each step while it is created. With no projects yet, the page shows [an empty state](#1-empty-state) with the same two actions.

## 6. Screen 4: Create a project and import a repository

![Create a project: name, slug, description and visibility](images/new-project.png)

*Figure 11: Create a project.*

A short form: the project name, an optional slug (made from the name when left empty), a description and the visibility. Mistakes are flagged under the field they belong to ([Form validation](#9-form-validation)), and what you type is kept as a draft on this device until the project is created. After "Create project", a toast confirms it and offers the next step, "Add an environment".

![Import a repository: choose the source, name the project, start the scan](images/import.png)

*Figure 12: Import a repository.*

Importing starts from an existing system. Step 1 chooses the source; step 2 names the project; then the scan starts. The page states the rules before anything happens: repository files are read and never executed, and the topology appears only after you review and apply what the scan found. While the scan runs, the page shows the work as it happens, with its seconds ([Show the work](#feeling-fast)).

## 7. Screen 5: Project overview

![The overview: the health headline, the component that needs attention, the health bar and the live map](images/overview.png)

*Figure 13: Overview, top of the page.*

![The lower part of the overview: five numbers, recent events and recent deployments](images/overview-lower.png)

*Figure 14: Overview, lower part.*

![The overview in Dark](images/overview-dark.png)

*Figure 15: Overview, Dark.*

The overview answers "how is this system doing?" in one sentence, then shows the details.

- **Page head.** The project name and description; the environment selector and "Open topology" on the right.
- **Health.** A headline such as "1 component needs attention.", the component itself as a link (Payment Service, degraded, 1.4.0), and a bar that shows the share of each health state with its counts.
- **Live map.** The environment's topology on a dark stage. When it comes into view it tells its story once: the components appear layer by layer, their health shows, and a red arrow climbs from the degraded component to everything that depends on it, which lights up as potentially affected. "Replay" tells it again; the whole box opens the topology.
- **Numbers.** Open work items, active bugs, components, dependencies and components that need attention.
- **Feeds.** Recent events, recent deployments, open work and recent activity. The first three link to their full pages.

A project without environments shows a single form to add the first one instead ([Empty state](#1-empty-state)).

## 8. Screen 6: Topology

![The topology: toolbar, the live map with the legend and minimap, and the details panel](images/topology.png)

*Figure 16: Topology.*

The topology is the main screen of Hydra: every component and dependency of one environment on a live map.

- **Toolbar.** Environment, search, filters by component type, health and dependency source, "Inspect component" (selects a component from a list, for keyboard users) and Refresh. The page head shows "Live" while the stream of updates is connected, and the health totals.
- **Map.** Each component is a card with its type, version, name and health. Lines are dependencies, labelled with their type; solid lines are declared, dashed lines discovered, dotted lines observed. The legend explains every shape and line. The map pans and zooms, has a minimap that shows problems in colour, and fits itself to the area. A health change arrives without a reload.
- **Details panel.** Empty until something is selected.
- **Under the map.** Recent events in this environment, and the dependency provenance: declared dependencies compared with observed and discovered ones.

![Impact analysis: Payment Service selected; Order Service directly and API Gateway and Web Frontend indirectly potentially affected](images/topology-impact.png)

*Figure 17: Impact analysis.*

Selecting a component opens its details: type, name, health, version and description; "Analyze potential impact"; its metrics (CPU, memory, requests, error rate, P95 latency); its details (owner, repository, origin, discovery); what it depends on and what uses it; recent deployments, linked work items and recent events. "Analyze potential impact" highlights every component that depends on it, directly or through others, on the map ("Affected · direct", "Affected · indirect"), dims the rest, and lists them in the panel under "Potentially affected" — never as a prediction.

![A selected dependency with its evidence: found in compose.yaml at services.web-frontend.depends_on](images/topology-edge.png)

*Figure 18: A dependency and its evidence.*

Selecting a line shows the dependency instead: who depends on whom, its type and source, and the evidence for it, such as the file and the place in the file where a repository scan found it.

![The topology in Dark during an impact analysis](images/topology-dark.png)

*Figure 19: Topology, Dark.*

## 9. Screen 7: Boards

![The board: four columns with work item cards](images/boards.png)

*Figure 20: Board.*

Boards plan the work next to the system it changes.

- **Board view.** Four columns (New, Active, Resolved, Closed) with their counts. A card shows the type (story, task, bug), its number, priority, title, tags, assignee and points. Cards move by drag and drop, or with the Move menu on each card for keyboard and touch. A move shows at once and is saved in the background; if saving fails, the card goes back and an error says why.
- **Toolbar.** Board or Backlog, search, and filters by type, priority, assignee ("Assigned to me") and iteration.

![The work item drawer: type, priority, title, description, planning fields, tags and linked components](images/boards-drawer.png)

*Figure 21: A work item in the drawer.*

- **Drawer.** "New work item" or a card opens a drawer with every field of the work item: type, priority, title, description, assignee, iteration, story points, area, estimates, parent, tags (and a new tag), and the components it touches. Linked components connect the work to the topology. Its activity history is shown under the form. Closing the drawer with unsaved changes keeps them as a draft ([Session expired](#8-session-expired)).

![The backlog: the same work items as a table](images/backlog.png)

*Figure 22: Backlog.*

- **Backlog view.** The same work items as a table, with a filter by state.

## 10. Screen 8: Components

![Components: the list of components and the list of declared dependencies](images/components.png)

*Figure 23: Components.*

The parts of the system and what each one depends on. The left panel lists the components with their type icon, type, origin, owner and description; components found by a scan can be corrected ("Correct") so that later scans keep the name and type you chose. The right panel lists the dependencies ("An arrow from A to B means A depends on B") with their type and source. Under them, two forms: "Add a component" and "Declare a dependency". "View on the map" opens the topology. Viewers see the lists without the forms, with a "View only" chip.

## 11. Screen 9: Environments

![Environments: a card per environment with its recorded health, and the form to add one](images/environments.png)

*Figure 24: Environments.*

One card per environment: its type, its name, a sentence about its health ("1 component needs attention."), the health bar with its counts, the components with problems as pills, and "Open its topology". An environment without health reports says so ("No health reports yet."). Under the cards, "Add an environment"; with two or more environments, "Compare two" opens the comparison.

## 12. Screen 10: Compare environments

![Compare environments: Development and Production side by side, component by component](images/comparison.png)

*Figure 25: Compare environments.*

Two environments side by side, component by component: the version and health recorded in each, and whether they are the same or different. "Differences only" hides the rows that match. A note explains what the data can and cannot prove: a record means a deployment or a runtime report exists, and no record does not prove that a component is missing.

## 13. Screen 11: Events

![Events: a feed of operational events with severity, component, type and time](images/events.png)

*Figure 26: Events.*

Deployments, health changes and other operational events of one environment, newest first. Each event shows its severity (shape and word), its title, the component, the event type and the time, with the full date and time on hover. The toolbar chooses the environment and filters by severity, and counts what is shown.

## 14. Screen 12: Deployments

![Deployments: a table of component, version, status, started and completed](images/deployments.png)

*Figure 27: Deployments.*

Every recorded deployment in an environment: component, version, status, and when it started and completed. On a phone each row becomes a small card ([Figure 31](#phones)).

## 15. Screen 13: Integrations

![Integrations: a connected repository with its scan history](images/integrations.png)

*Figure 28: Integrations.*

A connected repository with its branch, address, provider and last successful scan; "Scan now", "Disconnect" (or "Reconnect"); and the scan history with each scan's status and what it found. "Review" opens what a scan found: new, changed and missing components with the file and place each was found in, the number of dependency candidates, warnings and name conflicts. "Apply scan" adds it to the project and keeps the names and types you corrected by hand. While a scan runs, "Scan now" waits ("Scanning…"), because a repository is scanned one scan at a time. Only owners can change integrations.

## 16. Screen 14: Settings

![Settings: project details, members and the form to add one](images/settings.png)

*Figure 29: Settings.*

The project's details (name, slug, description, visibility), its members with their roles, a form to add a member by email (the person must have signed in once), and, at the bottom, archiving the project. Archiving asks for a confirmation on the page ("Archive it" or "Keep it") rather than in a browser dialog. Only owners can change settings; everyone else sees them with a "View only" chip.

## Other Screens

### Phones

![The landing page and the sign-in page on a phone](images/phone-public.png)

*Figure 30: The landing page and sign-in on a phone.*

![The overview, topology, board and deployments on a phone](images/phone-app.png)

*Figure 31: The overview, topology, board and deployments (Dark) on a phone.*

On a phone every page is a single column. The tab bar scrolls sideways and keeps the current tab in view, toolbars wrap, the topology's details panel moves under the map, and tables become small cards. Nothing scrolls sideways.

### Keycloak login

The account itself is entered on Keycloak's own pages, which use Hydra's `hydra` login theme: the same frame as the sign-in page, the same tokens and fonts, and the same Light and Dark rule. See [authentication.md](../authentication.md#login-theme).

### States

A screen is not one picture: it can be empty, loading, slow, broken, offline, filtered to nothing, closed to you, or waiting for a fix in a form. Each of these states is designed, worded and tested. The same few building blocks serve every page, so a state looks and reads the same wherever it appears.

#### 1. Empty state

What the screen says before there is any data: what is missing, why it matters, and the one action that fills it.

![No projects yet: "Create your first project" with Import a repository and New project](images/state-empty-projects.png)

*Figure 32: No projects yet.*

![A project without environments: "Add your first environment" with the form in place](images/state-empty-overview.png)

*Figure 33: A new project without environments.*

![A topology with nothing to draw: "Nothing to draw yet" with Add components and Scan a repository](images/state-empty-topology.png)

*Figure 34: A map with nothing to draw yet.*

![A project without environments on the topology: "No environments yet" with Add an environment](images/state-no-environments.png)

*Figure 35: A topology without environments.*

In both cases the details panel says "Nothing to inspect yet" instead of asking you to select a component that does not exist.

#### 2. Loading state

Grey placeholders in the shape of what is coming (skeletons) replace the content while it loads, so the page keeps its layout and the wait feels shorter. A thin bar at the top of the window shows that Hydra is working; it appears only if the wait is longer than 150 ms.

![The overview while it loads: skeleton number tiles and feeds](images/state-loading-overview.png)

*Figure 36: The overview while it loads.*

![The topology while it loads: placeholder cards where the map will be](images/state-loading-topology.png)

*Figure 37: The topology while it loads.*

#### 3. Error state

An error says what went wrong in plain words and how to fix it, and offers "Try again" when trying again can help. When nothing could be loaded, the page shows the error alone, without placeholders that would never fill. While Hydra runs on a developer's machine, the hint also names the command that helps (`docker compose up -d backend`, `docker compose logs backend`).

![The overview when the server fails: "Something went wrong on the server" with Try again](images/state-error-overview.png)

*Figure 38: The server failed.*

![The project list when the server cannot be reached: "Hydra's server can't be reached"](images/state-error-network.png)

*Figure 39: The server cannot be reached.*

#### 4. No internet

When the connection drops, a notice says so at once and the page stays as it was, so you are never left with a blank screen. An action that needs the network says "You're offline" where it failed, with "Try again". When the connection returns, "Back online" offers a refresh.

![Offline: "You're offline" at the top, and the failed refresh explained above the map](images/state-offline.png)

*Figure 40: Offline.*

![Back online, with a Refresh button](images/state-back-online.png)

*Figure 41: Back online.*

#### 5. Slow network

When the server takes longer than 3 seconds, a notice replaces the silence: "Still loading… The server is taking longer than usual", with a count of the seconds, so the wait shows progress instead of a frozen spinner. The loading bar keeps crawling and sprints to the end when the data arrives.

![The board on a slow network: skeleton columns and "Still loading… · 4 s"](images/state-slow.png)

*Figure 42: A slow network.*

#### 6. No search results

A search or filter that finds nothing says so, suggests the closest match when there is one ("Did you mean Payment Service?"), and offers a way back to everything.

![The topology search for "paymnt": "Did you mean Payment Service?"](images/state-no-results-topology.png)

*Figure 43: A typo on the topology.*

![The board search for "retrys": "Did you mean Add retries to payment calls?"](images/state-no-results-boards.png)

*Figure 44: A typo on the board.*

![The events filtered to Critical: "No critical events match these filters." with Clear the filters](images/state-no-results-events.png)

*Figure 45: A filter with no results.*

#### 7. Permission denied

When you may not open a project, the page explains why (projects are visible to their members only), who can change that (a project owner, in Settings, Members) and gives a way back. A project that does not exist, or was archived, gets its own message. Inside a project, actions you may not take are not shown, and a "View only" chip says why.

![You don't have access to this project, with Back to your projects](images/state-access-denied.png)

*Figure 46: No access.*

![This project wasn't found, with Back to your projects](images/state-not-found.png)

*Figure 47: Not found.*

![A viewer on the Components page: the View only chip and no forms](images/state-view-only.png)

*Figure 48: View only.*

#### 8. Session expired

When the session ends, Hydra sends you to sign in again and then back to the page you were on. Nothing you were writing is lost: a new project and a work item are saved on this device as you type, and they are offered back when you return.

![The sign-in page after an expired session: "Your session expired."](images/state-session-expired.png)

*Figure 49: Signing in again after the session expired.*

![The board offers the unsaved work item back: Continue editing or Discard](images/state-draft-board.png)

*Figure 50: An unsaved work item is offered back.*

![The new project form with "Your draft is back" and Start over](images/state-draft-new-project.png)

*Figure 51: A new project's draft is back.*

#### 9. Form validation

A mistake is flagged right where it happens: under the field, in a sentence that says how to fix it. Leaving a field shows its mistake at once; an empty required field is flagged only after a first "Create" or "Save", so a fresh form does not start red. On submit, the focus moves to the first field with a mistake. When the server refuses a value (a name that is already taken), its answer appears under that field too.

![Create a project with a missing name and a slug with a space](images/state-validation.png)

*Figure 52: Mistakes in a form.*

![A name that is already taken, flagged under the name](images/state-conflict.png)

*Figure 53: A name the server refused.*

#### 10. Success state

A success is confirmed where it happened (the new environment appears, with a short rise) and in a toast that says what is next and links to it. Toasts stay for 6 seconds, pause while the pointer or focus is on them, and are announced to screen readers.

![Staging added: the new card and a toast with Open its topology](images/state-success-environment.png)

*Figure 54: An environment added.*

![The same success in Dark](images/state-success-dark.png)

*Figure 55: An environment added, Dark.*

#### The states on a phone

![On a phone: offline, slow network, a success toast and no results](images/state-phone.png)

*Figure 56: Offline, slow network, success and no results on a phone.*

### Feeling fast

Six ways to make an interface feel fast, and how Hydra uses them:

| Technique | Used | Where |
| --- | --- | --- |
| Optimistic interface: show the result before the server confirms it | Yes | Moving a card on the board shows at once and is saved in the background (the card goes back if saving fails). A saved work item appears at once, and the board reloads quietly behind it. |
| Skeleton screens | Yes | Every list, table, card grid, the board, the map and the settings forms ([Loading state](#2-loading-state)). |
| Blurry image previews | No | Hydra shows no photographs or large images; every graphic is SVG or CSS and appears at once. |
| A progress bar that sprints at the end | Yes | The loading bar at the top crawls slowly while the API works and sprints to 100 % when it is done. |
| Start the work before they ask | Yes | Pointing at a project card, or focusing it, fetches the project's first data, so the overview opens without a wait. |
| Show the work | Yes | A repository scan shows what it is doing and counts its seconds; the impact button says "Analyzing…"; the large example project shows each step while it is created; a slow request counts its seconds ([Slow network](#5-slow-network)). |

![A repository scan in progress: "Reading configuration files and parsing Docker Compose · 7 s", and Scan now disabled](images/state-scan-running.png)

*Figure 57: A scan shows its work.*

![Impact analysis in progress: the button says Analyzing…](images/state-analyzing.png)

*Figure 58: The impact analysis at work.*
