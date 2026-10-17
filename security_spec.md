# Security Specification & Threat Model (Security TDD)

## 1. Core Data Invariants
- **Identity Integrity**: No user may write, update, or claim resources belonging to another user. The `clientId` or user profile `id` fields in incoming data must strictly match `request.auth.uid`.
- **Role Authority**: Only users with the validated role of `rep` (Representative) can add, modify, or delete products in the catalog.
- **Order State Machine**:
  - Orders are created exclusively with a `pending` status.
  - Clients can only cancel their own pending or approved orders.
  - Only representatives (`rep` role) can transitions orders to `approved` or `completed` states.
- **Stock Tracking Constraints**: Stock counts must be non-negative integers.

---

## 2. The "Dirty Dozen" Threat Payloads

### Payload 1: Privilege Escalation (Self-Promoting Representative)
- **Target Collection**: `/users/attacker_uid`
- **Intent**: A standard user tries to register or update their own profile with `role: "rep"` to gain sales representative dashboard access.
- **Malicious Payload**:
  ```json
  {
    "id": "attacker_uid",
    "phone": "+967770000001",
    "name": "Attacker Hack",
    "role": "rep"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Representative role registration is blocked/restricted to manual setup or admin bootstrapping).

### Payload 2: Impersonation / Identity Hijacking (Forging Client ID)
- **Target Collection**: `/orders/malicious_order`
- **Intent**: Attacker attempts to place an order but set the `clientId` to a victim's `victim_uid` to charge them.
- **Malicious Payload**:
  ```json
  {
    "id": "malicious_order",
    "clientId": "victim_uid",
    "clientName": "Victim Pharmacy",
    "items": [{"productId": "p1", "productName": "Medicine", "quantity": 10}],
    "status": "pending",
    "createdAt": "2026-07-19T10:54:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Mismatch between authenticated `request.auth.uid` and resource `clientId`).

### Payload 3: State Transition Bypass (Bypassing Pending Stage)
- **Target Collection**: `/orders/order_direct_completed`
- **Intent**: Pharmacy creates a new order but sets the state directly to `completed` or `approved` to force delivery without rep approval.
- **Malicious Payload**:
  ```json
  {
    "id": "order_direct_completed",
    "clientId": "attacker_uid",
    "items": [{"productId": "p1", "productName": "Medicine", "quantity": 5}],
    "status": "completed",
    "createdAt": "2026-07-19T10:54:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Order creations must start with `pending`).

### Payload 4: Catalog Sabotage (Unauthorized Product Deletion)
- **Target Collection**: `/products/p1`
- **Intent**: A standard pharmacy or clinic customer attempts to delete an active product from the catalog.
- **Malicious Payload**: `DELETE` request to `/products/p1`
- **Expectation**: `PERMISSION_DENIED` (Standard customer accounts cannot perform delete operations on products).

### Payload 5: Catalog Injection (Fake Product Creation)
- **Target Collection**: `/products/p_hacked`
- **Intent**: Standard customer tries to write a fake product with an exorbitant or zero price.
- **Malicious Payload**:
  ```json
  {
    "id": "p_hacked",
    "name": "Fake Water Medicine",
    "price": "0 YER",
    "unit": "علبة"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Product catalog writes restricted exclusively to reps).

### Payload 6: Resource Exhaustion / Wallet Denial (Junk Data Injection)
- **Target Collection**: `/users/attacker_uid`
- **Intent**: Attacker uploads a 2MB garbage string as their location or name to bloat storage fees.
- **Malicious Payload**:
  ```json
  {
    "id": "attacker_uid",
    "phone": "+967770000001",
    "name": "A...", // 100KB string
    "role": "pharmacy",
    "entityName": "B...", // 100KB string
    "location": "C..." // 1.5MB string
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Strict field length validations block strings exceeding size limits).

### Payload 7: Inventory Fraud (Negative Stock Reporting)
- **Target Collection**: `/stockReports/st_hacked`
- **Intent**: Attacker reports remaining stock as a negative number (`-999`) to corrupt analytics.
- **Malicious Payload**:
  ```json
  {
    "id": "st_hacked",
    "clientId": "attacker_uid",
    "productId": "p2",
    "remainingQty": -999,
    "reportedAt": "2026-07-19T10:54:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (`remainingQty` must be `>= 0`).

### Payload 8: Chrono-Tampering (Spoofing Timestamp)
- **Target Collection**: `/orders/order_forged_time`
- **Intent**: Attacker sets `createdAt` to 10 years in the past or future.
- **Malicious Payload**:
  ```json
  {
    "id": "order_forged_time",
    "clientId": "attacker_uid",
    "items": [{"productId": "p1", "productName": "Medicine", "quantity": 1}],
    "status": "pending",
    "createdAt": "1999-01-01T00:00:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (`createdAt` must match `request.time`).

### Payload 9: Self-Approval of Orders (State Modification Hack)
- **Target Collection**: `/orders/ord_123`
- **Intent**: Pharmacy customer attempts to change status of their order from `pending` to `approved` to force fulfillment.
- **Malicious Payload**:
  ```json
  {
    "status": "approved"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (State changes of orders are restricted to reps, or restricted keys filter out `status` updates for standard users).

### Payload 10: ID Poisoning Attack (Malformed Path variable)
- **Target Collection**: `/users/attacker_uid$$$!!!`
- **Intent**: Attempting to register with special SQL-injection-like characters or excessively long strings as document IDs.
- **Expectation**: `PERMISSION_DENIED` (Document ID fails `isValidId()` regex validator).

### Payload 11: Inventory Hijack (Overwriting Competitor's Stock)
- **Target Collection**: `/stockReports/st_competitor`
- **Intent**: Client pharmacy tries to modify the stock levels of a rival pharmacy.
- **Malicious Payload**:
  ```json
  {
    "id": "st_competitor",
    "clientId": "rival_uid",
    "productId": "p1",
    "remainingQty": 0,
    "reportedAt": "2026-07-19T10:54:00Z"
  }
  ```
- **Expectation**: `PERMISSION_DENIED` (Standard user cannot edit reports where `existing().clientId` or `incoming().clientId` does not equal `request.auth.uid`).

### Payload 12: Order List Eavesdropping (Unrestricted Collection Listing)
- **Target Collection**: `/orders` (Get collection listing)
- **Intent**: A standard customer queries `/orders` without a query filter to scrape other pharmacies' orders.
- **Expectation**: `PERMISSION_DENIED` (Queries without filtering by `clientId == request.auth.uid` are blocked inside rule definitions).

---

## 3. Test Runner Design
Validation of these security behaviors will be performed using standard test definitions or manual red-team review mapping. The core assertions in `firestore.rules` will be:
- `auth != null` is evaluated first.
- Every create/update uses `isValid[Entity]()` checks.
- Updates use `affectedKeys().hasOnly()` actions.
