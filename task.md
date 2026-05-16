You are working on Senix, an MCP server that reviews code changes. Step 1 
(shipping brief output and tool rename) is already done and deployed.

WRITING STYLE RULES
Do not use em-dashes or en-dashes. Use commas, periods, or parentheses 
instead. Write complete sentences with normal punctuation. Do not use 
bullet lists with dashes in UI text. Use plain numbered steps. Keep all 
UI copy clear and direct.

CONTEXT YOU NEED
The mcp_tokens table already exists in Supabase with these columns: id 
(uuid), user_id (uuid), name (text), token_hash (text), last_used_at 
(timestamp with time zone), created_at (timestamp with time zone). Do 
not create or migrate this table. Use it as is.

YOUR TASK
This is step 2 of 3. You are building the dashboard onboarding flow that 
lets a user pick their IDE, name and generate a token, copy a config 
snippet, and know they are set up.

WHAT TO BUILD

1. Add a new dashboard page at /dashboard/connect. Title: "Connect your IDE". 
   Subtitle: "Pick your IDE. Copy the config. Restart. You are done."

2. Below the subtitle, show four IDE cards in a 2x2 grid on desktop, 
   stacked on mobile. Each card has the IDE logo (use a simple SVG or 
   text if no logo asset exists), the IDE name, and a "Select" button. 
   The four IDEs are: Cursor, Antigravity, Claude Code, Windsurf.

3. When the user clicks "Select" on an IDE, the page transitions to the 
   setup view for that IDE. Use client-side state, no route change needed. 
   The setup view shows three steps stacked vertically.

   Step 1 box: "Name and generate your token"
   Inside: a text input labeled "Token name" with placeholder text like 
   "My Cursor setup" or "Laptop". Below that, a button labeled "Generate 
   token". When clicked, it calls a new API endpoint POST /api/mcp/token 
   that takes the name in the request body, creates a token tied to the 
   logged-in user, stores the name and hashed token in mcp_tokens, and 
   returns the plain token in the response. If the name field is empty, 
   default to "IDE on [today's date]" in the format "IDE on Nov 16, 2026". 
   The token should look like sk_mcp_xxxxxxxxxxxxxxxx (matching the 
   existing format). Show the token in a read-only input field with a 
   copy button next to it. Show the plain token to the user exactly once 
   on creation. After they navigate away, the token can never be shown 
   again, only revoked.

   Step 2 box: "Copy your config"
   Inside: show the config snippet for the selected IDE. Each IDE has 
   its own snippet format. Substitute the actual token into the snippet. 
   Include a "Copy" button.

   Cursor config (file location: ~/.cursor/mcp.json on macOS or Linux, 
   %APPDATA%\Cursor\mcp.json on Windows):
   {
     "mcpServers": {
       "senix": {
         "url": "https://senix-chi.vercel.app/api/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_TOKEN_HERE"
         }
       }
     }
   }

   Claude Code config (file location: ~/.config/claude/mcp_servers.json):
   Same JSON structure as Cursor.

   Windsurf config (file location: ~/.codeium/windsurf/mcp_config.json):
   Same JSON structure.

   Antigravity config (file location varies, link to their docs):
   Same JSON structure.

   Below each snippet, show the file location in a small monospace label 
   so the user knows where to paste it.

   Step 3 box: "Restart your IDE and test"
   Inside: plain instructions. "Quit and reopen your IDE. Then type in 
   chat: 'Use Senix to review my changes.' If Senix runs, you are connected."

4. Add a small "Need help?" link at the bottom of the page that scrolls 
   to a troubleshooting section with these common mistakes as a plain 
   numbered list (not bullets):
   1. Token pasted without "Bearer " in front of it.
   2. Wrong server name. The server must be called "senix" in the config.
   3. IDE was not fully quit and reopened. Some IDEs need a full restart.
   4. Another MCP server is registered with a similar tool name and is 
      being called instead.
   5. Token was revoked or copied wrong. Generate a new one.

5. Add a "Manage tokens" section under the user's main dashboard (not on 
   /connect, on the main /dashboard page). Show a list of existing tokens 
   for the logged-in user with these columns: name, created_at (formatted 
   as "Created Nov 15, 2026"), last_used_at (formatted as relative time, 
   see point 6), and a "Revoke" button for each row. Revoking deletes the 
   row from mcp_tokens. If the user has no tokens, show an empty state: 
   "You have no MCP tokens yet. Go to Connect your IDE to create one."

6. Add a "last seen" indicator. When the MCP server receives any request 
   with a valid token, update mcp_tokens.last_used_at to the current 
   timestamp. On the dashboard token list, format last_used_at as relative 
   time: "Used 5 minutes ago", "Used 2 hours ago", "Used 3 days ago". If 
   last_used_at is null or has never been set, show "Not yet connected" 
   in a muted color.

WHAT NOT TO CHANGE
Do not modify the MCP tool itself in this step. The shipping brief work 
is done. Do not touch the public landing page in this step. Do not modify 
the existing token authentication logic, only add the UI and the name 
field handling on token creation.

WHEN DONE
Tell me which files you created or changed. Take a screenshot of the 
/dashboard/connect page in its initial state (the 2x2 IDE grid) and 
after selecting Cursor (the three-step setup view) so I can verify the 
layout. Also take a screenshot of the Manage tokens section showing at 
least one existing token.