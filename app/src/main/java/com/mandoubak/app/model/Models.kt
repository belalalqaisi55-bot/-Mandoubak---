package com.mandoubak.app.model

enum class Persona(val titleEn: String, val titleAr: String, val subtitle: String) {
    STORE_OWNER("Store Owner", "صاحب متجر", "Order wholesale stock & track deliveries"),
    SALES_REP("Sales Rep", "مندوب توزيع", "Daily routes, drop-offs & cash collection"),
    DISTRIBUTOR("Distributor", "مشرف المبيعات", "Fleet oversight, catalog & receivables")
}

enum class ProductCategory(val titleEn: String, val titleAr: String) {
    ALL("All", "الكل"),
    GRAINS_RICE("Rice & Grains", "أرز وبقوليات"),
    OILS_GHEE("Oils & Ghee", "زيوت وسمن"),
    DAIRY_CHEESE("Dairy & Cheese", "ألبان وأجبان"),
    BEVERAGES("Beverages", "مشروبات وعصائر"),
    SNACKS("Snacks & Sweets", "بسكويت وحلويات"),
    DETERGENTS("Cleaning & Paper", "منظفات وورقيات"),
    CANNED("Canned Goods", "معلبات وصلصات")
}

data class BulkDiscountTier(
    val minCartons: Int,
    val discountPercent: Double
)

data class WholesaleProduct(
    val id: String,
    val nameAr: String,
    val nameEn: String,
    val brand: String,
    val category: ProductCategory,
    val packagingSpec: String, // e.g. "Carton 24 x 330ml"
    val unitsPerCarton: Int,
    val cartonPrice: Double, // Price per carton in USD/EGP/SAR
    val unitPrice: Double,
    val stockCartons: Int,
    val minOrderCartons: Int,
    val isDeal: Boolean = false,
    val dealDiscount: Int = 0,
    val tiers: List<BulkDiscountTier> = listOf(
        BulkDiscountTier(5, 4.0),
        BulkDiscountTier(15, 8.0),
        BulkDiscountTier(30, 12.0)
    )
)

data class WholesaleCartItem(
    val product: WholesaleProduct,
    val cartons: Int
) {
    val applicableDiscountPercent: Double
        get() {
            val tier = product.tiers.sortedByDescending { it.minCartons }
                .firstOrNull { cartons >= it.minCartons }
            return (tier?.discountPercent ?: 0.0) + (if (product.isDeal) product.dealDiscount.toDouble() else 0.0)
        }

    val subtotal: Double
        get() = cartons * product.cartonPrice

    val discountAmount: Double
        get() = subtotal * (applicableDiscountPercent / 100.0)

    val finalPrice: Double
        get() = subtotal - discountAmount
}

enum class OrderStatus(val titleEn: String, val titleAr: String) {
    PENDING("Pending Confirmation", "قيد المراجعة"),
    CONFIRMED("Confirmed / Packed", "تم التأكيد والتجهيز"),
    DISPATCHED("Out with Rep", "مع المندوب في الطريق"),
    DELIVERED("Delivered & Paid", "تم التسليم والتحصيل"),
    CANCELLED("Cancelled", "ملغي")
}

enum class PaymentType(val titleEn: String, val titleAr: String) {
    CASH_ON_DELIVERY("Cash on Delivery (COD)", "نقداً عند الاستلام"),
    CREDIT_30_DAYS("Net 30-Day Credit", "آجل 30 يوم"),
    DIGITAL_WALLET("Digital Bank / Wallet", "تحويل إلكتروني / محفظة")
}

data class OrderItemRecord(
    val productId: String,
    val productNameAr: String,
    val productNameEn: String,
    val packagingSpec: String,
    val cartons: Int,
    val unitPrice: Double,
    val cartonPrice: Double,
    val lineTotal: Double
)

data class WholesaleOrder(
    val id: String,
    val invoiceNo: String,
    val storeId: String,
    val storeName: String,
    val storePhone: String,
    val storeAddress: String,
    val items: List<OrderItemRecord>,
    val subtotal: Double,
    val discountAmount: Double,
    val totalAmount: Double,
    val status: OrderStatus,
    val paymentType: PaymentType,
    val assignedRepId: String,
    val assignedRepName: String,
    val dateString: String,
    val timeSlot: String = "Morning (09:00 - 13:00)",
    val notes: String = ""
)

data class RetailStore(
    val id: String,
    val name: String,
    val ownerName: String,
    val phone: String,
    val district: String,
    val address: String,
    val outstandingBalance: Double,
    val creditLimit: Double,
    val visitDay: String,
    val lastVisitedDate: String,
    val totalOrdersCount: Int
)

data class DeliveryRepresentative(
    val id: String,
    val name: String,
    val phone: String,
    val vehiclePlate: String,
    val vehicleType: String, // "Van 2.5T", "Refrigerated Truck"
    val assignedDistrict: String,
    val todayDeliveriesCompleted: Int,
    val todayDeliveriesTotal: Int,
    val cashCollected: Double,
    val cashTarget: Double,
    val isOnline: Boolean = true
)

data class StoreVisitLog(
    val id: String,
    val storeId: String,
    val storeName: String,
    val repName: String,
    val dateString: String,
    val purpose: String,
    val paymentCollected: Double,
    val note: String
)
