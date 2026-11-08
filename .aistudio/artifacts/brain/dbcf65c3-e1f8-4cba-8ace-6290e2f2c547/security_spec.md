# Security Specification: Mandoubak Med Firestore

## 1. Data Invariants
- Users: Each user can only read/update their own profile. Admin/Rep can read all.
- Orders/StockReports: Clients can read their own. Admin/Rep can read all.
- Products/Settings/Notifications: Public read, Admin/Rep write.
- TrashArchive/KeepNotes: Admin/Rep only.

## 2. The "Dirty Dozen" Payloads (Examples to deny)
1. { "role": "admin" } (Client trying to escalate privilege)
2. { "ownerId": "other_user_id" } (Client trying to hijack ownership)
3. { "status": "approved" } (Client trying to self-approve)
4. { "id": "a".repeat(200) } (ID Poisoning)
5. { "createdAt": "2020-01-01" } (Timestamp Spoofing)
6. { "ghostField": true } (Shadow Update)
7. { "orderItems": "invalid_type" } (Schema Violation)
8. { "message": "a".repeat(5000) } (Denial of Wallet / Payload size)
9. { "email": "admin@example.com" } (Email spoofing in write)
10. { "price": "free" } (Value poisoning / Type mismatch)
11. { "orders": [] } (Injecting array where not allowed)
12. { "isArchived": false } (State shortcutting on terminal state)

## 3. Test Runner (firestore.rules.test.ts structure)
```typescript
// Conceptual test runner structure
test("Dirty Dozen Payloads must be denied", async () => {
  const alice = authedApp({ uid: "alice" });
  await assertFails(alice.setDoc(doc(db, "users", "bob"), { ...payloads[0] }));
  // ... rest of the dozen
});
```
