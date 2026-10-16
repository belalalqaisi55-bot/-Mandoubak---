package com.mandoubak.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.mandoubak.app.model.*
import com.mandoubak.app.ui.theme.*

@Composable
fun ScheduleVisitDialog(
    doctors: List<Doctor>,
    pharmacies: List<Pharmacy>,
    drugs: List<MedicalDrug>,
    onDismiss: () -> Unit,
    onSchedule: (VisitType, String, String, String, String, List<String>) -> Unit
) {
    var selectedType by remember { mutableStateOf(VisitType.DOCTOR) }
    var selectedTargetName by remember { mutableStateOf(doctors.firstOrNull()?.name ?: "") }
    var selectedTargetSubtitle by remember { mutableStateOf(doctors.firstOrNull()?.specialty ?: "") }
    var selectedTargetId by remember { mutableStateOf(doctors.firstOrNull()?.id ?: "") }
    var timeSlot by remember { mutableStateOf("01:00 م - 01:30 م (اليوم)") }
    var selectedDrugName by remember { mutableStateOf(drugs.firstOrNull()?.tradeName ?: "") }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp))
                .testTag("schedule_visit_dialog"),
            color = MedicalSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "جدولة موعد زيارة جديد",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Type selector
                Row(modifier = Modifier.fillMaxWidth()) {
                    FilterChip(
                        selected = selectedType == VisitType.DOCTOR,
                        onClick = {
                            selectedType = VisitType.DOCTOR
                            selectedTargetName = doctors.firstOrNull()?.name ?: ""
                            selectedTargetSubtitle = doctors.firstOrNull()?.specialty ?: ""
                            selectedTargetId = doctors.firstOrNull()?.id ?: ""
                        },
                        label = { Text("زيارة طبيب / عيادة") },
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    FilterChip(
                        selected = selectedType == VisitType.PHARMACY,
                        onClick = {
                            selectedType = VisitType.PHARMACY
                            selectedTargetName = pharmacies.firstOrNull()?.name ?: ""
                            selectedTargetSubtitle = pharmacies.firstOrNull()?.district ?: ""
                            selectedTargetId = pharmacies.firstOrNull()?.id ?: ""
                        },
                        label = { Text("زيارة صيدلية") },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Target selector
                Text(
                    text = if (selectedType == VisitType.DOCTOR) "اختر الطبيب" else "اختر الصيدلية",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))

                if (selectedType == VisitType.DOCTOR) {
                    doctors.forEach { doc ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            RadioButton(
                                selected = selectedTargetId == doc.id,
                                onClick = {
                                    selectedTargetId = doc.id
                                    selectedTargetName = doc.name
                                    selectedTargetSubtitle = doc.specialty
                                }
                            )
                            Text("${doc.name} (${doc.specialty})", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                } else {
                    pharmacies.forEach { pharma ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            RadioButton(
                                selected = selectedTargetId == pharma.id,
                                onClick = {
                                    selectedTargetId = pharma.id
                                    selectedTargetName = pharma.name
                                    selectedTargetSubtitle = pharma.district
                                }
                            )
                            Text("${pharma.name} (${pharma.district})", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = timeSlot,
                    onValueChange = { timeSlot = it },
                    label = { Text("توقيت الزيارة المفضل") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = selectedDrugName,
                    onValueChange = { selectedDrugName = it },
                    label = { Text("المستحضر الدوائي المستهدف بالعرض") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        onSchedule(
                            selectedType,
                            selectedTargetId,
                            selectedTargetName,
                            selectedTargetSubtitle,
                            timeSlot,
                            listOf(selectedDrugName)
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("حفظ الموعد في خطة اليوم", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
fun BroadcastNotificationDialog(
    onDismiss: () -> Unit,
    onBroadcast: (String, String, String, String, Boolean) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var targetGroup by remember { mutableStateOf("جميع الأطباء والصيدليات") }
    var category by remember { mutableStateOf("إطلاق دواء جديد") }
    var isUrgent by remember { mutableStateOf(false) }

    val categories = listOf("إطلاق دواء جديد", "تحديث علمي وطبي", "عرض صيدلاني وبونص", "مؤتمر وندوة طبية")
    val targets = listOf("جميع الأطباء والصيدليات", "الأطباء والعيادات فقط", "الصيدليات المتعاقدة فقط")

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp))
                .testTag("broadcast_dialog"),
            color = MedicalSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "بث إشعار طبي جديد",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("عنوان الإشعار") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    label = { Text("نص الرسالة والتفاصيل") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 3
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("نوع الإشعار", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                categories.forEach { cat ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        RadioButton(selected = category == cat, onClick = { category = cat })
                        Text(cat, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text("الجمهور المستهدف", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                targets.forEach { t ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        RadioButton(selected = targetGroup == t, onClick = { targetGroup = t })
                        Text(t, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        onBroadcast(title, message, targetGroup, category, isUrgent)
                    },
                    enabled = title.isNotBlank() && message.isNotBlank(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("إرسال الإشعار الآن", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

@Composable
fun PharmacyOrderDialog(
    pharmacy: Pharmacy,
    drugs: List<MedicalDrug>,
    onDismiss: () -> Unit,
    onSubmitOrder: (Pharmacy, MedicalDrug, Int) -> Unit
) {
    var selectedDrug by remember { mutableStateOf(drugs.first()) }
    var quantityText by remember { mutableStateOf("25") }

    val qty = quantityText.toIntOrNull() ?: 25
    val total = selectedDrug.pricePharmacy * qty

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp)),
            color = MedicalSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "تسجيل طلبية أدوية",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "صيدلية: ${pharmacy.name}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text("اختر المستحضر الدوائي", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))

                drugs.forEach { drug ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        RadioButton(
                            selected = selectedDrug.id == drug.id,
                            onClick = { selectedDrug = drug }
                        )
                        Text(
                            text = "${drug.tradeName} ($${"%.2f".format(drug.pricePharmacy)})",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = quantityText,
                    onValueChange = { quantityText = it },
                    label = { Text("عدد العلب المطلوبة") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("إجمالي الفاتورة الصيدلانية:", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "$${"%.2f".format(total)}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        onSubmitOrder(pharmacy, selectedDrug, qty)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("تأكيد وإرسال الطلبية", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
