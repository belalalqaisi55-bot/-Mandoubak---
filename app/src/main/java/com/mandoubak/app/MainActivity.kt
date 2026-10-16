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
import com.mandoubak.app.viewmodel.MedicalTab
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
                val selectedDrugCategory by viewModel.selectedDrugCategory.collectAsState()

                val drugs by viewModel.filteredDrugs.collectAsState()
                val rawDrugs by viewModel.drugs.collectAsState()
                val doctors by viewModel.filteredDoctors.collectAsState()
                val rawDoctors by viewModel.doctors.collectAsState()
                val pharmacies by viewModel.filteredPharmacies.collectAsState()
                val rawPharmacies by viewModel.pharmacies.collectAsState()
                val visits by viewModel.visits.collectAsState()
                val notifications by viewModel.notifications.collectAsState()

                val selectedVisitForAi by viewModel.selectedVisitForAi.collectAsState()
                val isScheduleVisitOpen by viewModel.isScheduleVisitOpen.collectAsState()
                val isBroadcastNotificationOpen by viewModel.isBroadcastNotificationOpen.collectAsState()
                val pharmacyToOrder by viewModel.isPharmacyOrderOpen.collectAsState()
                val snackbarMsg by viewModel.snackbarMessage.collectAsState()

                LaunchedEffect(snackbarMsg) {
                    snackbarMsg?.let { msg ->
                        scope.launch {
                            snackbarHostState.showSnackbar(msg)
                            viewModel.clearSnackbar()
                        }
                    }
                }

                BackHandler(enabled = activeTab != MedicalTab.VISITS) {
                    viewModel.setActiveTab(MedicalTab.VISITS)
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        MandoubakTopBar(
                            currentPersona = currentPersona,
                            notificationCount = notifications.size,
                            onPersonaSelected = { viewModel.setPersona(it) },
                            onOpenNotifications = { viewModel.setActiveTab(MedicalTab.NOTIFICATIONS) }
                        )
                    },
                    bottomBar = {
                        NavigationBar(
                            modifier = Modifier.testTag("medical_bottom_nav"),
                            containerColor = MaterialTheme.colorScheme.surface,
                            tonalElevation = 6.dp
                        ) {
                            MedicalTab.values().forEach { tab ->
                                val isSelected = activeTab == tab
                                NavigationBarItem(
                                    selected = isSelected,
                                    onClick = { viewModel.setActiveTab(tab) },
                                    icon = {
                                        Icon(
                                            imageVector = when (tab) {
                                                MedicalTab.VISITS -> Icons.Default.EventNote
                                                MedicalTab.DOCTORS -> Icons.Default.Person
                                                MedicalTab.PHARMACIES -> Icons.Default.LocalPharmacy
                                                MedicalTab.DRUGS -> Icons.Default.Medication
                                                MedicalTab.NOTIFICATIONS -> Icons.Default.Campaign
                                            },
                                            contentDescription = tab.titleAr
                                        )
                                    },
                                    label = { Text(tab.titleAr) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = MaterialTheme.colorScheme.primary,
                                        selectedTextColor = MaterialTheme.colorScheme.primary,
                                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                                    ),
                                    modifier = Modifier.testTag("tab_${tab.name.lowercase()}")
                                )
                            }
                        }
                    },
                    floatingActionButton = {
                        when (activeTab) {
                            MedicalTab.VISITS -> {
                                ExtendedFloatingActionButton(
                                    onClick = { viewModel.openScheduleVisit() },
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = Color.White
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("موعد زيارة جديد")
                                }
                            }
                            MedicalTab.NOTIFICATIONS -> {
                                ExtendedFloatingActionButton(
                                    onClick = { viewModel.openBroadcastNotification() },
                                    containerColor = MaterialTheme.colorScheme.secondary,
                                    contentColor = Color.White
                                ) {
                                    Icon(Icons.Default.Campaign, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("بث إشعار")
                                }
                            }
                            else -> {}
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
                            MedicalTab.VISITS -> {
                                VisitsScreen(
                                    visits = visits,
                                    currentPersona = currentPersona,
                                    onOpenAiSummary = { viewModel.openVisitAiSummary(it) },
                                    onScheduleNewVisit = { viewModel.openScheduleVisit() }
                                )
                            }
                            MedicalTab.DOCTORS -> {
                                DoctorsScreen(
                                    doctors = doctors,
                                    searchQuery = searchQuery,
                                    onSearchChange = { viewModel.setSearchQuery(it) },
                                    onSelectDoctor = { doc ->
                                        scope.launch {
                                            snackbarHostState.showSnackbar("طبيب: ${doc.name} - أوقات الاستقبال: ${doc.repVisitingHours}")
                                        }
                                    },
                                    onScheduleVisitForDoctor = { doc ->
                                        viewModel.openScheduleVisit()
                                    }
                                )
                            }
                            MedicalTab.PHARMACIES -> {
                                PharmaciesScreen(
                                    pharmacies = pharmacies,
                                    searchQuery = searchQuery,
                                    onSearchChange = { viewModel.setSearchQuery(it) },
                                    onOrderForPharmacy = { pharma ->
                                        viewModel.openPharmacyOrder(pharma)
                                    }
                                )
                            }
                            MedicalTab.DRUGS -> {
                                DrugsScreen(
                                    drugs = drugs,
                                    selectedCategory = selectedDrugCategory,
                                    searchQuery = searchQuery,
                                    onSearchChange = { viewModel.setSearchQuery(it) },
                                    onCategoryChange = { viewModel.setSelectedDrugCategory(it) },
                                    onDrugClick = { drug ->
                                        scope.launch {
                                            snackbarHostState.showSnackbar("${drug.tradeName}: ${drug.indications}")
                                        }
                                    },
                                    onRequestSample = { drug ->
                                        viewModel.requestSample("العيادة الحالية", drug.tradeName, 2)
                                    }
                                )
                            }
                            MedicalTab.NOTIFICATIONS -> {
                                NotificationsScreen(
                                    notifications = notifications,
                                    onOpenBroadcastDialog = { viewModel.openBroadcastNotification() }
                                )
                            }
                        }
                    }
                }

                // Dialogs
                if (selectedVisitForAi != null) {
                    AiVisitDialog(
                        visit = selectedVisitForAi!!,
                        onDismiss = { viewModel.closeVisitAiSummary() },
                        onCompleteVisit = { id, notes, samples ->
                            viewModel.completeVisitWithAi(id, notes, samples)
                        }
                    )
                }

                if (isScheduleVisitOpen) {
                    ScheduleVisitDialog(
                        doctors = rawDoctors,
                        pharmacies = rawPharmacies,
                        drugs = rawDrugs,
                        onDismiss = { viewModel.closeScheduleVisit() },
                        onSchedule = { type, id, name, sub, time, prods ->
                            viewModel.scheduleVisit(type, id, name, sub, time, prods)
                        }
                    )
                }

                if (isBroadcastNotificationOpen) {
                    BroadcastNotificationDialog(
                        onDismiss = { viewModel.closeBroadcastNotification() },
                        onBroadcast = { title, msg, target, cat, urgent ->
                            viewModel.broadcastNotification(title, msg, target, cat, urgent)
                        }
                    )
                }

                if (pharmacyToOrder != null) {
                    PharmacyOrderDialog(
                        pharmacy = pharmacyToOrder!!,
                        drugs = rawDrugs,
                        onDismiss = { viewModel.closePharmacyOrder() },
                        onSubmitOrder = { pharma, drug, qty ->
                            viewModel.placePharmacyOrder(pharma, drug, qty)
                        }
                    )
                }
            }
        }
    }
}
