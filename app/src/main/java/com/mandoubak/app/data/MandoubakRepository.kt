package com.mandoubak.app.data

import com.mandoubak.app.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

class MandoubakRepository {

    private val _products = MutableStateFlow<List<WholesaleProduct>>(sampleProducts)
    val products: StateFlow<List<WholesaleProduct>> = _products.asStateFlow()

    private val _stores = MutableStateFlow<List<RetailStore>>(sampleStores)
    val stores: StateFlow<List<RetailStore>> = _stores.asStateFlow()

    private val _representatives = MutableStateFlow<List<DeliveryRepresentative>>(sampleReps)
    val representatives: StateFlow<List<DeliveryRepresentative>> = _representatives.asStateFlow()

    private val _orders = MutableStateFlow<List<WholesaleOrder>>(sampleOrders)
    val orders: StateFlow<List<WholesaleOrder>> = _orders.asStateFlow()

    private val _cartItems = MutableStateFlow<List<WholesaleCartItem>>(emptyList())
    val cartItems: StateFlow<List<WholesaleCartItem>> = _cartItems.asStateFlow()

    private val _visitLogs = MutableStateFlow<List<StoreVisitLog>>(sampleVisits)
    val visitLogs: StateFlow<List<StoreVisitLog>> = _visitLogs.asStateFlow()

    fun addToCart(product: WholesaleProduct, cartons: Int) {
        val current = _cartItems.value.toMutableList()
        val existingIndex = current.indexOfFirst { it.product.id == product.id }
        if (existingIndex >= 0) {
            val existing = current[existingIndex]
            current[existingIndex] = existing.copy(cartons = existing.cartons + cartons)
        } else {
            current.add(WholesaleCartItem(product, cartons))
        }
        _cartItems.value = current
    }

    fun updateCartQuantity(productId: String, cartons: Int) {
        if (cartons <= 0) {
            removeFromCart(productId)
            return
        }
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst { it.product.id == productId }
        if (index >= 0) {
            current[index] = current[index].copy(cartons = cartons)
            _cartItems.value = current
        }
    }

    fun removeFromCart(productId: String) {
        _cartItems.value = _cartItems.value.filterNot { it.product.id == productId }
    }

    fun clearCart() {
        _cartItems.value = emptyList()
    }

    fun placeOrder(
        store: RetailStore,
        paymentType: PaymentType,
        notes: String
    ): WholesaleOrder {
        val currentCart = _cartItems.value
        val itemsRecord = currentCart.map { item ->
            OrderItemRecord(
                productId = item.product.id,
                productNameAr = item.product.nameAr,
                productNameEn = item.product.nameEn,
                packagingSpec = item.product.packagingSpec,
                cartons = item.cartons,
                unitPrice = item.product.unitPrice,
                cartonPrice = item.product.cartonPrice,
                lineTotal = item.finalPrice
            )
        }

        val subtotal = currentCart.sumOf { it.subtotal }
        val discount = currentCart.sumOf { it.discountAmount }
        val total = subtotal - discount

        val assignedRep = _representatives.value.firstOrNull { it.assignedDistrict == store.district }
            ?: _representatives.value.first()

        val invoiceNumber = "INV-2026-${(1000..9999).random()}"
        val newOrder = WholesaleOrder(
            id = UUID.randomUUID().toString(),
            invoiceNo = invoiceNumber,
            storeId = store.id,
            storeName = store.name,
            storePhone = store.phone,
            storeAddress = "${store.district}, ${store.address}",
            items = itemsRecord,
            subtotal = subtotal,
            discountAmount = discount,
            totalAmount = total,
            status = OrderStatus.CONFIRMED,
            paymentType = paymentType,
            assignedRepId = assignedRep.id,
            assignedRepName = assignedRep.name,
            dateString = "Today, Oct 16",
            timeSlot = "Today (Next Drop-off)",
            notes = notes
        )

        _orders.value = listOf(newOrder) + _orders.value
        clearCart()

        // Update store balance if credit
        if (paymentType == PaymentType.CREDIT_30_DAYS) {
            _stores.value = _stores.value.map {
                if (it.id == store.id) it.copy(
                    outstandingBalance = it.outstandingBalance + total,
                    totalOrdersCount = it.totalOrdersCount + 1
                ) else it
            }
        }
        return newOrder
    }

