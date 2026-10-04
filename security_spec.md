# Security Specification & Test Suite

## 1. Data Invariants
1. **Consent & Transparency**: Location tracking must be initiated with explicit consent flags. A session cannot be forged with arbitrary identities or updated without ownership or recipient token.
2. **Identity Integrity**: `creatorId` on create must equal `request.auth.uid`. A user cannot forge sessions under other users' accounts.
3. **Data Boundary**: Phone numbers, addresses, and GPS coordinates must adhere to string length and numeric boundaries.
4. **State Transitions**: Sessions progress through `pending_consent`, `sharing_active`, `sharing_stopped`, and `sos_active`.
5. **Emergency SOS Protection**: SOS state changes must be preserved and cannot be silenced by unauthorized actors.
6. **PII Protection**: Emergency contacts under `/users/{userId}/emergency_contacts/{contactId}` must strictly be readable and writable only by the authenticated owner `{userId}`.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Spoofed Creator ID**: Attempting to create a session where `creatorId != request.auth.uid`.
2. **Missing Consent Requirement**: Attempting to write a session without the required `status` and `targetPhoneNumber`.
3. **Ghost Fields Injection**: Attempting to inject administrative privilege fields `isAdmin: true` into a location session.
4. **ID Poisoning Attack**: Attempting to write to a session ID containing invalid special characters or oversized strings (>128 chars).
5. **Unauthenticated Contact Read**: Unauthenticated attempt to read `/users/{victimId}/emergency_contacts`.
6. **Foreign Contact Manipulation**: Authenticated user A attempting to update or delete emergency contacts of user B.
7. **Oversized Address Denial of Wallet**: Injecting 500KB string into `address` field.
8. **Invalid Status Enum**: Writing a session with status `admin_bypass` or non-standard states.
9. **Coordinate Range Violation**: Attempting to update `currentLat` with string instead of numeric coordinate.
10. **Tampered Creator ID Update**: Attempting to mutate `creatorId` during an update.
11. **Negative Battery Level**: Setting invalid battery percentage or arbitrary types.
12. **Blanket Query Scraping**: Attempting an unrestricted collection query without filtering by relevant session or owner.
