/**
 * PW MedEd - Subject-Wise PYQ & Study Material Question Bank Module
 * Direct integration with Google Drive Folder:
 * https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link
 */

export const PYQ_DATA = {
  "driveRootUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link",
  "totalSubjects": 19,
  "totalDocuments": 60,
  "exams": [
    "NEET PG PYQs",
    "INI-CET PYQs",
    "FMGE PYQs"
  ],
  "subjects": [
    {
      "name": "Anaesthesia",
      "aliases": [
        "Anaesthesia",
        "Anesthesia"
      ],
      "phase": "Clinical Specialties",
      "icon": "vaccines",
      "color": "#0284c7",
      "topics": [
        "General Anaesthesia Agents",
        "Local & Regional Nerve Blocks",
        "Airway & Intubation Algorithms",
        "Monitoring & Critical Care",
        "CPR & Resuscitation Pearls"
      ],
      "docCount": 4
    },
    {
      "name": "Anatomy",
      "aliases": [
        "Anatomy",
        "General Anatomy"
      ],
      "phase": "1st Prof CBME Pre-Clinical",
      "icon": "accessibility_new",
      "color": "#16a34a",
      "topics": [
        "Gross Anatomy & Dissection",
        "Neuroanatomy & Cranial Nerves",
        "Embryology & Pharyngeal Arches",
        "General Histology",
        "Clinical Osteology"
      ],
      "docCount": 4
    },
    {
      "name": "Biochemistry",
      "aliases": [
        "Biochemistry",
        "Medical Biochemistry"
      ],
      "phase": "1st Prof CBME Pre-Clinical",
      "icon": "biotech",
      "color": "#059669",
      "topics": [
        "Enzymology & Kinetics",
        "Metabolic Cycles & Disorders",
        "Molecular Biology & Genetics",
        "Vitamins & Minerals",
        "Clinical Biochemistry & Lab Panels"
      ],
      "docCount": 4
    },
    {
      "name": "Physiology",
      "aliases": [
        "Physiology",
        "General Physiology"
      ],
      "phase": "1st Prof CBME Pre-Clinical",
      "icon": "cardiology",
      "color": "#d97706",
      "topics": [
        "General & Cellular Physiology",
        "Nerve-Muscle & Neurophysiology",
        "Cardiovascular System",
        "Respiratory Mechanics",
        "Renal Clearance & Acid-Base"
      ],
      "docCount": 3
    },
    {
      "name": "Pathology",
      "aliases": [
        "Pathology",
        "General Pathology"
      ],
      "phase": "2nd Prof CBME Para-Clinical",
      "icon": "microscope",
      "color": "#dc2626",
      "topics": [
        "Cell Injury & Apoptosis",
        "Inflammation & Tissue Repair",
        "Hematology & Anemias",
        "General Neoplasia & Tumor Markers",
        "Systemic Organ Pathology"
      ],
      "docCount": 3
    },
    {
      "name": "Pharmacology",
      "aliases": [
        "Pharmacology"
      ],
      "phase": "2nd Prof CBME Para-Clinical",
      "icon": "medication",
      "color": "#7c3aed",
      "topics": [
        "General Pharmacology & Pharmacokinetics",
        "Autonomic Nervous System",
        "Cardiovascular & Renal Drugs",
        "Antimicrobial Chemotherapy",
        "Neuropsychopharmacology"
      ],
      "docCount": 3
    },
    {
      "name": "Microbiology",
      "aliases": [
        "Microbiology",
        "Medical Microbiology"
      ],
      "phase": "2nd Prof CBME Para-Clinical",
      "icon": "coronavirus",
      "color": "#0891b2",
      "topics": [
        "Bacteriology & Culture Media",
        "Virology & Viral Vaccines",
        "Mycology & Antifungals",
        "Parasitology & Stool Microscopy",
        "Infection Control & Biomedical Waste"
      ],
      "docCount": 3
    },
    {
      "name": "Forensic Medicine",
      "aliases": [
        "Forensic Medicine",
        "FMT",
        "Forensic Medicine & Toxicology"
      ],
      "phase": "2nd Prof CBME Para-Clinical",
      "icon": "gavel",
      "color": "#475569",
      "topics": [
        "Thanatology & Postmortem Changes",
        "Mechanical & Firearm Injuries",
        "Medical Jurisprudence & IPC/BNS",
        "General & Specific Toxicology",
        "Sexual Offences & Forensic Anthropology"
      ],
      "docCount": 3
    },
    {
      "name": "Community Medicine",
      "aliases": [
        "Community Medicine",
        "PSM",
        "Preventive & Social Medicine"
      ],
      "phase": "3rd Prof CBME Para-Clinical",
      "icon": "groups_3",
      "color": "#0d9488",
      "topics": [
        "Epidemiology & Study Designs",
        "Biostatistics & Normal Distribution",
        "National Health Programs (NHM, NIKSHAY)",
        "Nutrition & Public Health",
        "Demography & Healthcare Planning"
      ],
      "docCount": 3
    },
    {
      "name": "ENT",
      "aliases": [
        "ENT",
        "Otorhinolaryngology",
        "Otolaryngology"
      ],
      "phase": "3rd Prof CBME Clinical",
      "icon": "hearing",
      "color": "#ca8a04",
      "topics": [
        "Audiometry & Hearing Loss",
        "Middle Ear Diseases & CSOM",
        "Rhinosinusitis & Epistaxis",
        "Larynx & Stridor in Children",
        "Head & Neck Neoplasms"
      ],
      "docCount": 3
    },
    {
      "name": "Ophthalmology",
      "aliases": [
        "Ophthalmology",
        "Opthalmology",
        "Eye"
      ],
      "phase": "3rd Prof CBME Clinical",
      "icon": "visibility",
      "color": "#0284c7",
      "topics": [
        "Cataract & Lens Disorders",
        "Glaucoma & Tonometry",
        "Retina & Diabetic Retinopathy",
        "Corneal Ulcers & Keratoplasty",
        "Strabismus & Neuro-Ophthalmology"
      ],
      "docCount": 3
    },
    {
      "name": "Medicine",
      "aliases": [
        "Medicine",
        "General Medicine",
        "Internal Medicine"
      ],
      "phase": "Final Prof Major Clinical",
      "icon": "stethoscope",
      "color": "#047857",
      "topics": [
        "Cardiology & STEMI/NSTEMI",
        "Pulmonology & Asthma/COPD",
        "Neurology & Stroke Syndromes",
        "Gastroenterology & Liver Cirrhosis",
        "Nephrology, Electrolytes & Endocrine"
      ],
      "docCount": 3
    },
    {
      "name": "Surgery",
      "aliases": [
        "Surgery",
        "General Surgery"
      ],
      "phase": "Final Prof Major Clinical",
      "icon": "surgical",
      "color": "#b91c1c",
      "topics": [
        "Fluid Resuscitation & Burns (Parkland)",
        "Breast Diseases & Carcinoma Staging",
        "Thyroid Nodules & Malignancies",
        "Acute Abdomen & Intestinal Obstruction",
        "Arterial, Venous & Trauma (ATLS) Protocols"
      ],
      "docCount": 3
    },
    {
      "name": "Obs and Gynae",
      "aliases": [
        "Obs and Gynae",
        "Obstetrics & Gynaecology",
        "OBG",
        "Obstetrics",
        "Gynaecology"
      ],
      "phase": "Final Prof Major Clinical",
      "icon": "pregnant_woman",
      "color": "#db2777",
      "topics": [
        "Antenatal Care & Fetal Monitoring (CTG)",
        "Hypertensive Disorders of Pregnancy (Preeclampsia)",
        "Antepartum & Postpartum Hemorrhage (PPH)",
        "Gynecological Malignancies (Cervix, Endometrium, Ovary)",
        "Infertility & Contraception"
      ],
      "docCount": 3
    },
    {
      "name": "Pediatrics",
      "aliases": [
        "Pediatrics",
        "Paediatrics"
      ],
      "phase": "Final Prof Clinical",
      "icon": "child_care",
      "color": "#ea580c",
      "topics": [
        "Developmental Milestones",
        "Neonatology & Neonatal Resuscitation",
        "Nutritional Deficiencies (PEM & Rickets)",
        "Infectious Exanthems & Vaccinations",
        "Pediatric Cardiology (Cyanotic Heart Disease)"
      ],
      "docCount": 3
    },
    {
      "name": "Orthopaedics",
      "aliases": [
        "Orthopaedics",
        "Orthopedics"
      ],
      "phase": "3rd Prof CBME Clinical",
      "icon": "personal_injury",
      "color": "#0369a1",
      "topics": [
        "Fractures & Dislocations Management",
        "Bone Tumors (Benign vs Malignant)",
        "Pediatric Orthopedics (CTEV & DDH)",
        "Spine & Bone Infections (Pott Spine, Osteomyelitis)",
        "Peripheral Nerve Injuries"
      ],
      "docCount": 3
    },
    {
      "name": "Dermatology",
      "aliases": [
        "Dermatology",
        "Dermatology & Venereology",
        "Skin"
      ],
      "phase": "Final Prof Clinical Specialties",
      "icon": "clean_hands",
      "color": "#d946ef",
      "topics": [
        "Papulosquamous Disorders (Psoriasis, Lichen Planus)",
        "Vesiculobullous Diseases (Pemphigus vs Pemphigoid)",
        "Infections (Leprosy, STIs, Syphilis)",
        "Cutaneous Manifestations of Systemic Diseases",
        "Hair, Nail & Pigmentary Disorders"
      ],
      "docCount": 3
    },
    {
      "name": "Psychiatry",
      "aliases": [
        "Psychiatry",
        "Mental Health"
      ],
      "phase": "Final Prof Clinical Specialties",
      "icon": "psychology",
      "color": "#8b5cf6",
      "topics": [
        "Schizophrenia & Psychotic Disorders",
        "Mood Disorders (Depression & Bipolar)",
        "Anxiety & OCD Spectrum",
        "Substance Abuse & Alcohol Withdrawal",
        "Psychopharmacology & ECT"
      ],
      "docCount": 3
    },
    {
      "name": "Radiology",
      "aliases": [
        "Radiology",
        "Radio-Diagnosis",
        "RadioLink",
        "Radiodiagnosis"
      ],
      "phase": "Final Prof Clinical Specialties",
      "icon": "radiology",
      "color": "#0284c7",
      "topics": [
        "Chest X-Ray Classic Signs",
        "Emergency CT Brain & Trauma",
        "Abdominal Ultrasound & CT Contrast",
        "MRI Physics & Sequences",
        "Radiation Safety & ALARA Principles"
      ],
      "docCount": 3
    }
  ],
  "documents": [
    {
      "id": "pyq-anaesth-neet-1",
      "title": "Anaesthesia - NEET PG (2020-2024) High Yield Solved Question Bank.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "4.8 MB",
      "pages": 64,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Anaesthesia_NEET_PG_PYQs_2020_2024.pdf",
      "summary": "Comprehensive 5-year solved NEET PG past papers covering inhalational agents, intravenous induction drugs, muscle relaxants, and epidural anatomy.",
      "subject": "Anaesthesia",
      "subjectAliases": [
        "Anaesthesia",
        "Anesthesia"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Clinical Specialties",
      "subjectIcon": "vaccines",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "General Anaesthesia Agents",
        "Local & Regional Nerve Blocks",
        "Airway & Intubation Algorithms",
        "Monitoring & Critical Care",
        "CPR & Resuscitation Pearls"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anaesth-neet-2",
      "title": "Anaesthesia - High Yield Clinical Image Based Questions (IBQs).pdf",
      "edition": "2024 Special Series",
      "year": "2024",
      "fileSize": "6.2 MB",
      "pages": 42,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Anaesthesia_IBQs_Clinical_Series.pdf",
      "summary": "Color illustrated airway devices, capnography waveforms, laryngeal mask airways, and nerve stimulator landmarks with clinical vignettes.",
      "subject": "Anaesthesia",
      "subjectAliases": [
        "Anaesthesia",
        "Anesthesia"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Clinical Specialties",
      "subjectIcon": "vaccines",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "General Anaesthesia Agents",
        "Local & Regional Nerve Blocks",
        "Airway & Intubation Algorithms",
        "Monitoring & Critical Care",
        "CPR & Resuscitation Pearls"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anaesth-inicet-1",
      "title": "Anaesthesia - INI-CET (Nov & May Sessions 2021-2024) Solved Recall Papers.pdf",
      "edition": "2024 All-AIIMS Edition",
      "year": "2021-2024",
      "fileSize": "5.1 MB",
      "pages": 56,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Anaesthesia_INICET_Solved_Recall_Papers.pdf",
      "summary": "In-depth All-AIIMS, PGI & JIPMER recall MCQs with clinical case scenarios, acid-base disorders, and arterial line monitoring.",
      "subject": "Anaesthesia",
      "subjectAliases": [
        "Anaesthesia",
        "Anesthesia"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Clinical Specialties",
      "subjectIcon": "vaccines",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "General Anaesthesia Agents",
        "Local & Regional Nerve Blocks",
        "Airway & Intubation Algorithms",
        "Monitoring & Critical Care",
        "CPR & Resuscitation Pearls"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anaesth-fmge-1",
      "title": "Anaesthesia - FMGE Screening Exam 6-Year PYQs & Rapid Revision.pdf",
      "edition": "2024 Quick Review",
      "year": "2019-2024",
      "fileSize": "3.9 MB",
      "pages": 48,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Anaesthesia_FMGE_6Year_PYQ_Rapid_Revision.pdf",
      "summary": "Focused high-frequency FMGE recurring one-liners, minimum alveolar concentration (MAC) tables, and spinal anesthesia contraindications.",
      "subject": "Anaesthesia",
      "subjectAliases": [
        "Anaesthesia",
        "Anesthesia"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Clinical Specialties",
      "subjectIcon": "vaccines",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "General Anaesthesia Agents",
        "Local & Regional Nerve Blocks",
        "Airway & Intubation Algorithms",
        "Monitoring & Critical Care",
        "CPR & Resuscitation Pearls"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anat-neet-1",
      "title": "Anatomy - NEET PG (2019-2024) 5-Year Chapterwise Solved PYQs.pdf",
      "edition": "2024 Comprehensive Vol. 1",
      "year": "2019-2024",
      "fileSize": "8.4 MB",
      "pages": 112,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Anatomy_NEET_PG_Chapterwise_PYQs.pdf",
      "summary": "Complete chapter-wise dissection of upper limb, lower limb, thorax, abdomen, pelvis, head & neck, and neuroanatomy with color schemas.",
      "subject": "Anatomy",
      "subjectAliases": [
        "Anatomy",
        "General Anatomy"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "accessibility_new",
      "subjectColor": "#16a34a",
      "subjectTopics": [
        "Gross Anatomy & Dissection",
        "Neuroanatomy & Cranial Nerves",
        "Embryology & Pharyngeal Arches",
        "General Histology",
        "Clinical Osteology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anat-neet-2",
      "title": "Anatomy - High Yield Embryology & Teratology Repeat PYQs.pdf",
      "edition": "2024 Focused Booster",
      "year": "2020-2024",
      "fileSize": "5.7 MB",
      "pages": 58,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Anatomy_Embryology_HighYield_PYQs.pdf",
      "summary": "Pharyngeal arch derivatives, aortic arch anomalies, gut rotation stages, and urogenital embryology questions with high-yield recall notes.",
      "subject": "Anatomy",
      "subjectAliases": [
        "Anatomy",
        "General Anatomy"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "accessibility_new",
      "subjectColor": "#16a34a",
      "subjectTopics": [
        "Gross Anatomy & Dissection",
        "Neuroanatomy & Cranial Nerves",
        "Embryology & Pharyngeal Arches",
        "General Histology",
        "Clinical Osteology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anat-inicet-1",
      "title": "Anatomy - INI-CET Deep Conceptual & Cross-Sectional Imaging PYQs.pdf",
      "edition": "2024 Elite Series",
      "year": "2020-2024",
      "fileSize": "9.2 MB",
      "pages": 94,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Anatomy_INICET_CrossSectional_Imaging_PYQs.pdf",
      "summary": "AIIMS pattern cross-sectional CT/MRI anatomical slices, skull base foramina, cavernous sinus relations, and perineum anatomy.",
      "subject": "Anatomy",
      "subjectAliases": [
        "Anatomy",
        "General Anatomy"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "accessibility_new",
      "subjectColor": "#16a34a",
      "subjectTopics": [
        "Gross Anatomy & Dissection",
        "Neuroanatomy & Cranial Nerves",
        "Embryology & Pharyngeal Arches",
        "General Histology",
        "Clinical Osteology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-anat-fmge-1",
      "title": "Anatomy - FMGE 500 Must-Know Repeated Questions & Diagram Bank.pdf",
      "edition": "2024 Must-Solve Edition",
      "year": "2019-2024",
      "fileSize": "7.1 MB",
      "pages": 76,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Anatomy_FMGE_500_MustKnow_PYQs.pdf",
      "summary": "Brachial plexus lesions, inguinal canal boundaries, coronary anatomy, and direct vs indirect hernia clinical diagrams for FMGE.",
      "subject": "Anatomy",
      "subjectAliases": [
        "Anatomy",
        "General Anatomy"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "accessibility_new",
      "subjectColor": "#16a34a",
      "subjectTopics": [
        "Gross Anatomy & Dissection",
        "Neuroanatomy & Cranial Nerves",
        "Embryology & Pharyngeal Arches",
        "General Histology",
        "Clinical Osteology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-biochem-neet-1",
      "title": "Biochemistry - NEET PG (2020-2024) Metabolic Pathways & Inborn Errors PYQs.pdf",
      "edition": "2024 Master Edition",
      "year": "2020-2024",
      "fileSize": "6.9 MB",
      "pages": 88,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Biochemistry_NEET_PG_Metabolic_Disorders_PYQs.pdf",
      "summary": "Glycogen storage diseases, amino acid catabolism defects (PKU, Maple Syrup, Alkaptonuria), lipid storage diseases and PCR/ELISA tools.",
      "subject": "Biochemistry",
      "subjectAliases": [
        "Biochemistry",
        "Medical Biochemistry"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "biotech",
      "subjectColor": "#059669",
      "subjectTopics": [
        "Enzymology & Kinetics",
        "Metabolic Cycles & Disorders",
        "Molecular Biology & Genetics",
        "Vitamins & Minerals",
        "Clinical Biochemistry & Lab Panels"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-biochem-neet-2",
      "title": "Biochemistry - High Yield Vitamins, Coenzymes & Nutrition Question Bank.pdf",
      "edition": "2024 Clinical Series",
      "year": "2021-2024",
      "fileSize": "4.5 MB",
      "pages": 52,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Biochemistry_Vitamins_Nutrition_PYQs.pdf",
      "summary": "Vitamin B-complex deficiency manifestations, Wernicke-Korsakoff, fat-soluble vitamins, trace elements, and heme synthesis pathways.",
      "subject": "Biochemistry",
      "subjectAliases": [
        "Biochemistry",
        "Medical Biochemistry"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "biotech",
      "subjectColor": "#059669",
      "subjectTopics": [
        "Enzymology & Kinetics",
        "Metabolic Cycles & Disorders",
        "Molecular Biology & Genetics",
        "Vitamins & Minerals",
        "Clinical Biochemistry & Lab Panels"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-biochem-inicet-1",
      "title": "Biochemistry - INI-CET Molecular Biology, Genetics & Blotting Techniques PYQs.pdf",
      "edition": "2024 Advanced Edition",
      "year": "2021-2024",
      "fileSize": "7.4 MB",
      "pages": 82,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Biochemistry_INICET_MolecularGenetics_PYQs.pdf",
      "summary": "CRISPR-Cas9, Sanger vs Next-Gen Sequencing, DNA repair mechanisms, and pedigree analysis questions tested in recent INI-CET exams.",
      "subject": "Biochemistry",
      "subjectAliases": [
        "Biochemistry",
        "Medical Biochemistry"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "biotech",
      "subjectColor": "#059669",
      "subjectTopics": [
        "Enzymology & Kinetics",
        "Metabolic Cycles & Disorders",
        "Molecular Biology & Genetics",
        "Vitamins & Minerals",
        "Clinical Biochemistry & Lab Panels"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-biochem-fmge-1",
      "title": "Biochemistry - FMGE 100 High-Frequency Recurring Table PYQs.pdf",
      "edition": "2024 Screening Special",
      "year": "2019-2024",
      "fileSize": "4.1 MB",
      "pages": 60,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Biochemistry_FMGE_HighFrequency_PYQs.pdf",
      "summary": "Key enzymes of glycolysis, Krebs cycle, urea cycle, cholesterol synthesis, and porphyrias summary charts with verified solutions.",
      "subject": "Biochemistry",
      "subjectAliases": [
        "Biochemistry",
        "Medical Biochemistry"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "biotech",
      "subjectColor": "#059669",
      "subjectTopics": [
        "Enzymology & Kinetics",
        "Metabolic Cycles & Disorders",
        "Molecular Biology & Genetics",
        "Vitamins & Minerals",
        "Clinical Biochemistry & Lab Panels"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-phys-neet-1",
      "title": "Physiology - NEET PG (2020-2024) Systemic Concepts & Graphs Solved Papers.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "7.8 MB",
      "pages": 96,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Physiology_NEET_PG_Systemic_Graphs_PYQs.pdf",
      "summary": "Wiggers diagram, cardiac output regulation, Frank-Starling law, lung volumes & capacities, oxyhemoglobin curves, and clearance calculations.",
      "subject": "Physiology",
      "subjectAliases": [
        "Physiology",
        "General Physiology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "cardiology",
      "subjectColor": "#d97706",
      "subjectTopics": [
        "General & Cellular Physiology",
        "Nerve-Muscle & Neurophysiology",
        "Cardiovascular System",
        "Respiratory Mechanics",
        "Renal Clearance & Acid-Base"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-phys-inicet-1",
      "title": "Physiology - INI-CET Neurophysiology, Vision & Endocrine Loop PYQs.pdf",
      "edition": "2024 AIIMS Level",
      "year": "2021-2024",
      "fileSize": "6.7 MB",
      "pages": 78,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Physiology_INICET_Neurophysiology_PYQs.pdf",
      "summary": "Sleep stages (EEG), basal ganglia pathways, auditory transduction, counter-current multiplier, and GFR autoregulation mechanisms.",
      "subject": "Physiology",
      "subjectAliases": [
        "Physiology",
        "General Physiology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "cardiology",
      "subjectColor": "#d97706",
      "subjectTopics": [
        "General & Cellular Physiology",
        "Nerve-Muscle & Neurophysiology",
        "Cardiovascular System",
        "Respiratory Mechanics",
        "Renal Clearance & Acid-Base"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-phys-fmge-1",
      "title": "Physiology - FMGE High Yield Core Normal Values & Formula Question Bank.pdf",
      "edition": "2024 Rapid Recall",
      "year": "2019-2024",
      "fileSize": "4.6 MB",
      "pages": 54,
      "lastUpdated": "2026-10-16",
      "downloadFileName": "Physiology_FMGE_Core_Values_PYQs.pdf",
      "summary": "Acid-base disorders Nomogram, Action potential phases, Hemostasis cascade, and Endocrine feedback questions for FMGE.",
      "subject": "Physiology",
      "subjectAliases": [
        "Physiology",
        "General Physiology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "1st Prof CBME Pre-Clinical",
      "subjectIcon": "cardiology",
      "subjectColor": "#d97706",
      "subjectTopics": [
        "General & Cellular Physiology",
        "Nerve-Muscle & Neurophysiology",
        "Cardiovascular System",
        "Respiratory Mechanics",
        "Renal Clearance & Acid-Base"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-path-neet-1",
      "title": "Pathology - NEET PG (2019-2024) 5-Year Image & Biopsy Question Bank.pdf",
      "edition": "2024 Illustrated Edition",
      "year": "2019-2024",
      "fileSize": "11.2 MB",
      "pages": 138,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Pathology_NEET_PG_Biopsy_Image_PYQs.pdf",
      "summary": "H&E stained histopathology, Reed-Sternberg cells, glomerulonephritis immunofluorescence, leukemia smears, and tumor translocations.",
      "subject": "Pathology",
      "subjectAliases": [
        "Pathology",
        "General Pathology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "microscope",
      "subjectColor": "#dc2626",
      "subjectTopics": [
        "Cell Injury & Apoptosis",
        "Inflammation & Tissue Repair",
        "Hematology & Anemias",
        "General Neoplasia & Tumor Markers",
        "Systemic Organ Pathology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-path-inicet-1",
      "title": "Pathology - INI-CET Molecular Pathology, Flow Cytometry & IHC PYQs.pdf",
      "edition": "2024 Elite Lab Series",
      "year": "2020-2024",
      "fileSize": "8.9 MB",
      "pages": 92,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Pathology_INICET_Molecular_IHC_PYQs.pdf",
      "summary": "Immunohistochemistry markers (CD15/CD30, CK7/CK20), molecular classifications of lymphomas, and amyloidosis staining patterns.",
      "subject": "Pathology",
      "subjectAliases": [
        "Pathology",
        "General Pathology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "microscope",
      "subjectColor": "#dc2626",
      "subjectTopics": [
        "Cell Injury & Apoptosis",
        "Inflammation & Tissue Repair",
        "Hematology & Anemias",
        "General Neoplasia & Tumor Markers",
        "Systemic Organ Pathology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-path-fmge-1",
      "title": "Pathology - FMGE High Repeat Histopathology Slides & Gross Specimen PYQs.pdf",
      "edition": "2024 Visual Guide",
      "year": "2019-2024",
      "fileSize": "7.9 MB",
      "pages": 80,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Pathology_FMGE_Gross_Specimen_PYQs.pdf",
      "summary": "Aschoff nodules, Councilman bodies, Psammoma bodies, Negri bodies, and classic granuloma questions for FMGE.",
      "subject": "Pathology",
      "subjectAliases": [
        "Pathology",
        "General Pathology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "microscope",
      "subjectColor": "#dc2626",
      "subjectTopics": [
        "Cell Injury & Apoptosis",
        "Inflammation & Tissue Repair",
        "Hematology & Anemias",
        "General Neoplasia & Tumor Markers",
        "Systemic Organ Pathology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-pharm-neet-1",
      "title": "Pharmacology - NEET PG (2020-2024) Drug of Choice & Adverse Effects Bank.pdf",
      "edition": "2024 Ultimate Guide",
      "year": "2020-2024",
      "fileSize": "7.6 MB",
      "pages": 104,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pharmacology_NEET_PG_DrugOfChoice_PYQs.pdf",
      "summary": "First-line drugs of choice, teratogenic drugs, CYP450 inducers and inhibitors, antidotes, and antiarrhythmic classifications.",
      "subject": "Pharmacology",
      "subjectAliases": [
        "Pharmacology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "medication",
      "subjectColor": "#7c3aed",
      "subjectTopics": [
        "General Pharmacology & Pharmacokinetics",
        "Autonomic Nervous System",
        "Cardiovascular & Renal Drugs",
        "Antimicrobial Chemotherapy",
        "Neuropsychopharmacology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-pharm-inicet-1",
      "title": "Pharmacology - INI-CET Monoclonal Antibodies & Novel Targeted Therapies PYQs.pdf",
      "edition": "2024 Modern Therapeutics",
      "year": "2021-2024",
      "fileSize": "6.4 MB",
      "pages": 72,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pharmacology_INICET_Novel_Therapies_PYQs.pdf",
      "summary": "Monoclonal antibody targets (-mabs, -nibs), checkpoint inhibitors (PD-1, CTLA-4), and latest diabetes SGLT2/GLP-1 receptor agonists.",
      "subject": "Pharmacology",
      "subjectAliases": [
        "Pharmacology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "medication",
      "subjectColor": "#7c3aed",
      "subjectTopics": [
        "General Pharmacology & Pharmacokinetics",
        "Autonomic Nervous System",
        "Cardiovascular & Renal Drugs",
        "Antimicrobial Chemotherapy",
        "Neuropsychopharmacology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-pharm-fmge-1",
      "title": "Pharmacology - FMGE Must-Know Drug Side Effects & Antidotes Review.pdf",
      "edition": "2024 High-Scorer Edition",
      "year": "2019-2024",
      "fileSize": "5.2 MB",
      "pages": 66,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pharmacology_FMGE_SideEffects_Antidotes_PYQs.pdf",
      "summary": "Gray baby syndrome, Red man syndrome, Disulfiram-like reactions, and emergency toxidrome treatment protocols.",
      "subject": "Pharmacology",
      "subjectAliases": [
        "Pharmacology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "medication",
      "subjectColor": "#7c3aed",
      "subjectTopics": [
        "General Pharmacology & Pharmacokinetics",
        "Autonomic Nervous System",
        "Cardiovascular & Renal Drugs",
        "Antimicrobial Chemotherapy",
        "Neuropsychopharmacology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-micro-neet-1",
      "title": "Microbiology - NEET PG (2020-2024) Bacteriology, Culture Media & Serology PYQs.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "8.1 MB",
      "pages": 98,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Microbiology_NEET_PG_Bacteriology_PYQs.pdf",
      "summary": "MacConkey agar, Lowenstein-Jensen, Sabouraud, Gram staining identification, and antibiotic susceptibility testing (AST) cases.",
      "subject": "Microbiology",
      "subjectAliases": [
        "Microbiology",
        "Medical Microbiology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "coronavirus",
      "subjectColor": "#0891b2",
      "subjectTopics": [
        "Bacteriology & Culture Media",
        "Virology & Viral Vaccines",
        "Mycology & Antifungals",
        "Parasitology & Stool Microscopy",
        "Infection Control & Biomedical Waste"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-micro-inicet-1",
      "title": "Microbiology - INI-CET Virology, Parasitology Ova/Cyst & BMW Rules PYQs.pdf",
      "edition": "2024 AIIMS Lab Special",
      "year": "2021-2024",
      "fileSize": "6.8 MB",
      "pages": 74,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Microbiology_INICET_Virology_Parasitology_PYQs.pdf",
      "summary": "HIV diagnosis algorithms, Hepatitis B serological profiles, COVID-19/Influenza PCR, and latest BMW color-coded segregation rules.",
      "subject": "Microbiology",
      "subjectAliases": [
        "Microbiology",
        "Medical Microbiology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "coronavirus",
      "subjectColor": "#0891b2",
      "subjectTopics": [
        "Bacteriology & Culture Media",
        "Virology & Viral Vaccines",
        "Mycology & Antifungals",
        "Parasitology & Stool Microscopy",
        "Infection Control & Biomedical Waste"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-micro-fmge-1",
      "title": "Microbiology - FMGE High Yield Stains, Vectors & Parasite Life Cycles.pdf",
      "edition": "2024 Visual Primer",
      "year": "2019-2024",
      "fileSize": "5.9 MB",
      "pages": 62,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "Microbiology_FMGE_Stains_Vectors_PYQs.pdf",
      "summary": "Malaria ring forms vs gametocytes, Leishmania LD bodies, Albert stain for Corynebacterium, and ZN staining for AFB.",
      "subject": "Microbiology",
      "subjectAliases": [
        "Microbiology",
        "Medical Microbiology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "coronavirus",
      "subjectColor": "#0891b2",
      "subjectTopics": [
        "Bacteriology & Culture Media",
        "Virology & Viral Vaccines",
        "Mycology & Antifungals",
        "Parasitology & Stool Microscopy",
        "Infection Control & Biomedical Waste"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-fmt-neet-1",
      "title": "Forensic Medicine - NEET PG (2020-2024) Postmortem Changes & Toxicology PYQs.pdf",
      "edition": "2024 Comprehensive",
      "year": "2020-2024",
      "fileSize": "6.5 MB",
      "pages": 76,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "FMT_NEET_PG_Postmortem_Toxicology_PYQs.pdf",
      "summary": "Rigor mortis timetable, livor mortis, adipocere, drowning findings, organophosphate poisoning, and snake bite management.",
      "subject": "Forensic Medicine",
      "subjectAliases": [
        "Forensic Medicine",
        "FMT",
        "Forensic Medicine & Toxicology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "gavel",
      "subjectColor": "#475569",
      "subjectTopics": [
        "Thanatology & Postmortem Changes",
        "Mechanical & Firearm Injuries",
        "Medical Jurisprudence & IPC/BNS",
        "General & Specific Toxicology",
        "Sexual Offences & Forensic Anthropology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-fmt-inicet-1",
      "title": "Forensic Medicine - INI-CET Firearm Ballistics & Forensic DNA Profiling PYQs.pdf",
      "edition": "2024 AIIMS Expert Edition",
      "year": "2021-2024",
      "fileSize": "5.4 MB",
      "pages": 60,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "FMT_INICET_Ballistics_DNA_PYQs.pdf",
      "summary": "Choking, tattooing, contact wound soot marks, STR markers in paternity disputes, and Section 375/376 IPC/BNS legal provisions.",
      "subject": "Forensic Medicine",
      "subjectAliases": [
        "Forensic Medicine",
        "FMT",
        "Forensic Medicine & Toxicology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "gavel",
      "subjectColor": "#475569",
      "subjectTopics": [
        "Thanatology & Postmortem Changes",
        "Mechanical & Firearm Injuries",
        "Medical Jurisprudence & IPC/BNS",
        "General & Specific Toxicology",
        "Sexual Offences & Forensic Anthropology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-fmt-fmge-1",
      "title": "Forensic Medicine - FMGE 200 Quick Repeat Toxicology & Injury MCQs.pdf",
      "edition": "2024 Screening Edition",
      "year": "2019-2024",
      "fileSize": "4.3 MB",
      "pages": 50,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "FMT_FMGE_Toxicology_Injuries_PYQs.pdf",
      "summary": "Dhatura vs Belladonna, Cyanide cherry red lividity, Blast injuries, and Age estimation by dentition and ossification centers.",
      "subject": "Forensic Medicine",
      "subjectAliases": [
        "Forensic Medicine",
        "FMT",
        "Forensic Medicine & Toxicology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "2nd Prof CBME Para-Clinical",
      "subjectIcon": "gavel",
      "subjectColor": "#475569",
      "subjectTopics": [
        "Thanatology & Postmortem Changes",
        "Mechanical & Firearm Injuries",
        "Medical Jurisprudence & IPC/BNS",
        "General & Specific Toxicology",
        "Sexual Offences & Forensic Anthropology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psm-neet-1",
      "title": "Community Medicine - NEET PG (2020-2024) Epidemiology & Biostatistics PYQs.pdf",
      "edition": "2024 Master Edition",
      "year": "2020-2024",
      "fileSize": "8.7 MB",
      "pages": 110,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "PSM_NEET_PG_Epidemiology_Biostatistics_PYQs.pdf",
      "summary": "Case-control vs cohort study, Odds Ratio, Relative Risk calculations, sensitivity/specificity curves, and statistical significance testing.",
      "subject": "Community Medicine",
      "subjectAliases": [
        "Community Medicine",
        "PSM",
        "Preventive & Social Medicine"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "3rd Prof CBME Para-Clinical",
      "subjectIcon": "groups_3",
      "subjectColor": "#0d9488",
      "subjectTopics": [
        "Epidemiology & Study Designs",
        "Biostatistics & Normal Distribution",
        "National Health Programs (NHM, NIKSHAY)",
        "Nutrition & Public Health",
        "Demography & Healthcare Planning"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psm-inicet-1",
      "title": "Community Medicine - INI-CET National Health Programs & Immunization Schedule PYQs.pdf",
      "edition": "2024 AIIMS Public Health",
      "year": "2021-2024",
      "fileSize": "7.2 MB",
      "pages": 84,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "PSM_INICET_HealthPrograms_Vaccines_PYQs.pdf",
      "summary": "National Immunization Schedule (NIS), TB NTEP algorithms, Vector-borne disease surveillance, and maternal mortality indicators.",
      "subject": "Community Medicine",
      "subjectAliases": [
        "Community Medicine",
        "PSM",
        "Preventive & Social Medicine"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "3rd Prof CBME Para-Clinical",
      "subjectIcon": "groups_3",
      "subjectColor": "#0d9488",
      "subjectTopics": [
        "Epidemiology & Study Designs",
        "Biostatistics & Normal Distribution",
        "National Health Programs (NHM, NIKSHAY)",
        "Nutrition & Public Health",
        "Demography & Healthcare Planning"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psm-fmge-1",
      "title": "Community Medicine - FMGE Screening Formulas, Indicators & Rates Bank.pdf",
      "edition": "2024 Rapid Formula Guide",
      "year": "2019-2024",
      "fileSize": "5.1 MB",
      "pages": 64,
      "lastUpdated": "2026-10-17",
      "downloadFileName": "PSM_FMGE_Formulas_Indicators_PYQs.pdf",
      "summary": "Infant Mortality Rate (IMR), Maternal Mortality Ratio (MMR), Net Reproduction Rate (NRR=1), and Cold Chain storage temperature rules.",
      "subject": "Community Medicine",
      "subjectAliases": [
        "Community Medicine",
        "PSM",
        "Preventive & Social Medicine"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "3rd Prof CBME Para-Clinical",
      "subjectIcon": "groups_3",
      "subjectColor": "#0d9488",
      "subjectTopics": [
        "Epidemiology & Study Designs",
        "Biostatistics & Normal Distribution",
        "National Health Programs (NHM, NIKSHAY)",
        "Nutrition & Public Health",
        "Demography & Healthcare Planning"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ent-neet-1",
      "title": "ENT - NEET PG (2020-2024) Audiograms, CSOM & Otology Solved PYQs.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "6.3 MB",
      "pages": 72,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "ENT_NEET_PG_Audiograms_Otology_PYQs.pdf",
      "summary": "Pure tone audiograms, Carhart notch in Otosclerosis, CSOM tubotympanic vs atticoantral, facial nerve palsy, and cochlear implants.",
      "subject": "ENT",
      "subjectAliases": [
        "ENT",
        "Otorhinolaryngology",
        "Otolaryngology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "hearing",
      "subjectColor": "#ca8a04",
      "subjectTopics": [
        "Audiometry & Hearing Loss",
        "Middle Ear Diseases & CSOM",
        "Rhinosinusitis & Epistaxis",
        "Larynx & Stridor in Children",
        "Head & Neck Neoplasms"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ent-inicet-1",
      "title": "ENT - INI-CET Stridor, Laryngeal Cancers & FESS Endoscopy PYQs.pdf",
      "edition": "2024 Clinical Special",
      "year": "2021-2024",
      "fileSize": "5.8 MB",
      "pages": 66,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "ENT_INICET_Stridor_Endoscopy_PYQs.pdf",
      "summary": "Laryngomalacia Omega-shaped epiglottis, Vocal cord nodules vs polyps, Juvenile nasopharyngeal angiofibroma (JNA), and tracheostomy.",
      "subject": "ENT",
      "subjectAliases": [
        "ENT",
        "Otorhinolaryngology",
        "Otolaryngology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "hearing",
      "subjectColor": "#ca8a04",
      "subjectTopics": [
        "Audiometry & Hearing Loss",
        "Middle Ear Diseases & CSOM",
        "Rhinosinusitis & Epistaxis",
        "Larynx & Stridor in Children",
        "Head & Neck Neoplasms"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ent-fmge-1",
      "title": "ENT - FMGE Must-Know Tuning Fork Tests & High Repeat Questions.pdf",
      "edition": "2024 High-Yield Revision",
      "year": "2019-2024",
      "fileSize": "4.4 MB",
      "pages": 52,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "ENT_FMGE_TuningFork_MustKnow_PYQs.pdf",
      "summary": "Rinne, Weber & Schwabach tests interpretation, Little area epistaxis management, and Foreign body bronchus clinical cases.",
      "subject": "ENT",
      "subjectAliases": [
        "ENT",
        "Otorhinolaryngology",
        "Otolaryngology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "hearing",
      "subjectColor": "#ca8a04",
      "subjectTopics": [
        "Audiometry & Hearing Loss",
        "Middle Ear Diseases & CSOM",
        "Rhinosinusitis & Epistaxis",
        "Larynx & Stridor in Children",
        "Head & Neck Neoplasms"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ophth-neet-1",
      "title": "Ophthalmology - NEET PG (2020-2024) Fundus Images & Glaucoma PYQs.pdf",
      "edition": "2024 Illustrated",
      "year": "2020-2024",
      "fileSize": "7.5 MB",
      "pages": 82,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Ophthalmology_NEET_PG_Fundus_Glaucoma_PYQs.pdf",
      "summary": "Diabetic retinopathy grades, Central Retinal Artery Occlusion (CRAO) cherry red spot, Primary Open Angle Glaucoma, and Phacoemulsification.",
      "subject": "Ophthalmology",
      "subjectAliases": [
        "Ophthalmology",
        "Opthalmology",
        "Eye"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "visibility",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Cataract & Lens Disorders",
        "Glaucoma & Tonometry",
        "Retina & Diabetic Retinopathy",
        "Corneal Ulcers & Keratoplasty",
        "Strabismus & Neuro-Ophthalmology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ophth-inicet-1",
      "title": "Ophthalmology - INI-CET Slit Lamp Findings & Retinoblastoma PYQs.pdf",
      "edition": "2024 AIIMS Level",
      "year": "2021-2024",
      "fileSize": "6.4 MB",
      "pages": 68,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Ophthalmology_INICET_SlitLamp_Retinoblastoma_PYQs.pdf",
      "summary": "Kayser-Fleischer ring, Acanthamoeba keratitis ring infiltrate, Retinoblastoma Flexner-Wintersteiner rosettes, and visual field defects.",
      "subject": "Ophthalmology",
      "subjectAliases": [
        "Ophthalmology",
        "Opthalmology",
        "Eye"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "visibility",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Cataract & Lens Disorders",
        "Glaucoma & Tonometry",
        "Retina & Diabetic Retinopathy",
        "Corneal Ulcers & Keratoplasty",
        "Strabismus & Neuro-Ophthalmology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ophth-fmge-1",
      "title": "Ophthalmology - FMGE High Yield Cataract Types & Refractive Errors PYQs.pdf",
      "edition": "2024 Quick Review",
      "year": "2019-2024",
      "fileSize": "4.8 MB",
      "pages": 56,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Ophthalmology_FMGE_Cataract_Refraction_PYQs.pdf",
      "summary": "Myopia vs Hypermetropia lenses, Congenital rubella cataract, Vernal keratoconjunctivitis Horner-Trantas dots, and Trachoma staging.",
      "subject": "Ophthalmology",
      "subjectAliases": [
        "Ophthalmology",
        "Opthalmology",
        "Eye"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "visibility",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Cataract & Lens Disorders",
        "Glaucoma & Tonometry",
        "Retina & Diabetic Retinopathy",
        "Corneal Ulcers & Keratoplasty",
        "Strabismus & Neuro-Ophthalmology"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-med-neet-1",
      "title": "General Medicine - NEET PG (2019-2024) Clinical Vignettes & ECG Question Bank.pdf",
      "edition": "2024 Master Clinical Vol. 1",
      "year": "2019-2024",
      "fileSize": "12.8 MB",
      "pages": 164,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Medicine_NEET_PG_ClinicalVignettes_ECG_PYQs.pdf",
      "summary": "12-lead ECG interpretations, STEMI reperfusion criteria, Heart failure guideline directed therapy, DKA protocols, and stroke thrombolysis.",
      "subject": "Medicine",
      "subjectAliases": [
        "Medicine",
        "General Medicine",
        "Internal Medicine"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "stethoscope",
      "subjectColor": "#047857",
      "subjectTopics": [
        "Cardiology & STEMI/NSTEMI",
        "Pulmonology & Asthma/COPD",
        "Neurology & Stroke Syndromes",
        "Gastroenterology & Liver Cirrhosis",
        "Nephrology, Electrolytes & Endocrine"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-med-inicet-1",
      "title": "General Medicine - INI-CET Critical Care, ABG & Rheumatology Protocols PYQs.pdf",
      "edition": "2024 Elite Medicine",
      "year": "2020-2024",
      "fileSize": "9.6 MB",
      "pages": 120,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Medicine_INICET_CriticalCare_ABG_PYQs.pdf",
      "summary": "Arterial Blood Gas (ABG) anion gap acidoses, SLE autoantibody profiles, Septic shock vasopressor titration, and acute kidney injury KDIGO.",
      "subject": "Medicine",
      "subjectAliases": [
        "Medicine",
        "General Medicine",
        "Internal Medicine"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "stethoscope",
      "subjectColor": "#047857",
      "subjectTopics": [
        "Cardiology & STEMI/NSTEMI",
        "Pulmonology & Asthma/COPD",
        "Neurology & Stroke Syndromes",
        "Gastroenterology & Liver Cirrhosis",
        "Nephrology, Electrolytes & Endocrine"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-med-fmge-1",
      "title": "General Medicine - FMGE 500 High-Yield Clinical Pearls & Diagnostic Triads.pdf",
      "edition": "2024 Comprehensive Screening",
      "year": "2019-2024",
      "fileSize": "8.2 MB",
      "pages": 102,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Medicine_FMGE_500_ClinicalPearls_PYQs.pdf",
      "summary": "Infective endocarditis Duke criteria, Meningitis CSF findings, Pneumonia CURB-65, Cushing syndrome tests, and Addisonian crisis.",
      "subject": "Medicine",
      "subjectAliases": [
        "Medicine",
        "General Medicine",
        "Internal Medicine"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "stethoscope",
      "subjectColor": "#047857",
      "subjectTopics": [
        "Cardiology & STEMI/NSTEMI",
        "Pulmonology & Asthma/COPD",
        "Neurology & Stroke Syndromes",
        "Gastroenterology & Liver Cirrhosis",
        "Nephrology, Electrolytes & Endocrine"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-surg-neet-1",
      "title": "General Surgery - NEET PG (2019-2024) 5-Year High Yield Case Based PYQs.pdf",
      "edition": "2024 Edition",
      "year": "2019-2024",
      "fileSize": "11.5 MB",
      "pages": 146,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Surgery_NEET_PG_CaseBased_PYQs.pdf",
      "summary": "Appendicitis, Cholecystitis, Acute pancreatitis scoring, Breast cancer TNM staging and receptor directed therapy, and Hernia repairs.",
      "subject": "Surgery",
      "subjectAliases": [
        "Surgery",
        "General Surgery"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "surgical",
      "subjectColor": "#b91c1c",
      "subjectTopics": [
        "Fluid Resuscitation & Burns (Parkland)",
        "Breast Diseases & Carcinoma Staging",
        "Thyroid Nodules & Malignancies",
        "Acute Abdomen & Intestinal Obstruction",
        "Arterial, Venous & Trauma (ATLS) Protocols"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-surg-inicet-1",
      "title": "General Surgery - INI-CET Trauma ATLS, Shock & Surgical Oncology PYQs.pdf",
      "edition": "2024 AIIMS Surgical Series",
      "year": "2020-2024",
      "fileSize": "9.1 MB",
      "pages": 114,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Surgery_INICET_Trauma_ATLS_Oncology_PYQs.pdf",
      "summary": "FAST examination, Damage control surgery, Thyroid Bethesda system, Pancreatic neuroendocrine tumors, and liver resection Couinaud segments.",
      "subject": "Surgery",
      "subjectAliases": [
        "Surgery",
        "General Surgery"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "surgical",
      "subjectColor": "#b91c1c",
      "subjectTopics": [
        "Fluid Resuscitation & Burns (Parkland)",
        "Breast Diseases & Carcinoma Staging",
        "Thyroid Nodules & Malignancies",
        "Acute Abdomen & Intestinal Obstruction",
        "Arterial, Venous & Trauma (ATLS) Protocols"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-surg-fmge-1",
      "title": "General Surgery - FMGE Core Surgical Instruments, Tubes & Repeat PYQs.pdf",
      "edition": "2024 Visual Surgical Review",
      "year": "2019-2024",
      "fileSize": "7.8 MB",
      "pages": 88,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Surgery_FMGE_Instruments_Tubes_PYQs.pdf",
      "summary": "Surgical instruments identification, Ryle tube, Foley catheter, Chest drain underwater seal, and Burns Rule of Nines calculations.",
      "subject": "Surgery",
      "subjectAliases": [
        "Surgery",
        "General Surgery"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "surgical",
      "subjectColor": "#b91c1c",
      "subjectTopics": [
        "Fluid Resuscitation & Burns (Parkland)",
        "Breast Diseases & Carcinoma Staging",
        "Thyroid Nodules & Malignancies",
        "Acute Abdomen & Intestinal Obstruction",
        "Arterial, Venous & Trauma (ATLS) Protocols"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-obg-neet-1",
      "title": "Obs & Gynae - NEET PG (2020-2024) High Yield Obstetrics & CTG Tracing PYQs.pdf",
      "edition": "2024 Master Clinical",
      "year": "2020-2024",
      "fileSize": "10.2 MB",
      "pages": 132,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "OBG_NEET_PG_Obstetrics_CTG_PYQs.pdf",
      "summary": "Cardiotocography (CTG) decels, Preeclampsia magnesium sulphate regimens, Postpartum hemorrhage bundle, and labor Partograph analysis.",
      "subject": "Obs and Gynae",
      "subjectAliases": [
        "Obs and Gynae",
        "Obstetrics & Gynaecology",
        "OBG",
        "Obstetrics",
        "Gynaecology"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "pregnant_woman",
      "subjectColor": "#db2777",
      "subjectTopics": [
        "Antenatal Care & Fetal Monitoring (CTG)",
        "Hypertensive Disorders of Pregnancy (Preeclampsia)",
        "Antepartum & Postpartum Hemorrhage (PPH)",
        "Gynecological Malignancies (Cervix, Endometrium, Ovary)",
        "Infertility & Contraception"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-obg-inicet-1",
      "title": "Obs & Gynae - INI-CET Gynecologic Oncology, FIGO Staging & Colposcopy PYQs.pdf",
      "edition": "2024 AIIMS Level",
      "year": "2020-2024",
      "fileSize": "8.4 MB",
      "pages": 98,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "OBG_INICET_Oncology_FIGO_PYQs.pdf",
      "summary": "Cervical cancer HPV guidelines, FIGO 2023 ovarian and endometrial cancer staging, Asherman syndrome, and PCOS Rotterdam criteria.",
      "subject": "Obs and Gynae",
      "subjectAliases": [
        "Obs and Gynae",
        "Obstetrics & Gynaecology",
        "OBG",
        "Obstetrics",
        "Gynaecology"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "pregnant_woman",
      "subjectColor": "#db2777",
      "subjectTopics": [
        "Antenatal Care & Fetal Monitoring (CTG)",
        "Hypertensive Disorders of Pregnancy (Preeclampsia)",
        "Antepartum & Postpartum Hemorrhage (PPH)",
        "Gynecological Malignancies (Cervix, Endometrium, Ovary)",
        "Infertility & Contraception"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-obg-fmge-1",
      "title": "Obs & Gynae - FMGE Contraceptive Devices & Must-Solve Repeat PYQs.pdf",
      "edition": "2024 Screening Edition",
      "year": "2019-2024",
      "fileSize": "6.7 MB",
      "pages": 76,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "OBG_FMGE_Contraception_Repeat_PYQs.pdf",
      "summary": "Mirena IUD, Pearl index calculations, Ectopic pregnancy methotrexate criteria, MTP Act amendments, and Bishop score.",
      "subject": "Obs and Gynae",
      "subjectAliases": [
        "Obs and Gynae",
        "Obstetrics & Gynaecology",
        "OBG",
        "Obstetrics",
        "Gynaecology"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Major Clinical",
      "subjectIcon": "pregnant_woman",
      "subjectColor": "#db2777",
      "subjectTopics": [
        "Antenatal Care & Fetal Monitoring (CTG)",
        "Hypertensive Disorders of Pregnancy (Preeclampsia)",
        "Antepartum & Postpartum Hemorrhage (PPH)",
        "Gynecological Malignancies (Cervix, Endometrium, Ovary)",
        "Infertility & Contraception"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-peds-neet-1",
      "title": "Pediatrics - NEET PG (2020-2024) Milestones, Growth Charts & Neonatology PYQs.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "7.9 MB",
      "pages": 94,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pediatrics_NEET_PG_Milestones_Neonatology_PYQs.pdf",
      "summary": "Gross motor/fine motor/language milestones, APGAR score, Neonatal jaundice Bhutani nomogram, Kwashiorkor vs Marasmus, and Rickets.",
      "subject": "Pediatrics",
      "subjectAliases": [
        "Pediatrics",
        "Paediatrics"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Clinical",
      "subjectIcon": "child_care",
      "subjectColor": "#ea580c",
      "subjectTopics": [
        "Developmental Milestones",
        "Neonatology & Neonatal Resuscitation",
        "Nutritional Deficiencies (PEM & Rickets)",
        "Infectious Exanthems & Vaccinations",
        "Pediatric Cardiology (Cyanotic Heart Disease)"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-peds-inicet-1",
      "title": "Pediatrics - INI-CET Congenital Heart Diseases & Genetic Syndromes PYQs.pdf",
      "edition": "2024 AIIMS Specialty",
      "year": "2021-2024",
      "fileSize": "6.9 MB",
      "pages": 82,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pediatrics_INICET_CongenitalHeart_Genetics_PYQs.pdf",
      "summary": "Tetralogy of Fallot, Transposition of great arteries (TGA), Down syndrome, Turner syndrome, and pediatric metabolic screening.",
      "subject": "Pediatrics",
      "subjectAliases": [
        "Pediatrics",
        "Paediatrics"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Clinical",
      "subjectIcon": "child_care",
      "subjectColor": "#ea580c",
      "subjectTopics": [
        "Developmental Milestones",
        "Neonatology & Neonatal Resuscitation",
        "Nutritional Deficiencies (PEM & Rickets)",
        "Infectious Exanthems & Vaccinations",
        "Pediatric Cardiology (Cyanotic Heart Disease)"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-peds-fmge-1",
      "title": "Pediatrics - FMGE Immunization Schedule & IMNCI Guidelines Question Bank.pdf",
      "edition": "2024 Fast-Track",
      "year": "2019-2024",
      "fileSize": "5.3 MB",
      "pages": 62,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Pediatrics_FMGE_Immunization_IMNCI_PYQs.pdf",
      "summary": "Measles, Mumps, Rubella, Chickenpox rashes timeline, IMNCI diarrhea classification, and ORS composition.",
      "subject": "Pediatrics",
      "subjectAliases": [
        "Pediatrics",
        "Paediatrics"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Clinical",
      "subjectIcon": "child_care",
      "subjectColor": "#ea580c",
      "subjectTopics": [
        "Developmental Milestones",
        "Neonatology & Neonatal Resuscitation",
        "Nutritional Deficiencies (PEM & Rickets)",
        "Infectious Exanthems & Vaccinations",
        "Pediatric Cardiology (Cyanotic Heart Disease)"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ortho-neet-1",
      "title": "Orthopaedics - NEET PG (2020-2024) X-Ray Fracture & Splint Solved Papers.pdf",
      "edition": "2024 Visual Guide",
      "year": "2020-2024",
      "fileSize": "7.8 MB",
      "pages": 84,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Orthopaedics_NEET_PG_XRay_Fractures_PYQs.pdf",
      "summary": "Colles vs Smiths fracture, Monteggia vs Galeazzi, Femoral neck fractures Garden classification, Compartment syndrome, and Thomas splint.",
      "subject": "Orthopaedics",
      "subjectAliases": [
        "Orthopaedics",
        "Orthopedics"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "personal_injury",
      "subjectColor": "#0369a1",
      "subjectTopics": [
        "Fractures & Dislocations Management",
        "Bone Tumors (Benign vs Malignant)",
        "Pediatric Orthopedics (CTEV & DDH)",
        "Spine & Bone Infections (Pott Spine, Osteomyelitis)",
        "Peripheral Nerve Injuries"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ortho-inicet-1",
      "title": "Orthopaedics - INI-CET Bone Tumors Histology & Radiographic Sign PYQs.pdf",
      "edition": "2024 Specialist Series",
      "year": "2021-2024",
      "fileSize": "6.5 MB",
      "pages": 70,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Orthopaedics_INICET_BoneTumors_Signs_PYQs.pdf",
      "summary": "Osteosarcoma sunburst sign, Ewing sarcoma onion-peel, Giant cell tumor soap-bubble appearance, and Osteoid osteoma nidus.",
      "subject": "Orthopaedics",
      "subjectAliases": [
        "Orthopaedics",
        "Orthopedics"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "personal_injury",
      "subjectColor": "#0369a1",
      "subjectTopics": [
        "Fractures & Dislocations Management",
        "Bone Tumors (Benign vs Malignant)",
        "Pediatric Orthopedics (CTEV & DDH)",
        "Spine & Bone Infections (Pott Spine, Osteomyelitis)",
        "Peripheral Nerve Injuries"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-ortho-fmge-1",
      "title": "Orthopaedics - FMGE Clinical Tests, Nerve Injuries & Splints Review.pdf",
      "edition": "2024 Screening Edition",
      "year": "2019-2024",
      "fileSize": "4.9 MB",
      "pages": 56,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Orthopaedics_FMGE_Tests_Nerves_PYQs.pdf",
      "summary": "Radial nerve wrist drop, Ulnar claw hand, Trendelenburg sign, Barlow & Ortolani tests for DDH, and Clubfoot Ponseti technique.",
      "subject": "Orthopaedics",
      "subjectAliases": [
        "Orthopaedics",
        "Orthopedics"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "3rd Prof CBME Clinical",
      "subjectIcon": "personal_injury",
      "subjectColor": "#0369a1",
      "subjectTopics": [
        "Fractures & Dislocations Management",
        "Bone Tumors (Benign vs Malignant)",
        "Pediatric Orthopedics (CTEV & DDH)",
        "Spine & Bone Infections (Pott Spine, Osteomyelitis)",
        "Peripheral Nerve Injuries"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-derm-neet-1",
      "title": "Dermatology - NEET PG (2020-2024) High Resolution Clinical Image PYQs.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "8.3 MB",
      "pages": 78,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Dermatology_NEET_PG_Clinical_Images_PYQs.pdf",
      "summary": "Auspitz sign in psoriasis, Wickham striae in lichen planus, Nikolsky sign in pemphigus vulgaris, Hansen disease WHO classification.",
      "subject": "Dermatology",
      "subjectAliases": [
        "Dermatology",
        "Dermatology & Venereology",
        "Skin"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "clean_hands",
      "subjectColor": "#d946ef",
      "subjectTopics": [
        "Papulosquamous Disorders (Psoriasis, Lichen Planus)",
        "Vesiculobullous Diseases (Pemphigus vs Pemphigoid)",
        "Infections (Leprosy, STIs, Syphilis)",
        "Cutaneous Manifestations of Systemic Diseases",
        "Hair, Nail & Pigmentary Disorders"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-derm-inicet-1",
      "title": "Dermatology - INI-CET Immunofluorescence & Dermatosurgery PYQs.pdf",
      "edition": "2024 AIIMS Level",
      "year": "2021-2024",
      "fileSize": "6.1 MB",
      "pages": 62,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Dermatology_INICET_Immunofluorescence_PYQs.pdf",
      "summary": "Fishnet pattern in pemphigus, Linear basement membrane pattern in bullous pemphigoid, and Drug reactions (SJS/TEN SCORTEN).",
      "subject": "Dermatology",
      "subjectAliases": [
        "Dermatology",
        "Dermatology & Venereology",
        "Skin"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "clean_hands",
      "subjectColor": "#d946ef",
      "subjectTopics": [
        "Papulosquamous Disorders (Psoriasis, Lichen Planus)",
        "Vesiculobullous Diseases (Pemphigus vs Pemphigoid)",
        "Infections (Leprosy, STIs, Syphilis)",
        "Cutaneous Manifestations of Systemic Diseases",
        "Hair, Nail & Pigmentary Disorders"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-derm-fmge-1",
      "title": "Dermatology - FMGE High Yield Sexually Transmitted Infections & Rashes.pdf",
      "edition": "2024 Screening Guide",
      "year": "2019-2024",
      "fileSize": "4.7 MB",
      "pages": 50,
      "lastUpdated": "2026-10-21",
      "downloadFileName": "Dermatology_FMGE_STIs_Rashes_PYQs.pdf",
      "summary": "Syphilis chancre vs chancroid vs herpes, Scabies burrow and treatment, Tinea versicolor spaghetti & meatball appearance.",
      "subject": "Dermatology",
      "subjectAliases": [
        "Dermatology",
        "Dermatology & Venereology",
        "Skin"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "clean_hands",
      "subjectColor": "#d946ef",
      "subjectTopics": [
        "Papulosquamous Disorders (Psoriasis, Lichen Planus)",
        "Vesiculobullous Diseases (Pemphigus vs Pemphigoid)",
        "Infections (Leprosy, STIs, Syphilis)",
        "Cutaneous Manifestations of Systemic Diseases",
        "Hair, Nail & Pigmentary Disorders"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psych-neet-1",
      "title": "Psychiatry - NEET PG (2020-2024) DSM-5 / ICD-11 Clinical Case Vignettes.pdf",
      "edition": "2024 Edition",
      "year": "2020-2024",
      "fileSize": "5.9 MB",
      "pages": 64,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Psychiatry_NEET_PG_Clinical_Case_Vignettes.pdf",
      "summary": "Schneider first rank symptoms, Delusions of reference/persecution, Lithium toxicity, SSRI vs TCA side effect profiles, and ECT indications.",
      "subject": "Psychiatry",
      "subjectAliases": [
        "Psychiatry",
        "Mental Health"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "psychology",
      "subjectColor": "#8b5cf6",
      "subjectTopics": [
        "Schizophrenia & Psychotic Disorders",
        "Mood Disorders (Depression & Bipolar)",
        "Anxiety & OCD Spectrum",
        "Substance Abuse & Alcohol Withdrawal",
        "Psychopharmacology & ECT"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psych-inicet-1",
      "title": "Psychiatry - INI-CET Cognitive Psychology & Addiction Medicine PYQs.pdf",
      "edition": "2024 AIIMS Level",
      "year": "2021-2024",
      "fileSize": "5.2 MB",
      "pages": 58,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Psychiatry_INICET_Addiction_Medicine_PYQs.pdf",
      "summary": "Delirium tremens management, Opiate overdose naloxone protocol, Dissociative fugue, and Tourette syndrome treatment.",
      "subject": "Psychiatry",
      "subjectAliases": [
        "Psychiatry",
        "Mental Health"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "psychology",
      "subjectColor": "#8b5cf6",
      "subjectTopics": [
        "Schizophrenia & Psychotic Disorders",
        "Mood Disorders (Depression & Bipolar)",
        "Anxiety & OCD Spectrum",
        "Substance Abuse & Alcohol Withdrawal",
        "Psychopharmacology & ECT"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-psych-fmge-1",
      "title": "Psychiatry - FMGE 150 Must-Score Diagnostic Criteria Question Bank.pdf",
      "edition": "2024 Rapid Screening",
      "year": "2019-2024",
      "fileSize": "4.1 MB",
      "pages": 46,
      "lastUpdated": "2026-10-18",
      "downloadFileName": "Psychiatry_FMGE_150_MustScore_PYQs.pdf",
      "summary": "Neuroleptic Malignant Syndrome vs Serotonin syndrome, Defense mechanisms, Anorexia nervosa vs Bulimia, and Narcolepsy.",
      "subject": "Psychiatry",
      "subjectAliases": [
        "Psychiatry",
        "Mental Health"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "psychology",
      "subjectColor": "#8b5cf6",
      "subjectTopics": [
        "Schizophrenia & Psychotic Disorders",
        "Mood Disorders (Depression & Bipolar)",
        "Anxiety & OCD Spectrum",
        "Substance Abuse & Alcohol Withdrawal",
        "Psychopharmacology & ECT"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-radio-neet-1",
      "title": "Radiology - NEET PG (2020-2024) High Yield Diagnostic Imaging Signs PYQs.pdf",
      "edition": "2024 Illustrated Master",
      "year": "2020-2024",
      "fileSize": "9.4 MB",
      "pages": 98,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Radiology_NEET_PG_Diagnostic_Imaging_PYQs.pdf",
      "summary": "Deep sulcus sign in pneumothorax, Sail sign in thymus, Epidural vs Subdural hematoma on non-contrast CT head, and pneumoperitoneum signs.",
      "subject": "Radiology",
      "subjectAliases": [
        "Radiology",
        "Radio-Diagnosis",
        "RadioLink",
        "Radiodiagnosis"
      ],
      "exam": "NEET PG PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "radiology",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Chest X-Ray Classic Signs",
        "Emergency CT Brain & Trauma",
        "Abdominal Ultrasound & CT Contrast",
        "MRI Physics & Sequences",
        "Radiation Safety & ALARA Principles"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-radio-inicet-1",
      "title": "Radiology - INI-CET MRI Sequences, PET-CT & Interventional Radiology PYQs.pdf",
      "edition": "2024 Elite Imaging",
      "year": "2021-2024",
      "fileSize": "8.1 MB",
      "pages": 82,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Radiology_INICET_MRI_Interventional_PYQs.pdf",
      "summary": "DWI and ADC restriction in acute cerebral infarction, T1 vs T2 signals, 18F-FDG PET uptake, and TIPS procedure in portal hypertension.",
      "subject": "Radiology",
      "subjectAliases": [
        "Radiology",
        "Radio-Diagnosis",
        "RadioLink",
        "Radiodiagnosis"
      ],
      "exam": "INI-CET PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "radiology",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Chest X-Ray Classic Signs",
        "Emergency CT Brain & Trauma",
        "Abdominal Ultrasound & CT Contrast",
        "MRI Physics & Sequences",
        "Radiation Safety & ALARA Principles"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    },
    {
      "id": "pyq-radio-fmge-1",
      "title": "Radiology - FMGE 100 Most Repeated X-Ray and CT Head Scan Questions.pdf",
      "edition": "2024 Visual Rapid Review",
      "year": "2019-2024",
      "fileSize": "6.5 MB",
      "pages": 64,
      "lastUpdated": "2026-10-19",
      "downloadFileName": "Radiology_FMGE_100_Repeated_XRays_PYQs.pdf",
      "summary": "Barium swallow bird-beak sign in achalasia, string sign in Crohn, Apple core in colon cancer, and Bat-wing pulmonary edema.",
      "subject": "Radiology",
      "subjectAliases": [
        "Radiology",
        "Radio-Diagnosis",
        "RadioLink",
        "Radiodiagnosis"
      ],
      "exam": "FMGE PYQs",
      "subjectPhase": "Final Prof Clinical Specialties",
      "subjectIcon": "radiology",
      "subjectColor": "#0284c7",
      "subjectTopics": [
        "Chest X-Ray Classic Signs",
        "Emergency CT Brain & Trauma",
        "Abdominal Ultrasound & CT Contrast",
        "MRI Physics & Sequences",
        "Radiation Safety & ALARA Principles"
      ],
      "driveFolderUrl": "https://drive.google.com/drive/folders/1feRfWqO6wi9jUewr1Xm59E8HN4y_HJ4a?usp=drive_link"
    }
  ]
};

export function getDocumentsForFaculty(facultySubject, isSuperFaculty = false) {
  if (!facultySubject || isSuperFaculty || facultySubject === 'All Subjects' || facultySubject.toLowerCase() === 'all') {
    return PYQ_DATA.documents;
  }
  const cleanSub = facultySubject.trim().toLowerCase();
  return PYQ_DATA.documents.filter(doc => {
    if (doc.subject.toLowerCase() === cleanSub) return true;
    if (Array.isArray(doc.subjectAliases)) {
      return doc.subjectAliases.some(a => a.toLowerCase() === cleanSub || cleanSub.includes(a.toLowerCase()));
    }
    return false;
  });
}

export function getAvailableSubjectsForFaculty(facultySubject, isSuperFaculty = false) {
  if (!facultySubject || isSuperFaculty || facultySubject === 'All Subjects' || facultySubject.toLowerCase() === 'all') {
    return PYQ_DATA.subjects;
  }
  const cleanSub = facultySubject.trim().toLowerCase();
  return PYQ_DATA.subjects.filter(s => {
    if (s.name.toLowerCase() === cleanSub) return true;
    if (Array.isArray(s.aliases)) {
      return s.aliases.some(a => a.toLowerCase() === cleanSub || cleanSub.includes(a.toLowerCase()));
    }
    return false;
  });
}
