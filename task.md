You are working on Senix, a developer tool dashboard built with Next.js 
and Tailwind CSS. The dashboard currently works correctly. You are not 
changing any functionality, data fetching, API calls, or business logic. 
This is a pure UI and design upgrade.

WRITING STYLE RULES
Do not use em-dashes or en-dashes. Use commas, periods, or parentheses 
instead. Write complete sentences with normal punctuation. Do not use 
bullet lists with dashes in UI copy. Keep all UI text clear and direct.

REFERENCE FEEL (do not copy colors, copy the feeling)
Study how Linear, Vercel dashboard, and Resend approach their dashboards:
tight typographic hierarchy, generous whitespace, a persistent left 
sidebar with icon-labeled sections, muted secondary text, subtle card 
depth, and primary actions that are weighted without being loud. That 
is the standard to match.

DESIGN TOKENS
Define these as Tailwind CSS variables or a constants file and use them 
consistently everywhere. Do not hardcode colors inline.

Background layers (darkest to lightest):
- base: #0a0a0a (page background)
- surface: #111111 (cards, panels)
- surface-raised: #1a1a1a (hover states, code blocks, input backgrounds)
- surface-border: #222222 (card borders, dividers)

Text:
- text-primary: #f0f0f0 (headings, primary labels)
- text-secondary: #888888 (meta text, timestamps, subtitles)
- text-muted: #555555 (placeholder text, disabled states)

Accent (use sparingly, only for the Senix brand and one primary CTA per page):
- accent: #16a34a (the existing Senix green, keep it but use it less)
- accent-hover: #15803d
- accent-subtle: #16a34a1a (10 percent opacity green for badge backgrounds)

Neutral actions (buttons that are not the primary CTA):
- neutral-button-bg: #1a1a1a
- neutral-button-border: #333333
- neutral-button-hover: #222222

Risk colors (keep these, just refine the shading):
- risk-high: #dc2626 text on #dc26261a background
- risk-medium: #d97706 text on #d977061a background
- risk-low: #16a34a text on #16a34a1a background

LAYOUT: REPLACE THE TOP NAV WITH A LEFT SIDEBAR

Remove the current top navigation bar inside the dashboard layout 
(Dashboard, Connect IDE links). Replace it with a fixed left sidebar 
that is 240px wide on desktop and collapses to a slide-in drawer on 
mobile (toggle with a hamburger icon in a slim top bar on mobile).

The sidebar contains from top to bottom:

1. Logo section (top, 64px tall): the Senix logo and wordmark, same 
   as currently used. Below it, a thin border separator.

2. Navigation section: icon plus label for each item. Use lucide-react 
   icons. Items in order:
   - LayoutDashboard icon, label "Overview", links to /dashboard
   - GitPullRequest icon, label "Reviews", links to /dashboard/reviews 
     (this page does not exist yet, just add the nav item pointing there, 
     show a "Coming soon" placeholder if visited)
   - Plug icon, label "Connect IDE", links to /dashboard/connect
   - Key icon, label "Tokens", links to /dashboard/tokens (move the 
     manage tokens section to its own page at this route, remove it 
     from the main dashboard page)
   - BookOpen icon, label "Docs", links to /docs/troubleshooting, 
     opens in a new tab

3. Bottom section (pinned to bottom of sidebar): 
   - User avatar (existing avatar component), username, and a small 
     caret or settings icon
   - Below that: a "Feedback" link with MessageSquare icon
   - Below that: a "Sign out" link with LogOut icon

Active state: the current page nav item has a white text label, 
accent-colored left border (2px solid accent), and surface-raised 
background. Inactive items have text-secondary labels that brighten 
to text-primary on hover with surface-raised background. Transition 
all hover states with duration-150.

The main content area sits to the right of the sidebar. On desktop it 
has a left margin of 240px. Add 32px padding on all sides of the 
content area. Do not add a second top nav bar inside the dashboard. 
The sidebar is the only navigation.

MAIN DASHBOARD PAGE (/dashboard)

Remove: the "DASHBOARD" eyebrow label above the heading.

Heading: keep "Your reviews at a glance" but increase to text-3xl 
font-semibold text-primary. Below it show "3 repos connected, 3 
analyses this week" in text-secondary text-sm. Add 8px gap between 
heading and meta line.

Add a stats row below the heading with 32px top margin. Three stat 
cards in a row (on mobile stack to one column). Each card is a surface 
background, surface-border border, rounded-xl, 24px padding. Contents:
- Card 1: "Total reviews" with the count in text-2xl font-bold 
  text-primary, label in text-secondary text-xs uppercase tracking-wider
- Card 2: "This week" same treatment
- Card 3: "Repos connected" same treatment
Do not add any icons to these cards. Numbers speak for themselves.

Recent analyses section:
- Section heading "Recent analyses" in text-lg font-semibold 
  text-primary, 32px top margin
