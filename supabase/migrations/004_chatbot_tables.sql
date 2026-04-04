-- Add Chatbot Support Tables
-- Migration: 004_chatbot_tables.sql
-- Adds tables for FAQ management and chat conversation logging

-- ============================================================================
-- CHATBOT TABLES
-- ============================================================================

-- Predefined FAQ pairs for rule-based responses
CREATE TABLE chat_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,  -- e.g., 'coverage', 'payouts', 'triggers', 'claims'
    language VARCHAR(10) DEFAULT 'en',  -- Language code: 'en', 'hi', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question, language)  -- Prevent duplicate questions per language
);

-- Conversation logs for analytics and debugging
CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,  -- Groups messages in a conversation session
    user_message TEXT NOT NULL,
    bot_response TEXT,
    query_type VARCHAR(20) NOT NULL,  -- 'rule' or 'ai'
    language VARCHAR(10) DEFAULT 'en',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for efficient querying
CREATE INDEX idx_chat_faqs_category_language ON chat_faqs(category, language) WHERE is_active = TRUE;
CREATE INDEX idx_chat_logs_worker_session ON chat_logs(worker_id, session_id);
CREATE INDEX idx_chat_logs_timestamp ON chat_logs(timestamp DESC);

-- ============================================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on chat tables
ALTER TABLE chat_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Policy for chat_faqs: Allow read access to authenticated users (workers can view FAQs)
CREATE POLICY "Allow read access to chat_faqs" ON chat_faqs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for chat_logs: Workers can only see their own logs, admins can see all
CREATE POLICY "Workers can view own chat logs" ON chat_logs
    FOR SELECT USING (auth.uid() = worker_id);

-- Allow insert for chat_logs (for logging conversations)
CREATE POLICY "Allow insert to chat_logs" ON chat_logs
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- ============================================================================
-- INITIAL DATA (Sample FAQs)
-- ============================================================================

-- Insert some initial FAQ entries for common queries
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('What is covered by SwiftShield?', 'SwiftShield provides parametric income protection for Q-commerce delivery workers. It covers income loss due to external disruptions like weather events, curfews, and platform outages. It does NOT cover health, accidents, vehicle damage, or personal negligence.', 'coverage', 'en'),
('What triggers are covered?', 'Covered triggers include: Heavy Rainfall (>15mm/hr), Extreme Heat (>42°C), Flash Floods, Severe Cold/Fog, Curfews/Civil Unrest, and Platform Outages (Pro plan only).', 'triggers', 'en'),
('How are payouts calculated?', 'Payouts are calculated based on your earnings history, time slot demand, location density, and platform activity. For example, heavy rain pays ₹85 per lost hour.', 'payouts', 'en'),
('Why was my claim rejected?', 'Claims can be rejected due to: not being active during disruption, GPS zone mismatch, fraud signals, or duplicate claims within 48 hours.', 'claims', 'en'),
('What is the weekly cap?', 'Weekly caps vary by plan: Starter ₹500, Shield ₹1,200, Pro ₹2,000. This is the maximum payout per week.', 'payouts', 'en');

