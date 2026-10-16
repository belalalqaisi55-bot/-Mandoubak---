package com.mandoubak.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mandoubak.app.model.MedicalNotification
import com.mandoubak.app.ui.theme.*

@Composable
fun NotificationsScreen(
    notifications: List<MedicalNotification>,
    onOpenBroadcastDialog: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("notifications_screen"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        item {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "لوحة التحكم وبث الإشعارات",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MedicalTextPrimary
                        )
                        Text(
                            text = "إرسال التنبيهات، إطلاق الأدوية، والعروض للصيدليات والأطباء",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MedicalTextMuted
                        )
                    }

                    FilledTonalButton(
                        onClick = onOpenBroadcastDialog,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.testTag("broadcast_notification_btn")
                    ) {
                        Icon(Icons.Default.Campaign, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("بث إشعار")
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "سجل الإشعارات المرسلة (${notifications.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        items(notifications, key = { it.id }) { notif ->
            NotificationCard(notif = notif)
        }
    }
}

@Composable
fun NotificationCard(notif: MedicalNotification) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (notif.isUrgent) Color(0xFFFEE2E2) else MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = notif.category,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (notif.isUrgent) StatusCancelled else MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Text(
                    text = notif.dateString,
                    style = MaterialTheme.typography.labelSmall,
                    color = MedicalTextMuted
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = notif.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MedicalTextPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = notif.message,
                style = MaterialTheme.typography.bodyMedium,
                color = MedicalTextSecondary,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MedicalOutline.copy(alpha = 0.4f))
            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Groups,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "الجمهور المستهدف: ${notif.targetGroup}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MedicalTextPrimary,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