- Keep the Risk and Sort filter dropdowns but restyle them: surface-raised 
  background, surface-border border, text-secondary text, rounded-lg, 
  no default browser arrow, use a ChevronDown icon from lucide-react
- Analysis cards: surface background, surface-border border, rounded-xl, 
  24px padding, no bullet point (remove the bullet). On hover, border 
  color transitions to #333333 and background to surface-raised. 
  Transition duration-150.
- Inside each card: repo name and PR number in text-secondary text-sm 
  at the top. PR title in text-primary font-semibold text-base below 
  it with 4px gap. Summary text in text-secondary text-sm with 8px 
  top margin, clamped to 2 lines with line-clamp-2. Bottom row: 
  timestamp on the left in text-muted text-xs, "View on GitHub" and 
  "Details" buttons on the right.
- Risk badge: pill shaped, rounded-full, text-xs font-medium, 
  uppercase tracking-wider. Use the risk colors defined above. 
  Position it in the top right of the card, not inline with the title. 
  It should float to the top-right corner of the card using absolute 
  positioning or flex justify-between on the top row.
- "View on GitHub" button: neutral-button style (surface-raised 
  background, surface-border border), text-secondary text, text-sm, 
  rounded-lg, 8px horizontal padding, 6px vertical padding. On hover 
  text brightens to text-primary.
- "Details" button: same neutral-button style but with a slightly 
  brighter border on hover. Do not use accent green for this button.

Empty state for analyses: replace the current text-only card with a 
centered empty state. Icon: GitPullRequest from lucide-react in 
text-muted, size 32px. Below it: "No reviews yet" in text-primary 
text-sm font-medium. Below that: "Open a pull request in a connected 
repo and Senix will review it within 30 seconds." in text-secondary 
text-sm text-center, max-w-xs. No card border around the empty state, 
just centered content with 48px vertical padding.

Connected repos section:
- Remove this section from the main dashboard entirely. It was just 
  an empty state taking up space. The sidebar "Overview" page can 
  note repos connected in the stat card. If a user needs to manage 
  repos they go to GitHub App settings.

Manage tokens section:
- Remove from the main dashboard page. Move to /dashboard/tokens 
  (its own page linked from the sidebar "Tokens" nav item).
- On /dashboard/tokens: heading "MCP Tokens" text-2xl font-semibold. 
  Subtitle "Tokens let your IDE connect to Senix." in text-secondary.
  Below: a "Generate token" button in neutral-button style (not accent 
  green). The token generation flow stays identical to what was built 
  in step 2, just restyled.
- Token list: each token is a surface card, surface-border border, 
  rounded-xl, 20px padding. Token name in text-primary font-medium. 
  Below it: "Created [date]" and "Last used [relative time]" in 
  text-secondary text-xs side by side with a dot separator. Revoke 
  button: text-only, text-muted, text-xs, on hover text becomes 
  #dc2626 (red). No background on the revoke button, it should feel 
  like a quiet destructive action, not a loud one.
- Empty state: "No tokens yet. Generate one to connect your IDE." 
  centered, text-secondary, with a "Generate token" button below it 
  in neutral-button style.

CONNECT IDE PAGE (/dashboard/connect)

Remove the left installations panel that currently shows "Senix-Org, 
3 repos." That information belongs in the sidebar, not as a panel on 
this specific page.

IDE grid: keep the 2x2 grid but restyle the cards completely.
- Each card: surface background, surface-border border, rounded-xl, 
  24px padding, flex row with items-center gap-4.
- IDE logo area: 40px by 40px rounded-lg surface-raised background, 
  flex items-center justify-center. Show the IDE initials in 
  text-primary font-mono text-sm font-bold (Cu, Ag, CC, Ws).
- IDE name: text-primary font-medium text-base, flex-1.
- Select button: neutral-button style. Do NOT use accent green for 
  this button. It is not the primary action on the page. text-sm, 
  rounded-lg, border surface-border, background surface-raised, 
  text-primary. On hover border brightens to #444444.
- On hover of the entire card: border color goes to #333333, 
  background to surface-raised. Cursor pointer. Transition duration-150.

After selecting an IDE, the three-step setup view:
- Step number circles: change from bright green filled circles to 
  simple outlined circles. Border surface-border, text text-secondary, 
  font-mono text-sm. When a step is completed (token generated), 
  the circle gets a checkmark icon (Check from lucide-react) in 
  accent color and the border becomes accent color. Not filled, 
  just the border and icon in accent.
- Step cards: surface background, surface-border border, rounded-xl, 
  24px padding, 16px gap between cards.
- Step heading: text-primary font-semibold text-base.
- Step body text: text-secondary text-sm, line-height relaxed.
- "Generate token" button: this is the ONE place on the connect page 
  where accent green is appropriate because it is the primary action. 
  Use accent background, white text, rounded-lg, font-medium text-sm, 
  12px horizontal padding, 8px vertical padding. On hover accent-hover 
  background. Add a subtle scale-95 active state.
