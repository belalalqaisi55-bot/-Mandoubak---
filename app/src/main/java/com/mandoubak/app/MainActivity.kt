package com.mandoubak.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.mandoubak.app.ui.components.MandoubakTopBar
import com.mandoubak.app.ui.screens.*
import com.mandoubak.app.ui.theme.MandoubakTheme
import com.mandoubak.app.viewmodel.MandoubakViewModel
import com.mandoubak.app.viewmodel.NavigationTab
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val viewModel: MandoubakViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MandoubakTheme {
                val snackbarHostState = remember { SnackbarHostState() }
                val scope = rememberCoroutineScope()

                val currentPersona by viewModel.selectedPersona.collectAsState()
                val activeTab by viewModel.activeTab.collectAsState()
                val searchQuery by viewModel.searchQuery.collectAsState()
                val selectedCategory by viewModel.selectedCategory.collectAsState()
                val orderStatusFilter by viewModel.orderStatusFilter.collectAsState()

                val products by viewModel.filteredProducts.collectAsState()
                val orders by viewModel.filteredOrders.collectAsState()
                val stores by viewModel.stores.collectAsState()
                val reps by viewModel.representatives.collectAsState()
                val visitLogs by viewModel.visitLogs.collectAsState()

                val cartItems by viewModel.cartItems.collectAsState()
                val cartTotalCartons by viewModel.cartTotalCartons.collectAsState()

                val selectedProduct by viewModel.selectedProduct.collectAsState()
                val selectedInvoiceOrder by viewModel.selectedInvoiceOrder.collectAsState()
                val selectedStoreForVisit by viewModel.selectedStoreForVisit.collectAsState()

                val isCartOpen by viewModel.isCartOpen.collectAsState()
                val isCheckoutOpen by viewModel.isCheckoutOpen.collectAsState()
                val isAddStoreOpen by viewModel.isAddStoreOpen.collectAsState()
                val snackbarMsg by viewModel.snackbarMessage.collectAsState()

                LaunchedEffect(snackbarMsg) {
                    snackbarMsg?.let { msg ->
                        scope.launch {
                            snackbarHostState.showSnackbar(msg)
                            viewModel.clearSnackbar()
                        }
                    }
                }

                // Handle back button if on non-marketplace tab
                BackHandler(enabled = activeTab != NavigationTab.MARKETPLACE) {
                    viewModel.setActiveTab(NavigationTab.MARKETPLACE)
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        MandoubakTopBar(
                            currentPersona = currentPersona,
                            cartItemCount = cartTotalCartons,
                            onPersonaSelected = { viewModel.setPersona(it) },
                            onOpenCart = { viewModel.openCart() }
                        )
                    },
                    bottomBar = {
                        NavigationBar(
                            modifier = Modifier.testTag("mandoubak_bottom_nav"),
                            containerColor = MaterialTheme.colorScheme.surface,
                            tonalElevation = 6.dp
                        ) {
                            NavigationTab.values().forEach { tab ->
                                val isSelected = activeTab == tab
                                NavigationBarItem(
                                    selected = isSelected,
                                    onClick = { viewModel.setActiveTab(tab) },
                                    icon = {
                                        Icon(
                                            imageVector = when (tab) {
                                                NavigationTab.MARKETPLACE -> Icons.Default.Storefront
                                                NavigationTab.ORDERS -> Icons.Default.ReceiptLong
                                                NavigationTab.FLEET -> Icons.Default.LocalShipping
                                                NavigationTab.STORES -> Icons.Default.Store
                                                NavigationTab.ANALYTICS -> Icons.Default.Assessment
                                            },
                                            contentDescription = tab.labelEn
                                        )
                                    },
                                    label = { Text("${tab.labelEn}") },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = MaterialTheme.colorScheme.primary,
                                        selectedTextColor = MaterialTheme.colorScheme.primary,
                                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                                    ),
                                    modifier = Modifier.testTag("nav_tab_${tab.name.lowercase()}")
                                )
                            }
                        }
                    },
                    floatingActionButton = {
                        if (activeTab == NavigationTab.MARKETPLACE && cartTotalCartons > 0) {
                            ExtendedFloatingActionButton(
                                onClick = { viewModel.openCart() },
                                containerColor = MaterialTheme.colorScheme.secondary,
                                contentColor = MaterialTheme.colorScheme.onSecondary,
                                modifier = Modifier.testTag("cart_fab")
                            ) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Order Cart ($cartTotalCartons Ctns)")
                            }
                        } else if (activeTab == NavigationTab.STORES) {
                            FloatingActionButton(
                                onClick = { viewModel.openAddStore() },
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = Color.White,
                                modifier = Modifier.testTag("add_store_fab")
                            ) {
                                Icon(Icons.Default.AddBusiness, contentDescription = "Add Store")
                            }
                        }
                    },
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { paddingValues ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                    ) {
                        when (activeTab) {
                            NavigationTab.MARKETPLACE -> {
                                MarketplaceScreen(
                                    products = products,
                                    selectedCategory = selectedCategory,
                                    searchQuery = searchQuery,
                                    onSearchChange = { viewModel.setSearchQuery(it) },
                                    onCategorySelect = { viewModel.setSelectedCategory(it) },
                                    onProductClick = { viewModel.selectProduct(it) },
                                    onAddToCart = { prod, qty -> viewModel.addToCart(prod, qty) }
                                )
                            }
                            NavigationTab.ORDERS -> {
                                OrdersScreen(
                                    orders = orders,
                                    statusFilter = orderStatusFilter,
                                    currentPersona = currentPersona,
                                    onStatusFilterChange = { viewModel.setOrderStatusFilter(it) },
                                    onViewInvoice = { viewModel.viewInvoice(it) },
                                    onUpdateStatus = { id, st -> viewModel.updateOrderStatus(id, st) },
                                    onMarkDelivered = { id, amt -> viewModel.markOrderDelivered(id, amt) }
                                )
                            }
                            NavigationTab.FLEET -> {
                                FleetAndRepScreen(
                                    representatives = reps,
                                    visitLogs = visitLogs
                                )
                            }
                            NavigationTab.STORES -> {
                                StoresScreen(
                                    stores = stores,
                                    onOpenAddStore = { viewModel.openAddStore() },
                                    onOpenVisitStore = { viewModel.openVisitStore(it) }
                                )
                            }
                            NavigationTab.ANALYTICS -> {
                                AnalyticsScreen(
                                    orders = orders,
                                    representatives = reps
                                )
                            }
                        }
                    }
                }

                // Dialogs & Sheets
                if (isCartOpen) {
                    CartBottomSheet(
                        cartItems = cartItems,
                        onUpdateQuantity = { id, qty -> viewModel.updateCartQuantity(id, qty) },
                        onRemoveItem = { viewModel.removeFromCart(it) },
                        onDismiss = { viewModel.closeCart() },
                        onProceedToCheckout = { viewModel.openCheckout() }
                    )
                }

                if (isCheckoutOpen) {
                    CheckoutDialog(
                        cartItems = cartItems,
                        stores = stores,
                        onDismiss = { viewModel.closeCheckout() },
                        onSubmitOrder = { store, paymentType, notes ->
                            viewModel.submitOrder(store, paymentType, notes)
                        }
                    )
                }

                if (selectedProduct != null) {
                    ProductDetailDialog(
                        product = selectedProduct!!,
                        onDismiss = { viewModel.selectProduct(null) },
                        onAddToCart = { qty ->
                            selectedProduct?.let { viewModel.addToCart(it, qty) }
                        }
                    )
                }

                if (selectedInvoiceOrder != null) {
                    InvoiceDialog(
                        order = selectedInvoiceOrder!!,
                        onDismiss = { viewModel.closeInvoice() },
                        onShare = {
                            scope.launch {
                                snackbarHostState.showSnackbar("Invoice link copied & ready to share with store!")
                            }
                        }
                    )
                }

                if (selectedStoreForVisit != null) {
                    RecordVisitDialog(
                        store = selectedStoreForVisit!!,
                        onDismiss = { viewModel.closeVisitStore() },
                        onSubmitVisit = { purpose, amt, note ->
                            viewModel.recordVisit(purpose, amt, note)
                        }
                    )
                }

                if (isAddStoreOpen) {
                    AddStoreDialog(
                        onDismiss = { viewModel.closeAddStore() },
                        onAddStore = { name, owner, phone, district, address, limit ->
                            viewModel.addNewStore(name, owner, phone, district, address, limit)
                        }
                    )
                }
            }
        }
    }
}
