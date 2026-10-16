package com.mandoubak.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.mandoubak.app.model.MedicalVisit
import com.mandoubak.app.model.VisitStatus
import com.mandoubak.app.ui.theme.*

@Composable
fun AiVisitDialog(
    visit: MedicalVisit,
    onDismiss: () -> Unit,
    onCompleteVisit: (String, String, Int) -> Unit
) {
    var rawNotes by remember { mutableStateOf(visit.rawRepNotes) }
    var samplesCount by remember { mutableIntStateOf(if (visit.samplesDelivered > 0) visit.samplesDelivered else 2) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.90f)
                .clip(RoundedCornerShape(20.dp))
                .testTag("ai_visit_dialog"),
            color = MedicalSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "المساعد الذكي لتلخيص الزيارات",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "AI Medical Visit Intelligence",
                                style = MaterialTheme.typography.labelSmall,
                                color = MedicalTextMuted
                            )
                        }
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = MedicalOutline)
                Spacer(modifier = Modifier.height(14.dp))

                // Target details card
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = visit.targetName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${visit.visitType.titleAr} • ${visit.subtitle}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        if (visit.productsDiscussed.isNotEmpty()) {
                            Text(
                                text = "المستحضرات المستهدفة: ${visit.productsDiscussed.joinToString("، ")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MedicalTextMuted
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (visit.status == VisitStatus.COMPLETED && visit.aiSummary.isNotBlank()) {
                    // Show full AI generated structured report
                    Text(
                        text = "تقرير المساعد الذكي المُولد تلقائياً",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    AiReportSection(
                        title = "1. الملخص التنفيذي للزيارة",
                        content = visit.aiSummary,
                        icon = Icons.Default.Summarize
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    AiReportSection(
                        title = "2. ملاحظات وتفاعل الطبيب / الصيدلي",
                        content = visit.aiDoctorFeedback,
                        icon = Icons.Default.Chat
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    AiReportSection(
                        title = "3. خطة العمل والتكليفات (Action Items)",
                        content = visit.aiNextActionItems,
                        icon = Icons.Default.Checklist
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    AiReportSection(
                        title = "4. موعد المتابعة المقترح",
                        content = visit.aiNextVisitRecommended,
                        icon = Icons.Default.Event
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "العينات الطبية المسلمة: ${visit.samplesDelivered} عينات",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = StatusCompleted
                    )

                    Spacer(modifier = Modifier.weight(1f, fill = false))
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = onDismiss,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("إغلاق التقرير", fontWeight = FontWeight.Bold, color = Color.White)
                    }

                } else {
                    // Edit and generate mode
                    Text(
                        text = "ملاحظات المندوب الميدانية (صوتية أو نصية)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "اكتب النقاط الرئيسية، ردود الطبيب، وأي أسئلة وسيقوم المساعد الذكي بصياغة التقرير وخطة المتابعة فوراً.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MedicalTextMuted,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = rawNotes,
                        onValueChange = { rawNotes = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp),
                        placeholder = {
                            Text(
                                "مثال: الطبيب أبدى اهتماماً كبيراً بمستحضر Cardiovasc وسأل عن الأعراض الجانبية لكبار السن. سلمت 2 عينات وطلب دراسة التكافؤ الحيوي لمراجعتها الأسبوع القادم..."
                            )
                        },
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Samples stepper
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("عدد العينات الطبية المسلمة", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("تسجيل الخصم من عهدة العينات", style = MaterialTheme.typography.labelSmall, color = MedicalTextMuted)
                        }

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { if (samplesCount > 0) samplesCount-- }) {
                                    Icon(Icons.Default.Remove, contentDescription = "Decrease")
                                }
                                Text(
                                    text = "$samplesCount",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp)
                                )
                                IconButton(onClick = { samplesCount++ }) {
                                    Icon(Icons.Default.Add, contentDescription = "Increase")
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f, fill = false))
                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            onCompleteVisit(visit.id, rawNotes, samplesCount)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "تلخيص بالذكاء الاصطناعي وإنهاء الزيارة",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AiReportSection(
    title: String,
    content: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = content,
                style = MaterialTheme.typography.bodyMedium,
                color = MedicalTextPrimary,
                lineHeight = 20.sp
            )
        }
    }
}
