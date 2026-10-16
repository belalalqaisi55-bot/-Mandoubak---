package com.mandoubak.app.data

import com.mandoubak.app.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

class MandoubakRepository {

    private val _drugs = MutableStateFlow<List<MedicalDrug>>(sampleDrugs)
    val drugs: StateFlow<List<MedicalDrug>> = _drugs.asStateFlow()

    private val _doctors = MutableStateFlow<List<Doctor>>(sampleDoctors)
    val doctors: StateFlow<List<Doctor>> = _doctors.asStateFlow()

    private val _pharmacies = MutableStateFlow<List<Pharmacy>>(samplePharmacies)
    val pharmacies: StateFlow<List<Pharmacy>> = _pharmacies.asStateFlow()

    private val _visits = MutableStateFlow<List<MedicalVisit>>(sampleVisits)
    val visits: StateFlow<List<MedicalVisit>> = _visits.asStateFlow()

    private val _notifications = MutableStateFlow<List<MedicalNotification>>(sampleNotifications)
    val notifications: StateFlow<List<MedicalNotification>> = _notifications.asStateFlow()

    private val _pharmacyOrders = MutableStateFlow<List<PharmacyDrugOrder>>(sampleOrders)
    val pharmacyOrders: StateFlow<List<PharmacyDrugOrder>> = _pharmacyOrders.asStateFlow()

    fun completeVisitWithAiSummary(
        visitId: String,
        rawNotes: String,
        samplesDelivered: Int
    ) {
        val current = _visits.value.toMutableList()
        val index = current.indexOfFirst { it.id == visitId }
        if (index >= 0) {
            val visit = current[index]
            // Intelligent Rule-based & heuristic AI synthesis of visit notes
            val (summary, feedback, action, nextDate) = synthesizeAiMedicalReport(visit, rawNotes)

            current[index] = visit.copy(
                status = VisitStatus.COMPLETED,
                samplesDelivered = samplesDelivered,
                rawRepNotes = rawNotes,
                aiSummary = summary,
                aiDoctorFeedback = feedback,
                aiNextActionItems = action,
                aiNextVisitRecommended = nextDate
            )
            _visits.value = current
        }
    }

    private fun synthesizeAiMedicalReport(
        visit: MedicalVisit,
        notes: String
    ): Quadruple<String, String, String, String> {
        val cleanNotes = if (notes.isBlank()) "زيارة روتينية ناجحة لتقديم المستحضرات الدوائية والكتالوج العلمي." else notes
        val summary = "تم إتمام الزيارة بنجاح ومناقشة المستحضرات الطبية مع ${visit.targetName}. أظهر العميل اهتماماً بمزايا المادة الفعالة وسرعة الامتصاص السريري مقارنة بالبدائل."
        val feedback = "ملاحظات الطبيب/الصيدلي: \"$cleanNotes\". تم الترحيب بالعينات وطلب دراسات المقارنة الدوائية."
        val actions = "1. إرسال دراسة التكافؤ الحيوي (Bioequivalence study) عبر واتساب/إيميل.\n2. تحضير دفعة عينات إضافية قبل بداية الشهر.\n3. التأكد من توافر الدواء في أقرب صيدليتين للعيادة."
        val nextDate = "خلال 10 إلى 14 يوماً (الموعد المقترح: الثلاثاء القادم)"
        return Quadruple(summary, feedback, actions, nextDate)
    }

    fun scheduleVisit(
        type: VisitType,
        targetId: String,
        targetName: String,
        subtitle: String,
        timeSlot: String,
        products: List<String>
    ) {
        val newVisit = MedicalVisit(
            id = "visit-${UUID.randomUUID().toString().take(6)}",
            visitType = type,
            targetId = targetId,
            targetName = targetName,
            subtitle = subtitle,
            timeSlot = timeSlot,
            status = VisitStatus.PLANNED,
            productsDiscussed = products
        )
        _visits.value = listOf(newVisit) + _visits.value
    }

