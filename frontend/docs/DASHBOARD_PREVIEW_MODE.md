# Dashboard Preview Mode (Dev Only)

The dashboard can now be rendered without logging into Cognito so that designers and developers can validate layout and UX work in isolation. This mode is only available while running the Vite dev server (`npm run dev`).

## Enabling preview mode

1. Start the frontend locally: `npm run dev`.
2. Open any dashboard URL in the same tab and append one of the flags below:
   - `?dashboardPreview`
   - `?preview=dashboard`

Example: <http://localhost:5173/dashboard?dashboardPreview>

When the flag is detected the guard that normally enforces authentication is bypassed and the dashboard renders immediately.

## Turning preview mode off

Append one of the following to any dashboard URL to disable the feature in the current tab:

- `?dashboardPreview=off`
- `?preview=off`

The preference is stored in `sessionStorage`, so the override persists while the browser tab stays open. Close the tab (or disable it explicitly) to return to the normal authentication flow.

## Notes

- Preview mode is ignored in production builds; it only activates when `import.meta.env.DEV` is true.
- Because no Cognito session is created, data that normally depends on an authenticated user may appear empty or with placeholder values. This is expected for layout-only validation.
- A `data-dashboard-preview="true"` attribute is added to the `<body>` tag while preview mode is active. This can be used for optional dev-only styling cues.