- Token display input: surface-raised background, surface-border 
  border, rounded-lg, font-mono text-sm text-primary, 12px padding. 
  Read-only. Copy button beside it: neutral-button style with a 
  Copy icon from lucide-react, switches to a Check icon for 2 seconds 
  after copying with a smooth opacity transition.
- Code block (config snippet): surface-raised background, rounded-lg, 
  16px padding, font-mono text-xs text-secondary, leading-relaxed. 
  Line numbers optional but clean. Copy button top-right corner of 
  the block.
- File path label below the code block: text-muted text-xs font-mono.
- "Need help?" link: move it to just below the step cards. Style it 
  as text-secondary text-sm with an ExternalLink icon from lucide-react 
  inline. On click it opens /docs/troubleshooting in a new tab 
  (target="_blank" rel="noopener noreferrer"). Do not scroll to an 
  inline section. Remove the inline troubleshooting section from this 
  page entirely. The docs page handles that.
- Breadcrumb ("Choose a different IDE / Cursor"): keep it but restyle. 
  text-secondary text-sm, the back arrow as ChevronLeft icon, 
  separator as a text-muted slash. On hover the back link text 
  brightens to text-primary.

MOTION AND TRANSITIONS

Add these animations. Use Tailwind's built-in transition utilities 
where possible. For anything more complex use CSS keyframes defined 
in globals.css or a motion library only if it is already in the 
project dependencies. Do not add framer-motion or any new animation 
library.

1. Page content fade-in: wrap the main content area in a div with 
   animate-in fade-in duration-300 (Tailwind animate-in is available 
   via tailwindcss-animate, check if it is already installed before 
   using it; if not, use a simple CSS keyframe instead).

2. Card hover lift: all surface cards get transition-all duration-150 
   on hover with the border color change described above. No transform 
   or scale, just the color transition. Keep it subtle.

3. IDE selection transition: when the user clicks "Select" on an IDE 
   card, the grid fades out and the three-step setup view fades in. 
   Use opacity and a slight translateY (8px down to 0) on the incoming 
   view. Duration 200ms. This replaces the current instant swap.

4. Copy button feedback: when the user clicks a copy button, the icon 
   switches from Copy to Check with a 150ms opacity crossfade. After 
   2000ms it fades back to Copy.

5. Step completion: when the token is generated and step 1 is complete, 
   the step circle animates from outlined to the accent-colored check 
   state with a 300ms ease-out transition on the border-color and 
   color properties.

6. Sidebar active indicator: the 2px left border on the active nav 
   item slides in from opacity 0 to opacity 1 on page load with a 
   200ms ease-out. On navigation change it transitions smoothly.

SMALL DETAILS THAT MATTER

1. "Need help?" now opens in a new tab everywhere it appears. Remove 
   every instance of it scrolling to an inline section.

2. All timestamps use relative time ("4 days ago", "just now") with a 
   title attribute containing the full ISO date so hovering shows the 
   exact time.

3. The user avatar in the sidebar bottom section: if the user has a 
   GitHub avatar, show it in a 32px circle with a 1px surface-border 
   ring. If no avatar, show their initials in a surface-raised circle 
   with text-secondary text.

4. Risk badges: the text inside is always uppercase and letter-spaced. 
   HIGH in red, MEDIUM in amber, LOW in green. UNKNOWN or missing risk 
   in text-muted on surface-raised background.

5. The "Details" button on analysis cards has a ChevronRight icon 
   after the text, not an arrow. It should feel like a quiet action.

6. Scrollbars in the dashboard: add custom scrollbar styling in 
   globals.css. Thin (4px), surface-raised color track, surface-border 
   color thumb, rounded. Only visible on hover of the scrollable area.

7. Focus states: all interactive elements must have a visible focus 
   ring for keyboard navigation. Use outline-2 outline-offset-2 
   outline-accent on focus-visible. Do not remove focus styles.

8. The Senix logo in the sidebar: add a 1px surface-border bottom 
   border under the logo section to visually separate it from the nav.

WHAT NOT TO CHANGE

Do not change any API routes, data fetching logic, authentication 
flows, token generation logic, or MCP server code. Do not change the 
playground page in this task. Do not change the public landing page. 
Do not add any new npm packages except checking if tailwindcss-animate 
is already present before using it. Do not change the docs pages. Do 
not change any Supabase queries.

WHEN DONE

Tell me every file you changed. Take a screenshot or describe the 
visual state of:
1. The main /dashboard page with the new sidebar
2. The /dashboard/connect IDE grid
3. The three-step setup view after selecting Cursor
4. The /dashboard/tokens page

If you cannot screenshot, describe what each page looks like in 
enough detail that I can verify it matches this spec without guessing.