/**
 * Utility to parse unstructured expense notes (single or multi-line) into structured expenses.
 * Parse entries from Apple Notes, Keep, or WhatsApp into Expense Tracker.
 */

const KEYWORD_CATEGORY_MAP = [
  {
    categoryKeywords: ['food', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'coffee', 'cafe', 'tea', 'chai', 'snack', 'restaurant', 'swiggy', 'zomato', 'eat', 'mcdonalds', 'kfc', 'starbucks', 'biryani'],
    catId: 'cat-food'
  },
  {
    categoryKeywords: ['groceries', 'grocery', 'vegetables', 'veggies', 'fruits', 'milk', 'bread', 'supermarket', 'mart', 'blinkit', 'zepto', 'instamart', 'market'],
    catId: 'cat-groceries'
  },
  {
    categoryKeywords: ['uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'petrol', 'fuel', 'diesel', 'metro', 'bus', 'flight', 'train', 'irctc', 'toll', 'parking'],
    catId: 'cat-travel'
  },
  {
    categoryKeywords: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shirt', 'dress', 'shopping', 'mall', 'zara', 'h&m'],
    catId: 'cat-misc'
  },
  {
    categoryKeywords: ['wifi', 'broadband', 'electricity', 'water', 'rent', 'recharge', 'airtel', 'jio', 'bill', 'maintenance', 'gas', 'cylinder'],
    catId: 'cat-rent-bills'
  },
  {
    categoryKeywords: ['netflix', 'spotify', 'movie', 'cinema', 'theatre', 'game', 'steam', 'ps5', 'concert', 'club', 'party', 'youtube'],
    catId: 'cat-entertainment'
  },
  {
    categoryKeywords: ['medicine', 'doctor', 'hospital', 'gym', 'fitness', 'protein', 'pharmacy', 'clinic', 'dentist', 'apollo'],
    catId: 'cat-misc'
  },
  {
    categoryKeywords: ['course', 'book', 'udemy', 'coursera', 'books', 'domain', 'hosting', 'exam', 'tuition', 'software', 'chatgpt'],
    catId: 'cat-misc'
  },
  {
    categoryKeywords: ['sip', 'stocks', 'mutual fund', 'gold', 'crypto', 'savings', 'fd', 'deposit', 'investment'],
    catId: 'cat-savings'
  }
];

const PAYMENT_KEYWORDS = {
  'upi': 'upi',
  'gpay': 'upi',
  'phonepe': 'upi',
  'paytm': 'upi',
  'scan': 'upi',
  'card': 'credit-card',
  'credit': 'credit-card',
  'debit': 'credit-card',
  'cc': 'credit-card',
  'cash': 'cash'
};

export const parseExpenseLine = (line, availableCategories = []) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  // Extract amount: matches forms like 150, 150.50, ₹150, Rs. 150, Rs 150, $25, 1200/-
  const amountRegex = /(?:₹|rs\.?|\$|€|£)?\s*(\d+(?:[.,]\d{1,2})?)(?:\s*(?:\/-|\/))?/i;
  const amountMatch = trimmed.match(amountRegex);

  let amount = 0;
  let remainingText = trimmed;

  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
    // Remove the matched amount string from the title
    remainingText = trimmed.replace(amountMatch[0], ' ').trim();
  }

  // Detect payment method
  let paymentMethod = 'upi'; // default
  const lowerRemaining = remainingText.toLowerCase();
  for (const [key, method] of Object.entries(PAYMENT_KEYWORDS)) {
    const reg = new RegExp(`\\b${key}\\b`, 'i');
    if (reg.test(lowerRemaining)) {
      paymentMethod = method;
      remainingText = remainingText.replace(reg, ' ').trim();
      break;
    }
  }

  // Detect category
  let categoryId = 'cat-misc';
  const cleanTokens = lowerRemaining.split(/\s+/);
  
  // First match against custom category names if user defined any
  const matchedCustomCat = availableCategories.find(c => 
    cleanTokens.some(token => token.length > 2 && c.name.toLowerCase().includes(token))
  );

  if (matchedCustomCat) {
    categoryId = matchedCustomCat.id;
  } else {
    // Check against standard dictionary
    for (const rule of KEYWORD_CATEGORY_MAP) {
      if (rule.categoryKeywords.some(keyword => lowerRemaining.includes(keyword))) {
        categoryId = rule.catId;
        break;
      }
    }
  }

  // Clean title
  let title = remainingText
    .replace(/^[-–—:•*]+\s*/, '') // remove bullet points
    .replace(/[-–—:•*]+\s*$/, '')
    .trim();

  if (!title) {
    // If no title was left, infer from category
    const catObj = availableCategories.find(c => c.id === categoryId);
    title = catObj ? catObj.name : 'Quick Expense';
  } else {
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title,
    amount: amount || 0,
    categoryId,
    paymentMethod,
    date: new Date().toISOString().split('T')[0],
    notes: 'Imported from Notes'
  };
};

export const parseMultiLineNotes = (fullText, availableCategories = []) => {
  const lines = fullText.split('\n');
  const results = [];

  for (const line of lines) {
    const parsed = parseExpenseLine(line, availableCategories);
    if (parsed && parsed.amount > 0) {
      results.push(parsed);
    }
  }

  return results;
};
