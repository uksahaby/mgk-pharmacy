/* eslint-disable no-console */
/**
 * Imports MGK Pharmacy's catalogue (downloaded by scripts/fetch-mgk.ts) into the local database,
 * cleaning it on the way in:
 *  - maps ~90 messy WooCommerce categories (and 3,900+ "Uncategorized" items) onto a clean category tree
 *  - assigns a dispensing class (OTC / POM / CONTROLLED) by drug class, defaulting unknown medicines to POM
 *  - extracts brand, strength, dosage form, pack size and generic name from names and tags
 *  - writes prisma/data/mgk-import-report.csv listing every product a pharmacist should check
 *
 *   npm run import:mgk -w apps/api                 # catalogue only; stock must be counted and received in admin
 *   npm run import:mgk -w apps/api -- --demo-stock  # local demo: in-stock items get a 12-month demo batch
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA = path.resolve(__dirname, "data");
const DEMO_STOCK = process.argv.includes("--demo-stock");
const DAY = 86_400_000;

type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  categories: { name: string; slug: string }[];
  tags?: { name: string }[];
  is_in_stock: boolean;
};

/* ------------------------------------------------------------------ */
/* Category tree                                                       */
/* ------------------------------------------------------------------ */

const CATEGORIES: [slug: string, name: string, description: string, icon: string][] = [
  ["pain-fever", "Pain & Fever", "Paracetamol, ibuprofen, anti-inflammatories and stronger pain relief.", "thermometer"],
  ["malaria", "Malaria", "WHO-recommended artemisinin combination therapies and severe-malaria treatment.", "bug"],
  ["antibiotics", "Antibiotics & Anti-infectives", "Antibiotics, antifungals, antivirals and dewormers. Most need a prescription.", "shield"],
  ["blood-pressure-heart", "Blood Pressure & Heart", "Antihypertensives, statins and other cardiovascular medicines.", "heart"],
  ["diabetes", "Diabetes Care", "Oral antidiabetics, insulin, glucometers and testing supplies.", "droplets"],
  ["stomach-digestion", "Stomach & Digestion", "Antacids, ulcer treatment, rehydration and diarrhoea relief.", "flask"],
  ["allergy-cold-cough", "Allergy, Cold & Cough", "Antihistamines, decongestants, cough syrups and asthma care.", "wind"],
  ["vitamins-supplements", "Vitamins & Supplements", "Multivitamins, blood tonics, immune and joint support.", "leaf"],
  ["mother-baby", "Mother & Baby", "Prenatal vitamins, children's medicines, baby food and baby care.", "baby"],
  ["skin-care", "Skin Care", "Medicated creams and ointments, antiseptics and wound care.", "sparkles"],
  ["eye-ear", "Eye & Ear Care", "Eye drops, ear drops and eye health supplements.", "eye"],
  ["sexual-reproductive", "Sexual & Reproductive Health", "Contraception, fertility, sexual wellness and women's health.", "venus"],
  ["first-aid-devices", "First Aid & Devices", "Dressings, syringes, test kits, BP monitors and nebulisers.", "stethoscope"],
  ["mental-health-neuro", "Mental Health & Neurology", "Antidepressants, antipsychotics, anticonvulsants and controlled medicines.", "brain"],
  ["hospital-specialist", "Hospital & Specialist", "Injectables, infusions, anaesthetics, hormones and specialist medicines.", "pill"],
  ["personal-care", "Personal Care & Beauty", "Oral care, skin and body care, hygiene and toiletries.", "sparkles"],
  ["food-drinks", "Food, Drinks & Nutrition", "Nutritional drinks, water, juices and snacks.", "leaf"],
  ["other", "Other Products", "Products awaiting categorisation by our team.", "pill"],
];

/** Original WooCommerce category names → our category (first match wins). */
const WOO_CATEGORY_MAP: [RegExp, string][] = [
  [/antimalarial/i, "malaria"],
  [/antidiabetic|diabetes/i, "diabetes"],
  [/antihypertensive|cardiovascular|statins|antiplatelet|heart health/i, "blood-pressure-heart"],
  [/antibiotic|aminoglycoside|cephalosporin|fluoroquinolone|penicillin|antiviral|antifungal(?!.*cream)/i, "antibiotics"],
  [/anti ?ulcer|antacid|h2 blocker|ppis|loose motion|laxative|antipasmodic/i, "stomach-digestion"],
  [/anti ?histamine|allergy|cold and cattarh|cough syrup|nasal spray|asthma|antiasthmatic/i, "allergy-cold-cough"],
  [/antideppresant|antipsychotic|antiepileptic|benzodiazepine|dopamine|controlled/i, "mental-health-neuro"],
  [/pain|nsaid|antiinflammatory|antipyretic|muscle relaxer/i, "pain-fever"],
  [/children|pregnancy|maternity/i, "mother-baby"],
  [/contracept|sexual|men.s health|^women$|hormonal care|vaginal|estrogen/i, "sexual-reproductive"],
  [/ear\/eye|eye care|^drops$/i, "eye-ear"],
  [/creams|antiseptic/i, "skin-care"],
  [/vitamin|supplement|blood tonic|wellness|liver health|weight management/i, "vitamins-supplements"],
  [/anti cancer|endocrine|iv infusion|injectable|sutures/i, "hospital-specialist"],
  [/health & beauty/i, "personal-care"],
];

/**
 * Keyword rules over name + tags. Order matters: specific drug classes before generic words.
 * `g` lists generic names used to fill in the product's generic name.
 */
