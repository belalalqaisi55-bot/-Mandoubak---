# Mandoubak (مندوبك) — B2B Wholesale & Fleet Delivery Platform

<div align="center">
  <h3>سوق الجملة المباشر وإدارة مناديب التوزيع والطلبات</h3>
  <p>Modern Android Application built with Jetpack Compose & Material 3</p>
</div>

---

## 📦 Overview

**Mandoubak (مندوبك)** is an enterprise B2B wholesale marketplace and sales representative fleet management application designed for supermarkets, grocery stores, food distributors, and FMCG delivery representatives.

The app bridges wholesale manufacturers/distributors and retail stores, streamlining bulk ordering, tiered volume discounts, route dispatch, commercial invoicing, and cash collection.

---

## ✨ Key Features

### 1. Multi-Persona Workspace
* **Store Owner (صاحب المتجر)**: Browse wholesale cartons, compute retail profit margins, order FMCG stock, track deliveries, and manage supplier credit statements.
* **Sales Representative (مندوب التوزيع)**: View today's delivery drops, navigate store routes, confirm deliveries, collect cash/checks, and log store visit notes.
* **Distributor / Supervisor (مشرف المبيعات)**: Fleet dispatch overview, driver status, inventory health, and commission leaderboards.

### 2. Wholesale Marketplace & Bulk Tier Pricing
* Full catalog across essential FMCG categories: Grains & Rice, Oils & Ghee, Dairy & Cheese, Beverages, Snacks, Detergents, and Canned Goods.
* Carton & unit breakdowns with Minimum Order Quantities (MOQ).
* Automatic bulk tier discounts (e.g., 5+ cartons = 4% off, 15+ cartons = 8% off, 30+ cartons = 12% off).
* Retailer profit margin calculator simulating shelf resale margin per carton.

### 3. Orders Lifecycle & Commercial Invoicing
* End-to-end purchase order pipeline: `Pending` ➔ `Confirmed` ➔ `Dispatched` ➔ `Delivered & Paid`.
* Commercial B2B Tax Invoice modal with itemized carton lines, payment terms, and direct PDF/WhatsApp export.
* Support for multiple commercial payment terms: Cash on Delivery (COD), Net 30-Day Credit, and Digital Wallet.

### 4. Representative Fleet & Route Delivery Tracking
* Daily driver route progression (completed drops vs target).
* Vehicle fleet tracking (cargo vans, 3-ton trucks, refrigerated haulers).
* Cash & check settlement counters per representative.
* Direct in-app driver calling and route check-in history.

### 5. Retail Stores & Credit Ledger
* Store accounts directory with owner contacts, location zones, and scheduled visit days.
* Net-30 credit lines with outstanding balance tracking and visual utilization indicators.
* Log store visits with purpose, cash collected, and restocking notes.

### 6. Analytics & Commission Leaderboard
* Gross wholesale revenue, total cartons moved, and route delivery on-time rate.
* Representative commission leaderboard ranked by verified cash collections.
* Warehouse inventory health indicators.

---

## 🛠️ Technology Stack

* **Platform**: Android (minSdk 26, compileSdk 36, targetSdk 36)
* **Language**: Kotlin 2.2 with built-in AGP 9.1.1 support
* **UI Toolkit**: Jetpack Compose with Material Design 3 (M3)
* **Architecture**: MVVM with Repository pattern and Kotlin Coroutines / `StateFlow`
* **Typography**: Bundled Google Fonts (`Rubik` & `Cairo`) for Latin and Arabic bilingual support
* **Design & Icons**: Custom adaptive launcher icon (`ic_launcher`), Material Symbols Extended, custom distribution hub illustration
