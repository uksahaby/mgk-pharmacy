/* eslint-disable no-console */
import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { SHIPPING_ZONES } from "./shipping-zones";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86_400_000;

const categories = [
  ["pain-fever", "Pain & Fever", "Paracetamol, ibuprofen and stronger pain relief for adults and children.", "thermometer"],
  ["malaria", "Malaria", "WHO-recommended artemisinin combination therapies and severe-malaria treatment.", "bug"],
  ["antibiotics", "Antibiotics", "Prescription antibiotics, dispensed only against a valid prescription.", "shield"],
  ["blood-pressure-heart", "Blood Pressure & Heart", "Antihypertensives, statins and other cardiovascular medicines.", "heart"],
  ["diabetes", "Diabetes Care", "Oral antidiabetics, insulin, glucometers and testing supplies.", "droplets"],
  ["stomach-digestion", "Stomach & Digestion", "Antacids, ulcer treatment, rehydration and diarrhoea relief.", "flask"],
  ["allergy-cold-cough", "Allergy, Cold & Cough", "Antihistamines, decongestants and cough syrups.", "wind"],
  ["vitamins-supplements", "Vitamins & Supplements", "Multivitamins, blood tonics, immune and joint support.", "leaf"],
  ["mother-baby", "Mother & Baby", "Prenatal vitamins, children's medicines and baby care.", "baby"],
  ["skin-care", "Skin Care", "Antifungal, antibacterial and anti-itch creams and ointments.", "sparkles"],
  ["eye-ear", "Eye & Ear Care", "Eye drops, ear drops and eye health supplements.", "eye"],
  ["sexual-reproductive", "Sexual & Reproductive Health", "Contraception, sexual wellness and women's health.", "venus"],
  ["first-aid-devices", "First Aid & Devices", "Dressings, thermometers, BP monitors and nebulisers.", "stethoscope"],
  ["mental-health-neuro", "Mental Health & Neurology", "Antidepressants, anticonvulsants and controlled medicines.", "brain"],
] as const;

type Seed = {
  n: string; g: string; b: string; m: string; s?: string; f: string; p: string; price: number; was?: number;
  c: (typeof categories)[number][0]; rx?: "OTC" | "POM" | "CONTROLLED"; use: string; feat?: boolean; cold?: boolean;
};