-- Hindi translations for key FAQs
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('SwiftShield क्या कवर करता है?', 'SwiftShield Q-कॉमर्स डिलीवरी वर्कर्स के लिए पैरामेट्रिक इनकम प्रोटेक्शन प्रदान करता है। यह मौसम की घटनाओं, कर्फ्यू और प्लेटफॉर्म आउटेज जैसे बाहरी व्यवधानों के कारण आय हानि को कवर करता है। यह स्वास्थ्य, दुर्घटनाएं, वाहन क्षति या व्यक्तिगत लापरवाही को कवर नहीं करता।', 'coverage', 'hi'),
('कौन से ट्रिगर कवर हैं?', 'कवर ट्रिगर में शामिल हैं: भारी बारिश (>15mm/hr), अत्यधिक गर्मी (>42°C), बाढ़, गंभीर ठंड/कोहरा, कर्फ्यू/सिविल अशांति, और प्लेटफॉर्म आउटेज (केवल प्रो प्लान)।', 'triggers', 'hi'),
('पेआउट कैसे कैलकुलेट होते हैं?', 'पेआउट आपकी कमाई इतिहास, समय स्लॉट डिमांड, स्थान घनत्व और प्लेटफॉर्म गतिविधि के आधार पर कैलकुलेट किए जाते हैं। उदाहरण के लिए, भारी बारिश प्रति खोए घंटे ₹85 देती है।', 'payouts', 'hi'),
('मेरा दावा क्यों अस्वीकार कर दिया गया?', 'दावे अस्वीकार किए जा सकते हैं: व्यवधान के दौरान सक्रिय न होने के कारण, GPS ज़ोन बेमेल, धोखाधड़ी संकेत, या 48 घंटों के भीतर डुप्लिकेट दावे।', 'claims', 'hi'),
('साप्ताहिक कैप क्या है?', 'साप्ताहिक कैप योजना के अनुसार भिन्न होते हैं: स्टार्टर ₹500, शील्ड ₹1,200, प्रो ₹2,000. यह प्रति सप्ताह अधिकतम भुगतान है।', 'payouts', 'hi');

-- Tamil translations for key FAQs
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('SwiftShield என்ன கவர்கிறது?', 'SwiftShield Q-காமர்ஸ் டெலிவரி வொர்கர்களுக்கு பாராமெட்ரிக் இன்கம் ப்ராடெக்ஷன் வழங்குகிறது. இது வெதர் இவென்ட்ஸ், கர்ப்யூ மற்றும் பிளாட்பார்ம் அவுட்டேஜ் போன்ற வெளிப்புற இடையூறுகளால் ஏற்படும் இன்கம் லாஸ்-ஐ கவர்கிறது. இது ஹெல்த், அக்கிடென்ட்ஸ், வெஹிக்கிள் டேமேஜ் அல்லது பர்சனல் நெக்லிஜென்ஸ்-ஐ கவர்வதில்லை.', 'coverage', 'ta'),
('எந்த ட்ரிகர்கள் கவரப்படுகின்றன?', 'கவரப்பட்ட ட்ரிகர்கள்: ஹெவி ரெயின்பால் (>15mm/hr), எக்ஸ்ட்ரீம் ஹீட் (>42°C), பிளாஷ் பிளாட்ஸ், சீவியர் கோல்ட்/பாக், கர்ப்யூ/சிவில் அன்ரெஸ்ட், மற்றும் பிளாட்பார்ம் அவுட்டேஜ் (ப்ரோ பிளான் மட்டுமே).', 'triggers', 'ta'),
('பேஆவுட்டுகள் எப்படி கணக்கிடப்படுகின்றன?', 'பேஆவுட்டுகள் உங்கள் கமையிங் ஹிஸ்டரி, டைம் ஸ்லாட் டிமாண்ட், லொகேஷன் டென்சிட்டி மற்றும் பிளாட்பார்ம் அக்டிவிட்டி-யின் அடிப்படையில் கணக்கிடப்படுகின்றன. எடுத்துக்காட்டாக, ஹெவி ரெயின் ஒரு லாஸ்ட் அவர்-க்கு ₹85 கொடுக்கிறது.', 'payouts', 'ta'),
('என் கிளைம் ஏன் ரிஜெக்ட் செய்யப்பட்டது?', 'கிளைம்கள் ரிஜெக்ட் செய்யப்படலாம்: டிஸ்ரப்ஷன் சமயத்தில் அக்டிவ் இல்லாததால், GPS ஜோன் மிஸ்மேட்ச், பிராட் சிக்னல்ஸ், அல்லது 48 மணி நேரத்திற்குள் டூப்லிகேட் கிளைம்கள்.', 'claims', 'ta'),
('வீக்லி கேப் என்ன?', 'வீக்லி கேப்கள் பிளான்-அனுசாரமாக மாறுபடுகின்றன: ஸ்டார்ட்டர் ₹500, ஷீல்ட் ₹1,200, ப்ரோ ₹2,000. இது ஒரு வாரத்திற்கு அதிகபட்ச பேஆவுட்.', 'payouts', 'ta');