type Rule = { cat: string; kw: string[]; g?: boolean };
const RULES: Rule[] = [
  // devices & supplies first, so "insulin syringe" is a device and "glucometer" isn't a drug
  { cat: "diabetes", kw: ["accu-chek", "accuchek", "glucometer", "glucose meter", "test strip", "lancet", "on call plus", "on-call", "contour plus", "fine test"] },
  { cat: "first-aid-devices", kw: ["syringe", "needle", "plaster", "gauze", "bandage", "cotton wool", "absorbent cotton", "glove", "face mask", "thermometer", "bp monitor", "blood pressure monitor", "sphygmo", "nebuli", "stethoscope", "cannula", "catheter", "giving set", "infusion set", "urine bag", "first aid", "crepe", "strapping", "test kit", "rapid test", "pregnancy test", "conception check", "specimen", "container", "filter paper", "sample bottle", "pulse oximeter", "wheelchair", "walking stick", "elastic", "hot water bottle", "suture", "scalpel", "blade", "micropore", "plaster of paris", "cotton bud", "dressing", "spatula", "urine m/s/c", "tourniquet"] },
  // controlled & neuro
  { cat: "mental-health-neuro", g: true, kw: ["diazepam", "lorazepam", "alprazolam", "bromazepam", "clonazepam", "nitrazepam", "flunitrazepam", "midazolam", "chlordiazepoxide", "amitriptyline", "imipramine", "clomipramine", "anafranil", "fluoxetine", "sertraline", "paroxetine", "escitalopram", "citalopram", "mirtazapine", "haloperidol", "olanzapine", "risperidone", "respidone", "chlorpromazine", "quetiapine", "aripiprazole", "trifluoperazine", "fluphenazine", "carbamazepine", "tegretol", "phenytoin", "valproate", "epilim", "encorate", "lamotrigine", "levetiracetam", "keppra", "gabapentin", "pregabalin", "lyrica", "phenobarbit", "trihexyphenidyl", "artane", "benzhexol", "levodopa", "madopar", "sinemet", "donepezil", "lithium", "zolpidem", "piracetam", "cinnarizine"] },
  // malaria
  { cat: "malaria", g: true, kw: ["artemether", "lumefantrine", "artesunate", "amodiaquine", "dihydroartemisinin", "piperaquine", "arteether", "artemisinin", "quinine", "chloroquine", "sulfadoxine", "pyrimethamine", "mefloquine", "primaquine", "proguanil", "atovaquone", "pyronaridine"] },
  { cat: "malaria", kw: ["coartem", "lonart", "amatem", "p-alaxin", "palaxin", "camosunate", "larinate", "gsunate", "g-sunate", "artequin", "artequick", "combisunate", "synriam", "duo-cotecxin", "cotecxin", "maldox", "fansidar", "lokmal", "combimal", "glowquine", "artazide", "lumartem", "lufanther", "coatal", "artesiane", "malafan", "amalar", "loxagyl"] },
  // anti-infectives
  { cat: "antibiotics", g: true, kw: ["amoxicillin", "amoxycillin", "clavulan", "ampicillin", "cloxacillin", "flucloxacillin", "penicillin", "ampiclox", "azithromycin", "clarithromycin", "erythromycin", "ciprofloxacin", "levofloxacin", "ofloxacin", "norfloxacin", "moxifloxacin", "pefloxacin", "sparfloxacin", "cefixime", "ceftriaxone", "cefuroxime", "cefpodoxime", "cefalexin", "cephalexin", "cefadroxil", "ceftazidime", "cefotaxime", "cefepime", "cefaclor", "cefdinir", "metronidazole", "tinidazole", "secnidazole", "doxycycline", "tetracycline", "clindamycin", "lincomycin", "gentamicin", "amikacin", "streptomycin", "co-trimoxazole", "cotrimoxazole", "sulfamethoxazole", "trimethoprim", "nitrofurantoin", "linezolid", "vancomycin", "meropenem", "imipenem", "chloramphenicol", "rifampicin", "isoniazid", "fluconazole", "itraconazole", "griseofulvin", "terbinafine", "nystatin", "voriconazole", "acyclovir", "aciclovir", "valacyclovir", "tenofovir", "lamivudine", "zidovudine", "efavirenz", "dolutegravir", "oseltamivir", "albendazole", "mebendazole", "ivermectin", "praziquantel", "pyrantel", "levamisole", "nitazoxanide"] },
  { cat: "antibiotics", kw: ["augmentin", "amoksiklav", "amoxiclav", "amoxil", "klavox", "zinnat", "zinacef", "ceporex", "zithromax", "zetro", "azinix", "ciprotab", "ciprotin", "tavanic", "oflomed", "tarivid", "flagyl", "dalacin", "septrin", "ampiclox", "rocephin", "skymox", "climox", "vermox", "zentel", "deworm", "cefsafe", "cefadox", "surexime", "evofix", "tiniflox", "uniflox", "okacin"] },
  // diabetes drugs
  { cat: "diabetes", g: true, kw: ["metformin", "glibenclamide", "gliclazide", "glimepiride", "glipizide", "pioglitazone", "sitagliptin", "vildagliptin", "linagliptin", "saxagliptin", "dapagliflozin", "empagliflozin", "canagliflozin", "acarbose", "insulin", "liraglutide"] },
  { cat: "diabetes", kw: ["glucophage", "daonil", "diamicron", "amaryl", "januvia", "galvus", "trajenta", "forxiga", "jardiance", "mixtard", "actrapid", "insulatard", "lantus", "novorapid", "humalog", "humulin", "novomix", "glucovance", "diabond", "clabetic", "sealmet", "taformin", "panfor", "glucochon", "glepid", "betix", "diabetic"] },
  // cardiovascular
  { cat: "blood-pressure-heart", g: true, kw: ["amlodipine", "nifedipine", "felodipine", "lercanidipine", "lisinopril", "ramipril", "enalapril", "captopril", "perindopril", "losartan", "valsartan", "telmisartan", "irbesartan", "candesartan", "olmesartan", "hydrochlorothiazide", "bendroflumethiazide", "bendrofluazide", "chlorthalidone", "indapamide", "furosemide", "frusemide", "torsemide", "torasemide", "spironolactone", "amiloride", "atenolol", "bisoprolol", "carvedilol", "metoprolol", "propranolol", "nebivolol", "labetalol", "methyldopa", "hydralazine", "clonidine", "atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "fenofibrate", "ezetimibe", "clopidogrel", "ticagrelor", "warfarin", "rivaroxaban", "apixaban", "digoxin", "amiodarone", "isosorbide", "glyceryl trinitrate", "trimetazidine", "sacubitril", "cholestyramine"] },
  { cat: "blood-pressure-heart", kw: ["norvasc", "zestril", "cozaar", "diovan", "exforge", "micardis", "lasix", "aldactone", "aldomet", "concor", "lipitor", "crestor", "plavix", "cardioprin", "torsinex", "rosart", "necsartan", "sartel", "amlozaar", "ponvas", "rovista", "xolstat", "simbaf", "cardiotan", "bendro", "lumipress", "co-diovan", "atacand", "aprovel", "coveram", "natrilix"] },
  // stomach
  { cat: "stomach-digestion", g: true, kw: ["omeprazole", "esomeprazole", "pantoprazole", "lansoprazole", "rabeprazole", "ranitidine", "famotidine", "cimetidine", "magnesium trisilicate", "aluminium hydroxide", "magnesium hydroxide", "simethicone", "loperamide", "oral rehydration", "metoclopramide", "domperidone", "ondansetron", "hyoscine", "dicyclomine", "drotaverine", "bisacodyl", "lactulose", "senna", "sennoside", "ispaghula", "mebeverine", "sucralfate", "racecadotril", "activated charcoal", "probiotic", "lactobacillus", "saccharomyces"] },
  { cat: "stomach-digestion", kw: ["antacid", "gestid", "gaviscon", "mintacid", "gelacid", "antamag", "imodium", "ors", "nexium", "barole", "omit", "omeshal", "esofag", "labzole", "buscopan", "dulcolax", "motilium", "vomset", "opelan", "esophran", "floranorm", "biogaia", "constistop", "loose motion", "diarrh", "ulcer", "heartburn", "prevacid"] },
  // allergy / respiratory
  { cat: "allergy-cold-cough", g: true, kw: ["loratadine", "desloratadine", "cetirizine", "levocetirizine", "fexofenadine", "chlorphenamine", "chlorpheniramine", "promethazine", "hydroxyzine", "ketotifen", "diphenhydramine", "montelukast", "salbutamol", "albuterol", "budesonide", "beclometasone", "beclomethasone", "fluticasone", "salmeterol", "formoterol", "ipratropium", "aminophylline", "theophylline", "pseudoephedrine", "phenylephrine", "dextromethorphan", "guaifenesin", "carbocisteine", "bromhexine", "ambroxol", "xylometazoline", "oxymetazoline"] },
  { cat: "allergy-cold-cough", kw: ["piriton", "zyrtec", "loratyn", "lorax", "atarax", "zaditen", "phenergan", "ventolin", "seretide", "symbicort", "benylin", "sinufed", "actifed", "otrivin", "oxozolin", "tuxil", "exdryl", "lysocyl", "cofta", "cof off", "shaltoux", "histolat", "rexal", "brustan", "kold time", "cough", "catarrh", "cattarh", "inhaler", "nasal", "allergy", "decongest"] },
  // pain
  { cat: "pain-fever", g: true, kw: ["paracetamol", "acetaminophen", "ibuprofen", "diclofenac", "aceclofenac", "naproxen", "piroxicam", "meloxicam", "celecoxib", "etoricoxib", "ketoprofen", "indomethacin", "mefenamic", "ketorolac", "tramadol", "codeine", "dihydrocodeine", "pentazocine", "morphine", "pethidine", "methocarbamol", "orphenadrine", "chlorzoxazone", "tizanidine", "baclofen", "methyl salicylate", "allopurinol", "colchicine", "febuxostat", "glucosamine", "tranexamic"] },
  { cat: "pain-fever", kw: ["panadol", "emzor paracetamol", "brufen", "ibucap", "cataflam", "voltaren", "voltral", "felvin", "ponstan", "celebrex", "arcoxia", "exxib", "tradomal", "tramal", "paragesic", "painkil", "pain relax", "curenac", "cetafenac", "zerodol", "mefdol", "babamol", "deep heat", "salonpas", "deep freeze", "thermal relief", "dubix", "efelon", "analgesic", "pain"] },
  // eye & ear
  { cat: "eye-ear", kw: ["eye drop", "eye/ear", "ear drop", "eye ointment", "ophthalmic", "eye gel", "artificial tear", "otic", "optrex", "visine", "lubrex eye", "tobradex", "ciproptic", "eyeglycate", "norodexa", "leobeta", "atribex", "reichlox", " eye"] },
  // sexual & reproductive
  { cat: "sexual-reproductive", g: true, kw: ["dinoprostone", "levonorgestrel", "ethinylestradiol", "norethisterone", "medroxyprogesterone", "progesterone", "estradiol", "clomiphene", "letrozole", "sildenafil", "tadalafil", "misoprostol", "mifepristone", "dydrogesterone"] },
  { cat: "sexual-reproductive", kw: ["postinor", "microgynon", "microlut", "desofem", "suprafem", "condom", "durex", "trojan", "kiss lube", "lubricant", "lube", "pessary", "vaginal", "canesten gyn", "polygynax", "clomid", "viagra", "cialis", "stenagra", "spermboom", "reproshield", "primolut", "duphaston", "fertility", "ovulation", "contracept", "sexual", "libido"] },
  // mother & baby
  { cat: "mother-baby", kw: ["pregnacare", "pregvyte", "pregnancy support", "folic", "calpol", "gripe water", "infant", "baby", "babies", "kids", "kisskids", "children", "child", "paed", "pediatric", "teething", "nappy", "diaper", "huggies", "pampers", "molfix", "breast pump", "feeding bottle", "chicco", "dano growing", "cerelac", "s-26", "similac", "formula"] },
  // vitamins
  { cat: "vitamins-supplements", g: true, kw: ["vitamin", "multivitamin", "ascorbic", "cholecalciferol", "mecobalamin", "cyanocobalamin", "folate", "ferrous", "iron", "calcium", "magnesium", "zinc", "selenium", "omega", "fish oil", "cod liver", "collagen", "glutathione", "coenzyme", "q10", "lutein", "ginseng", "ginkgo", "spirulina", "moringa", "amino acid", "dha", "evening primrose", "biotin"] },
  { cat: "vitamins-supplements", kw: ["wellwoman", "wellman", "wellteen", "centrum", "seven seas", "osteocare", "supracal", "astymin", "chemiron", "tatoron", "ferroglobin", "tonic", "immunboost", "nutrify", "daravit", "evergreen", "decavit", "neurotex", "neurobion", "cardiovit", "calgovit", "supplement", "b complex", "b-complex", "vitane", "renerve", "cosamine", "cosamid", "arthocare", "maxiron", "mumfer", "jawaron", "harmiron", "uptamin", "phatonic", "solotone", "hovid", "nutrigen", "curecee", "cac-1000", "cac -1000", "organic india", "livolin", "silybon", "liver"] },
  // personal-care brands (before the generic "cream"/"lotion" skin rule)
  { cat: "personal-care", kw: ["nivea", "dettol", "sensodyne", "colgate", "close up", "closeup", "oral-b", "oracare", "macleans", "pepsodent", "vaseline", "dove", "johnson", "carex", "lifebuoy", "jergens", "st ives", "cussons", "always", "lady care", "veet"] },
  // skin (medicated)
  { cat: "skin-care", g: true, kw: ["clotrimazole", "miconazole", "ketoconazole", "econazole", "betamethasone", "hydrocortisone", "clobetasol", "mometasone", "fusidic", "mupirocin", "silver sulfadiazine", "calamine", "povidone", "chlorhexidine", "benzoyl", "tretinoin", "permethrin", "benzyl benzoate"] },
  { cat: "skin-care", kw: ["cream", "ointment", "emulgel", " gel", "lotion", "antiseptic", "funbact", "betnovate", "canesten", "nizoral", "drugent", "halar", "siskin", "retinocen", "savlon", "pyodine", "wosan", "silver nitrate", "skin", "rash", "wound", "scar", "acne"] },
  // hospital & specialist
  { cat: "hospital-specialist", g: true, kw: ["dinoprostone", "dextrose", "normal saline", "sodium chloride infusion", "ringer", "darrow", "suxamethonium", "pancuronium", "vecuronium", "atracurium", "lidocaine", "lignocaine", "bupivacaine", "ketamine", "propofol", "thiopental", "adrenaline", "epinephrine", "atropine", "dexamethasone", "hydrocortisone sodium", "oxytocin", "ergometrine", "magnesium sulphate", "heparin", "enoxaparin", "levothyroxine", "carbimazole", "tamoxifen", "anastrozole", "capecitabine", "methotrexate", "cyclophosphamide", "hydroxyurea", "imatinib", "azathioprine", "prednisolone", "methylprednisolone", "vaccine", "immunoglobulin", "erythropoietin", "albumin"] },
  { cat: "hospital-specialist", kw: ["infusion", " inj", "inj ", "injection", "vial", "ampoule", "amp ", "for inj", "hospital pack", "xylogel", "xylocaine", "epidexone", "tandak"] },
  // personal care
  { cat: "personal-care", kw: ["nivea", "dettol", "sensodyne", "colgate", "close up", "closeup", "oral-b", "oral b", "oracare", "macleans", "pepsodent", "toothpaste", "toothbrush", "mouthwash", "mouth wash", "floss", "soap", "shower", "body wash", "deodorant", "roll on", "roll-on", "perfume", "body spray", "lip balm", "vaseline", "shampoo", "conditioner", "hair", "sanitizer", "sanitiser", "wipes", "tissue", "sanitary", "pad ", "pads", "always ", "panty liner", "razor", "shaving", "cotton buds", "sunscreen", "sun uv", "sun block", "moisturi", "body milk", "body lotion", "glow", "beauty", "makeup", "nail", "mosquito repellent", "repellent", "insecticide", "air freshener", "detergent", "bleach", "jik", "harpic"] },
  // food & drinks
  { cat: "food-drinks", kw: ["water 75cl", "water", "juice", "chivita", "hollandia", "yoghurt", "yogurt", "malta", "amstel", "monster", "energy drink", "red bull", "lacasera", "coke", "pepsi", "fanta", "sprite", "milk", "milo", "bournvita", "ovaltine", "horlicks", "peak", "three crowns", "honey", "jam", "biscuit", "cookies", "chocolate", "sweet", "candy", "mentos", "chewing gum", "gum", "snack", "cereal", "oats", "tea", "coffee", "nescafe", "lipton", "noodles", "glucose d", "lucozade", "kwalba", "swan", "eva water", "nestle pure", "cway", "great giant"] },
];

/* ------------------------------------------------------------------ */
/* Dispensing class                                                    */
/* ------------------------------------------------------------------ */

const CONTROLLED = ["diazepam", "lorazepam", "alprazolam", "bromazepam", "clonazepam", "nitrazepam", "flunitrazepam", "midazolam", "chlordiazepoxide", "tramadol", "tradomal", "tramal", "codeine", "dihydrocodeine", "pentazocine", "morphine", "pethidine", "fentanyl", "phenobarbit", "ketamine", "zolpidem"];

/** Classes that are prescription-only even if the product is otherwise unrecognised. */
const POM_CATEGORIES = new Set(["antibiotics", "blood-pressure-heart", "mental-health-neuro", "hospital-specialist"]);
const POM_KEYWORDS = ["dinoprostone", "fusidic", "fucidin", "mupirocin", "bactroban", "timolol", "latanoprost", "fluorometholone", "dorzolamide", "brimonidine", "atropine", "tropicamide", "steroid", "prednisolone", "dexamethasone", "betamethasone", "clobetasol", "salbutamol", "ventolin", "inhaler", "seretide", "symbicort", "budesonide", "fluticasone", "montelukast", "insulin", "metformin", "gliclazide", "glimepiride", "glibenclamide", "sitagliptin", "vildagliptin", "dapagliflozin", "empagliflozin", "pioglitazone", "nexium", "esomeprazole", "pantoprazole", "rabeprazole", "ondansetron", "domperidone", "metoclopramide", "sildenafil", "tadalafil", "clomiphene", "misoprostol", "mifepristone", "letrozole", "microgynon", "medroxyprogesterone", "norethisterone", "primolut", "duphaston", "progesterone", "estradiol", "chloramphenicol", "gentamicin", "ciproptic", "tobradex", "funbact", "allopurinol", "colchicine", "febuxostat", "diclofenac inj", "ketorolac", "celecoxib", "etoricoxib", "pregabalin", "gabapentin", "cinnarizine", "hydroxyzine", "atarax", "promethazine"];
const OTC_OVERRIDES = ["cardioprin", "aspirin 75", "low dose aspirin", "omeprazole 20", "loratadine", "cetirizine", "chlorphenamine", "piriton", "paracetamol", "ibuprofen", "hydrocortisone cream", "hydrocortisone 1%", "clotrimazole", "canesten", "postinor", "levonorgestrel 1.5", "condom"];
const NON_MEDICINE_CATS = new Set(["first-aid-devices", "personal-care", "food-drinks"]);

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = { "&amp;": "&", "&#8217;": "’", "&#8211;": "–", "&#8216;": "‘", "&quot;": '"', "&#039;": "'", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&#215;": "×" };
const decode = (s: string) => s.replace(/&[#a-z0-9]+;/gi, (m) => ENTITIES[m] ?? " ");
const stripHtml = (s: string) => decode(s.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const kwCache = new Map<string, RegExp>();
/** True when the keyword appears at the start of a word (so "ors" matches "ORS sachet" but not "colors"). */
const has = (text: string, kw: string) => {
  const k = kw.trim().toLowerCase();
  let re = kwCache.get(k);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    kwCache.set(k, re);
  }
  return re.test(text);
};

const FORMS: [RegExp, string][] = [
  [/\b(tab|tabs|tablet|tablets)\b/i, "Tablet"],
  [/\b(cap|caps|capsule|capsules|softgel)\b/i, "Capsule"],
  [/\b(syr|syrup)\b/i, "Syrup"],
  [/\b(sus|susp|suspension)\b/i, "Suspension"],
  [/\b(inj|injection|vial|amp|ampoule)\b/i, "Injection"],
  [/\binfusion\b|\bsaline\b|\bdextrose\b/i, "Infusion"],
  [/\b(eye|ear)\b.*\b(drop|drops)\b|\bdrops?\b/i, "Drops"],
  [/\bemulgel|\bgel\b/i, "Gel"],
  [/\bcream\b/i, "Cream"],
  [/\b(oint|ointment)\b/i, "Ointment"],
  [/\blotion\b/i, "Lotion"],
  [/\binhaler\b/i, "Inhaler"],
  [/\bspray\b/i, "Spray"],
  [/\b(supp|suppository|suppositories)\b/i, "Suppository"],
  [/\bpessar(y|ies)\b/i, "Pessary"],
  [/\bsachet|powder\b/i, "Powder"],
  [/\b(solution|soln|liquid|tincture|mouthwash)\b/i, "Liquid"],
];
const LEADING_FORM = /^(tab|tabs|tablet|cap|caps|capsule|syr|syrup|sus|susp|suspension|inj|injection|drop|drops|cream|oint|gel|spray)\.?\s+/i;
const STRENGTH = /(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu|%)(?:\s?\/\s?\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu)?)*)/i;

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (/^\d/.test(w) ? w : w.replace(/^([a-z])/, (c) => c.toUpperCase()).replace(/-([a-z])/g, (_, c: string) => `-${c.toUpperCase()}`)))
    .join(" ")
    .replace(/\b(Hct|Ors|Dha|Uv|Xl|Md|Sr|Mr|Er|Xr|Ds|Ii|Iii)\b/g, (m) => m.toUpperCase());
}

/** First word of the name, or the first two when the first is a short manufacturer code ("AG Amlodipine"). */
function brandOf(cleanName: string) {
  const words = cleanName.split(" ");
  return words[0].replace(/[^a-z]/gi, "").length <= 3 && words[1] ? `${words[0]} ${words[1]}` : words[0];
}

function packSizeFor(name: string, form: string) {
  const by = name.match(/\b(?:by|x)\s?(\d{1,4})\b/i);
  if (by) return `Pack of ${by[1]}`;
  const vol = name.match(/(\d+(?:\.\d+)?)\s?(ml|cl|l)\b/i);
  if (vol && ["Syrup", "Suspension", "Liquid", "Drops", "Infusion", "Lotion", "Spray"].includes(form)) return `${vol[1]}${vol[2].toLowerCase()} bottle`;
  const wt = name.match(/(\d+(?:\.\d+)?)\s?(g|gm|kg)\b/i);
  if (wt && ["Cream", "Ointment", "Gel"].includes(form)) return `${wt[1]}g tube`;
  if (vol) return `${vol[1]}${vol[2].toLowerCase()}`;
  if (wt) return `${wt[1]}${wt[2].toLowerCase()}`;
  return form === "Tablet" || form === "Capsule" ? "Pack (strip or box)" : "Single unit";
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

type Classified = {
  category: string;
  rxStatus: "OTC" | "POM" | "CONTROLLED";
  generics: string[];
  flags: string[];
};

const GENERICS = RULES.filter((r) => r.g).flatMap((r) => r.kw);
/** Class words that help categorise but aren't ingredient names, and keyword stems that need a proper display name. */
const CLASS_WORDS = new Set(["penicillin", "insulin", "probiotic", "vaccine", "multivitamin", "vitamin", "omega", "fish oil", "amino acid"]);
const GENERIC_DISPLAY: Record<string, string> = {
  clavulan: "Clavulanic Acid",
  phenobarbit: "Phenobarbital",
  "oral rehydration": "Oral Rehydration Salts",
  sennoside: "Senna",
  amoxycillin: "Amoxicillin",
  frusemide: "Furosemide",
};
const SUPPLEMENT_WORDS = new Set(RULES.filter((r) => r.g && r.cat === "vitamins-supplements").flatMap((r) => r.kw));

/** Brand-name stems that reliably indicate a drug class. Applied only when no exact keyword matched. */
const STEMS: [RegExp, string][] = [
  [/isopropyl|methylated|surgical spirit|apparatus|monitor|dialy[sz]er|diluent|reagent|collar|\btube\b|scalp vein|\bkit\b|cannula|massage gun|fascial gun|crutch|brace/, "first-aid-devices"],
  [/sunate|artem|artenat|lumef|quine\b|malar|winart|arteq/, "malaria"],
  [/\bcef|ceph|clox|cillin|amox|\bmox|moxil|clav|mycin\b|thro?cin|cycline|flox|cipro|\blevo\d|nidaz|ornid|secgyl|fung|conazol|sulfa|trim\b|cotrox/, "antibiotics"],
  [/gliptin|glitaz|formin\b|glicl|glim|glib|diab/, "diabetes"],
  [/pril\b|sartan|olol\b|dipine|statin|stol\b|thiazid|\bhct\b|cardi|lipid|\bbp\b/, "blood-pressure-heart"],
  [/prazol|somepra|rennie|antacid|ulcer|\blax|lactul|digest|bloat|gripe/, "stomach-digestion"],
  [/coxib|\bibu|profen|gesic|pain|dol\b|fenac|cetamol|pizotifen|ergot|migraine|tryp|chymo|serratio|arthr|joint/, "pain-fever"],
  [/\bcof|cough|cold|allerg|histin|sinus|lorat|cetiri|lukast|broncho|catarrh/, "allergy-cold-cough"],
  [/preg|natal|\bbaby|infant|kid/, "mother-baby"],
  [/vit\b|vita|tamin|tonic|omega|\bcod\b|softcod|astaxanthin|bilberry|nature.?s ?field|hale & hearty|ginseng|multi/, "vitamins-supplements"],
  [/peanut|coffee|coffe\b|guava|feast|biscuit|chips|drink/, "food-drinks"],
  [/\bmen\b|for men|woman|libido|wild cat|ovul|postpill|progest/, "sexual-reproductive"],
];

function classify(p: WooProduct, form: string): Classified {
  const flags: string[] = [];
  const name = decode(p.name).toLowerCase();
  const tags = (p.tags ?? []).map((t) => decode(t.name).toLowerCase());
  const description = stripHtml(p.short_description || p.description || "").toLowerCase();
  const nameTags = ` ${name} ${tags.join(" ")} `;
  const text = `${nameTags} ${description.slice(0, 400)} `;
  const wooCats = p.categories.map((c) => decode(c.name)).filter((c) => c !== "Uncategorized");

  // 1. keyword rules on name + tags (most reliable for this catalogue)
  let category = RULES.find((r) => r.kw.some((k) => has(name, k)))?.cat;
  // 2. keyword rules on tags
  if (!category) category = RULES.find((r) => r.kw.some((k) => tags.some((t) => has(t, k))))?.cat;
  // 3. active ingredient named in the product's own description ("…contains ciprofloxacin…")
  if (!category && description) category = RULES.find((r) => r.g && r.kw.some((k) => has(description.slice(0, 400), k)))?.cat;
  // 4. pharmacological name stems inside brand names ("Cefin" → cephalosporin, "Mopzole" → PPI)
  if (!category) {
    category = STEMS.find(([re]) => re.test(name))?.[1];
    if (category) flags.push("CATEGORY_FROM_NAME_STEM");
  }
  // 5. original WooCommerce category
  if (!category) {
    for (const c of wooCats) {
      const hit = WOO_CATEGORY_MAP.find(([re]) => re.test(c));
      if (hit) {
        category = hit[1];
        break;
      }
    }
  }
  // 4. a recognisable medicine form with no other clue
  if (!category && form !== "Single unit" && /tablet|capsule|syrup|suspension|injection|drops|inhaler/i.test(form)) category = "other";
  if (!category) {
    category = "other";
    flags.push("CATEGORY_UNKNOWN");
  } else if (category === "other") flags.push("CATEGORY_UNKNOWN");

  // Generics come from the name and description; tags only count when a tag *is* the generic (not "calcium channel blockers").
  const genericText = ` ${name} ${description.slice(0, 400)} `;
  let generics = [...new Set(GENERICS.filter((g) => has(genericText, g) || tags.includes(g)))];
  const drugs = generics.filter((g) => !SUPPLEMENT_WORDS.has(g));
  if (drugs.length) generics = drugs; // "Amlodipine", not "Amlodipine + Calcium"
  if (generics.some((g) => !CLASS_WORDS.has(g))) generics = generics.filter((g) => !CLASS_WORDS.has(g));
  generics = generics.slice(0, 3);

  // Dispensing class: controlled > explicit POM > OTC override > class rules > unknown-medicine default
  let rxStatus: Classified["rxStatus"];
  const isMedicine = !NON_MEDICINE_CATS.has(category);
  if (CONTROLLED.some((k) => has(nameTags, k)) || wooCats.some((c) => /controlled|benzodiazepine/i.test(c))) {
    rxStatus = "CONTROLLED";
  } else if (!isMedicine) {
    rxStatus = "OTC";
  } else if (OTC_OVERRIDES.some((k) => has(nameTags, k)) && !tags.includes("pom")) {
    rxStatus = "OTC";
  } else if (
    tags.includes("pom") ||
    wooCats.includes("POM") ||
    POM_CATEGORIES.has(category) ||
    form === "Injection" ||
    form === "Infusion" ||
    POM_KEYWORDS.some((k) => has(text, k))
  ) {
    rxStatus = "POM";
  } else if (category === "eye-ear" && !/tear|lubric|lubrex|optrex|visine|eye ?wash|vision|lutein|bilberry|saline|wax/.test(nameTags)) {
    // Medicated eye/ear drops (antibiotics, steroids, glaucoma) are prescription-only; comfort drops are not.
    rxStatus = "POM";
  } else if (category === "other") {
    rxStatus = "POM";
    flags.push("RX_DEFAULTED_TO_POM");
  } else {
    rxStatus = "OTC";
  }

  if (isMedicine && !generics.length) flags.push("GENERIC_UNKNOWN");
  return { category, rxStatus, generics, flags };
}

function describe(name: string, generic: string, rx: string, form: string, original: string) {
  const rxNote =
    rx === "CONTROLLED"
      ? "This is a controlled medicine: it is supplied only to verified customers against a valid prescription reviewed by our pharmacist."
      : rx === "POM"
        ? "This is a prescription-only medicine. Please upload a valid prescription at checkout; a pharmacist reviews it before your order is processed."
        : "";
  const description =
    original.length >= 40
      ? `${original.slice(0, 1800)}${original.length > 1800 ? "…" : ""}${rxNote ? ` ${rxNote}` : ""}`
      : `${name}${generic && generic !== name ? ` (${generic})` : ""}${form !== "Single unit" ? `, ${form.toLowerCase()}` : ""}. Ask our pharmacists on WhatsApp if you'd like more information about this product. ${rxNote}`.trim();
  return {
    description,
    usage: "Use exactly as directed on the pack or by your doctor or pharmacist. Do not exceed the stated dose. If you're pregnant, breastfeeding, taking other medicines or have a long-term condition, speak to a pharmacist first.",
    warnings: `Read the patient information leaflet before use. Stop using and seek medical advice if you experience a rash, swelling, difficulty breathing or any unexpected side effect. Keep out of the sight and reach of children.${rx === "CONTROLLED" ? " May cause drowsiness and dependence; do not drive or drink alcohol while taking it." : ""}`,
  };
}

const FEATURE_PICKS = ["coartem", "panadol extra", "augmentin", "pregnacare", "lonart", "wellwoman", "accu-chek", "omron"];

/* ------------------------------------------------------------------ */

async function main() {
  const file = path.join(DATA, "mgk-products.json");
  if (!fs.existsSync(file)) throw new Error("Run `npm run fetch:mgk -w apps/api` first.");
  const { products: raw, fetchedAt } = JSON.parse(fs.readFileSync(file, "utf8")) as { products: WooProduct[]; fetchedAt: string };
  console.log(`Importing ${raw.length} products fetched ${fetchedAt}${DEMO_STOCK ? " (demo stock)" : ""}…`);

  // Categories: upsert the clean tree.
  const catIds: Record<string, string> = {};
  for (const [i, [slug, name, description, icon]] of CATEGORIES.entries()) {
    const c = await prisma.category.upsert({
      where: { slug },
      create: { slug, name, description, icon, sortOrder: i },
      update: { name, description, icon, sortOrder: i },
    });
    catIds[slug] = c.id;
  }

  // Remove the demo catalogue. Products referenced by existing orders are hidden rather than deleted.
  const referenced = new Set((await prisma.orderItem.findMany({ select: { productId: true } })).map((r) => r.productId));
  await prisma.product.deleteMany({ where: { id: { notIn: [...referenced] } } });
  await prisma.product.updateMany({ where: { id: { in: [...referenced] } }, data: { active: false, featured: false } });
  const existingSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));

  const seenNames = new Map<string, number>();
  const report: string[][] = [["slug", "name", "category", "rx_status", "price_ngn", "in_stock", "flags"]];
  const rows: Parameters<typeof prisma.product.createMany>[0]["data"] & unknown[] = [];
  const batches: { id: string; productId: string; batchNumber: string; expiresAt: Date; quantity: number }[] = [];
  const stats = { imported: 0, skipped: 0, byCat: {} as Record<string, number>, byRx: {} as Record<string, number>, flagged: 0 };
  const featured = new Set<string>();

  for (const p of raw) {
    const priceKobo = Math.round(Number(p.prices.price) * 10 ** (2 - p.prices.currency_minor_unit));
    const regularKobo = Math.round(Number(p.prices.regular_price) * 10 ** (2 - p.prices.currency_minor_unit));
    const rawName = decode(p.name).replace(/\s+/g, " ").trim();
    const form = FORMS.find(([re]) => re.test(rawName))?.[1] ?? (p.tags ?? []).map((t) => FORMS.find(([re]) => re.test(t.name))?.[1]).find(Boolean) ?? "Single unit";
    const strength = rawName.match(STRENGTH)?.[1]?.replace(/\s+/g, "").toLowerCase() ?? null;
    const cleanName = titleCase(rawName.replace(LEADING_FORM, "").replace(STRENGTH, "").replace(/\b(by|x)\s?\d{1,4}\b/gi, "").replace(/\s{2,}/g, " ").replace(/[\s,–-]+$/, "").trim()) || titleCase(rawName);
    const cls = classify(p, form);
    const generic = cls.generics.length ? cls.generics.map((g) => GENERIC_DISPLAY[g] ?? titleCase(g)).join(" + ") : cleanName;
    const flags = [...cls.flags];

    if (!priceKobo) {
      stats.skipped++;
      report.push([p.slug, rawName, cls.category, cls.rxStatus, "0", String(p.is_in_stock), "SKIPPED_ZERO_PRICE"]);
      continue;
    }
    if (priceKobo < 100_00) flags.push("CHECK_LOW_PRICE");
    const dupKey = rawName.toUpperCase();
    seenNames.set(dupKey, (seenNames.get(dupKey) ?? 0) + 1);
    if (seenNames.get(dupKey)! > 1) flags.push("DUPLICATE_NAME");
    const original = stripHtml(p.short_description || p.description || "");
    if (original.length < 40) flags.push("NO_DESCRIPTION");
    if (!p.is_in_stock) flags.push("OUT_OF_STOCK_AT_SOURCE");
    else if (!DEMO_STOCK) flags.push("NEEDS_STOCK_COUNT");

    let slug = p.slug;
    if (existingSlugs.has(slug)) slug = `${slug}-mgk`;
    existingSlugs.add(slug);

    const id = crypto.randomUUID();
    const lower = rawName.toLowerCase();
    const feature = p.is_in_stock && FEATURE_PICKS.find((k) => lower.includes(k) && ![...featured].some((f) => f === k));
    if (feature) featured.add(feature);

    rows.push({
      id,
      slug,
      name: cleanName,
      genericName: generic,
      brand: brandOf(cleanName),
      strength,
      dosageForm: form === "Single unit" ? "Other" : form,
      packSize: packSizeFor(rawName, form),
      priceKobo,
      compareAtKobo: regularKobo > priceKobo ? regularKobo : null,
      categoryId: catIds[cls.category],
      rxStatus: cls.rxStatus,
      coldChain: /insulin|vaccine|mixtard|actrapid|lantus|novorapid|humalog|oxytocin|ergometrine/i.test(rawName),
      featured: !!feature,
      ...describe(cleanName, generic, cls.rxStatus, form, original),
    });
    if (p.is_in_stock && DEMO_STOCK) {
      batches.push({ id: crypto.randomUUID(), productId: id, batchNumber: "DEMO-IMPORT", expiresAt: new Date(Date.now() + 365 * DAY), quantity: 40 });
    }

    stats.imported++;
    stats.byCat[cls.category] = (stats.byCat[cls.category] ?? 0) + 1;
    stats.byRx[cls.rxStatus] = (stats.byRx[cls.rxStatus] ?? 0) + 1;
    const reviewFlags = flags.filter((f) => !["NEEDS_STOCK_COUNT", "OUT_OF_STOCK_AT_SOURCE", "NO_DESCRIPTION"].includes(f));
    if (reviewFlags.length) stats.flagged++;
    report.push([slug, rawName, cls.category, cls.rxStatus, (priceKobo / 100).toFixed(2), String(p.is_in_stock), flags.join(";")]);
  }

  for (let i = 0; i < rows.length; i += 500) await prisma.product.createMany({ data: rows.slice(i, i + 500) });
  for (let i = 0; i < batches.length; i += 500) await prisma.batch.createMany({ data: batches.slice(i, i + 500) });

  const csv = report.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
  fs.writeFileSync(path.join(DATA, "mgk-import-report.csv"), csv);

  console.log(`\nImported ${stats.imported} products (${stats.skipped} skipped with no price).`);
  console.log("By dispensing class:", stats.byRx);
  console.log("By category:", Object.fromEntries(Object.entries(stats.byCat).sort((a, b) => b[1] - a[1])));
  console.log(`Products with something for a pharmacist to check: ${stats.flagged}`);
  console.log(`Stock: ${DEMO_STOCK ? `${batches.length} demo batches created` : "none created; receive stock in admin after a physical count"}`);
  console.log("Report: prisma/data/mgk-import-report.csv");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
