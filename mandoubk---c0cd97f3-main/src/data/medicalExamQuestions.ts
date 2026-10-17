import { ExamQuestion, MedicalSpecialty } from "../types";

export interface SpecialtyMeta {
  id: MedicalSpecialty;
  title: string;
  englishTitle: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  topics: string[];
  boardNames: string[];
  referenceTextbooks: string[];
}

export const MEDICAL_SPECIALTIES: SpecialtyMeta[] = [
  {
    id: "pharmacy",
    title: "الصيدلة السريرية والدوائية",
    englishTitle: "Clinical Pharmacy & Pharmacology",
    icon: "Pill",
    color: "from-teal-600 to-emerald-600",
    badgeBg: "bg-teal-50",
    badgeBorder: "border-teal-200",
    badgeText: "text-teal-800",
    description: "Pharmacotherapy, pharmacokinetics, adverse drug reactions, therapeutic drug monitoring, clinical calculations, and pharmaceutical care.",
    topics: [
      "Clinical Pharmacology & Pharmacokinetics",
      "Pediatric & Renal Dose Adjustments",
      "High-Risk Drug Interactions & CYP450",
      "Hospital & Community Pharmacy Practice",
      "Sterile Compounding & USP Standards"
    ],
    boardNames: [
      "NAPLEX (North American Pharmacist Licensure Exam)",
      "SPLE (Saudi Pharmacist Licensure Exam - SCFHS)",
      "DHA / MOH / DOH Prometric Pharmacy Exam",
      "FPGEE / PEBC Pharmacist Board"
    ],
    referenceTextbooks: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics (14th Ed)",
      "DiPiro's Pharmacotherapy: A Pathophysiologic Approach (12th Ed)",
      "Applied Clinical Pharmacokinetics (3rd Ed)",
      "USP-NF / FDA Orange Book Guidelines"
    ]
  },
  {
    id: "medicine",
    title: "الطب البشري والجراحة",
    englishTitle: "General Medicine & Surgery",
    icon: "Stethoscope",
    color: "from-blue-600 to-indigo-600",
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-200",
    badgeText: "text-blue-800",
    description: "Internal medicine, emergency medicine, pediatrics, obstetrics & gynecology, general surgery, and evidence-based diagnostic algorithms.",
    topics: [
      "Internal Medicine & Cardiology",
      "Emergency Medicine & Trauma Management (ATLS)",
      "Pediatrics & Neonatology Algorithms",
      "Obstetrics & Gynecology Clinical Protocols",
      "General Surgery & Perioperative Care"
    ],
    boardNames: [
      "USMLE Step 2 CK & Step 1 (United States Medical Licensing Exam)",
      "SMLE (Saudi Medical Licensing Exam - SCFHS)",
      "PLAB / UKMLA (UK General Medical Council)",
      "MCCQE (Medical Council of Canada)"
    ],
    referenceTextbooks: [
      "Harrison's Principles of Internal Medicine (21st Ed)",
      "Current Medical Diagnosis & Treatment (CMDT 2024)",
      "Nelson Textbook of Pediatrics (21st Ed)",
      "Schwartz's Principles of Surgery (11th Ed)"
    ]
  },
  {
    id: "dentistry",
    title: "طب وجراحة الفم والأسنان",
    englishTitle: "Dentistry & Oral Surgery",
    icon: "Smile",
    color: "from-amber-600 to-orange-600",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-800",
    description: "Endodontics, restorative dentistry, local anesthesia & nerve blocks, periodontics, oral and maxillofacial surgery, and dental pharmacology.",
    topics: [
      "Endodontics & Pulp Vitality Diagnosis",
      "Local Anesthesia & Medical Emergencies in Dental Office",
      "Periodontology & Staging/Grading",
      "Pediatric Dentistry & Space Maintainers",
      "Oral Pathology & Maxillofacial Surgery"
    ],
    boardNames: [
      "INBDE (Integrated National Board Dental Examination - ADA)",
      "SDLE (Saudi Dental Licensure Exam - SCFHS)",
      "DHA / MOH Prometric Dental Board",
      "NDEB Canada Dental Licensing Exam"
    ],
    referenceTextbooks: [
      "Carranza's Clinical Periodontology (13th Ed)",
      "Cohen's Pathways of the Pulp (12th Ed)",
      "Malamed's Handbook of Local Anesthesia (7th Ed)",
      "Neville's Oral and Maxillofacial Pathology (5th Ed)"
    ]
  },
  {
    id: "nursing",
    title: "التمريض والرعاية الحرجة",
    englishTitle: "Nursing & Critical Care",
    icon: "HeartPulse",
    color: "from-rose-600 to-pink-600",
    badgeBg: "bg-rose-50",
    badgeBorder: "border-rose-200",
    badgeText: "text-rose-800",
    description: "Clinical judgment model (CJMM), priority nursing interventions, hemodynamic titration, pediatric & maternal care, and emergency protocols.",
    topics: [
      "Advanced Cardiac Life Support (ACLS) & CPR (AHA 2020-2025)",
      "Dosage Calculations & IV Fluid Titration",
      "ICU Hemodynamic Monitoring & Ventilator Care",
      "Infection Prevention & Patient Safety Standards",
      "Emergency Triage & Prioritization"
    ],
    boardNames: [
      "NCLEX-RN Next Generation (NCSBN)",
      "SNLE (Saudi Nursing Licensure Exam - SCFHS)",
      "DHA / HAAD Nursing Licensure Prometric",
      "CPN / CCRN Critical Care Certification"
    ],
    referenceTextbooks: [
      "Potter & Perry's Fundamentals of Nursing (10th Ed)",
      "Brunner & Suddarth's Medical-Surgical Nursing (15th Ed)",
      "American Heart Association (AHA) ACLS/BLS Guidelines (2020-2025)",
      "Saunders Comprehensive Review for the NCLEX-RN Examination (9th Ed)"
    ]
  },
  {
    id: "lab",
    title: "المختبرات والتحاليل الطبية",
    englishTitle: "Medical Laboratory Sciences",
    icon: "Microscope",
    color: "from-purple-600 to-violet-600",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-200",
    badgeText: "text-purple-800",
    description: "Clinical chemistry, hematology & coagulation, immunohematology (blood banking), clinical microbiology, serology, and quality assurance.",
    topics: [
      "Clinical Chemistry & Enzymology",
      "Hematology & Blood Film Morphology",
      "Blood Banking & Transfusion Crossmatching",
      "Diagnostic Medical Microbiology & Antimicrobial Susceptibility",
      "Urinalysis, Body Fluids & Quality Control"
    ],
    boardNames: [
      "ASCP Board of Certification (BOC MLS/MLT Exam)",
      "SLLE (Saudi Laboratory Licensure Exam - SCFHS)",
      "AMT (American Medical Technologists MLS Exam)",
      "CSMLS Canadian Medical Laboratory Board"
    ],
    referenceTextbooks: [
      "Henry's Clinical Diagnosis and Management by Laboratory Methods (24th Ed)",
      "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics (7th Ed)",
      "Rodak's Hematology: Clinical Principles and Applications (6th Ed)",
      "Bailey & Scott's Diagnostic Microbiology (15th Ed)"
    ]
  },
  {
    id: "radiology",
    title: "الأشعة والتصوير التشخيصي",
    englishTitle: "Diagnostic Radiology & Imaging",
    icon: "Activity",
    color: "from-cyan-600 to-blue-700",
    badgeBg: "bg-cyan-50",
    badgeBorder: "border-cyan-200",
    badgeText: "text-cyan-800",
    description: "Radiation physics & ALARA safety, radiographic anatomy, ultrasound protocols, computed tomography (CT), MRI safety, and iodinated contrast.",
    topics: [
      "Radiation Physics & ALARA Radiation Protection",
      "Radiographic Positioning & Image Quality Factors",
      "Diagnostic Ultrasound Imaging Protocols",
      "Computed Tomography (CT) & MRI Protocols",
      "Iodinated & Gadolinium Contrast Safety Guidelines"
    ],
    boardNames: [
      "ARRT (American Registry of Radiologic Technologists)",
      "SRLE (Saudi Radiology Licensure Exam - SCFHS)",
      "ABR Core Exam (American Board of Radiology)",
      "CAMRT Canadian Radiologic Technologist Exam"
    ],
    referenceTextbooks: [
      "Bushong's Radiologic Science for Technologists (12th Ed)",
      "Bontrager's Textbook of Radiographic Positioning and Related Anatomy (10th Ed)",
      "Brant and Helms' Fundamentals of Diagnostic Radiology (5th Ed)",
      "American College of Radiology (ACR) Manual on Contrast Media"
    ]
  }
];