-- Malayalam translations for key FAQs
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('SwiftShield എന്താണ് മറയ്ക്കുന്നത്?', 'SwiftShield Q-കോമേഴ്സ് ഡെലിവറി വർക്കേഴ്സിനായി പാരാമെട്രിക് ഇൻകം പ്രൊട്ടക്ഷൻ നൽകുന്നു. ഇത് വെതർ ഇവന്റ്സ്, കർഫ്യൂ, പ്ലാറ്റ്ഫോം ഔട്ടേജ് എന്നിവ പോലുള്ള ബാഹ്യ ഇടപെടലുകൾ മൂലം ഉണ്ടാകുന്ന ഇൻകം ലോസ് മറയ്ക്കുന്നു. ഇത് ഹെൽത്ത്, അക്സിഡന്റ്സ്, വെഹിക്കിൾ ഡാമേജ് അല്ലെങ്കിൽ പേഴ്സണൽ നെഗ്ലിജൻസ് മറയ്ക്കുന്നില്ല.', 'coverage', 'ml'),
('എന്താണ് ട്രിഗർ മറയ്ക്കുന്നത്?', 'മറയ്ക്കുന്ന ട്രിഗർ: ഹെവി റെയിൻഫാൾ (>15mm/hr), എക്സ്ട്രീം ഹീറ്റ് (>42°C), ഫ്ലാഷ് ഫ്ലഡ്സ്, സീവിയർ കോൾഡ്/ഫോഗ്, കർഫ്യൂ/സിവിൽ അന്റെസ്റ്റ്, പ്ലാറ്റ്ഫോം ഔട്ടേജ് (പ്രോ പ്ലാൻ മാത്രം).', 'triggers', 'ml'),
('പേയ്ഔട്ടുകൾ എങ്ങനെ കണക്കാക്കുന്നു?', 'പേയ്ഔട്ടുകൾ നിങ്ങളുടെ കമയിംഗ് ഹിസ്റ്ററി, ടൈം സ്ലോട്ട് ഡിമാൻഡ്, ലൊക്കേഷൻ ഡെൻസിറ്റി, പ്ലാറ്റ്ഫോം അക്റ്റിവിട്ടി എന്നിവയുടെ അടിസ്ഥാനത്തിൽ കണക്കാക്കുന്നു. ഉദാഹരണത്തിന്, ഹെവി റെയിൻ ഒരു ലോസ്റ്റ് അവർ-ക്ക് ₹85 നൽകുന്നു.', 'payouts', 'ml'),
('എന്റെ ക്ലെയിം എന്തുകൊണ്ട് നിരസിച്ചു?', 'ക്ലെയിമുകൾ നിരസിക്കപ്പെടാം: ഡിസ്രപ്ഷൻ സമയത്ത് അക്റ്റിവ് ഇല്ലാത്തതിനാൽ, GPS സോൺ മിസ്മാച്ച്, ഫ്രോഡ് സിഗ്നൽസ്, അല്ലെങ്കിൽ 48 മണിക്കൂറിനുള്ളിൽ ഡ്യൂപ്ലിക്കേറ്റ് ക്ലെയിമുകൾ.', 'claims', 'ml'),
('വീക്ക്ളി കാപ്പ് എന്താണ്?', 'വീക്ക്ളി കാപ്പുകൾ പ്ലാൻ അനുസരിച്ച് മാറുന്നു: സ്റ്റാർട്ടർ ₹500, ഷീൽഡ് ₹1,200, പ്രോ ₹2,000. ഇത് ഒരു ആഴ്ചയ്ക്ക് പരമാവധി പേയ്ഔട്ട്.', 'payouts', 'ml');