    fun updateOrderStatus(orderId: String, newStatus: OrderStatus) {
        _orders.value = _orders.value.map { order ->
            if (order.id == orderId) {
                order.copy(status = newStatus)
            } else {
                order
            }
        }
    }

    fun assignRepresentative(orderId: String, repId: String) {
        val rep = _representatives.value.firstOrNull { it.id == repId } ?: return
        _orders.value = _orders.value.map { order ->
            if (order.id == orderId) {
                order.copy(assignedRepId = rep.id, assignedRepName = rep.name, status = OrderStatus.DISPATCHED)
            } else {
                order
            }
        }
    }

    fun markOrderDeliveredAndCollected(orderId: String, collectedAmount: Double) {
        val order = _orders.value.firstOrNull { it.id == orderId } ?: return
        _orders.value = _orders.value.map {
            if (it.id == orderId) it.copy(status = OrderStatus.DELIVERED) else it
        }

        // Update representative collections
        _representatives.value = _representatives.value.map { rep ->
            if (rep.id == order.assignedRepId) {
                rep.copy(
                    todayDeliveriesCompleted = rep.todayDeliveriesCompleted + 1,
                    cashCollected = rep.cashCollected + collectedAmount
                )
            } else {
                rep
            }
        }

        // Record visit
        recordStoreVisit(
            storeId = order.storeId,
            storeName = order.storeName,
            repName = order.assignedRepName,
            purpose = "Order Delivery & Cash Collection #${order.invoiceNo}",
            paymentCollected = collectedAmount,
            note = "Successfully handed over all cartons and settled invoice."
        )
    }

    fun recordStoreVisit(
        storeId: String,
        storeName: String,
        repName: String,
        purpose: String,
        paymentCollected: Double,
        note: String
    ) {
        val visit = StoreVisitLog(
            id = UUID.randomUUID().toString(),
            storeId = storeId,
            storeName = storeName,
            repName = repName,
            dateString = "Oct 16, 2026 - 11:30 AM",
            purpose = purpose,
            paymentCollected = paymentCollected,
            note = note
        )
        _visitLogs.value = listOf(visit) + _visitLogs.value

        if (paymentCollected > 0) {
            _stores.value = _stores.value.map { s ->
                if (s.id == storeId) {
                    s.copy(
                        outstandingBalance = maxOf(0.0, s.outstandingBalance - paymentCollected),
                        lastVisitedDate = "Today"
                    )
                } else s
            }
        }
    }

    fun addStore(
        name: String,
        ownerName: String,
        phone: String,
        district: String,
        address: String,
        creditLimit: Double
    ) {
        val newStore = RetailStore(
            id = "store-${UUID.randomUUID().toString().take(6)}",
            name = name,
            ownerName = ownerName,
            phone = phone,
            district = district,
            address = address,
            outstandingBalance = 0.0,
            creditLimit = creditLimit,
            visitDay = "Monday / Thursday",
            lastVisitedDate = "Just Registered",
            totalOrdersCount = 0
        )
        _stores.value = listOf(newStore) + _stores.value
    }

