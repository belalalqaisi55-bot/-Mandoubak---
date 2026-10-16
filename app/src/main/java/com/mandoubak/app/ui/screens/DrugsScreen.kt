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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mandoubak.app.model.DrugCategory
import com.mandoubak.app.model.MedicalDrug
import com.mandoubak.app.ui.theme.*

@Composable
fun DrugsScreen(
    drugs: List<MedicalDrug>,
    selectedCategory: DrugCategory,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onCategoryChange: (DrugCategory) -> Unit,
    onDrugClick: (MedicalDrug) -> Unit,
    onRequestSample: (MedicalDrug) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("drugs_screen"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        // Search & Filter
        item {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "كتالوج الأدوية والمستحضرات الطبية",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MedicalTextPrimary
                )
                Text(
                    text = "المواد الفعالة، دواعي الاستعمال، أسعار الصيدليات، والعينات المتاحة",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MedicalTextMuted
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("ابحث بالاسم التجاري، العلمي، أو المادة الفعالة...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )
            }
        }

        // Category Filter Chips
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                DrugCategory.values().forEach { category ->
                    val isSelected = category == selectedCategory
                    FilterChip(
                        selected = isSelected,
                        onClick = { onCategoryChange(category) },
                        label = { Text("${category.titleAr} (${category.titleEn})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "المستحضرات الدوائية (${drugs.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        items(drugs, key = { it.id }) { drug ->
            DrugCard(
                drug = drug,
                onClick = { onDrugClick(drug) },
                onRequestSample = { onRequestSample(drug) }
            )
        }
    }
}

@Composable
fun DrugCard(
    drug: MedicalDrug,
    onClick: () -> Unit,
    onRequestSample: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable { onClick() }
            .testTag("drug_card_${drug.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row: Category Pill + New badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = drug.category.titleAr,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                if (drug.isNewLaunch) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.secondary
                    ) {
                        Text(
                            text = "مستحضر حديث الإطلاق ✦",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Drug Names
            Text(
                text = drug.tradeName,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MedicalTextPrimary
            )
            Text(
                text = "${drug.scientificName} • ${drug.activeIngredient}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "الشكل الصيدلاني: ${drug.dosageForm}",
                style = MaterialTheme.typography.labelSmall,
                color = MedicalTextMuted
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = drug.indications,
                style = MaterialTheme.typography.bodyMedium,
                color = MedicalTextSecondary,
                fontSize = 12.sp,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Pricing & Sample counts row
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("سعر الصيدلية:", style = MaterialTheme.typography.labelSmall, color = MedicalTextMuted)
                        Text(
                            text = "$${"%.2f".format(drug.pricePharmacy)}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Column {
                        Text("سعر الجمهور:", style = MaterialTheme.typography.labelSmall, color = MedicalTextMuted)
                        Text(
                            text = "$${"%.2f".format(drug.pricePublic)}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MedicalTextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("عينات مجانية متاحة:", style = MaterialTheme.typography.labelSmall, color = MedicalTextMuted)
                        Text(
                            text = "${drug.samplesAvailableCount} عينات",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (drug.samplesAvailableCount > 0) StatusCompleted else StatusCancelled
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MedicalOutline.copy(alpha = 0.4f))
            Spacer(modifier = Modifier.height(8.dp))

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onClick,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("النشرة والدراسة العلمية")
                }

                Button(
                    onClick = onRequestSample,
                    enabled = drug.samplesAvailableCount > 0,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Vaccines, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("صرف عينات للطبيب")
                }
            }
        }
    }
}