-- Telugu translations for key FAQs
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('SwiftShield ఏమి కవర్ చేస్తుంది?', 'SwiftShield Q-కామర్స్ డెలివరీ వర్కర్స్ కోసం పారామెట్రిక్ ఇంకం ప్రొటెక్షన్ అందిస్తుంది. ఇది వెదర్ ఇవెంట్స్, కర్ఫ్యూ మరియు ప్లాట్ఫార్మ్ అవుటేజ్ వంటి బాహ్య వ్యాఘాతాల కారణంగా ఇంకం లాస్-ను కవర్ చేస్తుంది. ఇది హెల్త్, అక్సిడెంట్స్, వెహికల్ డ్యామేజ్ లేదా పర్సనల్ నెగ్లిజెన్స్-ను కవర్ చేయదు.', 'coverage', 'te'),
('ఏ ట్రిగ్గర్లు కవర్ చేయబడతాయి?', 'కవర్ చేయబడిన ట్రిగ్గర్లు: హెవీ రెయిన్ఫాల్ (>15mm/hr), ఎక్స్ట్రీమ్ హీట్ (>42°C), ఫ్లాష్ ఫ్లడ్స్, సీవియర్ కోల్డ్/ఫాగ్, కర్ఫ్యూ/సివిల్ అన్రెస్ట్, ప్లాట్ఫార్మ్ అవుటేజ్ (ప్రో ప్లాన్ మాత్రమే).', 'triggers', 'te'),
('పేఔట్లు ఎలా క్యాల్క్యులేట్ చేయబడతాయి?', 'పేఔట్లు మీ కమైంగ్ హిస్టరీ, టైమ్ స్లాట్ డిమాండ్, లొకేషన్ డెన్సిటీ మరియు ప్లాట్ఫార్మ్ అక్టివిటీ ఆధారంగా క్యాల్క్యులేట్ చేయబడతాయి. ఉదాహరణకు, హెవీ రెయిన్ ఒక లాస్ట్ అవర్-కు ₹85 ఇస్తుంది.', 'payouts', 'te'),
('నా క్లెయిమ్ ఎందుకు రిజెక్ట్ చేయబడింది?', 'క్లెయిమ్లు రిజెక్ట్ చేయబడవచ్చు: డిస్రప్షన్ సమయంలో అక్టివ్ లేనందున, GPS జోన్ మిస్మ్యాచ్, ఫ్రాడ్ సిగ్నల్స్, లేదా 48 గంటల్లో డ్యూప్లికేట్ క్లెయిమ్లు.', 'claims', 'te'),
('వీక్లీ క్యాప్ ఏమిటి?', 'వీక్లీ క్యాప్స్ ప్లాన్ వారీగా మారుతాయి: స్టార్టర్ ₹500, షీల్డ్ ₹1,200, ప్రో ₹2,000. ఇది ఒక వారపు అత్యధిక పేఔట్.', 'payouts', 'te');

