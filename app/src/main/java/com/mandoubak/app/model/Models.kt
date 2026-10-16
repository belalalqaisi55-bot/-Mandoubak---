package com.mandoubak.app.model

enum class MedicalPersona(val titleEn: String, val titleAr: String, val subtitle: String) {
    MEDICAL_REP("Medical Rep", "المندوب الطبي", "الزيارات الميدانية والمساعد الذكي"),
    DOCTOR("Doctor / Clinic", "الطبيب / العيادة", "العينات الدوائية والمواعيد"),
    PHARMACY("Pharmacy", "الصيدلية", "طلبيات الأدوية والعروض الحصرية"),
    SUPERVISOR("Pharma Manager", "مشرف الدعاية", "لوحة الإشعارات ومتابعة الفريق")
}

enum class DrugCategory(val titleEn: String, val titleAr: String) {
    ALL("All", "الكل"),
    ANTIBIOTICS("Antibiotics", "المضادات الحيوية"),
    CARDIOLOGY("Cardiovascular", "القلب وضغط الدم"),
    ANALGESICS("Pain & Anti-inflammatory", "المسكنات والالتهابات"),
    DIABETES("Diabetes & Endocrine", "السكري والغدد"),
    GASTRO("Gastrointestinal", "الجهاز الهضمي"),
    DERMATOLOGY("Dermatology", "الجلدية والتجميل"),
    VITAMINS("Vitamins & Supplements", "المكملات والفيتامينات")
}

data class MedicalDrug(
    val id: String,
    val tradeName: String,
    val scientificName: String,
    val activeIngredient: String,
    val category: DrugCategory,
    val dosageForm: String, // e.g. "Film-coated Tablets 500mg (20 Tab)"
    val pricePharmacy: Double,
    val pricePublic: Double,
    val indications: String,
    val samplesAvailableCount: Int,
    val inStockPacks: Int,
    val isNewLaunch: Boolean = false
)

data class Doctor(
    val id: String,
    val name: String,
    val title: String, // "Consultant Cardiologist", "استشاري أمراض القلب"
    val specialty: String,
    val clinicName: String,
    val hospitalAffiliation: String,
    val district: String,
    val address: String,
    val phone: String,
    val repVisitingHours: String,
    val totalVisitsCount: Int,
    val lastVisitedDate: String,
    val preferredDrugs: List<String>,
    val notes: String
)

data class Pharmacy(
    val id: String,
    val name: String,
    val pharmacistInCharge: String,
    val phone: String,
    val district: String,
    val address: String,
    val outstandingBalance: Double,
    val creditLimit: Double,
    val ordersCount: Int,
    val lastOrderDate: String
)

enum class VisitType(val titleAr: String, val titleEn: String) {
    DOCTOR("طبيب / عيادة", "Doctor"),
    PHARMACY("صيدلية", "Pharmacy")
}

enum class VisitStatus(val titleAr: String, val titleEn: String) {
    PLANNED("مجدولة", "Planned"),
    COMPLETED("مكتملة", "Completed"),
    POSTPONED("مؤجلة", "Postponed"),
    CANCELLED("ملغاة", "Cancelled")
}

data class MedicalVisit(
    val id: String,
    val visitType: VisitType,
    val targetId: String,
    val targetName: String,
    val subtitle: String, // Specialty or District
    val timeSlot: String,
    val status: VisitStatus,
    val productsDiscussed: List<String>,
    val samplesDelivered: Int = 0,
    val rawRepNotes: String = "",
    val aiSummary: String = "",
    val aiDoctorFeedback: String = "",
    val aiNextActionItems: String = "",
    val aiNextVisitRecommended: String = ""
)

data class MedicalNotification(
    val id: String,
    val title: String,
    val message: String,
    val targetGroup: String, // "جميع الأطباء والصيدليات", "أطباء الباطنة والقلب", "الصيدليات"
    val category: String, // "إطلاق دواء جديد", "تحديث علمي", "عرض صيدلاني", "مؤتمر طبي"
    val dateString: String,
    val isUrgent: Boolean = false
)

data class PharmacyDrugOrder(
    val id: String,
    val invoiceNo: String,
    val pharmacyId: String,
    val pharmacyName: String,
    val drugName: String,
    val quantityPacks: Int,
    val unitPrice: Double,
    val totalAmount: Double,
    val dateString: String,
    val status: String
)
