/**
 * Hindi Transliteration — Roman to Devanagari
 * Uses a rule-based mapping for common Indian names, words, places, castes.
 * Type: "Somya Panchal" → "सोम्या पंचाल"
 */

// Longer patterns must come before shorter ones
const MAP = [
  // ── Consonant clusters ──────────────────────────────────────────────────
  ['ksh', 'क्ष'], ['gya', 'ज्ञ'], ['shr', 'श्र'], ['shri', 'श्री'],
  ['tth', 'ट्ठ'], ['ddy', 'द्ध'], ['ndr', 'न्द्र'],

  // ── Digraphs ─────────────────────────────────────────────────────────────
  ['aa', 'ा'], ['ii', 'ी'], ['uu', 'ू'], ['ee', 'ी'], ['oo', 'ू'],
  ['ai', 'ै'], ['au', 'ौ'], ['ou', 'ौ'],
  ['ch', 'च'], ['Ch', 'छ'], ['CH', 'छ'],
  ['sh', 'श'], ['Sh', 'ष'], ['SH', 'ष'],
  ['th', 'थ'], ['Th', 'ठ'], ['TH', 'ठ'],
  ['dh', 'ध'], ['Dh', 'ढ'], ['DH', 'ढ'],
  ['ph', 'फ'], ['bh', 'भ'], ['gh', 'ग'],
  ['kh', 'ख'], ['jh', 'झ'], ['nh', 'ञ'],
  ['ng', 'ङ'], ['ny', 'ञ'], ['nj', 'ञ'],
  ['ri', 'रि'], ['ru', 'रु'],
  ['tr', 'त्र'], ['pr', 'प्र'], ['br', 'ब्र'], ['kr', 'क्र'], ['gr', 'ग्र'],
  ['dr', 'द्र'], ['vr', 'व्र'], ['sr', 'स्र'],

  // ── Vowels (standalone) ──────────────────────────────────────────────────
  ['a', 'अ'], ['A', 'आ'], ['i', 'इ'], ['I', 'ई'], ['u', 'उ'], ['U', 'ऊ'],
  ['e', 'ए'], ['E', 'ऐ'], ['o', 'ओ'], ['O', 'औ'],
  ['an', 'अन'], ['am', 'अम'],

  // ── Consonants ────────────────────────────────────────────────────────────
  ['k', 'क'], ['K', 'ख'], ['g', 'ग'], ['G', 'घ'],
  ['c', 'क'], ['j', 'ज'], ['J', 'झ'],
  ['t', 'त'], ['T', 'ट'], ['d', 'द'], ['D', 'ड'],
  ['n', 'न'], ['N', 'ण'], ['p', 'प'], ['P', 'फ'],
  ['b', 'ब'], ['B', 'भ'], ['m', 'म'], ['y', 'य'],
  ['r', 'र'], ['l', 'ल'], ['L', 'ळ'], ['v', 'व'], ['w', 'व'],
  ['s', 'स'], ['S', 'श'], ['h', 'ह'], ['H', 'ह'],
  ['f', 'फ'], ['z', 'ज'], ['x', 'क्स'], ['q', 'क'],

  // ── Punctuation / digits pass-through ────────────────────────────────────
  [' ', ' '], ['.', '.'], [',', ','], ['-', '-'], ['/', '/'],
]

/**
 * Simple word-level transliterator using predefined common word dictionary
 * for accuracy on typical names used in loan apps.
 */
