import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "hi" | "en";

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "hi",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");
  useEffect(() => {
    const saved = localStorage.getItem("nd-lang");
    if (saved === "en" || saved === "hi") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("nd-lang", l);
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** Bilingual string table. Use as t("key") inside components. */
export const STR = {
  // header
  navReport: { hi: "समस्या दर्ज करें", en: "Report Issue" },
  navTrack: { hi: "मेरी शिकायत", en: "My Complaint" },
  navAuthority: { hi: "अधिकारी", en: "Authority" },
  // home
  homeTag: { hi: "उत्तर प्रदेश · नागरिक समस्या मंच", en: "Uttar Pradesh · Civic Issue Platform" },
  homeH1a: { hi: "अपने शहर की समस्या", en: "Your city's problem —" },
  homeH1b: { hi: "फोटो खींचें, बताएं।", en: "snap a photo, report it." },
  homeSub: {
    hi: "जलभराव, कूड़ा, गड्ढे, खुले नाले या बंद स्ट्रीट लाइट — एक फोटो और स्थान से शिकायत दर्ज करें। AI श्रेणी पहचानता है, और एक जैसी शिकायतें एक साथ जुड़ती हैं।",
    en: "Waterlogging, garbage, potholes, open drains or dead streetlights — report with one photo and a location. AI identifies the category, and similar complaints cluster together.",
  },
  homeCtaReport: { hi: "📷 समस्या दर्ज करें", en: "📷 Report an Issue" },
  homeCtaTrack: { hi: "🔎 मेरी शिकायत देखें", en: "🔎 Track My Complaint" },
  statTotal: { hi: "कुल शिकायतें", en: "Total complaints" },
  statOpen: { hi: "लंबित", en: "Open" },
  statResolved: { hi: "हल हुईं", en: "Resolved" },
  mapCaption: {
    hi: "रंगीन घेरे = एक ही जगह की कई संबंधित शिकायतें (क्लस्टर)",
    en: "Coloured circles = multiple related complaints at one spot (clusters)",
  },
  homeCats: { hi: "आप क्या बता सकते हैं", en: "What you can report" },
  step1t: { hi: "फोटो व स्थान", en: "Photo & location" },
  step1d: { hi: "फोटो लें और नक्शे पर जगह चुनें।", en: "Take a photo and pick the spot on the map." },
  step2t: { hi: "AI विश्लेषण", en: "AI analysis" },
  step2d: { hi: "AI फोटो व विवरण से श्रेणी पहचानता है।", en: "AI detects the category from photo and text." },
  step3t: { hi: "क्लस्टर", en: "Clustering" },
  step3d: { hi: "पास की एक जैसी शिकायतें एक साथ जुड़ती हैं।", en: "Similar nearby complaints group together." },
  step4t: { hi: "समाधान ट्रैक", en: "Track resolution" },
  step4d: { hi: "संदर्भ ID से स्थिति देखें।", en: "Check status with your reference ID." },
  footer: {
    hi: "NagarDrishti · UP State Innovation Challenge 2026 · AI सुझाव निर्णय-सहायता हैं, अंतिम निर्णय अधिकारी का।",
    en: "NagarDrishti · UP State Innovation Challenge 2026 · AI suggestions are decision-support; the final call rests with the officer.",
  },
  // report page
  repTitle: { hi: "समस्या बताएं", en: "Report a Problem" },
  repSub: { hi: "चार आसान कदम — फोटो, स्थान, श्रेणी, विवरण", en: "Four easy steps — photo, location, category, description" },
  repPhoto: { hi: "फोटो लें / चुनें", en: "Take / choose a photo" },
  repPhotoTap: { hi: "फोटो जोड़ने के लिए टैप करें", en: "Tap to add a photo" },
  repDesc: { hi: "क्या समस्या है? (विवरण)", en: "What's the problem? (description)" },
  repDescPh: { hi: "जैसे: बारिश के बाद सड़क पर बहुत पानी भर गया है", en: "e.g. The road is heavily waterlogged after rain" },
  repAiBusy: { hi: "AI विश्लेषण कर रहा है…", en: "AI is analysing…" },
  repAiBtn: { hi: "✨ AI से श्रेणी पहचानें", en: "✨ Detect category with AI" },
  repAiSuggest: { hi: "AI सुझाव", en: "AI suggestion" },
  repAiConf: { hi: "विश्वास", en: "Confidence" },
  repAiSev: { hi: "गंभीरता", en: "Severity" },
  repAiChange: { hi: "आप नीचे श्रेणी बदल सकते हैं।", en: "You can change the category below." },
  repCat: { hi: "श्रेणी", en: "Category" },
  repSev: { hi: "गंभीरता:", en: "Severity:" },
  sevLow: { hi: "कम", en: "Low" },
  sevMed: { hi: "मध्यम", en: "Medium" },
  sevHigh: { hi: "अधिक", en: "High" },
  repLoc: { hi: "स्थान चुनें", en: "Pick the location" },
  repGps: { hi: "📍 मेरा वर्तमान स्थान", en: "📍 My current location" },
  repPick: { hi: "नक्शे पर टैप करके सही जगह चुनें", en: "Tap the map to pick the exact spot" },
  repPicked: { hi: "चुना गया", en: "Selected" },
  repWardPh: { hi: "वार्ड / मोहल्ला (वैकल्पिक)", en: "Ward / neighbourhood (optional)" },
  repSubmit: { hi: "शिकायत दर्ज करें", en: "Submit Complaint" },
  repSubmitting: { hi: "दर्ज हो रही है…", en: "Submitting…" },
  repDoneTitle: { hi: "शिकायत दर्ज हो गई", en: "Complaint submitted" },
  repRefIs: { hi: "आपका संदर्भ नंबर", en: "Your reference number" },
  repViewStatus: { hi: "स्थिति देखें", en: "View status" },
  repNew: { hi: "नई शिकायत", en: "New complaint" },
  errGps: { hi: "GPS उपलब्ध नहीं — नक्शे पर जगह चुनें", en: "GPS unavailable — pick the spot on the map" },
  errLoc: { hi: "स्थान नहीं मिला — नक्शे पर टैप करें", en: "Location not found — tap the map" },
  errAi: { hi: "AI विश्लेषण विफल रहा", en: "AI analysis failed" },
  errNeedLoc: { hi: "कृपया स्थान चुनें", en: "Please pick a location" },
  errNeedCat: { hi: "कृपया श्रेणी चुनें", en: "Please pick a category" },
  errSubmit: { hi: "शिकायत दर्ज नहीं हो सकी", en: "Could not submit the complaint" },
  // track page
  trkTitle: { hi: "मेरी शिकायत", en: "My Complaint" },
  trkPh: { hi: "संदर्भ नंबर, जैसे NG-000101", en: "Reference no., e.g. NG-000101" },
  trkSearch: { hi: "खोजें", en: "Search" },
  trkSearching: { hi: "खोज रहे हैं…", en: "Searching…" },
  trkNotFound: { hi: "इस नंबर की कोई शिकायत नहीं मिली।", en: "No complaint found for this number." },
  trkRef: { hi: "संदर्भ नंबर", en: "Reference number" },
  trkUpdates: { hi: "अधिकारी अपडेट", en: "Officer updates" },
  // authority
  authLoading: { hi: "लोड हो रहा है…", en: "Loading…" },
  authNoAccess: { hi: "पहुँच नहीं है", en: "No access" },
  authNoAccessSub: { hi: "यह खाता अधिकारी के रूप में पंजीकृत नहीं है।", en: "This account is not registered as an authority." },
  authSignOut: { hi: "साइन आउट", en: "Sign out" },
  authLogin: { hi: "अधिकारी लॉगिन", en: "Authority Login" },
  authLoginSub: { hi: "अधिकारी / फील्ड टीम साइन-इन", en: "Authority / field team sign-in" },
  authSignIn: { hi: "साइन इन", en: "Sign in" },
  authSignUp: { hi: "खाता बनाएं", en: "Create account" },
  authToUp: { hi: "नया खाता बनाएं", en: "Create a new account" },
  authToIn: { hi: "पहले से खाता है? साइन इन", en: "Have an account? Sign in" },
  authConfirmSent: { hi: "ईमेल में पुष्टि लिंक भेजा गया है", en: "A confirmation link has been emailed to you" },
  dashTitle: { hi: "अधिकारी डैशबोर्ड", en: "Authority Dashboard" },
  dashPending: { hi: "लंबित", en: "Pending" },
  dashProgress: { hi: "कार्य जारी", en: "In progress" },
  dashResolved: { hi: "हल हुईं", en: "Resolved" },
  dashAllCats: { hi: "सभी श्रेणियाँ", en: "All categories" },
  dashAllWards: { hi: "सभी वार्ड", en: "All wards" },
  dashAllStatus: { hi: "सभी स्थितियाँ", en: "All statuses" },
  dashClusters: { hi: "इश्यू क्लस्टर", en: "Issue clusters" },
  dashClusterSub: {
    hi: "एक ही श्रेणी, ≤150 मी · प्राथमिकता = सघनता + नवीनता + गंभीरता + प्रमाण (निर्णय-सहायता)",
    en: "Same category, ≤150 m · priority = concentration + recency + severity + evidence (decision support)",
  },
  dashNoClusters: { hi: "कोई क्लस्टर नहीं", en: "No clusters" },
  dashRelComplaints: { hi: "संबंधित शिकायतें", en: "related complaints" },
  dashLast48: { hi: "पिछले 48 घंटे", en: "in last 48h" },
  dashScore: { hi: "स्कोर", en: "score" },
  dashClusterReports: { hi: "क्लस्टर की शिकायतें", en: "Cluster complaints" },
  dashRecent: { hi: "हाल की शिकायतें", en: "Recent complaints" },
  dashShowAll: { hi: "सभी दिखाएँ", en: "Show all" },
  colCat: { hi: "श्रेणी", en: "Category" },
  colWard: { hi: "वार्ड", en: "Ward" },
  colStatus: { hi: "स्थिति", en: "Status" },
  colTime: { hi: "समय", en: "Time" },
  dashUpdate: { hi: "अपडेट", en: "Update" },
  dashCatDist: { hi: "श्रेणी वितरण", en: "Category distribution" },
  dashWardPending: { hi: "वार्ड-वार लंबित", en: "Pending by ward" },
  updCat: { hi: "श्रेणी (सुधारें)", en: "Category (correct)" },
  updStatus: { hi: "स्थिति", en: "Status" },
  updNote: { hi: "टिप्पणी", en: "Note" },
  updNotePh: { hi: "जैसे: नाला साफ़ कराया गया", en: "e.g. Drain cleaned" },
  updPhoto: { hi: "समाधान फोटो (प्रमाण)", en: "Resolution photo (evidence)" },
  updSave: { hi: "अपडेट सहेजें", en: "Save update" },
  updSaving: { hi: "सहेज रहे हैं…", en: "Saving…" },
  updSaved: { hi: "अपडेट सहेजा गया", en: "Update saved" },
  updAiSuggest: { hi: "AI सुझाव", en: "AI suggestion" },
} as const;

export type StrKey = keyof typeof STR;

export function useT() {
  const { lang } = useLang();
  return (k: StrKey) => STR[k][lang] as string;
}

export const sevLabel = (lang: Lang, s: number) =>
  (["", STR.sevLow[lang], STR.sevMed[lang], STR.sevHigh[lang]] as const)[s] ?? "";
