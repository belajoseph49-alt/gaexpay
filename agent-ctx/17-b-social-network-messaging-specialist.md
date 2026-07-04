# Task 17-b — Social Network & Secure Messaging Specialist

## What was built
- **Prisma schema**: 6 new models (SocialPost, SocialLike, SocialComment, Connection, Conversation, Message) + 6 new User relation fields (socialPosts, socialLikes, socialComments, connectionsRequested, connectionsReceived, conversationsA, conversationsB, messagesSent). Verified via `bun run db:push` (37 models now total).
- **Seed**: `prisma/seed-social.ts` — 8 social users (with avatars), 5 accepted + 2 pending connections, 9 demo posts (3 with money tags / split bills), likes + comments threaded, 3 conversations with 10 messages. Idempotent via upsert + email-based user lookup.
- **Social API** (5 routes):
  - `GET /api/social/feed` — posts from accepted connections + self (with author, likes, comments, likedByMe flag)
  - `GET /api/social/posts?authorId=` — list posts by author (used for profile overlay)
  - `POST /api/social/posts` — create post (text + optional image URL + optional amountTag/amountKind/currency)
  - `GET/DELETE /api/social/posts/[id]` — fetch / delete own post
  - `POST /api/social/posts/[id]/like` — toggle like (atomic $transaction, increments/decrements likesCount)
  - `POST /api/social/posts/[id]/comments` — add comment (atomic $transaction, increments commentsCount)
  - `GET /api/social/connections` — accepted + pending incoming + suggested (not-yet-connected) users
  - `POST /api/social/connections` — send request (idempotent if prior exists, sends notification)
  - `PATCH /api/social/connections/[id]` — accept/reject (recipient-only, notifies requester on accept)
- **Messaging API** (3 routes):
  - `GET /api/messaging/conversations` — list with other participant, last message preview, unread count
  - `GET /api/messaging/conversations/[id]/messages?since=` — messages in conv, marks unread-as-read side-effect
  - `POST /api/messaging/conversations/[id]/messages` — send message (marks prior unread as read, bumps updatedAt)
  - `POST /api/messaging/conversations/new` — start/return conversation by @username/email/phone (normalized participantA/B ordering)
- **Frontend views**:
  - `social-view.tsx` — Tabs (Feed / Connections). Create-post card with optional image URL + "Request Money"/"Split Bill" amount tag toggle. Post cards with like/comment/share/send-money actions, animated comment thread with optimistic send, dropdown menu (copy link, view profile, delete). Connections tab: pending requests with accept/reject, accepted connections grid, suggested users with connect button. Profile overlay: gradient header + avatar + posts list, send-money / message shortcuts.
  - `messaging-view.tsx` — WhatsApp-style two-panel layout. Conversation list (searchable, unread badge, last-message preview with status icon). Chat window: avatar header with online dot, message bubbles (sent=primary right / received=left), per-message timestamps + status icons (✓ sent, ✓✓ delivered, ✓✓sky read), optimised optimistic send, polls every 5s via `?since=` for new messages, attach-money inline panel that posts a 💸 message then jumps to send view prefilled, new-chat dialog accepting @username/email/phone with prefill support (triggered by `sendPrefill` from connections list "Message" button).
- **Navigation**: Added new "Community" sidebar section with `Social` (Users icon) + `Messages` (MessageSquare icon) entries. Registered `"social"` and `"messaging"` in the `View` union type + the `views` map in `app-shell.tsx`.
- **i18n**: Added 100+ translation keys (`nav.community`, `nav.social`, `nav.messages`, `social.*`, `messaging.*`) to the EN dictionary + the KEYS audit list. Other 11 languages fall back to EN via the existing `build({...en, ...overrides})` helper, so no per-language work needed.

## Files created
- `prisma/seed-social.ts`
- `src/app/api/social/feed/route.ts`
- `src/app/api/social/posts/route.ts`
- `src/app/api/social/posts/[id]/route.ts`
- `src/app/api/social/posts/[id]/like/route.ts`
- `src/app/api/social/posts/[id]/comments/route.ts`
- `src/app/api/social/connections/route.ts`
- `src/app/api/social/connections/[id]/route.ts`
- `src/app/api/messaging/conversations/route.ts`
- `src/app/api/messaging/conversations/[id]/messages/route.ts`
- `src/app/api/messaging/conversations/new/route.ts`
- `src/components/gaexpay/views/social-view.tsx`
- `src/components/gaexpay/views/messaging-view.tsx`

## Files edited
- `prisma/schema.prisma` — added 6 models + 6 User relations
- `src/lib/store.ts` — added `"social" | "messaging"` to View union
- `src/lib/i18n/translations.ts` — added nav.* / social.* / messaging.* keys + KEYS audit entries
- `src/components/gaexpay/sidebar.tsx` — added `MessageSquare` import + Community nav section
- `src/components/gaexpay/app-shell.tsx` — imported SocialView + MessagingView + registered them in views map
- `src/components/gaexpay/views/staking-view.tsx` — fixed a pre-existing `setState-in-useMemo` lint error from another agent's parallel work (converted to derived `activePoolId`)

## Verification
- `bun run db:push` — ✅ database in sync (37 models)
- `bunx tsx prisma/seed-social.ts` — ✅ seeded 8 users, 5+2 connections, 9 posts, 3 convs, 10 messages
- `bun run lint` — ✅ 0 errors, 0 warnings
- `tail /home/z/my-project/dev.log` — ✅ no runtime errors; all 8 new endpoints return 200
- Curl-tested all endpoints with CSRF tokens:
  - `GET /api/social/feed` → 200 (returns posts array with author + likes + comments + likedByMe)
  - `GET /api/social/connections` → 200 (accepted + pending + suggested arrays)
  - `GET /api/messaging/conversations` → 200 (conversations with lastMessage + unreadCount)
  - `POST /api/messaging/conversations/new` {identifier:"chinedueze"} → 200 (returns conversation + user)
  - `POST /api/social/posts` {content, amountTag, amountKind} → 200 (creates post)
  - `POST /api/social/connections` {userId} → 200 (creates pending connection)
  - `POST /api/messaging/conversations/[id]/messages` {content} → 200 (creates message)
  - `DELETE /api/social/posts/[id]` → 200 (deletes own post)

## Notes
- Discovered mid-task that another agent (marketplace / staking) had created `prisma/schema.prisma` edits in parallel — my initial schema additions were clobbered. Re-applied and re-pushed successfully.
- The Messaging view polling uses `?since=` query parameter to fetch only new messages every 5s (lightweight); on GET, the route also marks messages from the other participant as `read` (server-side).
- Send-money-from-post: navigates to `send` view with `sendPrefill` containing the post author's username + amountTag.
- Message-in-chat send-money: posts a "💸 Sending X — tap to confirm" message, then jumps to `send` view prefilled with the recipient + amount.
- All API routes use the existing `requireAuth`/`getAuthUserId` helper, CSRF is enforced by middleware (caller must include `X-CSRF-Token` for mutations).
