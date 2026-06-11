## ADDED Requirements

### Requirement: Typography tokens exist alongside color tokens

`main.scss` SHALL define typography tokens for the recurring text roles — at minimum list-item size, metadata size, clock size, and normal/emphasis font weights — and the playlist and header components SHALL consume them instead of hardcoded font sizes and weights.

#### Scenario: Type scale changes in one place
- **WHEN** a typography token value is changed in `main.scss`
- **THEN** playlist rows and the header clock reflect the change without component edits

#### Scenario: No duplicate font-size declarations
- **WHEN** `PlaylistItem.vue` styles are inspected
- **THEN** each rule declares `font-size` at most once, via a token

### Requirement: Multiple named themes are selectable

The app SHALL offer named themes — at minimum `calm-slate`, `cobalt`, `dark` (classic), and `light` (classic) — each defined as a complete `[data-theme='<id>']` token block in `main.scss`. The active theme SHALL be a per-project setting selectable from a View-menu Theme submenu, with `cobalt` as the default for new projects. Code that needs a light/dark distinction SHALL use a family helper rather than comparing the theme id to `'dark'`.

#### Scenario: Switching theme from the menu
- **WHEN** the user picks a theme in the View → Theme submenu
- **THEN** the workspace restyles immediately, the choice is saved with the project, and the submenu radio reflects it after menu rebuilds

#### Scenario: Legacy projects keep their look
- **WHEN** a project saved with theme mode 'dark' or 'light' is opened
- **THEN** it renders with the classic theme it was saved with

#### Scenario: New project default
- **WHEN** a new project is created
- **THEN** its theme is `cobalt`
