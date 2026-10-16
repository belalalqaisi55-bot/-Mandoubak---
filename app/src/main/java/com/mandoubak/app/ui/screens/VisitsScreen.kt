package com.mandoubak.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mandoubak.app.R
import com.mandoubak.app.model.MedicalPersona
import com.mandoubak.app.model.MedicalVisit
import com.mandoubak.app.model.VisitStatus
import com.mandoubak.app.model.VisitType
import com.mandoubak.app.ui.components.MetricStatCard
import com.mandoubak.app.ui.components.VisitStatusBadge
import com.mandoubak.app.ui.theme.*

@Composable
fun VisitsScreen(
    visits: List<MedicalVisit>,
    currentPersona: MedicalPersona,
    onOpenAiSummary: (MedicalVisit) -> Unit,
    onScheduleNewVisit: () -> Unit
) {
    val completedCount = visits.count { it.status == VisitStatus.COMPLETED }
    val plannedCount = visits.count { it.status == VisitStatus.PLANNED }
    val samplesTotal = visits.sumOf { it.samplesDelivered }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("visits_screen"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        // Hero Medical Banner
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(20.dp))
            ) {
                Image(
                    painter = painterResource(id = R.drawable.medical_banner),
                    contentDescription = "Mandoubak Medical Rep",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color(0xDD004044))
                            )
                        )
                        .padding(16.dp),
                    contentAlignment = Alignment.BottomStart
                ) {
                    Column {
                        Surface(
                            color = MaterialTheme.colorScheme.secondary,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "مساعد الزيارات الذكي • AI Medical Assistant",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "خطة الزيارات الميدانية للأطباء والصيدليات",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "تلخيص تلقائي لملاحظات الطبيب، متابعة العينات، وجدولة المواعيد",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        // Metrics Row
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricStatCard(
                    title = "زيارات اليوم",
                    value = "$completedCount من ${visits.size}",
                    subtitle = "$plannedCount زيارات قيد الانتظار",
                    icon = Icons.Default.EventAvailable,
                    iconBgColor = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.weight(1f)
                )

                MetricStatCard(
                    title = "العينات الطبية",
                    value = "$samplesTotal عينة",
                    subtitle = "تم تسليمها للعيادات",
                    icon = Icons.Default.Vaccines,
                    iconBgColor = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Header + Add Visit Button
        item {
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "جدول الزيارات اليومية",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MedicalTextPrimary
                    )
                    Text(
                        text = "اضغط على أي زيارة لفتح ملخص الذكاء الاصطناعي",
                        style = MaterialTheme.typography.labelSmall,
                        color = MedicalTextMuted
                    )
                }

                FilledTonalButton(
                    onClick = onScheduleNewVisit,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("موعد جديد")
                }
            }
        }

        items(visits, key = { it.id }) { visit ->
            VisitCard(
                visit = visit,
                onClick = { onOpenAiSummary(visit) }
            )
        }
    }
}

@Composable
fun VisitCard(
    visit: MedicalVisit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable { onClick() }
            .testTag("visit_card_${visit.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row: Type icon + Target Name + Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (visit.visitType == VisitType.DOCTOR)
                                    MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.secondaryContainer
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (visit.visitType == VisitType.DOCTOR)
                                Icons.Default.MedicalInformation else Icons.Default.LocalPharmacy,
                            contentDescription = null,
                            tint = if (visit.visitType == VisitType.DOCTOR)
                                MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Text(
                            text = visit.targetName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MedicalTextPrimary
                        )
                        Text(
                            text = "${visit.visitType.titleAr} • ${visit.subtitle}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MedicalTextSecondary
                        )
                    }
                }

                VisitStatusBadge(status = visit.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Time & Discussed Drugs
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = visit.timeSlot,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MedicalTextPrimary
                )
            }

            if (visit.productsDiscussed.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Medication,
                        contentDescription = null,
                        tint = MedicalTextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "الأدوية المعروضة: ${visit.productsDiscussed.joinToString("، ")}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MedicalTextSecondary
                    )
                }
            }

            // AI Report preview snippet if completed
            if (visit.status == VisitStatus.COMPLETED && visit.aiSummary.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "AI Summary",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "ملخص المساعد الذكي:",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = visit.aiSummary,
                                style = MaterialTheme.typography.bodyMedium,
                                fontSize = 12.sp,
                                color = MedicalTextPrimary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MedicalOutline.copy(alpha = 0.4f))
            Spacer(modifier = Modifier.height(8.dp))

            // Action Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (visit.samplesDelivered > 0) {
                    Text(
                        text = "تم تسليم ${visit.samplesDelivered} عينات",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = StatusCompleted
                    )
                } else {
                    Text(
                        text = "لم تُسلم عينات بعد",
                        style = MaterialTheme.typography.labelSmall,
                        color = MedicalTextMuted
                    )
                }

                Button(
                    onClick = onClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (visit.status == VisitStatus.COMPLETED)
                            MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = if (visit.status == VisitStatus.COMPLETED)
                            Icons.Default.Visibility else Icons.Default.AutoAwesome,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (visit.status == VisitStatus.COMPLETED) "عرض التقرير الذكي" else "تدوين الزيارة بالـ AI",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White
                    )
                }
            }
        }
    }
}
