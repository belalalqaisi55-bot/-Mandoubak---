package com.mandoubak.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mandoubak.app.model.*
import com.mandoubak.app.ui.components.OrderStatusBadge
import com.mandoubak.app.ui.theme.*

@Composable
fun OrdersScreen(
    orders: List<WholesaleOrder>,
    statusFilter: OrderStatus?,
    currentPersona: Persona,
    onStatusFilterChange: (OrderStatus?) -> Unit,
    onViewInvoice: (WholesaleOrder) -> Unit,
    onUpdateStatus: (String, OrderStatus) -> Unit,
    onMarkDelivered: (String, Double) -> Unit
) {
    var deliveryDialogOrder by remember { mutableStateOf<WholesaleOrder?>(null) }
    var collectedAmountText by remember { mutableStateOf("") }

    if (deliveryDialogOrder != null) {
        val ord = deliveryDialogOrder!!
        AlertDialog(
            onDismissRequest = { deliveryDialogOrder = null },
            title = {
                Text("Confirm Delivery & Settlement", fontWeight = FontWeight.Bold)
            },
            text = {
                Column {
                    Text(
                        text = "Store: ${ord.storeName}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Invoice #${ord.invoiceNo} • Total: $${"%.2f".format(ord.totalAmount)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    Text(
                        text = "Payment Method: ${ord.paymentType.titleEn}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = collectedAmountText,
                        onValueChange = { collectedAmountText = it },
                        label = { Text("Amount Collected ($)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (ord.paymentType == PaymentType.CREDIT_30_DAYS)
                            "Note: This is credit; enter $0.00 or any partial cash collection."
                        else "Full COD amount is $${"%.2f".format(ord.totalAmount)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = collectedAmountText.toDoubleOrNull() ?: ord.totalAmount
                        onMarkDelivered(ord.id, amount)
                        deliveryDialogOrder = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered)
                ) {
                    Text("Confirm Delivery", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { deliveryDialogOrder = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("orders_screen"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        // Status Filter Chips
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = statusFilter == null,
                    onClick = { onStatusFilterChange(null) },
                    label = { Text("All Orders (${orders.size})") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = Color.White
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.testTag("filter_all_orders")
                )

                OrderStatus.values().forEach { status ->
                    val isSelected = statusFilter == status
                    FilterChip(
                        selected = isSelected,
                        onClick = { onStatusFilterChange(status) },
                        label = { Text("${status.titleEn} (${status.titleAr})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }
        }

        // Summary Bar
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Active Purchase Orders",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Total Value: $${"%.2f".format(orders.sumOf { it.totalAmount })}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        if (orders.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.ReceiptLong,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No orders found for this filter",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextSecondary
                        )
                    }
                }
            }
        } else {
            items(orders, key = { it.id }) { order ->
                OrderCard(
                    order = order,
                    currentPersona = currentPersona,
                    onViewInvoice = { onViewInvoice(order) },
                    onDispatch = { onUpdateStatus(order.id, OrderStatus.DISPATCHED) },
                    onOpenDeliverDialog = {
                        deliveryDialogOrder = order
                        collectedAmountText = if (order.paymentType == PaymentType.CASH_ON_DELIVERY)
                            "%.2f".format(order.totalAmount) else "0.00"
                    }
                )
            }
        }
    }
}

@Composable
fun OrderCard(
    order: WholesaleOrder,
    currentPersona: Persona,
    onViewInvoice: () -> Unit,
    onDispatch: () -> Unit,
    onOpenDeliverDialog: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .testTag("order_card_${order.invoiceNo}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header: Invoice No + Date + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = order.invoiceNo,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Text(
                        text = "${order.dateString} • ${order.timeSlot}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                }

                OrderStatusBadge(status = order.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Store Info & Address
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Storefront,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = order.storeName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = order.storeAddress,
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }
                    Text(
                        text = order.paymentType.titleEn,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Items breakdown summary
            Column(modifier = Modifier.fillMaxWidth()) {
                order.items.forEach { item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "• ${item.cartons} Cartons × ${item.productNameEn}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = "$${"%.2f".format(item.lineTotal)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = OutlineLight.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(8.dp))

            // Footer: Assigned Rep + Total + Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocalShipping,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Rep: ${order.assignedRepName}",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = "Total: ",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                        Text(
                            text = "$${"%.2f".format(order.totalAmount)}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(
                        onClick = onViewInvoice,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.ReceiptLong, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Invoice", style = MaterialTheme.typography.labelMedium)
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    if (order.status == OrderStatus.CONFIRMED && currentPersona != Persona.STORE_OWNER) {
                        Button(
                            onClick = onDispatch,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = StatusDispatched),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text("Dispatch", style = MaterialTheme.typography.labelMedium, color = Color.White)
                        }
                    } else if (order.status == OrderStatus.DISPATCHED && currentPersona != Persona.STORE_OWNER) {
                        Button(
                            onClick = onOpenDeliverDialog,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text("Deliver & Collect", style = MaterialTheme.typography.labelMedium, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}