export const MOCK_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: "q-ph-1",
    specialty: "pharmacy",
    category: "Pharmacotherapy & Renal Protection",
    caseVignette: "A 58-year-old male with a 10-year history of type 2 diabetes mellitus and hypertension presents for a routine evaluation. His blood pressure is 148/92 mmHg. Urinalysis reveals persistent microalbuminuria (urine albumin-to-creatinine ratio: 180 mg/g; normal < 30 mg/g). Serum creatinine is 1.1 mg/dL.",
    questionText: "Which of the following antihypertensive agents is the most appropriate first-line therapy to slow the progression of diabetic nephropathy?",
    options: [
      { id: "A", text: "Lisinopril (ACE inhibitor) or Losartan (ARB)" },
      { id: "B", text: "Atenolol (Cardioselective beta-blocker)" },
      { id: "C", text: "Furosemide (Loop diuretic)" },
      { id: "D", text: "Immediate-release Nifedipine (Dihydropyridine CCB)" }
    ],
    correctOptionId: "A",
    explanation: "ACE inhibitors (e.g., Lisinopril) and Angiotensin Receptor Blockers (ARBs, e.g., Losartan) preferentially dilate the efferent arteriole of the renal glomerulus. This action reduces intraglomerular hydrostatic pressure, thereby decreasing urinary albumin excretion and significantly delaying the progression of diabetic kidney disease, as recommended by ADA (American Diabetes Association) and KDIGO guidelines.",
    highYieldPearl: "Absolute contraindications to ACEIs/ARBs: Pregnancy (teratogenic causing renal dysgenesis/oligohydramnios), history of ACEI-induced angioedema, and bilateral renal artery stenosis.",
    difficulty: "medium",
    yearOrSource: "NAPLEX / SPLE Board Review",
    sourceOrganization: "NABP (National Association of Boards of Pharmacy) & ADA",
    referenceBook: "DiPiro's Pharmacotherapy: A Pathophysiologic Approach (12th Ed), Chapter 48"
  },
  {
    id: "q-ph-2",
    specialty: "pharmacy",
    category: "Drug-Drug Interactions & Pharmacokinetics",
    caseVignette: "A 64-year-old female on chronic Warfarin therapy for non-valvular atrial fibrillation has an INR stably maintained at 2.4. She is diagnosed with acute oropharyngeal candidiasis and is prescribed oral Fluconazole 200 mg daily for 14 days.",
    questionText: "What is the expected pharmacokinetic interaction between Fluconazole and Warfarin, and its clinical consequence on INR?",
    options: [
      { id: "A", text: "Fluconazole induces hepatic CYP3A4, causing subtherapeutic INR and increased thromboembolism risk" },
      { id: "B", text: "Fluconazole potent inhibition of hepatic CYP2C9 decreases S-warfarin clearance, leading to elevated INR and severe bleeding risk" },
      { id: "C", text: "Displacement of Warfarin from plasma albumin without impacting steady-state free drug concentration or INR" },
      { id: "D", text: "Accelerated renal excretion of Warfarin metabolites causing an unpredictable decrease in PT/INR" }
    ],
    correctOptionId: "B",
    explanation: "Warfarin is a racemic mixture of R- and S-enantiomers, with S-warfarin being 3 to 5 times more potent. S-warfarin is primarily metabolized by CYP2C9. Fluconazole is a potent inhibitor of CYP2C9. Co-administration dramatically reduces S-warfarin metabolic clearance, causing rapid accumulation, significant INR elevation, and high risk of life-threatening hemorrhage.",
    highYieldPearl: "When Fluconazole must be co-prescribed with Warfarin, proactively reduce the Warfarin dose by 25% to 50% and closely monitor INR within 48-72 hours.",
    difficulty: "hard",
    yearOrSource: "SPLE / Prometric Clinical Pharmacy Licensure",
    sourceOrganization: "SCFHS & American College of Clinical Pharmacy (ACCP)",
    referenceBook: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed), Chapter 32"
  },
  {
    id: "q-ph-3",
    specialty: "pharmacy",
    category: "Clinical Pharmacokinetics & Calculations",
    caseVignette: "A 4-year-old child weighing 15 kg is diagnosed with severe acute otitis media. The pediatrician prescribes high-dose Amoxicillin at 90 mg/kg/day divided in two equal doses every 12 hours. The pharmacy dispenses Amoxicillin oral suspension 400 mg/5 mL.",
    questionText: "How many milliliters (mL) should the parent administer per single dose?",
    options: [
      { id: "A", text: "16.9 mL every 12 hours" },
      { id: "B", text: "5.6 mL every 8 hours" },
      { id: "C", text: "8.4 mL every 12 hours" },
      { id: "D", text: "11.25 mL every 12 hours" }
    ],
    correctOptionId: "C",
    explanation: "1) Total Daily Dose = 15 kg \u00d7 90 mg/kg/day = 1350 mg/day.\n2) Single Dose = 1350 mg \u00f7 2 = 675 mg per dose.\n3) Concentration = 400 mg / 5 mL = 80 mg/mL.\n4) Volume per dose = 675 mg \u00f7 80 mg/mL = 8.4375 mL (rounded to 8.4 mL).",
    highYieldPearl: "High-dose Amoxicillin (80-90 mg/kg/day) is standard-of-care for AOM to overcome altered penicillin-binding proteins in penicillin-resistant Streptococcus pneumoniae.",
    difficulty: "medium",
    yearOrSource: "NAPLEX Clinical Calculations",
    sourceOrganization: "NABP & American Academy of Pediatrics (AAP)",
    referenceBook: "Pharmaceutical Calculations (15th Ed), Howard C. Ansel"
  },
  {
    id: "q-ph-4",
    specialty: "pharmacy",
    category: "Antimicrobial Stewardship & Adverse Reactions",
    caseVignette: "A 32-year-old male is admitted for intravenous Vancomycin therapy for MRSA osteomyelitis. During the rapid initial infusion (infused over 20 minutes), the patient suddenly develops flushing, erythema, pruritus, and a macular rash over his face, neck, and upper torso. Blood pressure is 118/75 mmHg with no laryngeal edema or wheezing.",
    questionText: "What is the most appropriate management for this infusion reaction?",
    options: [
      { id: "A", text: "Increase infusion rate to rapidly finish the dose and administer IV Hydrocortisone" },
      { id: "B", text: "Administer Intramuscular Epinephrine immediately for type-1 IgE-mediated anaphylaxis and permanently blacklist Vancomycin" },
      { id: "C", text: "Switch immediately to intravenous Daptomycin without slowing the current infusion" },
      { id: "D", text: "Temporarily halt the infusion, administer Diphenhydramine, and restart at a slower infusion rate (over at least 60-120 minutes)" }
    ],
    correctOptionId: "D",
    explanation: "This presentation represents Vancomycin Infusion Reaction (historically termed 'Red Man Syndrome'), an IgE-independent pseudoallergic reaction caused by direct mast cell degranulation due to rapid infusion rate. It is managed by stopping/slowing the infusion, administering an H1-antihistamine, and infusing subsequent doses over at least 1 hour per 1000 mg (or 30 minutes per 500 mg).",
    highYieldPearl: "Vancomycin target AUC/MIC ratio for serious MRSA infections is 400-600 mcg\u00b7h/mL (assuming MIC \u2264 1 mcg/mL) to maximize clinical efficacy while minimizing nephrotoxicity.",
    difficulty: "easy",
    yearOrSource: "Prometric / DHA Pharmacist Exam",
    sourceOrganization: "Infectious Diseases Society of America (IDSA)",
    referenceBook: "Sanford Guide to Antimicrobial Therapy (54th Ed)"
  },
  {
    id: "q-ph-5",
    specialty: "pharmacy",
    category: "Cardiovascular Therapeutics & Toxicology",
    caseVignette: "A 72-year-old female with heart failure with reduced ejection fraction (HFrEF, EF 30%) and chronic kidney disease (eGFR 35 mL/min) presents with nausea, yellow-green visual halos (xanthopsia), confusion, and bradycardia. Her Digoxin serum level is 3.2 ng/mL (Therapeutic range: 0.5 - 0.9 ng/mL). ECG shows junctional escape rhythm with PVCs.",
    questionText: "Which electrolyte disturbance most significantly potentiates Digoxin toxicity, and what is the definitive antidote for life-threatening toxicity?",
    options: [
      { id: "A", text: "Hypokalemia; Digoxin Immune Fab (DigiFab)" },
      { id: "B", text: "Hypercalcemia; Intravenous Calcium Gluconate" },
      { id: "C", text: "Hyperkalemia; Sodium Bicarbonate infusion" },
      { id: "D", text: "Hyponatremia; 3% Hypertonic Saline" }
    ],
    correctOptionId: "A",
    explanation: "Hypokalemia enhances digoxin binding to myocardial Na+/K+ ATPase pumps because potassium and digoxin compete for the same binding site on the enzyme. This significantly increases susceptibility to toxicity even at borderline concentrations. The definitive antidote for severe or refractory digoxin toxicity with arrhythmias is Digoxin-specific antibody fragments (DigiFab).",
    highYieldPearl: "Never give intravenous Calcium in acute Digoxin toxicity ('stone heart' risk) as intracellular calcium is already elevated, which can precipitate irreversible myocardial contracture.",
    difficulty: "hard",
    yearOrSource: "NAPLEX & ACCP Board Review",
    sourceOrganization: "NABP & American College of Cardiology (ACC)",
    referenceBook: "Goodman & Gilman's The Pharmacological Basis of Therapeutics (14th Ed), Chapter 29"
  },
  {
    id: "q-ph-6",
    specialty: "pharmacy",
    category: "Endocrine Pharmacotherapy",
    caseVignette: "A 60-year-old female with type 2 diabetes mellitus, established atherosclerotic cardiovascular disease (prior myocardial infarction), and eGFR of 48 mL/min/1.73m\u00b2 is not meeting her HbA1c target on Metformin 1000 mg BID. Her current HbA1c is 8.6%.",
    questionText: "According to ADA and KDIGO guidelines, which class of agents provides proven major cardiovascular and renal outcome benefits and should be added next?",
    options: [
      { id: "A", text: "Sulfonylureas (e.g., Glimepiride)" },
      { id: "B", text: "SGLT2 Inhibitors (e.g., Empagliflozin) or GLP-1 Receptor Agonists (e.g., Semaglutide)" },
      { id: "C", text: "Meglitinides (e.g., Repaglinide)" },
      { id: "D", text: "Thiazolidinediones (e.g., Pioglitazone)" }
    ],
    correctOptionId: "B",
    explanation: "Both SGLT2 inhibitors (Empagliflozin, Dapagliflozin) and GLP-1 receptor agonists with proven CVD benefit (Semaglutide, Dulaglutide, Liraglutide) demonstrate robust reductions in Major Adverse Cardiovascular Events (MACE), cardiovascular death, and progression of diabetic kidney disease independent of baseline HbA1c.",
    highYieldPearl: "SGLT2 inhibitors also carry FDA indications for heart failure across the full ejection fraction spectrum (HFrEF and HFpEF) and chronic kidney disease slowing.",
    difficulty: "medium",
    yearOrSource: "ADA Standards of Care / NAPLEX",
    sourceOrganization: "American Diabetes Association (ADA)",
    referenceBook: "DiPiro's Pharmacotherapy: A Pathophysiologic Approach (12th Ed), Chapter 57"
  },
  {
    id: "q-ph-7",
    specialty: "pharmacy",
    category: "Anticoagulation & Reversal Agents",
    caseVignette: "A 70-year-old male on Apixaban (Eliquis) 5 mg twice daily for non-valvular atrial fibrillation presents to the emergency room with an acute spontaneous intracranial hemorrhage. His last dose of Apixaban was taken 3 hours ago.",
    questionText: "What is the specific FDA-approved reversal agent for direct factor Xa inhibitors like Apixaban and Rivaroxaban in life-threatening bleeding?",
    options: [
      { id: "A", text: "Idarucizumab (Praxbind)" },
      { id: "B", text: "Protamine Sulfate" },
      { id: "C", text: "Andexanet alfa (Andexxa)" },
      { id: "D", text: "Phytonadione (Vitamin K1)" }
    ],
    correctOptionId: "C",
    explanation: "Andexanet alfa is a recombinant modified human factor Xa decoy protein that binds and sequesters factor Xa inhibitors (Apixaban and Rivaroxaban), restoring endogenous factor Xa activity. Idarucizumab is specifically for Dabigatran reversal only.",
    highYieldPearl: "If Andexanet alfa is not available, 4-Factor Prothrombin Complex Concentrate (4F-PCC, Kcentra) is the recommended off-label alternative according to CHEST guidelines.",
    difficulty: "hard",
    yearOrSource: "ACCP Board Certification / SPLE",
    sourceOrganization: "American College of Chest Physicians (CHEST) & FDA",
    referenceBook: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed), Chapter 32"
  },
  {
    id: "q-ph-8",
    specialty: "pharmacy",
    category: "Lipid Management & Statins",
    caseVignette: "A 52-year-old male with no history of cardiovascular disease or diabetes has a 10-year ASCVD risk calculated at 16.5% (High risk threshold \u2265 7.5%). His baseline LDL-C is 160 mg/dL.",
    questionText: "Which of the following statin regimens is classified as high-intensity statin therapy, expected to lower LDL-C by \u2265 50%?",
    options: [
      { id: "A", text: "Lovastatin 20 mg daily" },
      { id: "B", text: "Simvastatin 20 mg daily" },
      { id: "C", text: "Pravastatin 40 mg daily" },
      { id: "D", text: "Atorvastatin 40 to 80 mg daily or Rosuvastatin 20 to 40 mg daily" }
    ],
    correctOptionId: "D",
    explanation: "Per the ACC/AHA cholesterol guidelines, High-Intensity Statin Therapy consists solely of Atorvastatin 40-80 mg daily and Rosuvastatin 20-40 mg daily. These regimens reliably reduce LDL cholesterol by 50% or more. Moderate intensity regimens reduce LDL by 30-49%.",
    highYieldPearl: "Simvastatin 80 mg is NOT recommended due to increased risk of myopathy and rhabdomyolysis, particularly with CYP3A4 inhibitors.",
    difficulty: "easy",
    yearOrSource: "ACC/AHA Guidelines / NAPLEX",
    sourceOrganization: "American College of Cardiology & American Heart Association",
    referenceBook: "DiPiro's Pharmacotherapy (12th Ed), Chapter 19"
  },
  {
    id: "q-ph-9",
    specialty: "pharmacy",
    category: "Therapeutic Drug Monitoring & Pharmacokinetics",
    caseVignette: "A 45-year-old female with bipolar I disorder is stabilized on Lithium carbonate 300 mg TID. She is seen for routine monitoring. A 12-hour post-dose serum trough level is drawn.",
    questionText: "Which of the following represents the optimal therapeutic serum trough range for lithium maintenance therapy, and which common OTC medication can drastically increase lithium levels?",
    options: [
      { id: "A", text: "0.6 - 1.0 mEq/L; Ibuprofen (NSAIDs)" },
      { id: "B", text: "1.5 - 2.5 mEq/L; Pseudoephedrine" },
      { id: "C", text: "0.1 - 0.4 mEq/L; Acetaminophen" },
      { id: "D", text: "2.0 - 3.5 mEq/L; Calcium Carbonate" }
    ],
    correctOptionId: "A",
    explanation: "The target maintenance trough concentration for Lithium is 0.6 to 1.0 mEq/L (0.8 - 1.2 mEq/L for acute mania). NSAIDs (such as Ibuprofen and Naproxen) inhibit renal prostaglandins, decreasing renal blood flow and glomerular filtration, which causes lithium retention and toxicity.",
    highYieldPearl: "ACE inhibitors, ARBs, thiazide diuretics, and NSAIDs all decrease lithium renal clearance and precipitate lithium toxicity. Acetaminophen is the safe OTC analgesic of choice.",
    difficulty: "medium",
    yearOrSource: "NAPLEX / SPLE Board Exam",
    sourceOrganization: "College of Psychiatric and Neurologic Pharmacists (CPNP)",
    referenceBook: "Applied Clinical Pharmacokinetics (3rd Ed), Chapter 11"
  },
  {
    id: "q-ph-10",
    specialty: "pharmacy",
    category: "Sterile Compounding & Cleanroom Standards",
    caseVignette: "A hospital cleanroom pharmacy is preparing sterile compounded injectable medications under the United States Pharmacopeia (USP) general chapter standards.",
    questionText: "Under USP <797> standards, what is the maximum permissible International Organization for Standardization (ISO) air classification for the Primary Engineering Control (PEC, e.g., Laminar Airflow Workbench)?",
    options: [
      { id: "A", text: "ISO Class 8" },
      { id: "B", text: "ISO Class 5" },
      { id: "C", text: "ISO Class 4" },
      { id: "D", text: "ISO Class 7" }
    ],
    correctOptionId: "B",
    explanation: "USP <797> specifies that the Primary Engineering Control (PEC) where critical compounding occurs must maintain an ISO Class 5 air environment (no more than 3,520 particles of 0.5 \u03bcm or larger per cubic meter of air). The buffer room must be ISO Class 7, and the ante-room must be ISO Class 8 (or ISO 7 if opening into a negative-pressure hazardous buffer area).",
    highYieldPearl: "Gloves must be disinfected with sterile 70% Isopropyl Alcohol (IPA) immediately before compounding and whenever hands exit and re-enter the PEC.",
    difficulty: "medium",
    yearOrSource: "USP <797> / NAPLEX Federal Law",
    sourceOrganization: "United States Pharmacopeial Convention (USP)",
    referenceBook: "USP-NF General Chapter <797> Pharmaceutical Compounding - Sterile Preparations"
  },
  {
    id: "q-ph-11",
    specialty: "pharmacy",
    category: "Antiviral Therapy & HIV",
    caseVignette: "A 29-year-old male is newly diagnosed with HIV infection. Before initiating an antiretroviral therapy (ART) regimen containing Abacavir (ABC), mandatory pharmacogenomic testing is ordered.",
    questionText: "Which HLA allele must be screened prior to prescribing Abacavir to prevent life-threatening immunological hypersensitivity reactions?",
    options: [
      { id: "A", text: "HLA-A*3101" },
      { id: "B", text: "HLA-B*1502" },
      { id: "C", text: "HLA-B*5701" },
      { id: "D", text: "HLA-B*5801" }
    ],
    correctOptionId: "C",
    explanation: "Screening for HLA-B*5701 is mandatory prior to Abacavir initiation. Patients who test positive have a high risk of developing severe, potentially fatal multisystem Abacavir Hypersensitivity Reaction (AHR). If positive, Abacavir is permanently contraindicated and must never be re-challenged.",
    highYieldPearl: "HLA-B*1502 is tested for Carbamazepine (Stevens-Johnson syndrome risk in Asians); HLA-B*5801 is tested for Allopurinol (severe cutaneous adverse reactions).",
    difficulty: "medium",
    yearOrSource: "Clinical Pharmacogenetics Implementation Consortium (CPIC) / NAPLEX",
    sourceOrganization: "CPIC & DHHS HIV Guidelines",
    referenceBook: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed), Chapter 64"
  },
  {
    id: "q-ph-12",
    specialty: "pharmacy",
    category: "Asthma Management & GINA Guidelines",
    caseVignette: "A 22-year-old male with mild persistent asthma experiences symptoms twice a week. Under the current Global Initiative for Asthma (GINA) Track 1 guideline recommendations, what is the preferred reliever and controller strategy for Step 1-2 asthma?",
    questionText: "What is the evidence-based first-line as-needed therapy to reduce the risk of severe exacerbations?",
    options: [
      { id: "A", text: "As-needed Short-Acting Beta-2 Agonist (SABA, e.g. Albuterol) alone with no inhaled corticosteroid" },
      { id: "B", text: "Oral Montelukast (Leukotriene receptor antagonist) as monotherapy" },
      { id: "C", text: "Oral Theophylline extended-release daily" },
      { id: "D", text: "As-needed low-dose Inhaled Corticosteroid (ICS) combined with Formoterol (e.g. Budesonide-Formoterol)" }
    ],
    correctOptionId: "D",
    explanation: "GINA no longer recommends SABA monotherapy due to increased risk of severe exacerbations and asthma-related mortality. In GINA Track 1, as-needed low-dose ICS-formoterol is the preferred reliever across all asthma severity steps because formoterol provides rapid bronchodilation while the ICS treats underlying airway inflammation.",
    highYieldPearl: "Formoterol is a long-acting beta-2 agonist (LABA) with a unique rapid onset of action (1-3 minutes), matching Albuterol, which allows its use as an acute rescue inhaler.",
    difficulty: "medium",
    yearOrSource: "GINA Guidelines / SPLE / NAPLEX",
    sourceOrganization: "Global Initiative for Asthma (GINA 2024)",
    referenceBook: "DiPiro's Pharmacotherapy (12th Ed), Chapter 25"
  },
  {
    id: "q-med-1",
    specialty: "medicine",
    category: "Emergency Medicine & Acute Coronary Syndromes",
    caseVignette: "A 54-year-old male with a 20 pack-year smoking history presents to the emergency department with 45 minutes of crushing substernal chest pressure radiating to the left jaw and diaphoresis. Vital signs: BP 142/88 mmHg, HR 92 bpm, RR 18/min, SpO2 98% on room air. 12-lead ECG demonstrates 3 mm ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL.",
    questionText: "Which of the following is the single most definitive next step in management according to ACC/AHA guidelines?",
    options: [
      { id: "A", text: "Immediate transfer for primary percutaneous coronary intervention (PCI) with goal door-to-balloon time < 90 minutes" },
      { id: "B", text: "Perform immediate transesophageal echocardiography (TEE) to rule out aortic dissection" },
      { id: "C", text: "Obtain stat serum troponin I and CK-MB levels and await results before initiating reperfusion therapy" },
      { id: "D", text: "Administer Sublingual Nitroglycerin without checking right-sided precordial leads" }
    ],
    correctOptionId: "A",
    explanation: "The ECG confirms an acute inferior ST-Elevation Myocardial Infarction (STEMI). STEMI is a medical emergency requiring immediate coronary reperfusion therapy. The gold standard is primary PCI with a door-to-balloon time of < 90 minutes (or < 120 minutes if transferred). Do not delay reperfusion to wait for cardiac biomarker laboratory results.",
    highYieldPearl: "In inferior STEMI (II, III, aVF), always obtain right-sided ECG leads (V4R). If right ventricular infarction is present, Nitroglycerin and Morphine are contraindicated due to risk of profound refractory hypotension.",
    difficulty: "medium",
    yearOrSource: "USMLE Step 2 CK / SMLE Board Review",
    sourceOrganization: "NBME / FSMB & ACC/AHA Guidelines",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 275"
  },
  {
    id: "q-med-2",
    specialty: "medicine",
    category: "Internal Medicine & Endocrinology",
    caseVignette: "A 23-year-old female with type 1 diabetes presents to the emergency room with 1 day of vomiting, abdominal pain, and lethargy. Vitals: BP 96/60 mmHg, HR 124 bpm, RR 30/min (deep, rapid Kussmaul breathing). Blood glucose is 480 mg/dL, arterial blood gas shows pH 7.15, HCO3 10 mEq/L, anion gap 24. Serum Potassium is 3.1 mEq/L.",
    questionText: "What is the mandatory first therapeutic priority before initiating intravenous continuous insulin infusion?",
    options: [
      { id: "A", text: "Immediate IV bolus of Regular Insulin 0.14 units/kg to lower blood glucose" },
      { id: "B", text: "Aggressive isotonic saline hydration and IV potassium chloride repletion until serum K+ > 3.3 mEq/L" },
      { id: "C", text: "Intravenous Sodium Bicarbonate infusion to correct metabolic acidosis" },
      { id: "D", text: "Administer high-dose Subcutaneous Glargine and oral potassium tablets" }
    ],
    correctOptionId: "B",
    explanation: "In Diabetic Ketoacidosis (DKA), total body potassium is severely depleted despite normal/high initial serum values. Insulin drives potassium into cells. Starting insulin with a serum K+ < 3.3 mEq/L can cause fatal cardiac arrhythmias, respiratory muscle paralysis, and cardiac arrest. Potassium MUST be repleted with aggressive IV fluids before starting insulin.",
    highYieldPearl: "When blood glucose drops below 200 mg/dL during DKA treatment, add 5% Dextrose (D5W in 0.45% NS) to fluids while continuing insulin until the anion gap closes (HCO3 \u2265 18 mEq/L, venous pH > 7.3).",
    difficulty: "hard",
    yearOrSource: "USMLE Step 2 CK / PLAB Licensure",
    sourceOrganization: "American Diabetes Association (ADA) Clinical Guidelines",
    referenceBook: "Current Medical Diagnosis & Treatment (CMDT 2024), Chapter 27"
  },
  {
    id: "q-med-3",
    specialty: "medicine",
    category: "General Surgery & Acute Abdomen",
    caseVignette: "A 28-year-old male presents with 18 hours of periumbilical pain that has migrated to the right lower quadrant. Physical exam reveals tenderness at McBurney's point, positive Rovsing sign, and positive psoas sign. Temperature is 38.2\u00b0C, WBC is 15,200/mm\u00b3 with 82% neutrophils.",
    questionText: "Which of the following is the definitive diagnosis and primary management plan?",
    options: [
      { id: "A", text: "Acute diverticulitis; outpatient oral Ciprofloxacin and Metronidazole" },
      { id: "B", text: "Acute mesenteric lymphadenitis; reassurance and observational discharge" },
      { id: "C", text: "Acute appendicitis; prompt laparoscopic or open appendectomy" },
      { id: "D", text: "Renal colic; non-contrast helical abdominal CT and discharge with tamsulosin" }
    ],
    correctOptionId: "C",
    explanation: "Classic migratory abdominal pain (visceral periumbilical to somatic right lower quadrant at McBurney's point), fever, leukocytosis, and peritoneal signs (Rovsing, psoas, obturator) are pathognomonic for acute appendicitis. Definitive standard treatment is appendectomy before perforation occurs.",
    highYieldPearl: "In pregnant women presenting with suspected appendicitis, the appendix is displaced superiorly and laterally toward the right upper quadrant by the gravid uterus. Graded compression ultrasound or MRI without contrast is the initial imaging modality of choice.",
    difficulty: "easy",
    yearOrSource: "SMLE / UKMLA Surgical Core",
    sourceOrganization: "SCFHS & Royal College of Surgeons",
    referenceBook: "Schwartz's Principles of Surgery (11th Ed), Chapter 30"
  },
  {
    id: "q-med-4",
    specialty: "medicine",
    category: "Pediatrics & Infectious Diseases",
    caseVignette: "An 18-month-old unvaccinated boy is brought to the clinic with a 3-day history of high fever (39.5\u00b0C), cough, coryza, and conjunctivitis. Physical exam reveals tiny, irregular red spots with bluish-white speckles on the buccal mucosa opposite the lower molars. A maculopapular blanching rash is beginning along the hairline and behind the ears.",
    questionText: "What is the diagnostic finding on buccal mucosa, and what supplementation is proven to reduce mortality in this condition?",
    options: [
      { id: "A", text: "Forchheimer spots (Rubella / German Measles); Vitamin C supplementation" },
      { id: "B", text: "Strawberry tongue (Scarlet Fever); Intravenous Penicillin G" },
      { id: "C", text: "Herpangina ulcers (Coxsackievirus); Oral Acyclovir" },
      { id: "D", text: "Koplik spots (Measles / Rubeola); Vitamin A supplementation" }
    ],
    correctOptionId: "D",
    explanation: "The clinical triad of Cough, Coryza, Conjunctivitis (the '3 Cs') followed by Koplik spots on buccal mucosa and a cephalocaudal maculopapular rash is diagnostic of Measles (Rubeola virus). The World Health Organization (WHO) and AAP recommend high-dose Vitamin A therapy for all children with acute measles to prevent severe complications, corneal damage, and mortality.",
    highYieldPearl: "Subacute Sclerosing Panencephalitis (SSPE) is a rare, fatal, late degenerative central nervous system complication of defective measles virus infection occurring 7-10 years post-infection.",
    difficulty: "medium",
    yearOrSource: "USMLE Step 2 CK / Nelson Pediatrics",
    sourceOrganization: "American Academy of Pediatrics (AAP) & WHO",
    referenceBook: "Nelson Textbook of Pediatrics (21st Ed), Chapter 270"
  },
  {
    id: "q-med-5",
    specialty: "medicine",
    category: "Pulmonology & Critical Care",
    caseVignette: "A 62-year-old female presents with sudden-onset pleuritic chest pain, dyspnea, and hemoptysis 5 days after an elective total hip arthroplasty. Her BP is 88/56 mmHg, HR 128 bpm, SpO2 86% on room air. Jugular venous distension is present. CT pulmonary angiography confirms a massive saddle pulmonary embolism.",
    questionText: "In the setting of hemodynamic instability (massive PE with persistent hypotension), which therapy is indicated as first-line?",
    options: [
      { id: "A", text: "Systemic thrombolytic therapy (e.g., intravenous Alteplase / recombinant tPA)" },
      { id: "B", text: "Subcutaneous Enoxaparin 1 mg/kg twice daily as monotherapy" },
      { id: "C", text: "Oral Apixaban 10 mg twice daily" },
      { id: "D", text: "Aspirin 325 mg orally and observation" }
    ],
    correctOptionId: "A",
    explanation: "Massive pulmonary embolism is defined by acute PE with sustained hypotension (systolic BP < 90 mmHg for > 15 minutes), cardiogenic shock, or cardiac arrest. In the absence of absolute contraindications to bleeding, immediate systemic thrombolysis (Alteplase) is the standard of care to rapidly dissolve the clot and restore right ventricular function.",
    highYieldPearl: "If systemic thrombolysis is contraindicated due to active intracranial hemorrhage or recent major surgery, catheter-directed embolectomy or surgical embolectomy is the primary rescue intervention.",
    difficulty: "hard",
    yearOrSource: "CHEST Guidelines / USMLE Step 2 CK",
    sourceOrganization: "American College of Chest Physicians (CHEST) & AHA",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 279"
  },
  {
    id: "q-med-6",
    specialty: "medicine",
    category: "Neurology & Stroke",
    caseVignette: "A 68-year-old male is brought to the ED with sudden onset of right facial droop, right arm weakness, and expressive aphasia that began exactly 75 minutes ago. Non-contrast head CT rules out intracranial hemorrhage. His blood pressure is 170/95 mmHg, and blood glucose is 130 mg/dL.",
    questionText: "Assuming no contraindications, what is the best initial therapeutic step?",
    options: [
      { id: "A", text: "Administer Oral Aspirin 325 mg and Clopidogrel immediately" },
      { id: "B", text: "Intravenous recombinant tissue plasminogen activator (IV Alteplase or Tenecteplase)" },
      { id: "C", text: "Lower blood pressure aggressively to < 120/80 mmHg using IV Nitroprusside" },
      { id: "D", text: "Start IV Heparin infusion with a bolus" }
    ],
    correctOptionId: "B",
    explanation: "For acute ischemic stroke presenting within 4.5 hours of symptom onset ('last known well') with no contraindications and non-contrast head CT excluding hemorrhage, intravenous thrombolytic therapy (Alteplase or Tenecteplase) is proven to improve functional neurological outcomes. Blood pressure must be maintained below 185/110 mmHg prior to thrombolysis.",
    highYieldPearl: "Do NOT administer antiplatelet agents (Aspirin) or anticoagulants for 24 hours following IV thrombolysis, and repeat a head CT at 24 hours to exclude hemorrhagic conversion.",
    difficulty: "medium",
    yearOrSource: "AHA/ASA Stroke Guidelines / USMLE",
    sourceOrganization: "American Heart Association / American Stroke Association",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 422"
  },
  {
    id: "q-med-7",
    specialty: "medicine",
    category: "Gastroenterology & Hepatology",
    caseVignette: "A 50-year-old male with alcoholic cirrhosis presents with massive hematemesis. His BP is 86/50 mmHg, HR 122 bpm. Two large-bore peripheral IV lines are placed, and fluid resuscitation with isotonic crystalloids is initiated along with packed red blood cells.",
    questionText: "What pharmacologic therapy should be started immediately to reduce splanchnic blood flow and variceal bleeding?",
    options: [
      { id: "A", text: "Oral Propranolol" },
      { id: "B", text: "Intravenous Omeprazole only" },
      { id: "C", text: "Intravenous Octreotide bolus followed by continuous infusion, plus prophylactic IV Ceftriaxone" },
      { id: "D", text: "Intravenous Furosemide" }
    ],
    correctOptionId: "C",
    explanation: "In acute variceal hemorrhage, IV Octreotide (somatostatin analog) causes selective splanchnic vasoconstriction, reducing portal venous pressure and collateral blood flow. Prophylactic antibiotics (Ceftriaxone) significantly reduce bacterial infections, rebleeding rates, and overall mortality in cirrhotic patients with GI bleeding.",
    highYieldPearl: "Non-selective beta-blockers (Propranolol, Nadolol) are indicated for PRIMARY and SECONDARY prophylaxis of variceal hemorrhage, but are strictly CONTRAINDICATED in the acute bleeding phase due to blunting of compensatory tachycardia.",
    difficulty: "medium",
    yearOrSource: "AASLD Cirrhosis Guidelines / SMLE",
    sourceOrganization: "American Association for the Study of Liver Diseases",
    referenceBook: "Current Medical Diagnosis & Treatment (2024), Chapter 16"
  },
  {
    id: "q-med-8",
    specialty: "medicine",
    category: "Nephrology & Acid-Base",
    caseVignette: "A 34-year-old male is found unconscious in an alleyway. ABG reveals: pH 7.20, PaCO2 30 mmHg, HCO3 11 mEq/L. Serum electrolytes: Na 140, K 4.5, Cl 102, HCO3 11 mEq/L. Blood glucose is 110 mg/dL. Urinalysis reveals calcium oxalate crystals.",
    questionText: "What is the anion gap, the primary acid-base disturbance, and the most likely toxic ingestion?",
    options: [
      { id: "A", text: "Anion gap 35; High anion gap metabolic acidosis; Isopropanol poisoning" },
      { id: "B", text: "Anion gap 14; Normal anion gap metabolic acidosis; Diarrhea" },
      { id: "C", text: "Anion gap 8; Respiratory acidosis; Heroin overdose" },
      { id: "D", text: "Anion gap 27; High anion gap metabolic acidosis; Ethylene glycol poisoning" }
    ],
    correctOptionId: "D",
    explanation: "Anion Gap = Na - (Cl + HCO3) = 140 - (102 + 11) = 27 mEq/L (Normal 8-12). This represents a High Anion Gap Metabolic Acidosis (HAGMA). Calcium oxalate crystals in urine coupled with HAGMA and altered mental status are classic for Ethylene glycol (antifreeze) toxicity. Treatment is Fomepizole (alcohol dehydrogenase inhibitor) and hemodialysis.",
    highYieldPearl: "Methanol ingestion causes visual disturbance/blindness ('snowfield vision') with retinal edema; Ethylene glycol causes acute kidney injury with calcium oxalate monohydrate crystals.",
    difficulty: "hard",
    yearOrSource: "USMLE Step 2 CK / SMLE",
    sourceOrganization: "American College of Emergency Physicians (ACEP)",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 306"
  },
  {
    id: "q-med-9",
    specialty: "medicine",
    category: "Cardiology & Arrhythmias",
    caseVignette: "A 70-year-old male with chronic COPD presents to the clinic with fatigue and lightheadedness. His ECG reveals complete AV block (third-degree heart block) with regular P waves at 80 bpm and independent ventricular escape rhythm at 34 bpm with wide QRS complexes.",
    questionText: "What is the definitive long-term treatment for third-degree AV block in the absence of reversible causes?",
    options: [
      { id: "A", text: "Permanent cardiac pacemaker implantation" },
      { id: "B", text: "Oral Digoxin daily" },
      { id: "C", text: "High-dose oral Amiodarone" },
      { id: "D", text: "Long-term subcutaneous Heparin" }
    ],
    correctOptionId: "A",
    explanation: "Third-degree (complete) AV block is characterized by complete dissociation between atrial and ventricular activity. Because of the high risk of ventricular asystole, syncope (Stokes-Adams attacks), and sudden cardiac death, permanent pacemaker implantation is a Class I indication according to ACC/AHA/HRS guidelines.",
    highYieldPearl: "While awaiting permanent pacing, temporary transcutaneous or transvenous pacing or an Atropine/Isoproterenol/Dopamine drip can be used for acute symptomatic bradycardia.",
    difficulty: "easy",
    yearOrSource: "ACC/AHA Guidelines / SMLE",
    sourceOrganization: "American College of Cardiology & Heart Rhythm Society",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 250"
  },
  {
    id: "q-med-10",
    specialty: "medicine",
    category: "Rheumatology & Autoimmune",
    caseVignette: "A 32-year-old female presents with a 4-month history of joint pain in both wrists and hands, a photosensitive erythematous rash across her cheeks and bridge of nose sparing the nasolabial folds, and painless oral ulcers. Laboratory evaluation demonstrates positive ANA (1:640) and high-titer anti-double-stranded DNA (anti-dsDNA).",
    questionText: "What is the definitive diagnosis and which baseline medication reduces disease flares and improves overall survival in all patients with this condition?",
    options: [
      { id: "A", text: "Rheumatoid Arthritis; Methotrexate" },
      { id: "B", text: "Systemic Lupus Erythematosus (SLE); Hydroxychloroquine" },
      { id: "C", text: "Dermatomyositis; High-dose Prednisone" },
      { id: "D", text: "Sj\u00f6gren Syndrome; Cevimeline" }
    ],
    correctOptionId: "B",
    explanation: "Malar rash sparing the nasolabial folds, polyarthritis, oral ulcers, positive ANA, and anti-dsDNA antibodies confirm Systemic Lupus Erythematosus (SLE). Hydroxychloroquine (HCQ) is recommended for ALL patients with SLE unless contraindicated, as it decreases flares, prevents organ damage accrual, and reduces mortality.",
    highYieldPearl: "Annual ophthalmologic examination with visual fields (humphrey 10-2) and spectral-domain OCT is required to screen for HCQ retinal toxicity / retinopathy.",
    difficulty: "medium",
    yearOrSource: "ACR Guidelines / USMLE Step 2 CK",
    sourceOrganization: "American College of Rheumatology (ACR)",
    referenceBook: "Current Medical Diagnosis & Treatment (2024), Chapter 20"
  },
  {
    id: "q-med-11",
    specialty: "medicine",
    category: "Infectious Diseases & Meningitis",
    caseVignette: "A 21-year-old college student presents with a 12-hour history of severe headache, photophobia, fever (39.8\u00b0C), and a petechial purpuric rash on the lower extremities. Physical exam reveals positive Kernig and Brudzinski signs.",
    questionText: "What is the most likely pathogen, and what urgent empiric antibiotic regimen should be administered immediately?",
    options: [
      { id: "A", text: "Listeria monocytogenes; IV Ampicillin alone" },
      { id: "B", text: "Cryptococcus neoformans; IV Amphotericin B plus Flucytosine" },
      { id: "C", text: "Neisseria meningitidis; IV Ceftriaxone plus Vancomycin, with IV Dexamethasone" },
      { id: "D", text: "Herpes Simplex Virus; IV Acyclovir" }
    ],
    correctOptionId: "C",
    explanation: "Fever, altered mental status, nuchal rigidity (Kernig/Brudzinski signs), and a petechial/purpuric rash in a young adult is classic for Meningococcal Meningitis (Neisseria meningitidis). Immediate empiric coverage with Vancomycin + Ceftriaxone (plus Dexamethasone to prevent neurological sequelae and hearing loss) must not be delayed for lumbar puncture or neuroimaging.",
    highYieldPearl: "Close contacts of patients with N. meningitidis require chemoprophylaxis with Rifampin, Ciprofloxacin, or a single IM dose of Ceftriaxone.",
    difficulty: "medium",
    yearOrSource: "IDSA Guidelines / USMLE Step 2 CK",
    sourceOrganization: "Infectious Diseases Society of America (IDSA)",
    referenceBook: "Harrison's Principles of Internal Medicine (21st Ed), Chapter 146"
  },
  {
    id: "q-med-12",
    specialty: "medicine",
    category: "Obstetrics & Gynecology",
    caseVignette: "A 29-year-old primigravida at 34 weeks of gestation presents with a persistent severe frontal headache and visual scotomas. BP is 168/112 mmHg on two measurements 4 hours apart. Urinalysis demonstrates 3+ proteinuria (protein-to-creatinine ratio 0.8). Reflexes are 4+ with sustained ankle clonus.",
    questionText: "What is the diagnosis, and what medication must be administered immediately to prevent maternal seizures?",
    options: [
      { id: "A", text: "Epilepsy in pregnancy; Intravenous Diazepam" },
      { id: "B", text: "Gestational hypertension; Oral Atenolol" },
      { id: "C", text: "Chronic hypertension; Oral Lisinopril" },
      { id: "D", text: "Preeclampsia with severe features; Intravenous Magnesium Sulfate" }
    ],
    correctOptionId: "D",
    explanation: "New-onset hypertension (BP \u2265 160/110 mmHg) after 20 weeks of gestation with proteinuria and severe features (headache, visual changes, hyperreflexia/clonus) defines Preeclampsia with Severe Features. IV Magnesium Sulfate is the standard-of-care drug for seizure prophylaxis (prevention of eclampsia).",
    highYieldPearl: "Antidote for magnesium toxicity (loss of patellar reflexes, respiratory depression < 12/min, cardiac arrest) is 10% Calcium Gluconate (1 gram IV over 3-5 minutes).",
    difficulty: "medium",
    yearOrSource: "ACOG Practice Bulletin / SMLE",
    sourceOrganization: "American College of Obstetricians and Gynecologists",
    referenceBook: "Williams Obstetrics (26th Ed), Chapter 34"
  },
  {
    id: "q-den-1",
    specialty: "dentistry",
    category: "Local Anesthesia & Medical Emergencies",
    caseVignette: "A 24-year-old male with severe dental anxiety receives an inferior alveolar nerve block (IANB) using 2% Lidocaine with 1:100,000 Epinephrine. Immediately after the injection, the patient complains of perioral numbness, metallic taste in the mouth, tinnitus, lightheadedness, and visual disturbances, followed by generalized muscle twitching.",
    questionText: "What is the most probable etiology of these acute signs, and what is the definitive antidote for Local Anesthetic Systemic Toxicity (LAST)?",
    options: [
      { id: "A", text: "Local Anesthetic Systemic Toxicity (LAST) secondary to accidental intravascular injection; 20% Intravenous Lipid Emulsion (Intralipid)" },
      { id: "B", text: "Vasovagal syncope; Trendelenburg position and smelling salts" },
      { id: "C", text: "Type-1 IgE-mediated anaphylaxis to amide local anesthetic; Intramuscular Epinephrine" },
      { id: "D", text: "Acute hyperventilation syndrome; Paper bag rebreathing" }
    ],
    correctOptionId: "A",
    explanation: "Accidental intravascular injection of local anesthetics produces Local Anesthetic Systemic Toxicity (LAST). Initial CNS symptoms include perioral tingling, metallic taste, auditory/visual changes, followed by excitation/seizures, and subsequent cardiovascular collapse. The specific rescue antidote is 20% Intravenous Lipid Emulsion (ILE / Intralipid), which acts as a 'lipid sink' to extract lipophilic local anesthetics from tissue.",
    highYieldPearl: "Always aspirate in at least two planes before injecting local anesthetic to avoid intravascular deposition, especially in vascular areas like the pterygomandibular space.",
    difficulty: "hard",
    yearOrSource: "INBDE / SDLE Dental Licensure",
    sourceOrganization: "American Dental Association (ADA) & ASRA Guidelines",
    referenceBook: "Handbook of Local Anesthesia (7th Ed), Stanley F. Malamed, Chapter 18"
  },
  {
    id: "q-den-2",
    specialty: "dentistry",
    category: "Endodontics & Pulp Diagnosis",
    caseVignette: "A 35-year-old female presents with severe throbbing spontaneous pain in the mandibular right first molar (tooth #30) that lingers for several minutes following cold or hot stimuli. The tooth is sensitive to percussion. Electric pulp testing (EPT) produces an exaggerated response. Periapical radiograph shows a deep occlusal carious lesion encroaching on the pulp chamber with normal periapical ligament space.",
    questionText: "What is the correct pulpal and periapical diagnosis according to American Association of Endodontists (AAE) criteria?",
    options: [
      { id: "A", text: "Reversible Pulpitis with Normal Apical Tissues" },
      { id: "B", text: "Symptomatic Irreversible Pulpitis with Symptomatic Apical Periodontitis" },
      { id: "C", text: "Pulp Necrosis with Chronic Apical Abscess" },
      { id: "D", text: "Asymptomatic Irreversible Pulpitis with Condensing Osteitis" }
    ],
    correctOptionId: "B",
    explanation: "Spontaneous lingering pain (> 30 seconds) provoked by thermal stimuli is the hallmark of Symptomatic Irreversible Pulpitis. Pain to percussion indicates inflammation has extended into the periodontal ligament space, indicating Symptomatic Apical Periodontitis. Treatment is non-surgical root canal therapy (pulpectomy) or extraction.",
    highYieldPearl: "Reversible pulpitis pain resolves immediately (within 1-2 seconds) after removal of the thermal stimulus, whereas irreversible pulpitis features prolonged, lingering pain.",
    difficulty: "medium",
    yearOrSource: "INBDE Endodontics Core",
    sourceOrganization: "American Association of Endodontists (AAE)",
    referenceBook: "Cohen's Pathways of the Pulp (12th Ed), Chapter 1"
  },
  {
    id: "q-den-3",
    specialty: "dentistry",
    category: "Periodontology & Staging",
    caseVignette: "A 48-year-old male smoker (1 pack/day) undergoes periodontal examination. Interdental clinical attachment loss (CAL) is 5 mm at the site of greatest loss, radiographic bone loss extends to the middle third of the root (35%), and probing depths are 6 mm. No teeth have been lost due to periodontitis.",
    questionText: "Under the 2017 AAP/EFP Periodontal Disease Classification, what is the correct Periodontitis Staging and Grading for this patient?",
    options: [
      { id: "A", text: "Stage I, Grade A" },
      { id: "B", text: "Stage II, Grade B" },
      { id: "C", text: "Stage III, Grade C (Smoking \u2265 10 cigarettes/day modifies Grade to C)" },
      { id: "D", text: "Stage IV, Grade A" }
    ],
    correctOptionId: "C",
    explanation: "CAL \u2265 5 mm and radiographic bone loss to the middle third of the root signifies Stage III Periodontitis. Smoking \u2265 10 cigarettes per day is a key grade modifier that automatically elevates the disease progression rate to Grade C (rapid rate of progression).",
    highYieldPearl: "Periodontitis Staging (I to IV) describes the severity and complexity of management, while Grading (A, B, C) estimates the rate of progression and responsiveness to therapy.",
    difficulty: "medium",
    yearOrSource: "INBDE / SDLE Periodontics",
    sourceOrganization: "American Academy of Periodontology (AAP) & EFP",
    referenceBook: "Carranza's Clinical Periodontology (13th Ed), Chapter 5"
  },
  {
    id: "q-den-4",
    specialty: "dentistry",
    category: "Oral & Maxillofacial Surgery",
    caseVignette: "A 28-year-old male presents to the clinic 3 days after an uneventful surgical extraction of an impacted mandibular third molar (#32). He complains of severe, throbbing, radiating pain to his ear that is poorly relieved by analgesics. Intraoral exam reveals an empty socket with exposed alveolar bone devoid of a blood clot, with marked fetid odor.",
    questionText: "What is the diagnosis, and what is the recommended immediate conservative management?",
    options: [
      { id: "A", text: "Osteomyelitis; surgical debridement and IV Vancomycin" },
      { id: "B", text: "Periapical cyst; curettage under local anesthesia" },
      { id: "C", text: "Submandibular space infection; incision and drainage" },
      { id: "D", text: "Alveolar Osteitis (Dry Socket); gentle irrigation with warm saline and placement of a sedative dressing (e.g. Eugenol-impregnated gauze)" }
    ],
    correctOptionId: "D",
    explanation: "Alveolar osteitis ('dry socket') occurs when the post-extraction blood clot dislodges or undergoes premature fibrinolysis, exposing bone to oral fluids and air. Treatment is conservative: gentle saline irrigation to remove food debris and placement of a medicated sedative pack (containing eugenol). Systemic antibiotics are NOT indicated for uncomplicated dry socket.",
    highYieldPearl: "Risk factors for dry socket include smoking, oral contraceptive use (estrogen increases fibrinolytic activity), and traumatic extractions.",
    difficulty: "easy",
    yearOrSource: "INBDE / SDLE Surgery",
    sourceOrganization: "American Association of Oral and Maxillofacial Surgeons (AAOMS)",
    referenceBook: "Contemporary Oral and Maxillofacial Surgery (7th Ed), Hupp, Chapter 8"
  },
  {
    id: "q-den-5",
    specialty: "dentistry",
    category: "Oral Pathology",
    caseVignette: "A 55-year-old male with a 30 pack-year smoking history and heavy alcohol consumption presents with a persistent, non-healing ulcerated white and red lesion (erythroleukoplakia) on the lateral border of the tongue for 6 weeks. Induration is noted on palpation with non-tender ipsilateral cervical lymphadenopathy.",
    questionText: "What is the most likely diagnosis, and what is the mandatory next step?",
    options: [
      { id: "A", text: "Oral Squamous Cell Carcinoma (OSCC); urgent incisional biopsy of the lesion margin" },
      { id: "B", text: "Recurrent Aphthous Stomatitis; prescribe topical Triamcinolone acetonide" },
      { id: "C", text: "Oral Candidiasis; prescribe Nystatin oral suspension for 2 weeks" },
      { id: "D", text: "Geographic tongue; reassurance and nutritional advice" }
    ],
    correctOptionId: "A",
    explanation: "Persistent lesions (> 2 weeks) with induration, erythroleukoplakia, lateral tongue location, and risk factors (tobacco and alcohol) are highly suspicious for Oral Squamous Cell Carcinoma (OSCC). Immediate incisional biopsy of the margin including viable lesion tissue is mandatory for histopathological staging.",
    highYieldPearl: "High-risk anatomical sites for oral cancer: ventrolateral border of the tongue and the floor of the mouth.",
    difficulty: "medium",
    yearOrSource: "INBDE Pathology",
    sourceOrganization: "American Academy of Oral and Maxillofacial Pathology (AAOMP)",
    referenceBook: "Oral and Maxillofacial Pathology (4th Ed), Neville, Chapter 10"
  },
  {
    id: "q-den-6",
    specialty: "dentistry",
    category: "Pediatric Dentistry & Dental Trauma",
    caseVignette: "An 8-year-old girl falls from a bicycle, avulsing her maxillary permanent central incisor (#8) 20 minutes ago. The parent found the tooth on the clean grass and brings the child immediately to the dental clinic.",
    questionText: "What is the most appropriate management according to International Association of Dental Traumatology (IADT) guidelines?",
    options: [
      { id: "A", text: "Scrape the root surface with a curette to remove periodontal ligament remnants before replantation" },
      { id: "B", text: "Gently rinse with saline (handle by crown only), replant immediately, and splint with a flexible splint for 2 weeks" },
      { id: "C", text: "Place the tooth in dry gauze and delay replantation for 24 hours" },
      { id: "D", text: "Perform immediate extraoral root canal treatment before replanting" }
    ],
    correctOptionId: "B",
    explanation: "For an avulsed permanent tooth with open or closed apex, replantation within 60 minutes offers the highest chance of periodontal ligament (PDL) cell survival. The root surface should NOT be scraped or sterilized. It is gently rinsed with saline/milk, replanted, and splinted with a flexible splint for 1 to 2 weeks.",
    highYieldPearl: "Avulsed PRIMARY teeth should NEVER be replanted to prevent damage to the underlying permanent tooth germ.",
    difficulty: "medium",
    yearOrSource: "IADT Trauma Guidelines / INBDE",
    sourceOrganization: "International Association of Dental Traumatology (IADT)",
    referenceBook: "Textbook and Color Atlas of Traumatic Injuries to the Teeth (5th Ed), Chapter 14"
  },
  {
    id: "q-den-7",
    specialty: "dentistry",
    category: "Dental Pharmacology & Antibiotics",
    caseVignette: "A 42-year-old male with severe acute apical abscess originating from tooth #19 presents with diffuse facial swelling, fever (38.5\u00b0C), and moderate trismus. He reports a severe anaphylactic reaction (hives and angioedema) to Penicillin in the past.",
    questionText: "Which antibiotic is the most appropriate alternative for this odontogenic infection?",
    options: [
      { id: "A", text: "Amoxicillin-Clavulanate" },
      { id: "B", text: "Cephalexin" },
      { id: "C", text: "Clindamycin or Clarithromycin" },
      { id: "D", text: "Ampicillin" }
    ],
    correctOptionId: "C",
    explanation: "In patients with confirmed severe IgE-mediated allergy (anaphylaxis, angioedema) to penicillin, beta-lactams (including cephalosporins) are avoided. Clindamycin provides excellent bone penetration and anaerobic coverage against oral streptococci and Bacteroides species.",
    highYieldPearl: "Antibiotics in dentistry are adjuncts to definitive surgical/endodontic intervention (incision and drainage, pulpectomy, or extraction) and should NOT be prescribed for localized pulpitis.",
    difficulty: "easy",
    yearOrSource: "ADA Guidelines / INBDE",
    sourceOrganization: "American Dental Association (ADA)",
    referenceBook: "Pharmacology and Therapeutics for Dentistry (7th Ed), Chapter 33"
  },
  {
    id: "q-den-8",
    specialty: "dentistry",
    category: "Restorative Dentistry & Dental Materials",
    caseVignette: "A dentist is placing a Class II composite resin restoration on a maxillary premolar. During the adhesive protocol, the dentin is etched with 37% phosphoric acid.",
    questionText: "What is the primary consequence of excessive acid etching or over-drying (dessication) of the demineralized dentin surface?",
    options: [
      { id: "A", text: "Accelerated polymerization of composite resin" },
      { id: "B", text: "Complete remineralization of the dentinal tubules within 24 hours" },
      { id: "C", text: "Spontaneous pulpal necrosis in 100% of cases" },
      { id: "D", text: "Collapse of the collagen fibril network, leading to poor resin monomer penetration and postoperative sensitivity" }
    ],
    correctOptionId: "D",
    explanation: "Acid etching removes the smear layer and demineralizes superficial dentin, exposing a delicate collagen network. If over-dried, the exposed collagen fibrils collapse, preventing penetration of the hydrophilic primer and resin monomers, resulting in a defective hybrid layer and postoperative sensitivity.",
    highYieldPearl: "Wet bonding technique: Dentin should remain slightly moist ('glistening') after rinsing the etchant to maintain collagen architecture prior to primer application.",
    difficulty: "medium",
    yearOrSource: "INBDE Restorative Core",
    sourceOrganization: "Academy of Operative Dentistry",
    referenceBook: "Sturdevant's Art and Science of Operative Dentistry (7th Ed), Chapter 7"
  },
  {
    id: "q-nur-1",
    specialty: "nursing",
    category: "Cardiovascular & ACLS Critical Care",
    caseVignette: "A registered nurse on a telemetry unit observes sudden onset of ventricular fibrillation (VF) on the cardiac monitor for a 65-year-old postoperative patient. The nurse enters the room, confirms the patient is unresponsive, pulseless, and apneic, and calls the code team.",
    questionText: "What is the priority immediate nursing intervention according to AHA ACLS/BLS guidelines?",
    options: [
      { id: "A", text: "Initiate immediate high-quality chest compressions and defibrillate as soon as the defibrillator is ready" },
      { id: "B", text: "Administer IV Amiodarone 300 mg bolus" },
      { id: "C", text: "Perform endotracheal intubation before any compressions" },
      { id: "D", text: "Administer IV Epinephrine 1 mg before rhythm analysis" }
    ],
    correctOptionId: "A",
    explanation: "For shockable cardiac arrest rhythms (Ventricular Fibrillation and Pulseless Ventricular Tachycardia), the most critical determinants of survival are immediate high-quality CPR (compressions at 100-120/min, depth 2-2.4 inches, allowing complete recoil) and rapid defibrillation. Every minute of delay in defibrillation reduces survival by 7-10%.",
    highYieldPearl: "Chest compression fraction (CCF) should be kept above 80% with interruptions minimized to less than 10 seconds during rhythm checks and shock delivery.",
    difficulty: "easy",
    yearOrSource: "AHA ACLS Guidelines / NCLEX-RN",
    sourceOrganization: "American Heart Association (AHA) 2020-2025 Guidelines",
    referenceBook: "Brunner & Suddarth's Medical-Surgical Nursing (15th Ed), Chapter 27"
  },
  {
    id: "q-nur-2",
    specialty: "nursing",
    category: "Pharmacology & High-Alert Medications",
    caseVignette: "A patient with deep vein thrombosis is receiving continuous intravenous Heparin infusion at 1,400 units/hour. The latest activated partial thromboplastin time (aPTT) returns at 135 seconds (Therapeutic target: 60 - 80 seconds). The nurse notes epistaxis and active oozing around the peripheral IV insertion site.",
    questionText: "What is the immediate nursing action, and what is the specific antidote to prepare if ordered?",
    options: [
      { id: "A", text: "Slow the rate by 50% and administer Vitamin K1 (Phytonadione)" },
      { id: "B", text: "Stop the Heparin infusion immediately and prepare Protamine Sulfate for reversal" },
      { id: "C", text: "Continue current rate and recheck aPTT in 4 hours" },
      { id: "D", text: "Administer Fresh Frozen Plasma while increasing Heparin rate" }
    ],
    correctOptionId: "B",
    explanation: "An aPTT of 135 seconds in the presence of active bleeding indicates severe heparin overdose. The nurse must immediately stop the IV infusion and notify the provider. Protamine Sulfate is the specific antidote; 1 mg of protamine neutralizes approximately 100 units of unfractionated heparin.",
    highYieldPearl: "Protamine sulfate must be administered slowly by IV push over 10 minutes to prevent acute hypotension, bradycardia, and anaphylactoid reactions.",
    difficulty: "medium",
    yearOrSource: "NCLEX-RN Next Gen / SNLE",
    sourceOrganization: "Institute for Safe Medication Practices (ISMP)",
    referenceBook: "Saunders Comprehensive Review for the NCLEX-RN (9th Ed), Chapter 43"
  },
  {
    id: "q-nur-3",
    specialty: "nursing",
    category: "Prioritization & Delegation (CJMM)",
    caseVignette: "A medical-surgical charge nurse has four patients assigned to her unit. Which patient should the nurse assess FIRST?",
    questionText: "Which patient demonstrates the highest priority clinical urgency?",
    options: [
      { id: "A", text: "A 45-year-old with acute pancreatitis requesting PRN pain medication" },
      { id: "B", text: "A 58-year-old with type 2 diabetes whose morning fasting fingerstick blood glucose is 190 mg/dL" },
      { id: "C", text: "A 62-year-old patient who had a thyroidectomy 6 hours ago and is now displaying audible stridor, restlessness, and tachypnea" },
      { id: "D", text: "A 70-year-old with chronic heart failure whose bilateral ankle edema has increased from 1+ to 2+" }
    ],
    correctOptionId: "C",
    explanation: "Using the Airway-Breathing-Circulation (ABC) framework, stridor in a post-thyroidectomy patient indicates life-threatening upper airway obstruction due to hematoma compression or bilateral recurrent laryngeal nerve injury. This is a critical surgical emergency requiring immediate airway assessment and tracheostomy kit standby.",
    highYieldPearl: "Always keep an emergency tracheostomy tray, suction, and calcium gluconate at the bedside of post-thyroidectomy patients.",
    difficulty: "medium",
    yearOrSource: "NCLEX-RN Clinical Judgment Model (CJMM)",
    sourceOrganization: "National Council of State Boards of Nursing (NCSBN)",
    referenceBook: "Prioritization, Delegation, and Assignment (5th Ed), Linda LaCharity"
  },
  {
    id: "q-nur-4",
    specialty: "nursing",
    category: "Fluid, Electrolyte & Acid-Base Balance",
    caseVignette: "A nurse is caring for a patient with acute renal failure whose serum potassium level is 6.8 mEq/L. The ECG monitor reveals tall, peaked T waves and prolonged PR interval.",
    questionText: "Which medication should the nurse anticipate administering FIRST to protect the myocardium against fatal arrhythmias?",
    options: [
      { id: "A", text: "Subcutaneous Regular Insulin alone" },
      { id: "B", text: "Oral Sodium Polystyrene Sulfonate (Kayexalate)" },
      { id: "C", text: "Intravenous Furosemide bolus" },
      { id: "D", text: "Intravenous Calcium Gluconate 10%" }
    ],
    correctOptionId: "D",
    explanation: "In severe hyperkalemia with ECG changes, IV Calcium Gluconate (or Calcium Chloride) must be given immediately. Calcium antagonizes membrane excitability and stabilizes the cardiac resting membrane potential without altering serum potassium levels, preventing ventricular fibrillation.",
    highYieldPearl: "Follow Calcium Gluconate with IV Regular Insulin (10 units) plus 50 mL of 50% Dextrose (D50W) and Nebulized Albuterol to shift potassium intracellularly.",
    difficulty: "medium",
    yearOrSource: "NCLEX-RN / SNLE Nursing",
    sourceOrganization: "Emergency Nurses Association (ENA)",
    referenceBook: "Brunner & Suddarth's Medical-Surgical Nursing (15th Ed), Chapter 13"
  },
  {
    id: "q-nur-5",
    specialty: "nursing",
    category: "Pediatric Nursing & Respiratory Emergencies",
    caseVignette: "A 3-year-old child is brought to the emergency department sitting in a 'tripod' position, leaning forward with neck hyperextended, drooling saliva, and exhibiting inspiratory stridor with marked anxiety. Temperature is 39.7\u00b0C.",
    questionText: "What action is strictly CONTRAINDICATED during the initial nursing assessment?",
    options: [
      { id: "A", text: "Visualizing the pharynx with a tongue blade or swab" },
      { id: "B", text: "Administering humidified oxygen in a blow-by fashion" },
      { id: "C", text: "Allowing the child to remain on the parent's lap" },
      { id: "D", text: "Alerting an anesthesiologist and otolaryngologist for airway management" }
    ],
    correctOptionId: "A",
    explanation: "The clinical presentation (high fever, drooling, dysphagia, dysphonia, distressed tripod posture) is classic for Acute Epiglottitis (caused by Haemophilus influenzae type b or Streptococcus). Inspecting the throat with a tongue blade can trigger immediate complete laryngospasm and fatal airway occlusion.",
    highYieldPearl: "Maintain a calm environment, do NOT separate the child from the parent, do NOT attempt IV placement until the airway is secured in the operating room.",
    difficulty: "easy",
    yearOrSource: "NCLEX-RN Pediatrics",
    sourceOrganization: "Society of Pediatric Nurses (SPN)",
    referenceBook: "Wong's Essentials of Pediatric Nursing (11th Ed), Chapter 21"
  },
  {
    id: "q-nur-6",
    specialty: "nursing",
    category: "Maternal & Newborn Nursing",
    caseVignette: "A postpartum nurse is assessing a client 2 hours following an uncomplicated vaginal delivery of an 8 lb 4 oz infant. On palpation, the uterine fundus is soft, boggy, and displaced to the right of the umbilicus. Lochia rubra is heavy, soaking one peripad in 20 minutes.",
    questionText: "What is the initial nursing action?",
    options: [
      { id: "A", text: "Administer IV Methylergonovine immediately without checking blood pressure" },
      { id: "B", text: "Assist the client to void or catheterize to empty the bladder, then perform gentle fundal massage" },
      { id: "C", text: "Place the client in high Fowler's position" },
      { id: "D", text: "Prepare the client for emergent hysterectomy" }
    ],
    correctOptionId: "B",
    explanation: "A boggy uterus displaced laterally (usually to the right) indicates a distended urinary bladder, which prevents effective uterine myometrial contraction and causes uterine atony (the leading cause of primary postpartum hemorrhage). Emptying the bladder followed by fundal massage restores uterine tone.",
    highYieldPearl: "Methylergonovine (Methergine) is contraindicated in hypertensive clients due to its potent vasoconstrictive effect.",
    difficulty: "medium",
    yearOrSource: "NCLEX-RN Maternal-Newborn",
    sourceOrganization: "AWHONN & ACOG",
    referenceBook: "Maternal-Child Nursing (6th Ed), McKinney, Chapter 28"
  },
  {
    id: "q-nur-7",
    specialty: "nursing",
    category: "Neurological Assessment & ICP",
    caseVignette: "A nurse is monitoring a client with a severe traumatic brain injury in the ICU. The client's baseline Glasgow Coma Scale (GCS) was 12. Two hours later, the client is difficult to arouse, the left pupil is dilated (6 mm) and sluggish to light, and vital signs show BP 184/60 mmHg, HR 48 bpm, and irregular respirations.",
    questionText: "What pathophysiological triad is represented by these vital sign changes, and what does it signify?",
    options: [
      { id: "A", text: "Virchow's triad; Pulmonary Embolism" },
      { id: "B", text: "Beck's triad; Cardiac tamponade" },
      { id: "C", text: "Cushing's triad; Impending brain herniation due to severely increased intracranial pressure (ICP)" },
      { id: "D", text: "Charcot's triad; Acute ascending cholangitis" }
    ],
    correctOptionId: "C",
    explanation: "Cushing's Triad (systolic hypertension with widened pulse pressure, bradycardia, and irregular/Cheyne-Stokes respirations) is a late and ominous sign of severe intracranial hypertension and brainstem compression (herniation). Unilateral pupil dilation indicates uncal herniation compressing cranial nerve III.",
    highYieldPearl: "Elevate head of bed to 30 degrees, maintain neck in neutral midline position to facilitate jugular venous drainage, and avoid hyperthermia and hypovolemia.",
    difficulty: "hard",
    yearOrSource: "CCRN / NCLEX-RN Critical Care",
    sourceOrganization: "American Association of Critical-Care Nurses (AACN)",
    referenceBook: "Brunner & Suddarth's Medical-Surgical Nursing (15th Ed), Chapter 66"
  },
  {
    id: "q-nur-8",
    specialty: "nursing",
    category: "Infection Control & PPE Standards",
    caseVignette: "A patient with active, cavitary pulmonary tuberculosis (TB) is admitted to the medical unit. The nurse prepares to enter the room to administer medications.",
    questionText: "Which type of transmission-based precautions and personal protective equipment (PPE) are required?",
    options: [
      { id: "A", text: "Standard Precautions with positive pressure room" },
      { id: "B", text: "Droplet Precautions; Standard surgical mask only" },
      { id: "C", text: "Contact Precautions; Gown and clean gloves only" },
      { id: "D", text: "Airborne Precautions; Airborne Infection Isolation Room (AIIR / negative pressure) and N95 particulate respirator (or PAPR)" }
    ],
    correctOptionId: "D",
    explanation: "Mycobacterium tuberculosis is transmitted via droplet nuclei (< 5 \u03bcm) that remain suspended in the air. Airborne Precautions mandate an Airborne Infection Isolation Room (negative pressure room with \u2265 12 air changes per hour) and a fitted N95 respirator mask worn by healthcare workers.",
    highYieldPearl: "If the patient must be transported outside the room for essential tests, the PATIENT must wear a standard surgical mask.",
    difficulty: "easy",
    yearOrSource: "CDC Guidelines / NCLEX-RN",
    sourceOrganization: "Centers for Disease Control and Prevention (CDC)",
    referenceBook: "Potter & Perry's Fundamentals of Nursing (10th Ed), Chapter 28"
  },
  {
    id: "q-lab-1",
    specialty: "lab",
    category: "Hematology & Coagulation",
    caseVignette: "A 9-year-old boy presents with hemarthrosis of the right knee following minor blunt trauma. Coagulation panel results: Prothrombin Time (PT): 12.0 sec (normal 11-13 sec), Activated Partial Thromboplastin Time (aPTT): 68 sec (normal 25-35 sec), Platelet Count: 285,000/\u03bcL, Bleeding Time: normal. Mixing study with normal pooled plasma corrects the prolonged aPTT to 28 sec immediately and after 2 hours of incubation.",
    questionText: "What is the most likely diagnosis indicated by the corrected mixing study?",
    options: [
      { id: "A", text: "Factor VIII deficiency (Hemophilia A) or Factor IX deficiency (Hemophilia B)" },
      { id: "B", text: "Lupus Anticoagulant (Factor inhibitor)" },
      { id: "C", text: "Disseminated Intravascular Coagulation (DIC)" },
      { id: "D", text: "Severe Vitamin K deficiency" }
    ],
    correctOptionId: "A",
    explanation: "An isolated prolonged aPTT with normal PT and platelet count indicates an abnormality in the intrinsic coagulation pathway (Factors VIII, IX, XI, XII). A 1:1 mixing study that corrects into the normal range indicates a FACTOR DEFICIENCY rather than a circulating inhibitor. Hemophilia A (Factor VIII) and Hemophilia B (Factor IX) are the classic causes of hemarthrosis in young males.",
    highYieldPearl: "If the prolonged aPTT fails to correct upon mixing with normal plasma, a factor inhibitor (such as a factor VIII autoantibody or lupus anticoagulant) is present.",
    difficulty: "medium",
    yearOrSource: "ASCP Board of Certification / SLLE",
    sourceOrganization: "American Society for Clinical Pathology (ASCP)",
    referenceBook: "Rodak's Hematology: Clinical Principles and Applications (6th Ed), Chapter 37"
  },
  {
    id: "q-lab-2",
    specialty: "lab",
    category: "Immunohematology (Blood Banking)",
    caseVignette: "During pre-transfusion testing for a 45-year-old female scheduled for hysterectomy, blood typing results show: Forward Typing: Anti-A (+4), Anti-B (0), Anti-D (+4). Reverse Typing: A1 cells (0), B cells (+4). The antibody screen is positive at 37\u00b0C in the AHG phase for Panel Cell 1 and 3.",
    questionText: "What is the patient's ABO/Rh blood type, and what is the mandatory next step before releasing crossmatched packed red blood cells?",
    options: [
      { id: "A", text: "B-positive; Release O-negative uncrossmatched blood" },
      { id: "B", text: "A-positive; Perform an Antibody Identification Panel to identify the unexpected red cell alloantibody" },
      { id: "C", text: "AB-positive; Release any crossmatched A-positive units immediately" },
      { id: "D", text: "O-negative; Redo forward typing with Anti-AB" }
    ],
    correctOptionId: "B",
    explanation: "Forward typing confirms presence of A antigen and Rh(D) antigen on RBCs. Reverse typing confirms naturally occurring Anti-B in serum, establishing the blood group as A-positive. A positive unexpected antibody screen requires an Antibody Identification Panel to identify clinically significant IgG antibodies (e.g. anti-Kell, anti-Duffy, anti-Kidd) before providing antigen-negative, AHG-crossmatched blood units.",
    highYieldPearl: "ABO discrepancies must be fully investigated before transfusion: Forward typing detects antigens on patient RBCs; reverse typing detects antibodies in patient serum.",
    difficulty: "medium",
    yearOrSource: "ASCP Immunohematology Core / AABB",
    sourceOrganization: "Association for the Advancement of Blood & Biotherapies (AABB)",
    referenceBook: "Modern Blood Banking & Transfusion Practices (7th Ed), Denise M. Harmening"
  },
  {
    id: "q-lab-3",
    specialty: "lab",
    category: "Diagnostic Microbiology",
    caseVignette: "A urine culture from a 26-year-old female with acute uncomplicated cystitis yields > 100,000 CFU/mL of a Gram-negative bacillus on MacConkey agar displaying bright pink, lactose-fermenting colonies with a precipitated bile zone. Biochemical testing: Indole: Positive, Methyl Red: Positive, Voges-Proskauer: Negative, Citrate: Negative (IMViC ++--), Oxidase: Negative.",
    questionText: "What is the definitive identity of this common urinary pathogen?",
    options: [
      { id: "A", text: "Klebsiella pneumoniae" },
      { id: "B", text: "Proteus mirabilis" },
      { id: "C", text: "Escherichia coli" },
      { id: "D", text: "Pseudomonas aeruginosa" }
    ],
    correctOptionId: "C",
    explanation: "Lactose-fermenting Gram-negative rod producing pink colonies on MacConkey agar, oxidase negative, and classic IMViC ++-- (Indole positive, Methyl Red positive, VP negative, Citrate negative) is the textbook biochemical profile of Escherichia coli, the causative agent in > 80% of community-acquired UTIs.",
    highYieldPearl: "Klebsiella pneumoniae is also a lactose fermenter but is typically Indole negative and Citrate positive (IMViC --++), producing mucoid colonies due to its prominent polysaccharide capsule.",
    difficulty: "easy",
    yearOrSource: "ASCP Microbiology Core",
    sourceOrganization: "American Society for Microbiology (ASM)",
    referenceBook: "Bailey & Scott's Diagnostic Microbiology (15th Ed), Chapter 20"
  },
  {
    id: "q-lab-4",
    specialty: "lab",
    category: "Clinical Chemistry & Enzymology",
    caseVignette: "A 42-year-old male presents with severe epigastric pain radiating to the back following an alcohol binge. Serum amylase is 950 U/L (Reference: 28-100 U/L) and serum lipase is 1,200 U/L (Reference: 13-60 U/L).",
    questionText: "Why is serum Lipase considered clinically superior to serum Amylase for the laboratory diagnosis of acute pancreatitis?",
    options: [
      { id: "A", text: "Lipase can be detected by rapid urine dipstick at the bedside" },
      { id: "B", text: "Amylase is only synthesized in salivary glands" },
      { id: "C", text: "Lipase levels never increase in renal insufficiency" },
      { id: "D", text: "Lipase has higher sensitivity and remains elevated for a significantly longer duration (7-14 days vs 3-5 days for amylase)" }
    ],
    correctOptionId: "D",
    explanation: "Serum lipase is synthesized almost exclusively by pancreatic acinar cells, giving it higher diagnostic specificity than amylase (which is also produced by salivary glands, fallopian tubes, and tumors). Furthermore, lipase remains elevated in plasma for 7-14 days compared to amylase which clears in 3-5 days.",
    highYieldPearl: "Lipase levels \u2265 3 times the upper limit of normal are virtually diagnostic of acute pancreatitis in the appropriate clinical setting.",
    difficulty: "medium",
    yearOrSource: "ASCP Clinical Chemistry",
    sourceOrganization: "American Association for Clinical Chemistry (ADLM)",
    referenceBook: "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics (7th Ed), Chapter 28"
  },
  {
    id: "q-lab-5",
    specialty: "lab",
    category: "Hematology & Peripheral Blood Smear",
    caseVignette: "A peripheral blood smear from a 62-year-old male undergoing investigation for marked leukocytosis (WBC 85,000/\u03bcL) demonstrates an abundance of small, mature-appearing lymphocytes with numerous fragile, disrupted 'smudge cells' (basket cells). Flow cytometry reveals CD5+, CD19+, and CD23+ clonal B-cell population.",
    questionText: "What is the definitive hematologic malignancy?",
    options: [
      { id: "A", text: "Chronic Lymphocytic Leukemia (CLL)" },
      { id: "B", text: "Acute Myeloid Leukemia (AML)" },
      { id: "C", text: "Chronic Myelogenous Leukemia (CML)" },
      { id: "D", text: "Hairy Cell Leukemia" }
    ],
    correctOptionId: "A",
    explanation: "Chronic Lymphocytic Leukemia (CLL) is the most common leukemia in older adults. Hallmarks include persistent absolute lymphocytosis, smudge cells on peripheral smear (fragile leukemic cells damaged during slide preparation), and co-expression of CD19 (B-cell) and CD5 (T-cell marker) with CD23 on flow cytometry.",
    highYieldPearl: "Adding a drop of 22% Bovine Albumin to the blood prior to making the blood film stabilizes smudge cells in CLL, allowing an accurate differential count.",
    difficulty: "medium",
    yearOrSource: "ASCP Hematology Core",
    sourceOrganization: "College of American Pathologists (CAP)",
    referenceBook: "Rodak's Hematology: Clinical Principles and Applications (6th Ed), Chapter 33"
  },
  {
    id: "q-lab-6",
    specialty: "lab",
    category: "Urinalysis & Renal Pathology",
    caseVignette: "A 10-year-old boy presents with facial edema and dark, tea-colored urine 2 weeks following an untreated streptococcal pharyngeal infection. Microscopic urinalysis reveals prominent Red Blood Cell (RBC) Casts, dysmorphic RBCs, and 2+ proteinuria.",
    questionText: "The presence of Red Blood Cell (RBC) casts in urinary sediment is pathognomonic for which anatomical source of bleeding?",
    options: [
      { id: "A", text: "Lower urinary tract hemorrhage (e.g. cystitis or urethritis)" },
      { id: "B", text: "Glomerular inflammation (e.g. Acute Glomerulonephritis)" },
      { id: "C", text: "Acute pyelonephritis" },
      { id: "D", text: "Urolithiasis (nephrolithiasis)" }
    ],
    correctOptionId: "B",
    explanation: "RBC casts form when red blood cells traverse a damaged glomerular basement membrane and become entrapped in a matrix of Tamm-Horsfall mucoprotein inside renal distal convoluted tubules. Their presence confirms a glomerular origin of hematuria, distinguishing glomerulonephritis from lower urinary tract bleeding.",
    highYieldPearl: "WBC casts indicate acute pyelonephritis or acute interstitial nephritis; Muddy brown granular casts indicate acute tubular necrosis (ATN).",
    difficulty: "easy",
    yearOrSource: "ASCP Urinalysis Core / SLLE",
    sourceOrganization: "Clinical Laboratory Standards Institute (CLSI)",
    referenceBook: "Fundamentals of Urine and Body Fluid Analysis (4th Ed), Brunzel"
  },
  {
    id: "q-lab-7",
    specialty: "lab",
    category: "Quality Control & Westgard Rules",
    caseVignette: "In a clinical chemistry laboratory running daily internal quality control for serum Glucose, two consecutive control observations exceed the mean plus 2 standard deviations (+2s) on the same side of the mean.",
    questionText: "Which Westgard Multi-Rule is violated, and what type of error does it typically detect?",
    options: [
      { id: "A", text: "1_3s rule; Random error" },
      { id: "B", text: "R_4s rule; Random error" },
      { id: "C", text: "2_2s rule; Systematic error (bias)" },
      { id: "D", text: "4_1s rule; Gross operator error" }
    ],
    correctOptionId: "C",
    explanation: "The 2_2s Westgard rule is violated when two consecutive control measurements exceed the same +2s or -2s limit. This rule violation is sensitive to systematic error (shift or bias, such as reagent lot variation, standard calibration drift, or temperature fluctuations) and requires holding patient runs until corrected.",
    highYieldPearl: "Random errors are detected by 1_3s and R_4s rules (e.g. bubbles, pipetting precision error, electrical surges); systematic errors are detected by 2_2s, 4_1s, and 10x rules.",
    difficulty: "hard",
    yearOrSource: "ASCP Quality Assurance",
    sourceOrganization: "Westgard Quality Corporation & CLSI",
    referenceBook: "Basic QC Practices (4th Ed), James O. Westgard"
  },
  {
    id: "q-lab-8",
    specialty: "lab",
    category: "Clinical Immunology & Serology",
    caseVignette: "A serum sample tested for syphilis by the Rapid Plasma Reagin (RPR) non-treponemal flocculation test yields a weakly reactive result at 1:1 dilution, but when diluted to 1:64, the reaction becomes strongly reactive (+4).",
    questionText: "What immunological phenomenon explains this false-negative or falsely weak reaction in undiluted specimen?",
    options: [
      { id: "A", text: "Hook effect in competitive immunoassay" },
      { id: "B", text: "Postzone phenomenon (Antigen excess)" },
      { id: "C", text: "Heterophile antibody cross-reactivity" },
      { id: "D", text: "Prozone phenomenon (Antibody excess)" }
    ],
    correctOptionId: "D",
    explanation: "The Prozone phenomenon occurs in agglutination/flocculation tests when there is an overwhelming excess of antibodies relative to antigen. The high antibody concentration prevents cross-linking of lattice complexes, leading to a false-negative or falsely low reaction until the serum is properly diluted.",
    highYieldPearl: "Postzone phenomenon occurs when antigen is present in excess relative to antibody, also preventing optimal lattice formation.",
    difficulty: "medium",
    yearOrSource: "ASCP Immunology",
    sourceOrganization: "American Society for Clinical Pathology",
    referenceBook: "Clinical Immunology and Serology: A Laboratory Perspective (5th Ed), Stevens"
  },
  {
    id: "q-rad-1",
    specialty: "radiology",
    category: "Radiation Protection & ALARA Physics",
    caseVignette: "A radiologic technologist is calculating occupational radiation exposure while assisting during long fluoroscopically guided interventional cardiac procedures.",
    questionText: "According to the Inverse Square Law, if the technologist increases their physical distance from the X-ray tube and patient scatter source from 1 meter to 3 meters, by what factor is their radiation exposure dose reduced?",
    options: [
      { id: "A", text: "Reduced to 1/9 of the initial dose (decreases by a factor of 9)" },
      { id: "B", text: "Reduced to 1/3 of the initial dose" },
      { id: "C", text: "Reduced to 1/2 of the initial dose" },
      { id: "D", text: "Reduced to 1/6 of the initial dose" }
    ],
    correctOptionId: "A",
    explanation: "The Inverse Square Law states that the intensity (I) of radiation is inversely proportional to the square of the distance (d) from the source: I1/I2 = (d2/d1)\u00b2. Increasing distance by a factor of 3 (from 1 m to 3 m) decreases radiation exposure to (1/3)\u00b2 = 1/9 of the original intensity. Distance is the most effective occupational protection measure.",
    highYieldPearl: "The three cardinal principles of radiation protection under the ALARA (As Low As Reasonably Achievable) concept are: Time (minimize), Distance (maximize), and Shielding (utilize lead aprons \u2265 0.5 mm Pb equivalent).",
    difficulty: "easy",
    yearOrSource: "ARRT Radiography Physics Board",
    sourceOrganization: "NCRP (National Council on Radiation Protection and Measurements)",
    referenceBook: "Radiologic Science for Technologists (12th Ed), Stewart C. Bushong, Chapter 4"
  },
  {
    id: "q-rad-2",
    specialty: "radiology",
    category: "Computed Tomography (CT) Contrast Safety",
    caseVignette: "A 68-year-old male with chronic kidney disease stage 3b (eGFR 32 mL/min/1.73m\u00b2) is scheduled for an urgent contrast-enhanced CT of the abdomen to evaluate for bowel ischemia.",
    questionText: "According to American College of Radiology (ACR) guidelines, what is the single most effective evidence-based intervention to prevent Contrast-Induced Acute Kidney Injury (CI-AKI)?",
    options: [
      { id: "A", text: "High-dose intravenous Furosemide immediately following contrast injection" },
      { id: "B", text: "Intravenous volume expansion with isotonic 0.9% Normal Saline before and after contrast administration" },
      { id: "C", text: "Oral Dexamethasone 12 hours and 2 hours prior to scan" },
      { id: "D", text: "Emergency hemodialysis within 1 hour post-contrast administration" }
    ],
    correctOptionId: "B",
    explanation: "According to the ACR and KDIGO guidelines, isotonic intravenous crystalloid hydration (0.9% Normal Saline at 1 mL/kg/hr for 6-12 hours pre-procedure and 6-12 hours post-procedure) is the primary evidence-based method to expand intravascular volume, promote renal tubular flow, and prevent contrast-induced acute kidney injury (CI-AKI). Diuretics are contraindicated as they cause volume contraction.",
    highYieldPearl: "Corticosteroid premedication regimens (e.g., Prednisone 50 mg PO at 13, 7, and 1 hour) prevent IgE-independent anaphylactoid allergic reactions, but have ZERO protective effect against Contrast-Induced Nephrotoxicity.",
    difficulty: "medium",
    yearOrSource: "ARRT / ABR Diagnostic Radiology Core",
    sourceOrganization: "American College of Radiology (ACR) Committee on Drugs and Contrast Media",
    referenceBook: "ACR Manual on Contrast Media (2023 Guidelines)"
  },
  {
    id: "q-rad-3",
    specialty: "radiology",
    category: "Magnetic Resonance Imaging (MRI) Safety & Artifacts",
    caseVignette: "A patient with an implanted cardiac pacemaker and a suspected cerebral aneurysm clipping is brought to the MRI suite for an urgent lumbar spine MRI.",
    questionText: "Which zone of the 4-Zone MRI safety classification system designates the MRI scanner magnet room itself, and what is the absolute requirement before entering?",
    options: [
      { id: "A", text: "Zone I; Accessible to general public with no restrictions" },
      { id: "B", text: "Zone II; Patient reception and initial greeting area only" },
      { id: "C", text: "Zone IV; Strict screening and complete removal of all ferromagnetic objects (Zone IV contains the static magnetic field with projectile risk)" },
      { id: "D", text: "Zone III; Semi-restricted area where ferromagnetic items are permitted with caution" }
    ],
    correctOptionId: "C",
    explanation: "The ACR MRI Safety 4-Zone system classifies MRI suites into:\n- Zone I: General public access (waiting rooms).\n- Zone II: Patient registration, screening, and interview area.\n- Zone III: Strictly restricted, access-controlled area supervised by MRI personnel.\n- Zone IV: The actual MRI scanner room housing the magnet. The fringe field is always active ('The Magnet is ALWAYS ON') presenting severe missile/projectile and pacemaker interference hazards.",
    highYieldPearl: "The primary static magnetic field (B0) is measured in Tesla (1 Tesla = 10,000 Gauss). Even when the MRI scanner is not actively scanning, the superconducting magnetic field is continuously energized.",
    difficulty: "hard",
    yearOrSource: "ARRT MRI Safety Certification",
    sourceOrganization: "American College of Radiology (ACR) Guidance Document on MR Safe Practices",
    referenceBook: "Brant and Helms' Fundamentals of Diagnostic Radiology (5th Ed), Chapter 2"
  },
  {
    id: "q-rad-4",
    specialty: "radiology",
    category: "Chest Radiography Interpretation",
    caseVignette: "A 58-year-old male with acute right-sided pleuritic chest pain and dyspnea has an erect posteroanterior (PA) chest radiograph performed. The film reveals blunting of the right costophrenic angle.",
    questionText: "Approximately how much pleural fluid must accumulate before costophrenic angle blunting becomes visible on an upright PA chest radiograph?",
    options: [
      { id: "A", text: "500 mL of pleural fluid" },
      { id: "B", text: "5 to 10 mL of pleural fluid" },
      { id: "C", text: "Over 1,000 mL of pleural fluid" },
      { id: "D", text: "175 to 200 mL of pleural fluid" }
    ],
    correctOptionId: "D",
    explanation: "On an upright posteroanterior (PA) chest radiograph, blunting of the lateral costophrenic angle typically requires at least 175-200 mL of pleural fluid. On a lateral chest radiograph, blunting of the posterior costophrenic sulcus can be identified with as little as 50-75 mL. A lateral decubitus view can detect as little as 5-10 mL.",
    highYieldPearl: "Ultrasound is significantly more sensitive than upright chest radiographs and can detect as little as 20 mL of pleural effusion while guiding safe thoracentesis.",
    difficulty: "medium",
    yearOrSource: "ARRT / ABR Core Examination",
    sourceOrganization: "Radiological Society of North America (RSNA)",
    referenceBook: "Felson's Principles of Chest Roentgenology (4th Ed), Chapter 8"
  },
  {
    id: "q-rad-5",
    specialty: "radiology",
    category: "Ultrasound Physics & Doppler",
    caseVignette: "A sonographer is evaluating carotid artery stenosis using Color and Spectral Doppler ultrasound. The velocity waveform demonstrates severe aliasing (wrap-around of peak systolic velocities past the baseline display).",
    questionText: "According to the Nyquist theorem, which technical adjustment eliminates or reduces Doppler aliasing?",
    options: [
      { id: "A", text: "Increase the Pulse Repetition Frequency (PRF) / Scale and shift the zero baseline" },
      { id: "B", text: "Increase the ultrasound transducer operating frequency" },
      { id: "C", text: "Adjust the Doppler angle to exactly 0 degrees" },
      { id: "D", text: "Decrease the depth to increase attenuation" }
    ],
    correctOptionId: "A",
    explanation: "Aliasing occurs when the Doppler frequency shift exceeds the Nyquist limit, defined as half the Pulse Repetition Frequency (PRF / 2). To eliminate aliasing: 1) Increase the scale / PRF, 2) Shift the baseline, 3) Use a lower frequency transducer, 4) Increase the Doppler angle (up to 60\u00b0), or 5) Switch to Continuous-Wave (CW) Doppler.",
    highYieldPearl: "The optimal Doppler insonation angle for vascular examination is between 45 and 60 degrees. Angles > 60 degrees produce unacceptable cosine velocity errors.",
    difficulty: "medium",
    yearOrSource: "ARDMS Sonography Principles & Instrumentation (SPI)",
    sourceOrganization: "American Registry for Diagnostic Medical Sonography",
    referenceBook: "Diagnostic Ultrasound: Physics and Equipment (2nd Ed), Chapter 6"
  },
  {
    id: "q-rad-6",
    specialty: "radiology",
    category: "Emergency Neuroimaging & Trauma",
    caseVignette: "A 22-year-old male is struck on the temporal bone during a sporting accident. He experiences a brief loss of consciousness, awakens with a lucid interval of 30 minutes, and then rapidly deteriorates into coma. Non-contrast head CT shows a hyperdense, biconvex (lenticular) extra-axial collection that does not cross cranial suture lines.",
    questionText: "What is the diagnosis, and which blood vessel is most commonly lacerated?",
    options: [
      { id: "A", text: "Subdural Hematoma; Bridging cortical veins" },
      { id: "B", text: "Epidural Hematoma; Middle meningeal artery" },
      { id: "C", text: "Subarachnoid Hemorrhage; Anterior communicating artery aneurysm" },
      { id: "D", text: "Intraparenchymal hemorrhage; Charcot-Bouchard microaneurysm" }
    ],
    correctOptionId: "B",
    explanation: "A biconvex (lens-shaped) hyperdense extra-axial collection limited by cranial sutures (where the dura is firmly adherent to the skull) coupled with a 'lucid interval' is the classic presentation of an Epidural Hematoma (EDH). It typically results from a temporal bone fracture tearing the Middle Meningeal Artery.",
    highYieldPearl: "Subdural hematomas (SDH) are crescent-shaped, cross suture lines, and are caused by tearing of bridging veins (common in elderly and alcoholics with cerebral atrophy).",
    difficulty: "easy",
    yearOrSource: "ABR Core / ARRT Radiography",
    sourceOrganization: "American Society of Emergency Radiology (ASER)",
    referenceBook: "Brant and Helms' Fundamentals of Diagnostic Radiology (5th Ed), Chapter 4"
  },
  {
    id: "q-rad-7",
    specialty: "radiology",
    category: "MRI Safety & Contrast Agents",
    caseVignette: "A 50-year-old male with end-stage renal disease (ESRD) on maintenance hemodialysis requires an MRI. The ordering physician inquires about administering linear ionic Gadolinium-based Contrast Agents (GBCAs).",
    questionText: "Which rare, debilitating fibrosing disease affecting the skin and systemic organs was historically linked to unchelated gadolinium retention in severe renal failure?",
    options: [
      { id: "A", text: "Systemic Sclerosis" },
      { id: "B", text: "Retroperitoneal Fibrosis" },
      { id: "C", text: "Nephrogenic Systemic Fibrosis (NSF)" },
      { id: "D", text: "Contrast-Induced Pulmonary Fibrosis" }
    ],
    correctOptionId: "C",
    explanation: "Nephrogenic Systemic Fibrosis (NSF) is a rare, severe condition causing widespread fibrosis of skin, connective tissue, and internal organs occurring in patients with severe renal impairment (eGFR < 30 mL/min) exposed to high-risk linear GBCAs. Modern stable macrocyclic GBCAs (Group II) have virtually eliminated this risk.",
    highYieldPearl: "According to the ACR, Group II macrocyclic GBCAs (Gadobutrol, Gadoteridol, Gadoterate meglumine) carry an extremely low or near-zero risk of NSF and do not require routine screening eGFR tests in outpatients.",
    difficulty: "medium",
    yearOrSource: "ACR Manual on Contrast Media / ARRT",
    sourceOrganization: "American College of Radiology (ACR)",
    referenceBook: "ACR Manual on Contrast Media (2023 Guidelines)"
  },
  {
    id: "q-rad-8",
    specialty: "radiology",
    category: "Pediatric Radiography & Radiation Stewardship",
    caseVignette: "A 4-year-old boy presents with suspected right-sided foreign body aspiration. The radiologist chooses imaging parameters following the 'Image Gently' campaign guidelines.",
    questionText: "Under the 'Image Gently' pediatric imaging alliance, what is the primary technical objective when imaging pediatric patients?",
    options: [
      { id: "A", text: "Remove lead collimation to image the entire body simultaneously" },
      { id: "B", text: "Use the same default adult CT protocols to ensure maximal signal-to-noise ratio" },
      { id: "C", text: "Perform repeated routine CT scans rather than ultrasound" },
      { id: "D", text: "Child-size the radiation dose by lowering mAs and kVp according to body weight and thickness" }
    ],
    correctOptionId: "D",
    explanation: "The 'Image Gently' alliance advocates for radiation safety in pediatric imaging: pediatric tissues are much more radiosensitive, and children have a longer life expectancy during which radiation-induced oncogenesis could manifest. Protocols must be tailored ('child-sized') by reducing mAs and kVp to deliver the lowest possible dose that maintains diagnostic image quality.",
    highYieldPearl: "Always collimate the X-ray beam strictly to the anatomical region of interest; open uncollimated beams dramatically increase scatter radiation and patient dose.",
    difficulty: "easy",
    yearOrSource: "Image Gently / ARRT Radiography",
    sourceOrganization: "The Alliance for Radiation Safety in Pediatric Imaging (Image Gently)",
    referenceBook: "Bushong's Radiologic Science for Technologists (12th Ed), Chapter 20"
  }
];

