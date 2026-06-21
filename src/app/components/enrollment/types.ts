export interface FormData {
  fullName: string;
  email: string;
  whatsapp: string;
  planId: string;
  utrNumber: string;
  colleges: string[];
  referralSource: string;
  referralOther: string;
  remarks: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  tag?: string;
}

export const PLANS: Plan[] = [
  { id: "ai-chatbot", name: "AI Chatbot Access", price: 199 },
  { id: "roadmap", name: "Preparation Roadmap & Strategy", price: 399 },
  { id: "portfolio", name: "Portfolio Review", price: 499 },
  { id: "interview", name: "IIT Interview Guidance", price: 499 },
  { id: "flex", name: "Flex Preparation Bundle", price: 3999, tag: "Popular" },
  { id: "pro", name: "Pro* Preparation Bundle", price: 7999, tag: "Best Value" },
  { id: "core", name: "Core Preparation Bundle", price: 10999, tag: "Complete" },
];

export const IIT_OPTIONS = [
  { id: "iit-bombay", label: "IIT Bombay" },
  { id: "iit-delhi", label: "IIT Delhi" },
  { id: "iit-hyderabad", label: "IIT Hyderabad" },
  { id: "iit-jodhpur", label: "IIT Jodhpur" },
  { id: "iit-roorkee", label: "IIT Roorkee" },
  { id: "iit-gandhinagar", label: "IIT Gandhinagar" },
];

export const REFERRAL_OPTIONS = [
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "ai", label: "AI Platform", emoji: "🤖" },
  { id: "blog", label: "Your Blog", emoji: "✍️" },
  { id: "reddit", label: "Reddit", emoji: "🔴" },
  { id: "others", label: "Others", emoji: "💬" },
];

export const UPI_ID = "sanukumar972@ybl";
export const UPI_NAME = "Sanu Kumar";
export const SUPPORT_NO = "9390715011";
export const SUPPORT_DISPLAY = "939 071 5011";