    companion object {
        val sampleProducts = listOf(
            WholesaleProduct(
                id = "prod-1",
                nameAr = "أرز بسمتي فاخر الشعلان",
                nameEn = "Al Shalan Basmati Rice Grade A",
                brand = "Al Shalan",
                category = ProductCategory.GRAINS_RICE,
                packagingSpec = "Bale (4 x 10kg Sacks)",
                unitsPerCarton = 4,
                cartonPrice = 48.0,
                unitPrice = 12.0,
                stockCartons = 320,
                minOrderCartons = 2,
                isDeal = true,
                dealDiscount = 5
            ),
            WholesaleProduct(
                id = "prod-2",
                nameAr = "زيت ذرة عافية نقي",
                nameEn = "Afia Pure Corn Oil 1.5L",
                brand = "Afia",
                category = ProductCategory.OILS_GHEE,
                packagingSpec = "Carton (6 x 1.5L Bottles)",
                unitsPerCarton = 6,
                cartonPrice = 32.5,
                unitPrice = 5.42,
                stockCartons = 480,
                minOrderCartons = 3,
                isDeal = false
            ),
            WholesaleProduct(
                id = "prod-3",
                nameAr = "حليب جهينة كامل الدسم",
                nameEn = "Juhayna Full Cream Milk 1L",
                brand = "Juhayna",
                category = ProductCategory.DAIRY_CHEESE,
                packagingSpec = "Shrink (12 x 1L TetraPak)",
                unitsPerCarton = 12,
                cartonPrice = 18.0,
                unitPrice = 1.50,
                stockCartons = 600,
                minOrderCartons = 5,
                isDeal = true,
                dealDiscount = 8
            ),
            WholesaleProduct(
                id = "prod-4",
                nameAr = "مشروب غازي بيبسي كانز",
                nameEn = "Pepsi Cola Cans 330ml",
                brand = "PepsiCo",
                category = ProductCategory.BEVERAGES,
                packagingSpec = "Tray (24 x 330ml Cans)",
                unitsPerCarton = 24,
                cartonPrice = 16.5,
                unitPrice = 0.69,
                stockCartons = 950,
                minOrderCartons = 10,
                isDeal = true,
                dealDiscount = 10
            ),
            WholesaleProduct(
                id = "prod-5",
                nameAr = "بسكويت أوريو شوكولاتة كلاسيك",
                nameEn = "Oreo Original Sandwich Cookies",
                brand = "Mondelez",
                category = ProductCategory.SNACKS,
                packagingSpec = "Box (16 Packs x 38g)",
                unitsPerCarton = 16,
                cartonPrice = 14.0,
                unitPrice = 0.88,
                stockCartons = 280,
                minOrderCartons = 4
            ),
            WholesaleProduct(
                id = "prod-6",
                nameAr = "مسحوق غسيل أوتوماتيك إريال",
                nameEn = "Ariel Automatic Laundry Detergent 4kg",
                brand = "Ariel / P&G",
                category = ProductCategory.DETERGENTS,
                packagingSpec = "Master Carton (4 x 4kg Bags)",
                unitsPerCarton = 4,
                cartonPrice = 39.0,
                unitPrice = 9.75,
                stockCartons = 190,
                minOrderCartons = 2
            ),
            WholesaleProduct(
                id = "prod-7",
                nameAr = "فول مدمس سادة حدائق كاليفورنيا",
                nameEn = "California Garden Fava Beans 400g",
                brand = "California Garden",
                category = ProductCategory.CANNED,
                packagingSpec = "Case (24 x 400g Tins)",
                unitsPerCarton = 24,
                cartonPrice = 22.0,
                unitPrice = 0.92,
                stockCartons = 410,
                minOrderCartons = 3
            ),
            WholesaleProduct(
                id = "prod-8",
                nameAr = "شاي أسود ليبتون العلامة الصفراء",
                nameEn = "Lipton Yellow Label Black Tea 100 Bags",
                brand = "Lipton",
                category = ProductCategory.BEVERAGES,
                packagingSpec = "Master Carton (12 x 100 Teabags)",
                unitsPerCarton = 12,
                cartonPrice = 29.0,
                unitPrice = 2.42,
                stockCartons = 340,
                minOrderCartons = 2
            ),
            WholesaleProduct(
                id = "prod-9",
                nameAr = "سكر أبيض ناعم الأسرة",
                nameEn = "Al Osra Fine White Sugar 5kg",
                brand = "Al Osra",
                category = ProductCategory.GRAINS_RICE,
                packagingSpec = "Bundle (6 x 5kg Bags)",
                unitsPerCarton = 6,
                cartonPrice = 27.0,
                unitPrice = 4.50,
                stockCartons = 520,
                minOrderCartons = 4
            ),
            WholesaleProduct(
                id = "prod-10",
                nameAr = "صلصة طماطم هاينز معجون مركز",
                nameEn = "Heinz Tomato Paste 360g",
                brand = "Heinz",
                category = ProductCategory.CANNED,
                packagingSpec = "Carton (24 x 360g Jars)",
                unitsPerCarton = 24,
                cartonPrice = 26.5,
                unitPrice = 1.10,
                stockCartons = 310,
                minOrderCartons = 2
            )
        )

        val sampleStores = listOf(
            RetailStore(
                id = "store-101",
                name = "Al-Noor Supermarket",
                ownerName = "Hajj Mahmoud Al-Noor",
                phone = "+20 102 345 6789",
                district = "Nasr City / Downtown",
                address = "45 Abbas El Akkad Street",
                outstandingBalance = 840.0,
                creditLimit = 3500.0,
                visitDay = "Monday / Thursday",
                lastVisitedDate = "2 days ago",
                totalOrdersCount = 28
            ),
            RetailStore(
                id = "store-102",
                name = "Al-Baraka Grocery",
                ownerName = "Abu Kareem",
                phone = "+20 111 876 5432",
                district = "New Cairo / 5th Settlement",
                address = "Plot 18, Commercial Strip",
                outstandingBalance = 320.0,
                creditLimit = 2000.0,
                visitDay = "Tuesday / Friday",
                lastVisitedDate = "Yesterday",
                totalOrdersCount = 14
            ),
            RetailStore(
                id = "store-103",
                name = "Golden Star Minimarket",
                ownerName = "Sherif Badawy",
                phone = "+20 122 555 9812",
                district = "Maadi / Degla",
                address = "12 Road 206",
                outstandingBalance = 1250.0,
                creditLimit = 5000.0,
                visitDay = "Wednesday / Saturday",
                lastVisitedDate = "3 days ago",
                totalOrdersCount = 42
            ),
            RetailStore(
                id = "store-104",
                name = "Al-Amal Hypermarket",
                ownerName = "Hassan Al-Amal",
                phone = "+20 100 998 2211",
                district = "Heliopolis / Korba",
                address = "88 Baghdad Street",
                outstandingBalance = 0.0,
                creditLimit = 8000.0,
                visitDay = "Daily",
                lastVisitedDate = "Today",
                totalOrdersCount = 65
            )
        )

        val sampleReps = listOf(
            DeliveryRepresentative(
                id = "rep-1",
                name = "Tariq Mansoor",
                phone = "+20 109 881 7722",
                vehiclePlate = "ب ن س 4591",
                vehicleType = "Transit Van (3.0 Ton)",
                assignedDistrict = "Nasr City / Downtown",
                todayDeliveriesCompleted = 7,
                todayDeliveriesTotal = 11,
                cashCollected = 2140.0,
                cashTarget = 3500.0,
                isOnline = true
            ),
            DeliveryRepresentative(
                id = "rep-2",
                name = "Omar Al-Khatib",
                phone = "+20 114 223 8899",
                vehiclePlate = "ق ط ر 9023",
                vehicleType = "Refrigerated Truck (4.5 Ton)",
                assignedDistrict = "New Cairo / 5th Settlement",
                todayDeliveriesCompleted = 5,
                todayDeliveriesTotal = 8,
                cashCollected = 1680.0,
                cashTarget = 2800.0,
                isOnline = true
            ),
            DeliveryRepresentative(
                id = "rep-3",
                name = "Youssef Nabil",
                phone = "+20 128 334 1100",
                vehiclePlate = "د هـ م 1178",
                vehicleType = "Cargo Van (2.5 Ton)",
                assignedDistrict = "Maadi / Degla",
                todayDeliveriesCompleted = 9,
                todayDeliveriesTotal = 10,
                cashCollected = 3100.0,
                cashTarget = 3300.0,
                isOnline = true
            )
        )

        val sampleOrders = listOf(
            WholesaleOrder(
                id = "ord-101",
                invoiceNo = "INV-2026-8812",
                storeId = "store-101",
                storeName = "Al-Noor Supermarket",
                storePhone = "+20 102 345 6789",
                storeAddress = "Nasr City, 45 Abbas El Akkad",
                items = listOf(
                    OrderItemRecord(
                        productId = "prod-1",
                        productNameAr = "أرز بسمتي فاخر الشعلان",
                        productNameEn = "Al Shalan Basmati Rice",
                        packagingSpec = "Bale (4 x 10kg)",
                        cartons = 10,
                        unitPrice = 12.0,
                        cartonPrice = 48.0,
                        lineTotal = 460.8
                    ),
                    OrderItemRecord(
                        productId = "prod-2",
                        productNameAr = "زيت ذرة عافية نقي",
                        productNameEn = "Afia Pure Corn Oil 1.5L",
                        packagingSpec = "Carton (6 x 1.5L)",
                        cartons = 8,
                        unitPrice = 5.42,
                        cartonPrice = 32.5,
                        lineTotal = 249.6
                    )
                ),
                subtotal = 740.0,
                discountAmount = 29.6,
                totalAmount = 710.4,
                status = OrderStatus.DISPATCHED,
                paymentType = PaymentType.CASH_ON_DELIVERY,
                assignedRepId = "rep-1",
                assignedRepName = "Tariq Mansoor",
                dateString = "Today, 10:15 AM",
                timeSlot = "Morning (10:00 - 12:00)",
                notes = "Deliver via back alley loading dock."
            ),
            WholesaleOrder(
                id = "ord-102",
                invoiceNo = "INV-2026-8813",
                storeId = "store-103",
                storeName = "Golden Star Minimarket",
                storePhone = "+20 122 555 9812",
                storeAddress = "Maadi, 12 Road 206",
                items = listOf(
                    OrderItemRecord(
                        productId = "prod-4",
                        productNameAr = "مشروب غازي بيبسي كانز",
                        productNameEn = "Pepsi Cola Cans 330ml",
                        packagingSpec = "Tray (24 x 330ml)",
                        cartons = 20,
                        unitPrice = 0.69,
                        cartonPrice = 16.5,
                        lineTotal = 290.4
                    ),
                    OrderItemRecord(
                        productId = "prod-3",
                        productNameAr = "حليب جهينة كامل الدسم",
                        productNameEn = "Juhayna Milk 1L",
                        packagingSpec = "Shrink (12 x 1L)",
                        cartons = 15,
                        unitPrice = 1.50,
                        cartonPrice = 18.0,
                        lineTotal = 248.4
                    )
                ),
                subtotal = 600.0,
                discountAmount = 61.2,
                totalAmount = 538.8,
                status = OrderStatus.DELIVERED,
                paymentType = PaymentType.CREDIT_30_DAYS,
                assignedRepId = "rep-3",
                assignedRepName = "Youssef Nabil",
                dateString = "Today, 09:00 AM",
                timeSlot = "Early Morning",
                notes = "Signed by store manager Sherif."
            ),
            WholesaleOrder(
                id = "ord-103",
                invoiceNo = "INV-2026-8814",
                storeId = "store-102",
                storeName = "Al-Baraka Grocery",
                storePhone = "+20 111 876 5432",
                storeAddress = "New Cairo, Plot 18 Commercial Strip",
                items = listOf(
                    OrderItemRecord(
                        productId = "prod-6",
                        productNameAr = "مسحوق غسيل أوتوماتيك إريال",
                        productNameEn = "Ariel Detergent 4kg",
                        packagingSpec = "Carton (4 x 4kg)",
                        cartons = 6,
                        unitPrice = 9.75,
                        cartonPrice = 39.0,
                        lineTotal = 224.64
                    )
                ),
                subtotal = 234.0,
                discountAmount = 9.36,
                totalAmount = 224.64,
                status = OrderStatus.CONFIRMED,
                paymentType = PaymentType.CASH_ON_DELIVERY,
                assignedRepId = "rep-2",
                assignedRepName = "Omar Al-Khatib",
                dateString = "Today, 11:00 AM",
                timeSlot = "Afternoon (14:00 - 17:00)",
                notes = "Call before dispatch."
            )
        )

        val sampleVisits = listOf(
            StoreVisitLog(
                id = "v-1",
                storeId = "store-103",
                storeName = "Golden Star Minimarket",
                repName = "Youssef Nabil",
                dateString = "Today, 09:15 AM",
                purpose = "Delivery & Invoicing #INV-2026-8813",
                paymentCollected = 538.8,
                note = "Checked shelf stock, ordered Pepsi and Juhayna."
            ),
            StoreVisitLog(
                id = "v-2",
                storeId = "store-104",
                storeName = "Al-Amal Hypermarket",
                repName = "Tariq Mansoor",
                dateString = "Yesterday, 04:00 PM",
                purpose = "Routine Route Check & Statement Audit",
                paymentCollected = 800.0,
                note = "Account fully cleared, requested new rice quota."
            )
        )
    }
}
