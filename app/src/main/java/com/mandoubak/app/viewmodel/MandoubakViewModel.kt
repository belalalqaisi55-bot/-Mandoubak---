package com.mandoubak.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mandoubak.app.data.MandoubakRepository
import com.mandoubak.app.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class NavigationTab(val labelEn: String, val labelAr: String) {
    MARKETPLACE("Market", "السوق"),
    ORDERS("Orders", "الطلبات"),
    FLEET("Fleet & Reps", "المناديب"),
    STORES("Stores", "المحلات"),
    ANALYTICS("Analytics", "التقارير")
}

class MandoubakViewModel(
    private val repository: MandoubakRepository = MandoubakRepository()
) : ViewModel() {

    private val _selectedPersona = MutableStateFlow(Persona.STORE_OWNER)
    val selectedPersona: StateFlow<Persona> = _selectedPersona.asStateFlow()

    private val _activeTab = MutableStateFlow(NavigationTab.MARKETPLACE)
    val activeTab: StateFlow<NavigationTab> = _activeTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow(ProductCategory.ALL)
    val selectedCategory: StateFlow<ProductCategory> = _selectedCategory.asStateFlow()

    private val _orderStatusFilter = MutableStateFlow<OrderStatus?>(null)
    val orderStatusFilter: StateFlow<OrderStatus?> = _orderStatusFilter.asStateFlow()

    private val _selectedProduct = MutableStateFlow<WholesaleProduct?>(null)
    val selectedProduct: StateFlow<WholesaleProduct?> = _selectedProduct.asStateFlow()

    private val _selectedInvoiceOrder = MutableStateFlow<WholesaleOrder?>(null)
    val selectedInvoiceOrder: StateFlow<WholesaleOrder?> = _selectedInvoiceOrder.asStateFlow()

    private val _selectedStoreForVisit = MutableStateFlow<RetailStore?>(null)
    val selectedStoreForVisit: StateFlow<RetailStore?> = _selectedStoreForVisit.asStateFlow()

    private val _isCartOpen = MutableStateFlow(false)
    val isCartOpen: StateFlow<Boolean> = _isCartOpen.asStateFlow()

    private val _isCheckoutOpen = MutableStateFlow(false)
    val isCheckoutOpen: StateFlow<Boolean> = _isCheckoutOpen.asStateFlow()

    private val _isAddStoreOpen = MutableStateFlow(false)
    val isAddStoreOpen: StateFlow<Boolean> = _isAddStoreOpen.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    val products: StateFlow<List<WholesaleProduct>> = repository.products
    val stores: StateFlow<List<RetailStore>> = repository.stores
    val representatives: StateFlow<List<DeliveryRepresentative>> = repository.representatives
    val orders: StateFlow<List<WholesaleOrder>> = repository.orders
    val cartItems: StateFlow<List<WholesaleCartItem>> = repository.cartItems
    val visitLogs: StateFlow<List<StoreVisitLog>> = repository.visitLogs

    val filteredProducts: StateFlow<List<WholesaleProduct>> = combine(
        products,
        searchQuery,
        selectedCategory
    ) { prods, query, cat ->
        prods.filter { p ->
            val matchesCategory = (cat == ProductCategory.ALL || p.category == cat)
            val matchesQuery = query.isBlank() ||
                    p.nameEn.contains(query, ignoreCase = true) ||
                    p.nameAr.contains(query, ignoreCase = true) ||
                    p.brand.contains(query, ignoreCase = true)
            matchesCategory && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredOrders: StateFlow<List<WholesaleOrder>> = combine(
        orders,
        orderStatusFilter,
        selectedPersona
    ) { orderList, status, persona ->
        var list = orderList
        if (status != null) {
            list = list.filter { it.status == status }
        }
        if (persona == Persona.SALES_REP) {
            // Rep view: focus on assigned active runs
            list = list.sortedBy { it.status == OrderStatus.DELIVERED }
        }
        list
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val cartTotalCartons: StateFlow<Int> = cartItems.map { items ->
        items.sumOf { it.cartons }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val cartTotalAmount: StateFlow<Double> = cartItems.map { items ->
        items.sumOf { it.finalPrice }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    fun setPersona(persona: Persona) {
        _selectedPersona.value = persona
        _snackbarMessage.value = "Switched persona: ${persona.titleEn} (${persona.titleAr})"
    }

    fun setActiveTab(tab: NavigationTab) {
        _activeTab.value = tab
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSelectedCategory(cat: ProductCategory) {
        _selectedCategory.value = cat
    }

    fun setOrderStatusFilter(status: OrderStatus?) {
        _orderStatusFilter.value = status
    }

    fun selectProduct(product: WholesaleProduct?) {
        _selectedProduct.value = product
    }

    fun addToCart(product: WholesaleProduct, cartons: Int) {
        repository.addToCart(product, cartons)
        _snackbarMessage.value = "Added $cartons cartons of ${product.nameEn} to Wholesale Order"
    }

    fun updateCartQuantity(productId: String, cartons: Int) {
        repository.updateCartQuantity(productId, cartons)
    }

    fun removeFromCart(productId: String) {
        repository.removeFromCart(productId)
    }

    fun openCart() {
        _isCartOpen.value = true
    }

    fun closeCart() {
        _isCartOpen.value = false
    }

    fun openCheckout() {
        _isCartOpen.value = false
        _isCheckoutOpen.value = true
    }

    fun closeCheckout() {
        _isCheckoutOpen.value = false
    }

    fun submitOrder(store: RetailStore, paymentType: PaymentType, notes: String) {
        val newOrder = repository.placeOrder(store, paymentType, notes)
        _isCheckoutOpen.value = false
        _selectedInvoiceOrder.value = newOrder
        _snackbarMessage.value = "Order #${newOrder.invoiceNo} successfully created!"
        _activeTab.value = NavigationTab.ORDERS
    }

    fun viewInvoice(order: WholesaleOrder) {
        _selectedInvoiceOrder.value = order
    }

    fun closeInvoice() {
        _selectedInvoiceOrder.value = null
    }

    fun updateOrderStatus(orderId: String, status: OrderStatus) {
        repository.updateOrderStatus(orderId, status)
        _snackbarMessage.value = "Order status updated to ${status.titleEn}"
    }

    fun markOrderDelivered(orderId: String, amount: Double) {
        repository.markOrderDeliveredAndCollected(orderId, amount)
        _snackbarMessage.value = "Order marked as Delivered & Collected $${"%.2f".format(amount)}"
    }

    fun openVisitStore(store: RetailStore) {
        _selectedStoreForVisit.value = store
    }

    fun closeVisitStore() {
        _selectedStoreForVisit.value = null
    }

    fun recordVisit(purpose: String, amount: Double, note: String) {
        val store = _selectedStoreForVisit.value ?: return
        val repName = representatives.value.firstOrNull()?.name ?: "Sales Representative"
        repository.recordStoreVisit(store.id, store.name, repName, purpose, amount, note)
        _selectedStoreForVisit.value = null
        _snackbarMessage.value = "Visit recorded for ${store.name}"
    }

    fun openAddStore() {
        _isAddStoreOpen.value = true
    }

    fun closeAddStore() {
        _isAddStoreOpen.value = false
    }

    fun addNewStore(name: String, owner: String, phone: String, district: String, address: String, creditLimit: Double) {
        repository.addStore(name, owner, phone, district, address, creditLimit)
        _isAddStoreOpen.value = false
        _snackbarMessage.value = "Registered new store: $name"
    }

    fun clearSnackbar() {
        _snackbarMessage.value = null
    }
}
