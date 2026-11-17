---
name: Ally
description: Una agenda personal que convierte fechas límite en semanas de estudio.
colors:
  ocean-950: "#06121e"
  ocean-900: "#0a1b29"
  ocean-850: "#0e2332"
  ocean-800: "#132d3d"
  ocean-700: "#1c4051"
  pearl: "#edf7f7"
  pearl-dim: "#b7cbd3"
  pearl-muted: "#93afbb"
  current: "#5de4d8"
  current-bright: "#9af4e6"
  rose: "#ee7eac"
  rose-dark: "#7d2855"
  stone: "#597386"
  crystal: "#2f7b82"
  amber: "#e7bd72"
  error: "#ffabb7"
typography:
  display:
    fontFamily: "Sora, DM Sans, sans-serif"
    fontSize: "clamp(44px, 6.1vw, 82px)"
    fontWeight: 600
    lineHeight: 1.12
  body:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "12px"
  lg: "15px"
  xl: "18px"
components:
  button-primary:
    backgroundColor: "{colors.current}"
    textColor: "{colors.ocean-950}"
    rounded: "{rounded.md}"
    padding: "10px 17px"
    height: "44px"
  button-primary-large:
    backgroundColor: "{colors.current}"
    textColor: "{colors.ocean-950}"
    rounded: "{rounded.lg}"
    padding: "15px 23px"
    height: "54px"
---

# Design System: Ally

## Overview

**Creative North Star: "La estela luminosa"**

Ally turns a deadline into a visible route through a personal study week. Its interface pairs a midnight ocean with restrained bioluminescent accents, giving the week grid a calm, legible structure rather than making every surface compete for attention.

The public landing page uses original current-line artwork and an illustrative Monday-to-Sunday schedule. The signed-in interface shifts into a practical weekly calendar; real goals, availability, validation, and study blocks come from the Django API.

**Key Characteristics:**
- Spanish-first, personal planning for students and teachers.
- Luminous cyan marks navigation and action; technique colors distinguish study blocks.
- API-generated blocks remain the source of truth; the client never creates a study plan.

## Colors

The palette is anchored in deep blue-black and pearl text, with turquoise light reserved for orientation and action.

### Primary
- **Bioluminescent Current** (`#5de4d8`): primary actions, active navigation, and calendar indicators.
- **Bright Current** (`#9af4e6`): emphasis and focused text on dark surfaces.

### Secondary
- **Pomodoro Rose** (`#ee7eac`): Pomodoro blocks and material samples.
- **Crystal Teal** (`#2f7b82`): milestone blocks and material samples.
- **Deadline Amber** (`#e7bd72`): due-date markers.

### Neutral
- **Ocean Night** (`#06121e`): page background.
- **Deep Water** (`#0a1b29`, `#0e2332`, `#132d3d`, `#1c4051`): layered surfaces and borders.
- **Pearl** (`#edf7f7`): primary text.
- **Muted Pearl** (`#b7cbd3`, `#93afbb`): supporting text and metadata.
- **Stone** (`#597386`): continuous-study blocks.
- **Soft Error** (`#ffabb7`): API and validation errors.

**The Current Rule.** Cyan guides attention; it does not replace readable text or the distinct material colors of study techniques.

## Typography

**Display Font:** Sora  
**Body Font:** DM Sans, with Segoe UI and sans-serif fallbacks.

**Character:** Sora gives headings a clear, deliberate silhouette. DM Sans keeps forms, calendar details, and longer Spanish copy easy to scan.

### Hierarchy
- **Display** (600, `clamp(44px, 6.1vw, 82px)`, 1.12): landing headline; mobile uses a 40–58px clamp.
- **Headline** (600, 24–34px): dashboard and section headings.
- **Title** (600, 16–20px): resource and component headings.
- **Body** (400, 16px, 1.55): explanatory copy and forms; constrain long copy to a readable measure.
- **Label** (600–700, 10–13px): navigation, metadata, form labels, and calendar details.

## Layout

The landing page opens with a two-column hero: concise product copy beside a seven-day schedule illustration. Below 850px it stacks; below 580px, navigation simplifies and the illustrative week scrolls horizontally.

The dashboard uses a 228px sidebar on wide screens, then changes to a compact, horizontally scrollable navigation above the content on narrower screens. The weekly calendar starts Monday and keeps seven days in one time grid. Its 710px minimum width is contained by a horizontal scroll region on small screens rather than widening the page.

## Elevation & Depth

Depth comes primarily from tonal ocean layers, thin borders, and restrained soft shadows. Interactive study blocks add a slight perspective tilt to make their material differences legible without sacrificing the calendar grid.

### Shadow Vocabulary
- **Soft Surface** (`0 16px 36px rgba(0, 0, 0, 0.32)`): elevated calendar and landing-demo surfaces.
- **Study Block** (`0 5px 10px rgba(0, 0, 0, 0.3)`): calendar blocks against the time grid.

## Shapes

Controls and compact surfaces use 8–12px corners; primary actions use 12–15px; large illustrative surfaces use up to 18px. Thin ocean-tinted borders define surfaces. Technique blocks use distinct fills and lower-edge accents rather than heavy outlines.

## Components

### Buttons
- **Shape:** compact, with 12px corners; large calls to action use 15px.
- **Primary:** current-turquoise surface, ocean text, 44px default minimum height; large actions are 54px.
- **Hover / Focus:** slight lift on hover and a high-contrast turquoise focus ring.
- **Quiet / Outline:** preserve pearl text and use a restrained surface or border change.

### Weekly Calendar
- Monday-first time grid with week and day views.
- Blocks are colored by category technique and remain draggable only when scheduled.
- Selecting a block exposes details and keyboard-operable 30-minute move controls.
- Rejected moves restore the prior position and show the API validation.

### Forms and Resource Lists
- Labels remain visible above fields; server validation is shown in an announced error region.
- Create, edit, and delete use the API-backed resource endpoints.
- Empty states point toward the next action without inventing sample user data.

## Do's and Don'ts

- Keep the API authoritative for availability validation and schedule generation.
- Preserve the Monday-to-Sunday calendar and its contained horizontal scrolling on small screens.
- Use technique colors consistently: rose for Pomodoro, stone for continuous study, and teal crystal for milestones.
- Do not imply Google sign-in until the backend exposes an OAuth endpoint.
- Do not add classroom sharing, work-block types, or client-side schedule recommendations without a product and API change.