const products: Seed[] = [
  // Pain & fever
  { n: "Panadol Extra", g: "Paracetamol + Caffeine", b: "Panadol", m: "GSK", s: "500mg/65mg", f: "Tablet", p: "Pack of 24 tablets", price: 1200, c: "pain-fever", use: "headache, toothache, period pain and fever", feat: true },
  { n: "Emzor Paracetamol", g: "Paracetamol", b: "Emzor", m: "Emzor Pharmaceuticals", s: "500mg", f: "Tablet", p: "Pack of 96 tablets", price: 950, c: "pain-fever", use: "mild to moderate pain and fever" },
  { n: "Emzor Paracetamol Syrup", g: "Paracetamol", b: "Emzor", m: "Emzor Pharmaceuticals", s: "125mg/5ml", f: "Syrup", p: "100ml bottle", price: 700, c: "pain-fever", use: "fever and pain in children" },
  { n: "Brufen", g: "Ibuprofen", b: "Brufen", m: "Abbott", s: "400mg", f: "Tablet", p: "Pack of 30 tablets", price: 2400, c: "pain-fever", use: "pain, inflammation and fever" },
  { n: "Cataflam", g: "Diclofenac Potassium", b: "Cataflam", m: "Novartis", s: "50mg", f: "Tablet", p: "Pack of 20 tablets", price: 4800, c: "pain-fever", rx: "POM", use: "acute pain and inflammation, including dental and post-operative pain" },
  { n: "Dihydrocodeine", g: "Dihydrocodeine Tartrate", b: "DF118", m: "Martindale", s: "30mg", f: "Tablet", p: "Pack of 28 tablets", price: 7000, c: "pain-fever", rx: "CONTROLLED", use: "moderate to severe pain when other painkillers are not enough" },
  { n: "Tramadol HCl", g: "Tramadol Hydrochloride", b: "Tramal", m: "Grünenthal", s: "50mg", f: "Capsule", p: "Pack of 20 capsules", price: 3500, c: "pain-fever", rx: "CONTROLLED", use: "moderate to severe pain" },

  // Malaria
  { n: "Coartem", g: "Artemether + Lumefantrine", b: "Coartem", m: "Novartis", s: "20mg/120mg", f: "Tablet", p: "Pack of 24 tablets (1 course)", price: 4500, c: "malaria", use: "uncomplicated malaria in adults and children over 5kg", feat: true },
  { n: "Coartem Dispersible", g: "Artemether + Lumefantrine", b: "Coartem", m: "Novartis", s: "20mg/120mg", f: "Dispersible tablet", p: "Pack of 6 tablets (child course)", price: 2200, c: "malaria", use: "uncomplicated malaria in infants and children" },
  { n: "Lonart DS", g: "Artemether + Lumefantrine", b: "Lonart", m: "Bliss GVS", s: "80mg/480mg", f: "Tablet", p: "Pack of 6 tablets (1 course)", price: 2800, c: "malaria", use: "uncomplicated malaria in adults" },
  { n: "P-Alaxin", g: "Dihydroartemisinin + Piperaquine", b: "P-Alaxin", m: "Bliss GVS", s: "40mg/320mg", f: "Tablet", p: "Pack of 9 tablets (1 course)", price: 3200, c: "malaria", use: "uncomplicated malaria with a convenient 3-day course" },
  { n: "Camosunate", g: "Artesunate + Amodiaquine", b: "Camosunate", m: "Geneith", s: "100mg/270mg", f: "Tablet", p: "Pack of 6 tablets", price: 1800, c: "malaria", use: "uncomplicated malaria" },
  { n: "Larinate Injection", g: "Artesunate", b: "Larinate", m: "Ipca", s: "60mg", f: "Injection", p: "1 vial + diluent", price: 1600, c: "malaria", rx: "POM", use: "severe malaria, administered by a healthcare professional" },

  // Antibiotics
  { n: "Zithromax", g: "Azithromycin", b: "Zithromax", m: "Pfizer", s: "500mg", f: "Tablet", p: "Pack of 3 tablets", price: 6500, c: "antibiotics", rx: "POM", use: "respiratory, skin and certain sexually transmitted bacterial infections" },
  { n: "Zetro", g: "Azithromycin", b: "Zetro", m: "Getz Pharma", s: "500mg", f: "Tablet", p: "Pack of 3 tablets", price: 2500, c: "antibiotics", rx: "POM", use: "respiratory, skin and certain sexually transmitted bacterial infections" },
  { n: "Augmentin", g: "Amoxicillin + Clavulanic Acid", b: "Augmentin", m: "GSK", s: "625mg", f: "Tablet", p: "Pack of 14 tablets", price: 12000, c: "antibiotics", rx: "POM", use: "sinus, chest, urinary tract, skin and dental infections", feat: true },
  { n: "Amoxil", g: "Amoxicillin", b: "Amoxil", m: "Beecham", s: "500mg", f: "Capsule", p: "Pack of 21 capsules", price: 3500, c: "antibiotics", rx: "POM", use: "a wide range of bacterial infections" },
  { n: "Ciprotab", g: "Ciprofloxacin", b: "Ciprotab", m: "Fidson", s: "500mg", f: "Tablet", p: "Pack of 10 tablets", price: 1500, c: "antibiotics", rx: "POM", use: "urinary tract, gut and some respiratory infections" },
  { n: "Tavanic", g: "Levofloxacin", b: "Tavanic", m: "Sanofi", s: "500mg", f: "Tablet", p: "Pack of 5 tablets", price: 24000, c: "antibiotics", rx: "POM", use: "pneumonia, sinusitis and complicated urinary tract infections" },
  { n: "Evofix Suspension", g: "Cefixime", b: "Evofix", m: "Evans", s: "100mg/5ml", f: "Suspension", p: "50ml bottle", price: 5250, c: "antibiotics", rx: "POM", use: "ear, throat, chest and urinary infections in children" },
  { n: "Flagyl", g: "Metronidazole", b: "Flagyl", m: "Sanofi", s: "400mg", f: "Tablet", p: "Pack of 21 tablets", price: 2600, c: "antibiotics", rx: "POM", use: "gut, dental and gynaecological infections caused by anaerobic bacteria and parasites" },
  { n: "Dalacin C", g: "Clindamycin", b: "Dalacin", m: "Pfizer", s: "150mg", f: "Capsule", p: "Pack of 16 capsules", price: 9800, c: "antibiotics", rx: "POM", use: "serious skin, bone and dental infections" },

  // Blood pressure & heart
  { n: "Norvasc", g: "Amlodipine", b: "Norvasc", m: "Pfizer", s: "5mg", f: "Tablet", p: "Pack of 30 tablets", price: 9500, c: "blood-pressure-heart", rx: "POM", use: "high blood pressure and angina", feat: true },
  { n: "Amlodipine Teva", g: "Amlodipine", b: "Teva", m: "Teva", s: "10mg", f: "Tablet", p: "Pack of 28 tablets", price: 2200, c: "blood-pressure-heart", rx: "POM", use: "high blood pressure and angina" },
  { n: "Losartan Potassium", g: "Losartan", b: "Cozaar", m: "Organon", s: "50mg", f: "Tablet", p: "Pack of 28 tablets", price: 2700, c: "blood-pressure-heart", rx: "POM", use: "high blood pressure and kidney protection in type 2 diabetes" },
  { n: "Exforge HCT", g: "Amlodipine + Valsartan + Hydrochlorothiazide", b: "Exforge", m: "Novartis", s: "5/160/12.5mg", f: "Tablet", p: "Pack of 28 tablets", price: 10500, c: "blood-pressure-heart", rx: "POM", use: "high blood pressure not controlled on two medicines" },
  { n: "Zestril", g: "Lisinopril", b: "Zestril", m: "AstraZeneca", s: "10mg", f: "Tablet", p: "Pack of 28 tablets", price: 22000, c: "blood-pressure-heart", rx: "POM", use: "high blood pressure and heart failure" },
  { n: "Lipitor", g: "Atorvastatin", b: "Lipitor", m: "Pfizer", s: "20mg", f: "Tablet", p: "Pack of 30 tablets", price: 14500, c: "blood-pressure-heart", rx: "POM", use: "high cholesterol and prevention of heart attack and stroke" },
  { n: "Atorvastatin Sandoz", g: "Atorvastatin", b: "Sandoz", m: "Sandoz", s: "20mg", f: "Tablet", p: "Pack of 30 tablets", price: 3800, c: "blood-pressure-heart", rx: "POM", use: "high cholesterol and prevention of heart attack and stroke" },
  { n: "Cardioprin", g: "Aspirin (low dose)", b: "Cardioprin", m: "Reckitt", s: "75mg", f: "Gastro-resistant tablet", p: "Pack of 30 tablets", price: 1500, c: "blood-pressure-heart", use: "prevention of heart attack and stroke when advised by a doctor" },

  // Diabetes
  { n: "Glucophage", g: "Metformin", b: "Glucophage", m: "Merck", s: "500mg", f: "Tablet", p: "Pack of 30 tablets", price: 3200, c: "diabetes", rx: "POM", use: "type 2 diabetes", feat: true },
  { n: "Diamicron MR", g: "Gliclazide", b: "Diamicron", m: "Servier", s: "60mg", f: "Modified-release tablet", p: "Pack of 30 tablets", price: 10500, c: "diabetes", rx: "POM", use: "type 2 diabetes" },
  { n: "Amaryl", g: "Glimepiride", b: "Amaryl", m: "Sanofi", s: "2mg", f: "Tablet", p: "Pack of 30 tablets", price: 8400, c: "diabetes", rx: "POM", use: "type 2 diabetes" },
  { n: "Galvus Met", g: "Vildagliptin + Metformin", b: "Galvus", m: "Novartis", s: "50mg/1000mg", f: "Tablet", p: "Pack of 30 tablets", price: 19500, c: "diabetes", rx: "POM", use: "type 2 diabetes not controlled on metformin alone" },
  { n: "Mixtard 30 Penfill", g: "Human Insulin (30/70)", b: "Mixtard", m: "Novo Nordisk", s: "100 IU/ml", f: "Cartridge", p: "Pack of 5 × 3ml cartridges", price: 28000, c: "diabetes", rx: "POM", cold: true, use: "diabetes requiring insulin" },
  { n: "Accu-Chek Active Meter", g: "Blood glucose meter", b: "Accu-Chek", m: "Roche", f: "Device", p: "Meter kit with 10 strips", price: 23000, c: "diabetes", use: "home blood glucose monitoring" },
  { n: "Accu-Chek Active Test Strips", g: "Glucose test strips", b: "Accu-Chek", m: "Roche", f: "Test strip", p: "Pack of 50 strips", price: 16500, c: "diabetes", use: "use with Accu-Chek Active meters" },

  // Stomach & digestion
  { n: "Gestid", g: "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", b: "Gestid", m: "Fidson", f: "Suspension", p: "200ml bottle", price: 2700, c: "stomach-digestion", use: "heartburn, indigestion and bloating" },
  { n: "Nexium", g: "Esomeprazole", b: "Nexium", m: "AstraZeneca", s: "20mg", f: "Gastro-resistant tablet", p: "Pack of 14 tablets", price: 9800, c: "stomach-digestion", rx: "POM", use: "acid reflux, ulcers and H. pylori treatment" },
  { n: "Omeprazole Sandoz", g: "Omeprazole", b: "Sandoz", m: "Sandoz", s: "20mg", f: "Capsule", p: "Pack of 28 capsules", price: 2800, c: "stomach-digestion", use: "heartburn and acid reflux" },
  { n: "Imodium", g: "Loperamide", b: "Imodium", m: "Janssen", s: "2mg", f: "Capsule", p: "Pack of 12 capsules", price: 2400, c: "stomach-digestion", use: "short-term relief of acute diarrhoea in adults" },
  { n: "ORS Low Osmolarity", g: "Oral Rehydration Salts", b: "Emzor ORS", m: "Emzor Pharmaceuticals", f: "Sachet", p: "Pack of 10 sachets", price: 1500, c: "stomach-digestion", use: "rehydration during diarrhoea and vomiting" },
  { n: "Zinc Sulphate Dispersible", g: "Zinc Sulphate", b: "Zinkid", m: "Emzor Pharmaceuticals", s: "20mg", f: "Dispersible tablet", p: "Pack of 10 tablets", price: 900, c: "stomach-digestion", use: "with ORS for childhood diarrhoea" },
  { n: "Buscopan", g: "Hyoscine Butylbromide", b: "Buscopan", m: "Sanofi", s: "10mg", f: "Tablet", p: "Pack of 20 tablets", price: 3600, c: "stomach-digestion", use: "stomach cramps and period pain" },

  // Allergy, cold & cough
  { n: "Loratyn", g: "Loratadine", b: "Loratyn", m: "Hovid", s: "10mg", f: "Tablet", p: "Pack of 10 tablets", price: 1000, c: "allergy-cold-cough", use: "hay fever, catarrh and itchy skin without drowsiness" },
  { n: "Zyrtec", g: "Cetirizine", b: "Zyrtec", m: "UCB", s: "10mg", f: "Tablet", p: "Pack of 10 tablets", price: 3200, c: "allergy-cold-cough", use: "allergies, hay fever and hives" },
  { n: "Piriton", g: "Chlorphenamine", b: "Piriton", m: "GSK", s: "4mg", f: "Tablet", p: "Pack of 30 tablets", price: 900, c: "allergy-cold-cough", use: "allergies and itching (may cause drowsiness)" },
  { n: "Benylin Original", g: "Diphenhydramine + Ammonium Chloride", b: "Benylin", m: "Johnson & Johnson", f: "Syrup", p: "100ml bottle", price: 2900, c: "allergy-cold-cough", use: "chesty cough" },
  { n: "Sinufed", g: "Pseudoephedrine + Triprolidine", b: "Sinufed", m: "Fidson", f: "Syrup", p: "100ml bottle", price: 2400, c: "allergy-cold-cough", use: "blocked nose and catarrh" },
  { n: "Ventolin Inhaler", g: "Salbutamol", b: "Ventolin", m: "GSK", s: "100mcg/dose", f: "Inhaler", p: "200 doses", price: 5500, c: "allergy-cold-cough", rx: "POM", use: "fast relief of asthma symptoms" },

  // Vitamins & supplements
  { n: "Vitabiotics Wellwoman", g: "Multivitamin for women", b: "Wellwoman", m: "Vitabiotics", f: "Capsule", p: "Pack of 30 capsules", price: 9500, was: 11000, c: "vitamins-supplements", use: "daily nutritional support for women", feat: true },
  { n: "Vitabiotics Wellman", g: "Multivitamin for men", b: "Wellman", m: "Vitabiotics", f: "Tablet", p: "Pack of 30 tablets", price: 9500, was: 11000, c: "vitamins-supplements", use: "daily nutritional support for men" },
  { n: "Redoxon Double Action", g: "Vitamin C + Zinc", b: "Redoxon", m: "Bayer", s: "1000mg/10mg", f: "Effervescent tablet", p: "Tube of 15 tablets", price: 4800, c: "vitamins-supplements", use: "immune support" },
  { n: "Seven Seas Cod Liver Oil", g: "Omega-3 + Vitamins A & D", b: "Seven Seas", m: "P&G Health", f: "Capsule", p: "Pack of 60 capsules", price: 7200, c: "vitamins-supplements", use: "heart, joint and brain health" },
  { n: "Astymin Forte", g: "Amino acids + Multivitamins", b: "Astymin", m: "Tablets India", f: "Capsule", p: "Pack of 30 capsules", price: 3600, c: "vitamins-supplements", use: "recovery, fatigue and appetite support" },
  { n: "Chemiron", g: "Iron + Folic Acid + Vitamin B12", b: "Chemiron", m: "Chemiron Intl", f: "Syrup", p: "200ml bottle", price: 2500, c: "vitamins-supplements", use: "blood building and iron-deficiency anaemia" },
  { n: "Osteocare", g: "Calcium + Magnesium + Vitamin D3 + Zinc", b: "Osteocare", m: "Vitabiotics", f: "Tablet", p: "Pack of 30 tablets", price: 5200, c: "vitamins-supplements", use: "bone and joint health" },

  // Mother & baby
  { n: "Pregnacare Original", g: "Prenatal multivitamin", b: "Pregnacare", m: "Vitabiotics", f: "Tablet", p: "Pack of 30 tablets", price: 8800, c: "mother-baby", use: "nutritional support before and during pregnancy", feat: true },
  { n: "Folic Acid", g: "Folic Acid", b: "Emzor", m: "Emzor Pharmaceuticals", s: "5mg", f: "Tablet", p: "Pack of 100 tablets", price: 800, c: "mother-baby", use: "prevention of neural-tube defects and folate deficiency" },
  { n: "Calpol Infant", g: "Paracetamol", b: "Calpol", m: "J&J", s: "120mg/5ml", f: "Suspension", p: "100ml bottle", price: 3200, c: "mother-baby", use: "fever and pain in babies from 2 months" },
  { n: "Gripe Water", g: "Dill oil + Sodium bicarbonate", b: "Woodward's", m: "Woodward's", f: "Liquid", p: "150ml bottle", price: 2100, c: "mother-baby", use: "wind and colic in babies" },
  { n: "Vitane Drops", g: "Multivitamin drops", b: "Vitane", m: "Evans", f: "Drops", p: "30ml bottle", price: 3200, c: "mother-baby", use: "daily vitamins for infants" },

  // Skin
  { n: "Canesten Cream", g: "Clotrimazole", b: "Canesten", m: "Bayer", s: "1%", f: "Cream", p: "20g tube", price: 2600, c: "skin-care", use: "fungal skin infections such as ringworm and athlete's foot" },
  { n: "Funbact-A", g: "Betamethasone + Clotrimazole + Gentamicin", b: "Funbact", m: "Fidson", f: "Cream", p: "30g tube", price: 1100, c: "skin-care", rx: "POM", use: "inflamed skin infections" },
  { n: "Hydrocortisone Cream", g: "Hydrocortisone", b: "Emzor", m: "Emzor Pharmaceuticals", s: "1%", f: "Cream", p: "15g tube", price: 900, c: "skin-care", use: "insect bites, eczema and mild skin irritation" },
  { n: "Savlon Antiseptic Liquid", g: "Chlorhexidine + Cetrimide", b: "Savlon", m: "Johnson & Johnson", f: "Liquid", p: "250ml bottle", price: 2200, c: "skin-care", use: "cleaning cuts, grazes and wounds" },

  // Eye & ear
  { n: "Optrex Eye Drops", g: "Witch hazel", b: "Optrex", m: "Reckitt", f: "Eye drops", p: "10ml bottle", price: 4200, c: "eye-ear", use: "tired and irritated eyes" },
  { n: "Gentamicin Eye/Ear Drops", g: "Gentamicin", b: "Gentalek", m: "Ciron", s: "0.3%", f: "Drops", p: "10ml bottle", price: 700, c: "eye-ear", rx: "POM", use: "bacterial eye and ear infections" },
  { n: "Vision Plus", g: "Lutein + Bilberry + Vitamins", b: "Vision Plus", m: "Swiss Pharma", f: "Capsule", p: "Pack of 30 capsules", price: 5400, c: "eye-ear", use: "eye health support" },

  // Sexual & reproductive
  { n: "Postinor-2", g: "Levonorgestrel", b: "Postinor", m: "Gedeon Richter", s: "0.75mg", f: "Tablet", p: "Pack of 2 tablets", price: 1500, c: "sexual-reproductive", use: "emergency contraception within 72 hours" },
  { n: "Microgynon 30", g: "Levonorgestrel + Ethinylestradiol", b: "Microgynon", m: "Bayer", f: "Tablet", p: "1 cycle (21 tablets)", price: 1200, c: "sexual-reproductive", rx: "POM", use: "oral contraception" },
  { n: "Durex Extra Safe", g: "Latex condoms", b: "Durex", m: "Reckitt", f: "Condom", p: "Pack of 12", price: 3800, c: "sexual-reproductive", use: "protection against pregnancy and STIs" },
  { n: "Clotrimazole Vaginal Tablet", g: "Clotrimazole", b: "Canesten", m: "Bayer", s: "500mg", f: "Pessary", p: "1 pessary + applicator", price: 3300, c: "sexual-reproductive", use: "vaginal thrush" },

  // First aid & devices
  { n: "Omron M2 BP Monitor", g: "Automatic upper-arm blood pressure monitor", b: "Omron", m: "Omron Healthcare", f: "Device", p: "1 monitor with cuff", price: 45000, c: "first-aid-devices", use: "accurate home blood pressure monitoring", feat: true },
  { n: "Omron Compressor Nebulizer", g: "Nebuliser", b: "Omron", m: "Omron Healthcare", f: "Device", p: "1 nebuliser kit", price: 66000, c: "first-aid-devices", use: "delivering inhaled asthma and COPD medicines" },
  { n: "Digital Thermometer", g: "Digital clinical thermometer", b: "Microlife", m: "Microlife", f: "Device", p: "1 thermometer", price: 3500, c: "first-aid-devices", use: "measuring body temperature" },
  { n: "Cotton Absorbent Gauze Roll", g: "Absorbent gauze", b: "Hospicare", m: "Hospicare", s: "15cm × 4.5m", f: "Dressing", p: "1 roll", price: 400, c: "first-aid-devices", use: "wound dressing and padding" },
  { n: "Insulin Syringes", g: "Insulin syringe 1ml (U-100)", b: "BD", m: "Becton Dickinson", f: "Syringe", p: "Pack of 10", price: 2500, c: "first-aid-devices", use: "insulin injection" },

  // Mental health & neuro
  { n: "Diazepam", g: "Diazepam", b: "Valium", m: "Roche", s: "5mg", f: "Tablet", p: "Pack of 28 tablets", price: 1800, c: "mental-health-neuro", rx: "CONTROLLED", use: "short-term relief of severe anxiety and muscle spasm" },
  { n: "Paroxetine", g: "Paroxetine", b: "Seroxat", m: "GSK", s: "20mg", f: "Tablet", p: "Pack of 30 tablets", price: 8500, c: "mental-health-neuro", rx: "POM", use: "depression, panic disorder and anxiety disorders" },
  { n: "Tegretol", g: "Carbamazepine", b: "Tegretol", m: "Novartis", s: "200mg", f: "Tablet", p: "Pack of 50 tablets", price: 7800, c: "mental-health-neuro", rx: "POM", use: "epilepsy and trigeminal neuralgia" },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function describe(p: Seed) {
  const rxNote =
    p.rx === "CONTROLLED"
      ? "This is a controlled medicine. It can only be supplied to verified customers against a valid prescription, reviewed by our pharmacist."
      : p.rx === "POM"
        ? "This is a prescription-only medicine. Please upload a valid prescription at checkout; our pharmacist will review it before your order is processed."
        : "Available without a prescription. Our pharmacists are happy to advise if you're unsure whether it's right for you.";
  return {
    description: `${p.n}${p.s ? ` ${p.s}` : ""} contains ${p.g}. It is used for ${p.use}. Supplied as ${p.p.toLowerCase()} by ${p.m}. ${rxNote}`,
    usage: `Take exactly as directed on the pack or by your doctor or pharmacist. Do not exceed the stated dose. If you're pregnant, breastfeeding, taking other medicines or have a long-term condition, speak to a pharmacist before use.`,
    warnings: `Read the patient information leaflet before use. Stop using and seek medical advice if you experience a rash, swelling, difficulty breathing or any unexpected side effect. Keep out of the sight and reach of children.${p.rx === "CONTROLLED" ? " May cause drowsiness and dependence; do not drive or drink alcohol while taking it." : ""}`,
  };
}

/** A minimal valid one-page PDF used as a sample prescription for the demo review queue. */
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 120>>stream
BT /F1 16 Tf 30 250 Td (SAMPLE PRESCRIPTION - NOT VALID) Tj 0 -30 Td /F1 11 Tf (Rx: Glucophage 500mg - 1 tab twice daily x 30 days) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

async function main() {
  console.log("Seeding…");
  const uploads = path.resolve(__dirname, "..", "uploads");
  fs.mkdirSync(uploads, { recursive: true });

  const catIds: Record<string, string> = {};
  for (const [i, [slug, name, description, icon]] of categories.entries()) {
    const c = await prisma.category.create({ data: { slug, name, description, icon, sortOrder: i } });
    catIds[slug] = c.id;
  }

  const productIds: Record<string, string> = {};
  for (const [i, p] of products.entries()) {
    const slug = slugify(`${p.n} ${p.s ?? ""}`);
    const created = await prisma.product.create({
      data: {
        slug,
        name: p.n,
        genericName: p.g,
        brand: p.b,
        manufacturer: p.m,
        strength: p.s ?? null,
        dosageForm: p.f,
        packSize: p.p,
        priceKobo: p.price * 100,
        compareAtKobo: p.was ? p.was * 100 : null,
        categoryId: catIds[p.c],
        rxStatus: p.rx ?? "OTC",
        coldChain: !!p.cold,
        featured: !!p.feat,
        soldCount: (i * 37) % 120,
        ...(p.cold ? { storage: "Store unopened in a refrigerator (2–8°C). Do not freeze. In-use cartridges may be kept below 30°C for up to 4 weeks." } : {}),
        ...describe(p),
      },
    });
    productIds[p.n] = created.id;

    // Two batches per product: one expiring sooner (sold first under FEFO), one later.
    // A few products are deliberately low or out of stock to exercise the UI.
    const outOfStock = i % 29 === 12;
    const low = i % 11 === 3;
    await prisma.batch.createMany({
      data: [
        { productId: created.id, batchNumber: `B${2600 + i}A`, expiresAt: new Date(Date.now() + (60 + (i % 5) * 30) * DAY), quantity: outOfStock ? 0 : low ? 4 : 20 + (i % 7) * 5 },
        { productId: created.id, batchNumber: `B${2600 + i}B`, expiresAt: new Date(Date.now() + (400 + (i % 9) * 20) * DAY), quantity: outOfStock || low ? 0 : 40 + (i % 4) * 10 },
      ],
    });
  }

  await prisma.shippingZone.createMany({ data: SHIPPING_ZONES });

  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const admin = await prisma.user.create({
    data: { email: process.env.SEED_ADMIN_EMAIL!, passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD!), firstName: "Amina", lastName: "Bello", role: "ADMIN", verificationStatus: "APPROVED", phone: "+2348030000001" },
  });
  await prisma.user.create({
    data: { email: process.env.SEED_PHARMACIST_EMAIL!, passwordHash: await hash(process.env.SEED_PHARMACIST_PASSWORD!), firstName: "Ibrahim", lastName: "Musa", role: "PHARMACIST", verificationStatus: "APPROVED", phone: "+2348030000002" },
  });
  await prisma.user.create({
    data: { email: process.env.SEED_RIDER_EMAIL!, passwordHash: await hash(process.env.SEED_RIDER_PASSWORD!), firstName: "Sani", lastName: "Garba", role: "RIDER", verificationStatus: "APPROVED", phone: "+2348030000003" },
  });
  const customer = await prisma.user.create({
    data: { email: process.env.SEED_CUSTOMER_EMAIL!, passwordHash: await hash(process.env.SEED_CUSTOMER_PASSWORD!), firstName: "Fatima", lastName: "Sani", phone: "+2348031234567" },
  });
  await prisma.address.create({
    data: { userId: customer.id, label: "Home", fullName: "Fatima Sani", phone: "+2348031234567", line1: "12 Zoo Road", city: "Kano", state: "Kano", landmark: "Opposite Kano Zoo gate", isDefault: true },
  });

  // Sample prescription + order waiting for pharmacist review, so the admin queue isn't empty.
  const rxFile = `seed-sample-prescription.pdf`;
  fs.writeFileSync(path.join(uploads, rxFile), SAMPLE_PDF);
  const rx = await prisma.prescription.create({
    data: { userId: customer.id, patientName: "Fatima Sani", prescriberName: "Dr. A. Yusuf", facility: "Aminu Kano Teaching Hospital", issuedOn: new Date(Date.now() - 2 * DAY), filePath: rxFile, originalName: "prescription.pdf", mimeType: "application/pdf" },
  });
  const kano = await prisma.shippingZone.findUniqueOrThrow({ where: { code: "KANO" } });
  const glucophage = await prisma.product.findUniqueOrThrow({ where: { id: productIds["Glucophage"] } });
  const strips = await prisma.product.findUniqueOrThrow({ where: { id: productIds["Accu-Chek Active Test Strips"] } });

  const rxOrder = await prisma.order.create({
    data: {
      number: "MGK-261015-104211", accessKey: "seed-demo-key-rx", userId: customer.id, email: customer.email, phone: customer.phone!, firstName: "Fatima", lastName: "Sani",
      status: "AWAITING_RX_REVIEW", paymentMethod: "BANK_TRANSFER", fulfilment: "DELIVERY", zoneId: kano.id,
      addressLine1: "12 Zoo Road", city: "Kano", state: "Kano", landmark: "Opposite Kano Zoo gate",
      subtotalKobo: glucophage.priceKobo * 2 + strips.priceKobo, shippingKobo: kano.feeKobo, totalKobo: glucophage.priceKobo * 2 + strips.priceKobo + kano.feeKobo,
      prescriptionId: rx.id, requiresRx: true,
      items: { create: [
        { productId: glucophage.id, name: glucophage.name, packSize: glucophage.packSize, rxStatus: "POM", priceKobo: glucophage.priceKobo, quantity: 2 },
        { productId: strips.id, name: strips.name, packSize: strips.packSize, rxStatus: "OTC", priceKobo: strips.priceKobo, quantity: 1 },
      ] },
      events: { create: [
        { type: "PLACED", message: "Order placed.", actor: "customer" },
        { type: "RX_REVIEW", message: "Your prescription is with our pharmacist for review (usually within 2 working hours)." },
      ] },
    },
  });

  // A completed historic order for the customer.
  const coartem = await prisma.product.findUniqueOrThrow({ where: { id: productIds["Coartem"] } });
  await prisma.order.create({
    data: {
      number: "MGK-260921-583302", accessKey: "seed-demo-key-done", userId: customer.id, email: customer.email, phone: customer.phone!, firstName: "Fatima", lastName: "Sani",
      status: "DELIVERED", paymentMethod: "PAYSTACK", paymentStatus: "PAID", paymentRef: "seed-ref-1", paidAt: new Date(Date.now() - 24 * DAY), fulfilment: "DELIVERY", zoneId: kano.id,
      addressLine1: "12 Zoo Road", city: "Kano", state: "Kano",
      subtotalKobo: coartem.priceKobo, shippingKobo: kano.feeKobo, totalKobo: coartem.priceKobo + kano.feeKobo,
      createdAt: new Date(Date.now() - 24 * DAY),
      items: { create: [{ productId: coartem.id, name: coartem.name, packSize: coartem.packSize, rxStatus: "OTC", priceKobo: coartem.priceKobo, quantity: 1 }] },
      events: { create: [
        { type: "PLACED", message: "Order placed.", createdAt: new Date(Date.now() - 24 * DAY) },
        { type: "PAID", message: "Payment confirmed.", createdAt: new Date(Date.now() - 24 * DAY) },
        { type: "DISPATCHED", message: "Your order is on its way.", createdAt: new Date(Date.now() - 23.8 * DAY) },
        { type: "DELIVERED", message: "Your order has been delivered.", createdAt: new Date(Date.now() - 23.5 * DAY) },
      ] },
    },
  });

  await prisma.contactMessage.create({
    data: { name: "Musa Abdullahi", email: "musa@example.com", topic: "PRODUCT", message: "Do you stock Galvus Met 50/850? My doctor changed my dose." },
  });

  console.log(`Seeded ${categories.length} categories, ${products.length} products, 4 zones, 4 users, 2 orders (admin: ${admin.email}).`);
  console.log(`Demo prescription order: ${rxOrder.number}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