const WORD_DICT = {
  // Common first names
  'somya':'सोम्या','saumya':'सौम्या','pooja':'पूजा','puja':'पूजा',
  'priya':'प्रिया','anita':'अनीता','sunita':'सुनीता','kavita':'कविता',
  'rekha':'रेखा','geeta':'गीता','seema':'सीमा','neha':'नेहा',
  'ritu':'रितु','meena':'मीना','usha':'उषा','asha':'आशा',
  'radha':'राधा','sita':'सीता','laxmi':'लक्ष्मी','lakshmi':'लक्ष्मी',
  'durga':'दुर्गा','sarita':'सरिता','mamta':'ममता','sunita':'सुनीता',
  'ramesh':'रमेश','suresh':'सुरेश','mahesh':'महेश','rakesh':'राकेश',
  'dinesh':'दिनेश','naresh':'नरेश','ganesh':'गणेश','rajesh':'राजेश',
  'mukesh':'मुकेश','ritesh':'रितेश','umesh':'उमेश','kamlesh':'कमलेश',
  'ravi':'रवि','shyam':'श्याम','mohan':'मोहन','sohan':'सोहन',
  'rohan':'रोहन','vikas':'विकास','deepak':'दीपक','manish':'मनीष',
  'anil':'अनिल','sunil':'सुनील','kapil':'कपिल','akhil':'अखिल',
  'sahil':'साहिल','nikhil':'निखिल','rahul':'राहुल','amol':'अमोल',
  'amit':'अमित','sumit':'सुमित','rohit':'रोहित','mohit':'मोहित',
  'ankit':'अंकित','lalit':'ललित','punit':'पुनीत','vinit':'विनीत',
  'raju':'राजू','sonu':'सोनू','monu':'मोनू','golu':'गोलू',
  'ram':'राम','shyam':'श्याम','hari':'हरि','gopal':'गोपाल',
  'krishna':'कृष्ण','vishnu':'विष्णु','shankar':'शंकर','shiv':'शिव',
  'bharat':'भारत','arjun':'अर्जुन','vijay':'विजय','ajay':'अजय',
  'sanjay':'संजय','manoj':'मनोज','saroj':'सरोज',

  // Common last names / surnames
  'panchal':'पंचाल','sharma':'शर्मा','verma':'वर्मा','gupta':'गुप्ता',
  'agarwal':'अग्रवाल','aggarwal':'अग्रवाल','jain':'जैन','seth':'सेठ',
  'singh':'सिंह','yadav':'यादव','kushwah':'कुशवाह','kushwaha':'कुशवाहा',
  'patel':'पटेल','chauhan':'चौहान','rajput':'राजपूत','thakur':'ठाकुर',
  'chaudhary':'चौधरी','mishra':'मिश्रा','tiwari':'तिवारी','dubey':'दुबे',
  'tripathi':'त्रिपाठी','pathak':'पाठक','pandey':'पांडेय','upadhyay':'उपाध्याय',
  'srivastava':'श्रीवास्तव','shukla':'शुक्ला','dwivedi':'द्विवेदी',
  'dixit':'दीक्षित','saxena':'सक्सेना','bhatnagar':'भटनागर',
  'rastogi':'रस्तोगी','mathur':'माथुर','nigam':'निगम','sinha':'सिन्हा',
  'prasad':'प्रसाद','nath':'नाथ','das':'दास','lal':'लाल','rai':'राय',
  'kumar':'कुमार','devi':'देवी','bai':'बाई','wati':'वती',

  // Castes
  'brahmin':'ब्राह्मण','rajput':'राजपूत','jat':'जाट','gujjar':'गुज्जर',
  'yadav':'यादव','kurmi':'कुर्मी','lodha':'लोधा','mali':'माली',
  'nai':'नाई','teli':'तेली','lohar':'लोहार','kumhar':'कुम्हार',
  'khatik':'खटीक','chamar':'चमार','valmiki':'वाल्मीकि','pasi':'पासी',
  'kori':'कोरी','dhimar':'धीमर','kahar':'कहार','kayastha':'कायस्थ',
  'bania':'बनिया','vaishya':'वैश्य','khatri':'खत्री','arora':'अरोड़ा',

  // Villages / places
  'delhi':'दिल्ली','agra':'आगरा','mathura':'मथुरा','vrindavan':'वृंदावन',
  'lucknow':'लखनऊ','kanpur':'कानपुर','allahabad':'इलाहाबाद',
  'varanasi':'वाराणसी','banaras':'बनारस','patna':'पटना','mumbai':'मुंबई',
  'pune':'पुणे','jaipur':'जयपुर','jodhpur':'जोधपुर','udaipur':'उदयपुर',
  'bhopal':'भोपाल','indore':'इंदौर','gwalior':'ग्वालियर','ujjain':'उज्जैन',
  'nagpur':'नागपुर','nashik':'नासिक','kolkata':'कोलकाता',
  'hyderabad':'हैदराबाद','chennai':'चेन्नई','bangalore':'बैंगलोर',
  'ahmedabad':'अहमदाबाद','surat':'सूरत','vadodara':'वडोदरा',

  // States
  'uttarpradesh':'उत्तर प्रदेश','madhyapradesh':'मध्य प्रदेश',
  'rajasthan':'राजस्थान','gujarat':'गुजरात','maharashtra':'महाराष्ट्र',
  'punjab':'पंजाब','haryana':'हरियाणा','bihar':'बिहार',
  'jharkhand':'झारखंड','odisha':'ओडिशा','assam':'असम',
  'kerala':'केरल','karnataka':'कर्नाटक','telangana':'तेलंगाना',

  // Relations
  'pita':'पिता','mata':'माता','pati':'पति','patni':'पत्नी',
  'beta':'बेटा','beti':'बेटी','bhai':'भाई','bahan':'बहन',
  'dada':'दादा','dadi':'दादी','nana':'नाना','nani':'नानी',
  'chacha':'चाचा','chachi':'चाची','mama':'मामा','mami':'मामी',

  // Common words in address/notes
  'gali':'गली','mohalla':'मोहल्ला','ward':'वार्ड','nagar':'नगर',
  'gram':'ग्राम','gaon':'गाँव','tola':'टोला','khet':'खेत',
  'makan':'मकान','dukan':'दुकान','bazar':'बाजार','road':'रोड',
  'colony':'कॉलोनी','society':'सोसायटी','sector':'सेक्टर',
}

/**
 * Main transliteration function
 * @param {string} text - Roman text to convert
 * @returns {string} - Devanagari text
 */
export function toHindi(text) {
  if (!text || !text.trim()) return text

  // Process word by word
  return text.split(' ').map(word => {
    if (!word) return word
    const lower = word.toLowerCase()
    // Check dictionary first (most accurate)
    if (WORD_DICT[lower]) return WORD_DICT[lower]
    // Otherwise use rule-based mapping
    return transliterateWord(word)
  }).join(' ')
}

function transliterateWord(word) {
  let result = ''
  let i = 0
  const w = word.toLowerCase()

  while (i < w.length) {
    let matched = false
    // Try longest match first (up to 4 chars)
    for (let len = 4; len >= 1; len--) {
      const chunk = w.slice(i, i + len)
      const found = MAP.find(([rom]) => rom === chunk)
      if (found) {
        result += found[1]
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      result += w[i]
      i++
    }
  }
  return result
}

/**
 * Check if text is already in Devanagari
 */
export function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(text)
}