export const HIGH_YIELD_PEARLS: {
  specialty: MedicalSpecialty;
  title: string;
  source: string;
  pearlText: string;
  clinicalApplication: string;
}[] = [
  {
    specialty: "pharmacy",
    title: "Aminoglycosides & Vancomycin Therapeutic Drug Monitoring",
    source: "ASHP & IDSA Guidelines (2024)",
    pearlText: "Target AUC24/MIC of 400-600 mcg·h/mL for Vancomycin maximizes clinical efficacy in MRSA bacteremia while minimizing acute tubular necrosis. Extended-interval aminoglycoside dosing (7 mg/kg Gentamicin) exploits concentration-dependent killing and the post-antibiotic effect.",
    clinicalApplication: "Draw peak levels 30 minutes post-infusion and trough levels within 30 minutes prior to the next scheduled dose."
  },
  {
    specialty: "pharmacy",
    title: "Potassium Sparing Diuretics & Hyperkalemia Risk",
    source: "Goodman & Gilman's Therapeutics (14th Ed)",
    pearlText: "Triple combination of ACE inhibitors, ARBs, and Aldosterone antagonists (Spironolactone/Eplerenone) or SGLT2 inhibitors warrants frequent serum potassium monitoring. Withhold potassium supplements if serum K+ exceeds 5.0 mEq/L.",
    clinicalApplication: "Check baseline eGFR and potassium within 1 to 2 weeks after initiating or titrating aldosterone antagonists in heart failure."
  },
  {
    specialty: "medicine",
    title: "Sepsis-3 Guidelines & 1-Hour Bundle",
    source: "Surviving Sepsis Campaign Guidelines (2021-2024)",
    pearlText: "The 1-Hour Sepsis Bundle mandates: 1) Measure lactate level, 2) Obtain blood cultures BEFORE antibiotics, 3) Administer broad-spectrum empiric antimicrobials, 4) Administer 30 mL/kg IV crystalloid for hypotension (MAP < 65 mmHg) or lactate ≥ 4 mmol/L, 5) Initiate vasopressors (Norepinephrine first-line) if fluid refractory.",
    clinicalApplication: "Norepinephrine is the first-choice vasopressor in septic shock; target a Mean Arterial Pressure (MAP) ≥ 65 mmHg."
  },
  {
    specialty: "dentistry",
    title: "Antibiotic Prophylaxis for Infective Endocarditis (AHA/ADA)",
    source: "AHA Guidelines for Prevention of Infective Endocarditis",
    pearlText: "Antibiotic prophylaxis is strictly indicated only for high-risk cardiac conditions (prosthetic heart valves, previous IE history, repaired congenital heart disease with prosthetic material, cardiac transplant with valvulopathy) undergoing gingival or periapical manipulation.",
    clinicalApplication: "First-line regimen: Amoxicillin 2.0 grams PO (50 mg/kg in children) single dose given 30 to 60 minutes before the dental procedure. If allergic to penicillin: Clindamycin 600 mg, Azithromycin/Clarithromycin 500 mg, or Cephalexin 2.0 g."
  },
  {
    specialty: "nursing",
    title: "Airway, Breathing, Circulation (ABC) Priority Triage",
    source: "Emergency Nursing Association (ENA) & NCLEX-RN",
    pearlText: "Airway compromise (stridor, foreign body, facial burns) and respiratory distress always supersede circulatory and neurological alterations in non-trauma triage, except in massive exsanguinating external hemorrhage where 'C-A-B' (Stop the Bleed) is prioritized.",
    clinicalApplication: "Assess patency, bilateral chest rise, respiratory rate, and SpO2 before administering analgesics or routine medications."
  },
  {
    specialty: "lab",
    title: "Hemolytic Transfusion Reactions & DAT (Coombs Test)",
    source: "AABB Technical Manual & Henry's Clinical Diagnosis",
    pearlText: "Acute hemolytic transfusion reactions (AHTR) present with fever, chills, hemoglobinuria, hypotension, and flank pain due to ABO incompatibility. The Direct Antiglobulin Test (DAT / Direct Coombs) confirms in vivo sensitization of transfused red blood cells by recipient antibodies.",
    clinicalApplication: "Immediately stop the transfusion, maintain IV saline access, send post-transfusion blood and urine samples with the blood bag to the blood bank for clerical and serological workup."
  },
  {
    specialty: "radiology",
    title: "ACR Contrast Reaction Management (Anaphylactoid Treatment)",
    source: "American College of Radiology (ACR) Manual on Contrast Media",
    pearlText: "Severe acute bronchospasm and laryngeal edema following iodinated or gadolinium contrast injection are treated with Intramuscular Epinephrine (1:1,000 dilution, 0.3 mg IM in the anterolateral thigh), high-flow O2 (10-15 L/min), and rapid isotonic IV fluid boluses.",
    clinicalApplication: "Keep emergency airway and Epinephrine auto-injectors immediately accessible within every imaging exam suite."
  }
];