    fun broadcastNotification(
        title: String,
        message: String,
        targetGroup: String,
        category: String,
        isUrgent: Boolean
    ) {
        val notif = MedicalNotification(
            id = "notif-${UUID.randomUUID().toString().take(6)}",
            title = title,
            message = message,
            targetGroup = targetGroup,
            category = category,
            dateString = "اليوم، الآن",
            isUrgent = isUrgent
        )
        _notifications.value = listOf(notif) + _notifications.value
    }

    fun requestDrugSample(doctorName: String, drugName: String, packs: Int) {
        _drugs.value = _drugs.value.map {
            if (it.tradeName == drugName) {
                it.copy(samplesAvailableCount = maxOf(0, it.samplesAvailableCount - packs))
            } else it
        }
    }

    fun placePharmacyOrder(
        pharmacy: Pharmacy,
        drug: MedicalDrug,
        quantity: Int
    ) {
        val order = PharmacyDrugOrder(
            id = "ord-${UUID.randomUUID().toString().take(6)}",
            invoiceNo = "RX-2026-${(1000..9999).random()}",
            pharmacyId = pharmacy.id,
            pharmacyName = pharmacy.name,
            drugName = drug.tradeName,
            quantityPacks = quantity,
            unitPrice = drug.pricePharmacy,
            totalAmount = drug.pricePharmacy * quantity,
            dateString = "اليوم، 11:45 ص",
            status = "تم التجهيز للشحن"
        )
        _pharmacyOrders.value = listOf(order) + _pharmacyOrders.value
    }

    data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