-- Kannada translations for key FAQs
INSERT INTO chat_faqs (question, answer, category, language) VALUES
('SwiftShield ಏನನ್ನು ಕವರ್ ಮಾಡುತ್ತದೆ?', 'SwiftShield Q-ಕಾಮರ್ಸ್ ಡೆಲಿವರಿ ವರ್ಕರ್ಸ್ ಗಾಗಿ ಪ್ಯಾರಾಮೆಟ್ರಿಕ್ ಇಂಕಮ್ ಪ್ರೊಟೆಕ್ಷನ್ ನೀಡುತ್ತದೆ. ಇದು ವೆದರ್ ಇವೆಂಟ್ಸ್, ಕರ್ಫ್ಯೂ ಮತ್ತು ಪ್ಲಾಟ್ಫಾರ್ಮ್ ಔಟೇಜ್ ನಂತಹ ಬಾಹ್ಯ ಅಡೆತಡೆಗಳಿಂದ ಉಂಟಾಗುವ ಇಂಕಮ್ ಲಾಸ್ ಅನ್ನು ಕವರ್ ಮಾಡುತ್ತದೆ. ಇದು ಹೆಲ್ತ್, ಅಕ್ಸಿಡೆಂಟ್ಸ್, ವೆಹಿಕಲ್ ಡ್ಯಾಮೇಜ್ ಅಥವಾ ಪರ್ಸನಲ್ ನೆಗ್ಲಿಜೆನ್ಸ್ ಅನ್ನು ಕವರ್ ಮಾಡುವುದಿಲ್ಲ.', 'coverage', 'kn'),
('ಯಾವ ಟ್ರಿಗರ್ ಕವರ್ ಮಾಡಲಾಗಿದೆ?', 'ಕವರ್ ಮಾಡಲಾದ ಟ್ರಿಗರ್: ಹೆವಿ ರೈನ್ಫಾಲ್ (>15mm/hr), ಎಕ್ಸ್ಟ್ರೀಮ್ ಹೀಟ್ (>42°C), ಫ್ಲಾಷ್ ಫ್ಲಡ್ಸ್, ಸೀವಿಯರ್ ಕೋಲ್ಡ್/ಫಾಗ್, ಕರ್ಫ್ಯೂ/ಸಿವಿಲ್ ಅನ್ರೆಸ್ಟ್, ಪ್ಲಾಟ್ಫಾರ್ಮ್ ಔಟೇಜ್ (ಪ್ರೋ ಪ್ಲಾನ್ ಮಾತ್ರ).', 'triggers', 'kn'),
('ಪೇಔಟ್ ಗಳು ಹೇಗೆ ಕ್ಯಾಲ್ಕ್ಯುಲೇಟ್ ಮಾಡಲಾಗುತ್ತದೆ?', 'ಪೇಔಟ್ ಗಳು ನಿಮ್ಮ ಕಮೈಂಗ್ ಹಿಸ್ಟರಿ, ಟೈಮ್ ಸ್ಲಾಟ್ ಡಿಮಾಂಡ್, ಲೊಕೇಷನ್ ಡೆನ್ಸಿಟಿ ಮತ್ತು ಪ್ಲಾಟ್ಫಾರ್ಮ್ ಅಕ್ಟಿವಿಟಿ ಆಧಾರದ ಮೇಲೆ ಕ್ಯಾಲ್ಕ್ಯುಲೇಟ್ ಮಾಡಲಾಗುತ್ತದೆ. ಉದಾಹರಣೆಗೆ, ಹೆವಿ ರೈನ್ ಒಂದು ಲಾಸ್ಟ್ ಅವರ್-ಗೆ ₹85 ನೀಡುತ್ತದೆ.', 'payouts', 'kn'),
('ನನ್ನ ಕ್ಲೈಮ್ ಏಕೆ ರಿಜೆಕ್ಟ್ ಮಾಡಲಾಯಿತು?', 'ಕ್ಲೈಮ್ ಗಳು ರಿಜೆಕ್ಟ್ ಮಾಡಲಾಗಬಹುದು: ಡಿಸ್ರಪ್ಷನ್ ಸಮಯದಲ್ಲಿ ಅಕ್ಟಿವ್ ಇಲ್ಲದಿರುವುದರಿಂದ, GPS ಜೋನ್ ಮಿಸ್ಮ್ಯಾಚ್, ಫ್ರಾಡ್ ಸಿಗ್ನಲ್ಸ್, ಅಥವಾ 48 ಗಂಟೆಗಳಲ್ಲಿ ಡ್ಯೂಪ್ಲಿಕೇಟ್ ಕ್ಲೈಮ್ ಗಳು.', 'claims', 'kn'),
('ವೀಕ್ಲಿ ಕ್ಯಾಪ್ ಏನು?', 'ವೀಕ್ಲಿ ಕ್ಯಾಪ್ ಗಳು ಪ್ಲಾನ್ ಅನುಸಾರವಾಗಿ ಬದಲಾಗುತ್ತವೆ: ಸ್ಟಾರ್ಟರ್ ₹500, ಷೀಲ್ಡ್ ₹1,200, ಪ್ರೋ ₹2,000. ಇದು ಒಂದು ವಾರಕ್ಕೆ ಗರಿಷ್ಠ ಪೇಔಟ್.', 'payouts', 'kn');