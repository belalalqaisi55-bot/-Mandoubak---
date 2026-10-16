package com.mandoubak.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mandoubak.app.model.MedicalPersona
import com.mandoubak.app.model.VisitStatus
import com.mandoubak.app.ui.theme.*

@Composable
fun MandoubakTopBar(
    currentPersona: MedicalPersona,
    notificationCount: Int,
    onPersonaSelected: (MedicalPersona) -> Unit,
    onOpenNotifications: () -> Unit
) {
    var personaMenuExpanded by remember { mutableStateOf(false) }

    Surface(
        color = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
        tonalElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Logo & Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.secondary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.MedicalServices,
                            contentDescription = "Mandoubak Logo",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "مندوبك",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Mandoubak",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.secondaryContainer,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text = "منصة المندوب الطبي والأطباء والصيدليات",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 11.sp
                        )
                    }
                }

                // Actions: Persona Switcher + Alerts
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color.White.copy(alpha = 0.18f),
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { personaMenuExpanded = true }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                .testTag("medical_persona_button")
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = when (currentPersona) {
                                        MedicalPersona.MEDICAL_REP -> Icons.Default.Badge
                                        MedicalPersona.DOCTOR -> Icons.Default.LocalHospital
                                        MedicalPersona.PHARMACY -> Icons.Default.LocalPharmacy
                                        MedicalPersona.SUPERVISOR -> Icons.Default.SupervisorAccount
                                    },
                                    contentDescription = "Persona",
                                    tint = MaterialTheme.colorScheme.secondary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = currentPersona.titleAr,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Icon(
                                    imageVector = Icons.Default.ArrowDropDown,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = personaMenuExpanded,
                            onDismissRequest = { personaMenuExpanded = false }
                        ) {
                            MedicalPersona.values().forEach { persona ->
                                DropdownMenuItem(
                                    leadingIcon = {
                                        Icon(
                                            imageVector = when (persona) {
                                                MedicalPersona.MEDICAL_REP -> Icons.Default.Badge
                                                MedicalPersona.DOCTOR -> Icons.Default.LocalHospital
                                                MedicalPersona.PHARMACY -> Icons.Default.LocalPharmacy
                                                MedicalPersona.SUPERVISOR -> Icons.Default.SupervisorAccount
                                            },
                                            contentDescription = null,
                                            tint = if (persona == currentPersona) MaterialTheme.colorScheme.primary else MedicalTextSecondary
                                        )
                                    },
                                    text = {
                                        Column {
                                            Text(
                                                text = "${persona.titleAr} (${persona.titleEn})",
                                                fontWeight = if (persona == currentPersona) FontWeight.Bold else FontWeight.Normal
                                            )
                                            Text(
                                                text = persona.subtitle,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MedicalTextMuted
                                            )
                                        }
                                    },
                                    onClick = {
                                        onPersonaSelected(persona)
                                        personaMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    IconButton(
                        onClick = onOpenNotifications,
                        modifier = Modifier.testTag("open_alerts_button")
                    ) {
                        BadgedBox(
                            badge = {
                                if (notificationCount > 0) {
                                    Badge(
                                        containerColor = MaterialTheme.colorScheme.secondary,
                                        contentColor = Color.White
                                    ) {
                                        Text("$notificationCount", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "الإشعارات",
                                tint = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VisitStatusBadge(status: VisitStatus) {
    val (bgColor, textColor) = when (status) {
        VisitStatus.PLANNED -> Pair(Color(0xFFE0F2FE), Color(0xFF0369A1))
        VisitStatus.COMPLETED -> Pair(Color(0xFFDCFCE7), Color(0xFF15803D))
        VisitStatus.POSTPONED -> Pair(Color(0xFFFEF3C7), Color(0xFFB45309))
        VisitStatus.CANCELLED -> Pair(Color(0xFFFEE2E2), Color(0xFFB91C1C))
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(textColor)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "${status.titleAr} • ${status.titleEn}",
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun MetricStatCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    iconBgColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconBgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MedicalTextSecondary
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MedicalTextPrimary
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = MedicalTextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}
