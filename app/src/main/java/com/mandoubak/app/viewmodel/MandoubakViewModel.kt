package com.mandoubak.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mandoubak.app.data.MandoubakRepository
import com.mandoubak.app.model.*
import kotlinx.coroutines.flow.*

enum class MedicalTab(val titleAr: String, val titleEn: String) {
    VISITS("الزيارات", "Visits"),
    DOCTORS("الأطباء", "Doctors"),
    PHARMACIES("الصيدليات", "Pharmacies"),
    DRUGS("الأدوية", "Drugs"),
    NOTIFICATIONS("الإشعارات", "Alerts")
}

class MandoubakViewModel(
    private val repository: MandoubakRepository = MandoubakRepository()
) : ViewModel() {

    private val _selectedPersona = MutableStateFlow(MedicalPersona.MEDICAL_REP)
    val selectedPersona: StateFlow<MedicalPersona> = _selectedPersona.asStateFlow()

    private val _activeTab = MutableStateFlow(MedicalTab.VISITS)
    val activeTab: StateFlow<MedicalTab> = _activeTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedDrugCategory = MutableStateFlow(DrugCategory.ALL)
    val selectedDrugCategory: StateFlow<DrugCategory> = _selectedDrugCategory.asStateFlow()

    private val _selectedVisitForAi = MutableStateFlow<MedicalVisit?>(null)
    val selectedVisitForAi: StateFlow<MedicalVisit?> = _selectedVisitForAi.asStateFlow()

    private val _selectedDrugDetail = MutableStateFlow<MedicalDrug?>(null)
    val selectedDrugDetail: StateFlow<MedicalDrug?> = _selectedDrugDetail.asStateFlow()

    private val _selectedDoctorDetail = MutableStateFlow<Doctor?>(null)
    val selectedDoctorDetail: StateFlow<Doctor?> = _selectedDoctorDetail.asStateFlow()

    private val _isScheduleVisitOpen = MutableStateFlow(false)
    val isScheduleVisitOpen: StateFlow<Boolean> = _isScheduleVisitOpen.asStateFlow()

    private val _isBroadcastNotificationOpen = MutableStateFlow(false)
    val isBroadcastNotificationOpen: StateFlow<Boolean> = _isBroadcastNotificationOpen.asStateFlow()

    private val _isPharmacyOrderOpen = MutableStateFlow<Pharmacy?>(null)
    val isPharmacyOrderOpen: StateFlow<Pharmacy?> = _isPharmacyOrderOpen.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    val drugs: StateFlow<List<MedicalDrug>> = repository.drugs
    val doctors: StateFlow<List<Doctor>> = repository.doctors
    val pharmacies: StateFlow<List<Pharmacy>> = repository.pharmacies
    val visits: StateFlow<List<MedicalVisit>> = repository.visits
    val notifications: StateFlow<List<MedicalNotification>> = repository.notifications
    val pharmacyOrders: StateFlow<List<PharmacyDrugOrder>> = repository.pharmacyOrders

    val filteredDrugs: StateFlow<List<MedicalDrug>> = combine(
        drugs,
        searchQuery,
        selectedDrugCategory
    ) { list, query, cat ->
        list.filter { drug ->
            val matchCategory = (cat == DrugCategory.ALL || drug.category == cat)
            val matchQuery = query.isBlank() ||
                    drug.tradeName.contains(query, ignoreCase = true) ||
                    drug.scientificName.contains(query, ignoreCase = true) ||
                    drug.activeIngredient.contains(query, ignoreCase = true) ||
                    drug.indications.contains(query, ignoreCase = true)
            matchCategory && matchQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredDoctors: StateFlow<List<Doctor>> = combine(
        doctors,
        searchQuery
    ) { list, query ->
        if (query.isBlank()) list else list.filter {
            it.name.contains(query, ignoreCase = true) ||
                    it.specialty.contains(query, ignoreCase = true) ||
                    it.district.contains(query, ignoreCase = true) ||
                    it.clinicName.contains(query, ignoreCase = true)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredPharmacies: StateFlow<List<Pharmacy>> = combine(
        pharmacies,
        searchQuery
    ) { list, query ->
        if (query.isBlank()) list else list.filter {
            it.name.contains(query, ignoreCase = true) ||
                    it.district.contains(query, ignoreCase = true) ||
                    it.pharmacistInCharge.contains(query, ignoreCase = true)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setPersona(persona: MedicalPersona) {
        _selectedPersona.value = persona
        _snackbarMessage.value = "تم التبديل إلى: ${persona.titleAr} (${persona.titleEn})"
    }

    fun setActiveTab(tab: MedicalTab) {
        _activeTab.value = tab
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSelectedDrugCategory(cat: DrugCategory) {
        _selectedDrugCategory.value = cat
    }

    fun openVisitAiSummary(visit: MedicalVisit) {
        _selectedVisitForAi.value = visit
    }

    fun closeVisitAiSummary() {
        _selectedVisitForAi.value = null
    }

    fun completeVisitWithAi(visitId: String, notes: String, samples: Int) {
        repository.completeVisitWithAiSummary(visitId, notes, samples)
        _selectedVisitForAi.value = null
        _snackbarMessage.value = "تم تلخيص الزيارة وحفظ تقرير المساعد الذكي بنجاح!"
    }

    fun openDrugDetail(drug: MedicalDrug) {
        _selectedDrugDetail.value = drug
    }

    fun closeDrugDetail() {
        _selectedDrugDetail.value = null
    }

    fun openDoctorDetail(doctor: Doctor) {
        _selectedDoctorDetail.value = doctor
    }

    fun closeDoctorDetail() {
        _selectedDoctorDetail.value = null
    }

    fun openScheduleVisit() {
        _isScheduleVisitOpen.value = true
    }

    fun closeScheduleVisit() {
        _isScheduleVisitOpen.value = false
    }

    fun scheduleVisit(type: VisitType, targetId: String, targetName: String, subtitle: String, timeSlot: String, products: List<String>) {
        repository.scheduleVisit(type, targetId, targetName, subtitle, timeSlot, products)
        _isScheduleVisitOpen.value = false
        _snackbarMessage.value = "تمت إضافة موعد الزيارة بنجاح!"
    }

    fun openBroadcastNotification() {
        _isBroadcastNotificationOpen.value = true
    }

    fun closeBroadcastNotification() {
        _isBroadcastNotificationOpen.value = false
    }

    fun broadcastNotification(title: String, message: String, target: String, category: String, urgent: Boolean) {
        repository.broadcastNotification(title, message, target, category, urgent)
        _isBroadcastNotificationOpen.value = false
        _snackbarMessage.value = "تم بث الإشعار بنجاح لجميع العملاء المستهدفين!"
    }

    fun openPharmacyOrder(pharmacy: Pharmacy) {
        _isPharmacyOrderOpen.value = pharmacy
    }

    fun closePharmacyOrder() {
        _isPharmacyOrderOpen.value = null
    }

    fun placePharmacyOrder(pharmacy: Pharmacy, drug: MedicalDrug, quantity: Int) {
        repository.placePharmacyOrder(pharmacy, drug, quantity)
        _isPharmacyOrderOpen.value = null
        _snackbarMessage.value = "تم تسجيل طلبية ${drug.tradeName} لصيدلية ${pharmacy.name}!"
    }

    fun requestSample(doctorName: String, drugName: String, count: Int) {
        repository.requestDrugSample(doctorName, drugName, count)
        _snackbarMessage.value = "تم تسجيل صرف $count عينات مجانية لـ $doctorName"
    }

    fun clearSnackbar() {
        _snackbarMessage.value = null
    }
}
