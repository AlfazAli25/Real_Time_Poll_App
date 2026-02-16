# Real-Time Poll Rooms

This README focuses on:

1. Fairness/anti-abuse mechanisms used in this system
2. Edge cases handled in the current implementation
3. Known limitations and what should be improved next

---

## Fairness / Anti-Abuse Mechanisms

The app uses two core mechanisms.

### 1) Device Token Restriction (Primary)

#### How it is implemented
- The frontend generates a unique device ID and stores it in browser local storage (`realtime_poll_device_id`).
- Vote-related API calls include this value in the `x-device-id` header.
- The backend stores voter records per poll (`deviceId`, `ip`, `optionId`, timestamp).

#### Behavior enforced
- One device can have only **one active vote per poll**.
- If the same device votes a different option, backend moves the vote:
  - decrements previous option
  - increments new option
- If the same device votes the same option again, no duplicate vote is added.
- If the device chooses **Remove Vote**, backend removes the active vote and user can vote again.

#### Why this helps
- Prevents duplicate increments from the same browser/device.
- Supports user correction (change option) without violating one-vote-at-a-time logic.

---

### 2) IP Address Restriction (Secondary)

#### How it is implemented
- Backend extracts IP via `x-forwarded-for` (proxy-safe path) or fallback request IP.
- IP is associated with each voter record.

#### Behavior enforced
- If the same IP tries to vote in the same poll using a **different device token**, backend blocks that vote.

#### Why this helps
- Adds a second anti-abuse barrier when device token is reset.
- Reduces simple multi-device abuse from one network source.

---

## Edge Cases Handled

### Poll Creation

1. **Empty question submission**
  - Frontend validates and backend enforces with HTTP 400.

2. **Less than two valid options**
  - Options are trimmed and empty entries removed.
  - Backend rejects if valid options count is less than 2.

3. **Invalid expiry value**
  - Frontend validates positive number.
  - Backend handles invalid values safely and only sets expiry for valid positive input.

### Poll Fetching / Lifecycle

4. **Voting on non-existing poll**
  - Backend returns 404 and frontend shows poll unavailable state.

5. **Voting after poll deletion**
  - Soft-deleted polls are blocked for vote and remove-vote operations.

6. **Voting after poll expiry**
  - Backend returns 410 (gone/closed).
  - Frontend surfaces closure messaging.

7. **Non-creator trying to delete poll**
  - Backend validates requester `x-device-id` against poll `creatorDeviceId`.
  - If not matched, backend returns 403 (`Only poll creator can delete this poll.`).
  - Frontend also hides **Delete poll** button for non-creators (`canDelete=false`).

### Voting Logic

8. **Duplicate vote attempts**
  - Same device + same option: no additional increment.
  - Same device + different option: vote updated (moved).
  - Different device + same IP: blocked.

9. **Remove vote when user has no vote**
  - Backend returns 404 with explicit message.

10. **Invalid option selection**
  - Backend validates `optionId` against poll options and rejects invalid IDs.

### Realtime and Network

11. **Network disconnection during vote**
   - Frontend catches network errors and shows error feedback.
   - Socket reconnection is enabled.

12. **Joining room for unavailable poll**
   - Socket path validates poll existence/deletion and emits `poll_unavailable`.

13. **Realtime consistency for all viewers**
   - Backend persists vote changes first, then emits `vote_updated` to room.
   - All clients in poll room receive synchronized state.

---

## Known Limitations

1. **Device ID is local-storage based**
  - Users can clear local storage and get a new token.

2. **IP restriction has practical limitations**
  - Shared networks/NAT can falsely block legitimate users.
  - Dynamic mobile IP changes can reduce accuracy.

3. **Ownership model is device-token based (not account-based)**
  - Creator-only delete is implemented, but identity still depends on local-storage device token.
  - If creator clears local storage or changes browser/device, ownership continuity can be lost.

4. **Potential concurrency concerns under heavy load**
  - Vote update logic is app-level; very high parallel traffic benefits from stronger transactional controls.

5. **Embedded voter records can grow large for viral polls**
  - Poll document can become heavy with many voters.

6. **Basic observability only**
  - No advanced telemetry dashboards, tracing, or alerting integrated yet.

---

## What Should Be Improved Next

1. **Add authenticated identity layer**
  - JWT/session or signed anonymous tokens to harden voter identity.

2. **Introduce stronger anti-bot/anti-fraud controls**
  - Challenge/captcha for suspicious traffic.
  - Behavioral risk scoring and abuse analytics.

3. **Use transactional vote mutations in MongoDB**
  - Ensure strict correctness under high concurrency.

4. **Normalize data model for scale**
  - Move voters to dedicated collection with indexes.
  - Keep poll doc lightweight with aggregate counters.

5. **Improve route-level rate limiting**
  - Stricter limits for vote endpoints.
  - Shared store (e.g., Redis) for multi-instance deployments.

6. **Strengthen ownership controls**
  - Move from device-token ownership to authenticated accounts or signed creator tokens.
  - Add creator recovery flow (e.g., signed admin link) to prevent ownership loss after storage reset.

7. **Improve observability and operations**
  - Structured logs, request IDs, error classes, metrics dashboards, uptime alerts.

8. **Add automated tests and CI pipeline**
  - Integration tests for vote switching/removal and socket updates.
  - Deployment checks in CI before release.

---

## Summary

Fairness is currently enforced by:

1. **Device token single-active-vote logic** (with vote update/remove support)
2. **IP-based secondary restriction**

Core functional and realtime edge cases are covered, and the next iteration should focus on stronger identity, concurrency guarantees, scalability, and production observability.

Also, poll deletion is now restricted to the original poll creator (device-token match), and non-creators do not see delete controls in UI.