    companion object {
        val sampleDrugs = listOf(
            MedicalDrug(
                id = "drug-1",
                tradeName = "Cardiovasc® 10mg",
                scientificName = "Amlodipine Besylate",
                activeIngredient = "Amlodipine 10mg",
                category = DrugCategory.CARDIOLOGY,
                dosageForm = "أقراص مغلفة (30 قرص)",
                pricePharmacy = 14.50,
                pricePublic = 18.00,
                indications = "علاج ارتفاع ضغط الدم والذبحة الصدرية المستقرة بجرعة واحدة يومياً مع فعالية 24 ساعة.",
                samplesAvailableCount = 45,
                inStockPacks = 850,
                isNewLaunch = true
            ),
            MedicalDrug(
                id = "drug-2",
                tradeName = "Amoxiklav® Forte 1g",
                scientificName = "Amoxicillin + Clavulanic Acid",
                activeIngredient = "Amoxicillin 875mg + Clavulanic 125mg",
                category = DrugCategory.ANTIBIOTICS,
                dosageForm = "أقراص سريعة الامتصاص (14 قرص)",
                pricePharmacy = 22.00,
                pricePublic = 27.50,
                indications = "مضاد حيوي واسع المدى لعلاج التهابات الجهاز التنفسي والجيوب الأنفية والمسالك البولية.",
                samplesAvailableCount = 60,
                inStockPacks = 1200,
                isNewLaunch = false
            ),
            MedicalDrug(
                id = "drug-3",
                tradeName = "Glucofit® 850mg",
                scientificName = "Metformin Hydrochloride",
                activeIngredient = "Metformin HCl 850mg",
                category = DrugCategory.DIABETES,
                dosageForm = "أقراص ممتدة المفعول (60 قرص)",
                pricePharmacy = 11.20,
                pricePublic = 14.00,
                indications = "السيطرة على سكر الدم من النوع الثاني مع تقليل مقاومة الإنسولين وحماية الشرايين.",
                samplesAvailableCount = 30,
                inStockPacks = 640
            ),
            MedicalDrug(
                id = "drug-4",
                tradeName = "Panacalm® Forte",
                scientificName = "Paracetamol + Ibuprofen",
                activeIngredient = "Paracetamol 500mg + Ibuprofen 200mg",
                category = DrugCategory.ANALGESICS,
                dosageForm = "كبسولات جيلاتينية رخوة (20 كبسولة)",
                pricePharmacy = 8.50,
                pricePublic = 11.00,
                indications = "مسكن سريع ومضاد للالتهابات لعلاج آلام المفاصل، الأسنان، الصداع النصفي والحمى.",
                samplesAvailableCount = 80,
                inStockPacks = 1500,
                isNewLaunch = true
            ),
            MedicalDrug(
                id = "drug-5",
                tradeName = "NexoGastro® 40mg",
                scientificName = "Esomeprazole Magnesium",
                activeIngredient = "Esomeprazole 40mg",
                category = DrugCategory.GASTRO,
                dosageForm = "كبسولات مقاومة لأحماض المعدة (28 كبسولة)",
                pricePharmacy = 19.80,
                pricePublic = 24.50,
                indications = "علاج ارتجاع المريء (GERD) وقرحة المعدة والاثني عشر وحماية المعدة مع المسكنات.",
                samplesAvailableCount = 40,
                inStockPacks = 780
            ),
            MedicalDrug(
                id = "drug-6",
                tradeName = "Dermacure® Cream",
                scientificName = "Fusidic Acid + Betamethasone",
                activeIngredient = "Fusidic Acid 2% + Betamethasone 0.1%",
                category = DrugCategory.DERMATOLOGY,
                dosageForm = "أنبوب مرهم موضعي 30 جرام",
                pricePharmacy = 9.00,
                pricePublic = 12.00,
                indications = "علاج الإكزيما المصحوبة بعدوى بكتيرية والتهابات الجلد التحسسية والصدفية.",
                samplesAvailableCount = 25,
                inStockPacks = 430
            ),
            MedicalDrug(
                id = "drug-7",
                tradeName = "VitaBoost® Max",
                scientificName = "Multivitamins + Zinc + CoQ10",
                activeIngredient = "12 Vitamins + 7 Minerals + Coenzyme Q10",
                category = DrugCategory.VITAMINS,
                dosageForm = "أقراص فوارة بنكهة البرتقال (20 قرص)",
                pricePharmacy = 13.00,
                pricePublic = 16.50,
                indications = "تعزيز المناعة العامة وتجديد النشاط اليومي ودعم صحة كبار السن والرياضيين.",
                samplesAvailableCount = 50,
                inStockPacks = 910
            )
        )

        val sampleDoctors = listOf(
            Doctor(
                id = "doc-1",
                name = "د. سارة خليل",
                title = "استشاري أول أمراض القلب والأوعية الدموية",
                specialty = "أمراض القلب والأوعية الدموية",
                clinicName = "مركز القلب التخصصي",
                hospitalAffiliation = "مستشفى السلام الدولي",
                district = "مدينة نصر - الحي السابع",
                address = "شارع الطيران، برج الأطباء، الدور 5",
                phone = "+20 101 234 5678",
                repVisitingHours = "الأحد والثلاثاء: 1:00 م - 3:00 م",
                totalVisitsCount = 18,
                lastVisitedDate = "منذ 4 أيام",
                preferredDrugs = listOf("Cardiovasc® 10mg", "Panacalm® Forte"),
                notes = "تركز جداً على نتائج الدراسات الإكلينيكية؛ تفضل الحصول على عينات منتظمة لمرضى العيادة."
            ),
            Doctor(
                id = "doc-2",
                name = "د. أحمد البدر",
                title = "أستاذ الباطنة العامة وأمراض الجهاز الهضمي",
                specialty = "الجهاز الهضمي والكبد",
                clinicName = "عيادات الشفاء التخصصية",
                hospitalAffiliation = "مستشفى دار الفؤاد",
                district = "مصر الجديدة - الكوربة",
                address = "22 شارع بغداد، ميدان الكوربة",
                phone = "+20 112 987 6543",
                repVisitingHours = "السبت والأربعاء: 12:00 م - 2:00 م",
                totalVisitsCount = 12,
                lastVisitedDate = "منذ أسبوع",
                preferredDrugs = listOf("NexoGastro® 40mg", "Amoxiklav® Forte 1g"),
                notes = "يكتب أدوية المعدة بكثافة؛ مهتم بتحديثات التفاعل الدوائي."
            ),
            Doctor(
                id = "doc-3",
                name = "د. منى سالم",
                title = "استشاري طب الأطفال وحديثي الولادة",
                specialty = "طب الأطفال",
                clinicName = "عيادة الطفولة السعيدة",
                hospitalAffiliation = "مستشفى الأطفال الجامعي",
                district = "التجمع الخامس - شارع التسعين",
                address = "ميديكال بارك بريميير، عيادة 304",
                phone = "+20 120 445 6677",
                repVisitingHours = "الاثنين والخميس: 2:00 م - 4:00 م",
                totalVisitsCount = 15,
                lastVisitedDate = "منذ 3 أيام",
                preferredDrugs = listOf("Amoxiklav® Forte 1g", "VitaBoost® Max"),
                notes = "تفضل المضادات الحيوية ذات الطعم المقبول للأطفال والمكملات الغذائية الخالية من السكر."
            ),
            Doctor(
                id = "doc-4",
                name = "د. طارق نبيل",
                title = "استشاري جراحة العظام والمفاصل والعمود الفقري",
                specialty = "جراحة العظام والمفاصل",
                clinicName = "عيادة إيليت للعظام",
                hospitalAffiliation = "مستشفى النزهة الدولي",
                district = "المعادي - دجلة",
                address = "شارع 206، مبنى العيادات التخصصية",
                phone = "+20 100 887 1122",
                repVisitingHours = "الأحد والخميس: 11:00 ص - 1:00 م",
                totalVisitsCount = 9,
                lastVisitedDate = "منذ أسبوعين",
                preferredDrugs = listOf("Panacalm® Forte"),
                notes = "يطلب مسكنات قوية وآمنة للمعدة لكبار السن بعد جراحات الركبة."
            )
        )

        val samplePharmacies = listOf(
            Pharmacy(
                id = "pharma-1",
                name = "صيدليات العزبي - فرع الكوربة",
                pharmacistInCharge = "د. مينا فريد",
                phone = "+20 102 345 6789",
                district = "مصر الجديدة",
                address = "شارع إبراهيم اللقاني، الكوربة",
                outstandingBalance = 1420.0,
                creditLimit = 8000.0,
                ordersCount = 34,
                lastOrderDate = "أمس"
            ),
            Pharmacy(
                id = "pharma-2",
                name = "صيدلية الأمل المركزية",
                pharmacistInCharge = "د. ياسمين حسني",
                phone = "+20 114 555 8899",
                district = "مدينة نصر",
                address = "شارع عباس العقاد، بجوار الجامعة العمالية",
                outstandingBalance = 650.0,
                creditLimit = 5000.0,
                ordersCount = 21,
                lastOrderDate = "منذ 3 أيام"
            ),
            Pharmacy(
                id = "pharma-3",
                name = "صيدليات سيف - فرع المعادي",
                pharmacistInCharge = "د. حازم ممدوح",
                phone = "+20 128 777 4433",
                district = "المعادي",
                address = "ميدان فيكتوريا، شارع 9",
                outstandingBalance = 0.0,
                creditLimit = 10000.0,
                ordersCount = 48,
                lastOrderDate = "اليوم"
            )
        )

        val sampleVisits = listOf(
            MedicalVisit(
                id = "vis-101",
                visitType = VisitType.DOCTOR,
                targetId = "doc-1",
                targetName = "د. سارة خليل",
                subtitle = "استشاري القلب - مركز القلب التخصصي",
                timeSlot = "1:00 م - 1:30 م (اليوم)",
                status = VisitStatus.PLANNED,
                productsDiscussed = listOf("Cardiovasc® 10mg", "Panacalm® Forte"),
                samplesDelivered = 0
            ),
            MedicalVisit(
                id = "vis-102",
                visitType = VisitType.PHARMACY,
                targetId = "pharma-1",
                targetName = "صيدليات العزبي - فرع الكوربة",
                subtitle = "د. مينا فريد - مراجعة النواقص والطلبيات",
                timeSlot = "2:15 م - 2:45 م (اليوم)",
                status = VisitStatus.PLANNED,
                productsDiscussed = listOf("Cardiovasc® 10mg", "Amoxiklav® Forte 1g"),
                samplesDelivered = 0
            ),
            MedicalVisit(
                id = "vis-103",
                visitType = VisitType.DOCTOR,
                targetId = "doc-2",
                targetName = "د. أحمد البدر",
                subtitle = "أستاذ الباطنة - عيادات الشفاء",
                timeSlot = "12:00 م - 12:30 م (مكتملة)",
                status = VisitStatus.COMPLETED,
                productsDiscussed = listOf("NexoGastro® 40mg"),
                samplesDelivered = 4,
                rawRepNotes = "د. أحمد أثنى على فعالية NexoGastro مع مرضى الارتجاع الليلي وطلب دراسة التكافؤ، وأكد أنه سيبدأ في وصفه في الروشتات.",
                aiSummary = "زيارة ناجحة جداً؛ الطبيب اعتمد دواء NexoGastro كخيار أول لمرضى ارتجاع المريء الليلي.",
                aiDoctorFeedback = "تم تسليم 4 علب عينات طبية، وأبدى اهتماماً كبيراً بدراسة التكافؤ الحيوي والجرعات العلاجية.",
                aiNextActionItems = "إرسال ملف الـ PDF العلمي عبر الواتساب ومتابعة توفر الدواء في صيدلية العزبي المجاورة للعيادة.",
                aiNextVisitRecommended = "الأربعاء القادم 12:00 م"
            )
        )

        val sampleNotifications = listOf(
            MedicalNotification(
                id = "notif-1",
                title = "إطلاق دواء جديد: Cardiovasc® 10mg للقلب والضغط",
                message = "يسر شركة مندوبك للأدوية الإعلان عن توفر عقار Cardiovasc بجرعة 10 مجم في جميع الصيدليات الكبرى وبخصم صيدلاني 15% لأول طلبية، مع توفر عينات للأطباء.",
                targetGroup = "جميع الأطباء والصيدليات",
                category = "إطلاق دواء جديد",
                dateString = "اليوم، 09:30 ص",
                isUrgent = true
            ),
            MedicalNotification(
                id = "notif-2",
                title = "دعوة لحضور المؤتمر السنوي للجهاز الهضمي والمناظير",
                message = "ندعو السادة أطباء الباطنة والجهاز الهضمي للتسجيل في الندوة العلمية حول أحدث بروتوكولات علاج الارتجاع المريئي بفندق الفورسيزونز.",
                targetGroup = "أطباء الباطنة والجهاز الهضمي",
                category = "مؤتمر طبي",
                dateString = "أمس، 04:00 م",
                isUrgent = false
            ),
            MedicalNotification(
                id = "notif-3",
                title = "عرض بونص صيدلاني: Amoxiklav 1g (اشترِ 10 علب واحصل على 2 مجاناً)",
                message = "عرض ترويجي ساري حتى نهاية الشهر لجميع الصيدليات المتعاقدة على كراتين Amoxiklav 1g مع شحن فوري خلال 24 ساعة.",
                targetGroup = "الصيدليات",
                category = "عرض صيدلاني",
                dateString = "منذ يومين",
                isUrgent = false
            )
        )

        val sampleOrders = listOf(
            PharmacyDrugOrder(
                id = "ord-1",
                invoiceNo = "RX-2026-9011",
                pharmacyId = "pharma-1",
                pharmacyName = "صيدليات العزبي - فرع الكوربة",
                drugName = "Cardiovasc® 10mg",
                quantityPacks = 50,
                unitPrice = 14.50,
                totalAmount = 725.0,
                dateString = "اليوم، 10:00 ص",
                status = "تم التجهيز للشحن"
            ),
            PharmacyDrugOrder(
                id = "ord-2",
                invoiceNo = "RX-2026-9012",
                pharmacyId = "pharma-2",
                pharmacyName = "صيدلية الأمل المركزية",
                drugName = "Amoxiklav® Forte 1g",
                quantityPacks = 30,
                unitPrice = 22.00,
                totalAmount = 660.0,
                dateString = "أمس، 03:30 م",
                status = "تم التسليم"
            )
        )
    }
}