/**
 * Utility function to dynamically shuffle options for any ExamQuestion
 * so the correct answer is randomized across A, B, C, D every time it is taken.
 */
export function shuffleExamQuestion(q: ExamQuestion): ExamQuestion {
  const correctOpt = q.options.find((o) => o.id === q.correctOptionId) || q.options[0];
  const correctText = correctOpt.text;

  const shuffledTexts = [...q.options.map((o) => o.text)];
  for (let i = shuffledTexts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTexts[i], shuffledTexts[j]] = [shuffledTexts[j], shuffledTexts[i]];
  }

  const letters = ["A", "B", "C", "D"];
  const newOptions = shuffledTexts.map((text, idx) => ({
    id: letters[idx],
    text
  }));

  const newCorrectOptionId = newOptions.find((o) => o.text === correctText)?.id || "A";

  return {
    ...q,
    options: newOptions,
    correctOptionId: newCorrectOptionId
  };
}

/**
 * Retrieves questions for a given specialty with optional runtime option shuffling
 */
export function getSpecialtyExamQuestions(
  specialty: MedicalSpecialty,
  shuffleOptions: boolean = true
): ExamQuestion[] {
  const filtered = MOCK_EXAM_QUESTIONS.filter((q) => q.specialty === specialty);
  if (!shuffleOptions) return filtered;
  return filtered.map((q) => shuffleExamQuestion(q));
}
