export const defaultPortfolioData = {
  profile: {
    name: "Amrit Dash",
    title: "AI & Automation Engineer",
    tagline:
      "Building automation-first products with modern AI, workflow orchestration, and human-friendly interfaces.",
    location: "India",
    status: "Open to impactful automation and AI engineering collaborations.",
    summary:
      "Software Engineer with 5 years of experience delivering automation systems across consulting and product teams. I use a fail-fast, fix-fast mindset to ship practical solutions with measurable business impact.",
  },
  contact: {
    email: "amrit.dash60@gmail.com",
    phone: "+91 7978416962",
    website: "https://amritdash.web.app",
    linkedin: "https://linkedin.com/in/amritdash60",
    github: "https://github.com/the-AoG-guy",
    instagram: "https://instagram.com/_amrit_dash_",
  },
  cv: {
    lightUrl: "assets/amrit-dash-cv-light-2025.pdf",
    darkUrl: "assets/amrit-dash-cv-dark-2025.pdf",
  },
  theme: {
    defaultMode: "dark",
    accent: "#6ee7ff",
    altAccent: "#ff8a5b",
    fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  },
  scores: [
    { label: "IELTS", value: "8.0" },
    { label: "GRE", value: "306.5" },
    { label: "CGPA", value: "7.90" },
  ],
  skills: [
    "Google Apps Script",
    "Make.com / Zapier / n8n",
    "Monday CRM / HubSpot",
    "Firebase Tools",
    "LLM Agents + RAG",
    "Node.js / React / TypeScript",
    "Shopify Liquid",
    "Flutter + Dart",
    "SQL / C / C++ / Java",
    "WhatsApp + Twilio Bot Development",
  ],
  experience: [
    {
      company: "Contour Education",
      role: "Automation Engineer",
      period: "08/2025 - Present",
      highlights: [
        "Driving end-to-end automation for student onboarding, class allocation, attendance, and parent-student communication.",
        "Building CRM-centric automations using Make.com, Zapier, n8n, Google Apps Script, and Monday.com.",
      ],
      primary: true,
    },
    {
      company: "Axelerant Technologies",
      role: "Business Automation Engineer",
      period: "07/2023 - 08/2024",
      highlights: [
        "Developed internal business workflow automations with Make, Zapier, Apps Script, and Zoho automation stacks.",
        "Built onboarding, appraisal, and offboarding automation pipelines and optimized existing scenarios for cost and reliability.",
      ],
    },
    {
      company: "HighRadius Corporation",
      role: "Script Automation Team Lead",
      period: "07/2022 - 06/2023",
      highlights: [
        "Built ASAP automation tools that became daily operational systems for consulting teams.",
        "Partnered with client teams and internal stakeholders to reduce manual process overhead and improve data flow.",
      ],
    },
    {
      company: "HighRadius Corporation",
      role: "Automation Consultant / Engineer",
      period: "2021 - 2022",
      highlights: [
        "Implemented Cash Application Automation solutions for clients including Zurich Insurance, CrediQ, and Heritage Crystal Clean.",
        "Led a small team for Bureau Veritas project implementation and go-live delivery.",
      ],
    },
    {
      company: "Freelance (Project-Based)",
      role: "Software Engineer",
      period: "09/2024 - 07/2025",
      highlights: [
        "Built a Flutter app and dashboard for coffee plantation operations (Coffee Mapper).",
        "Delivered Shopify custom components, WhatsApp bot workflows, and LLM-based prototypes for client use-cases.",
      ],
    },
  ],
  education: [
    {
      school: "KIIT University",
      degree: "Bachelor of Technology, Computer Science and Engineering",
      period: "04/2017 - 04/2021",
      details: "Focused on practical product engineering, developer communities, and hackathon-led learning.",
    },
  ],
  projects: [
    {
      title: "GenkiFlow IDE",
      type: "Next.js + Genkit AI IDE",
      summary:
        "A browser-based IDE integrating Google Genkit capabilities for code generation, refactoring, and summarization with persistent file context.",
      tags: ["AI", "Next.js", "Genkit"],
      links: [{ label: "Explore", url: "https://github.com/the-AoG-guy" }],
      thumbnail: "",
      image: "",
    },
    {
      title: "Coffee Mapper",
      type: "Flutter Android App",
      summary:
        "Field operations app built for Coffee Development Trust, Koraput to track plantation regions and capture district-level records.",
      tags: ["Flutter", "Android", "Field Ops"],
      links: [
        { label: "Play Store", url: "https://play.google.com/store/apps/details?id=com.coffee.mapper" },
      ],
      thumbnail: "",
      image: "",
    },
    {
      title: "Coffee Mapper Dashboard",
      type: "Flutter Web Dashboard",
      summary:
        "Web dashboard for plantation map views and report generation across tracked coffee regions.",
      tags: ["Flutter Web", "Dashboard", "Maps"],
      links: [{ label: "Live Site", url: "https://coffee-mapper-dashboard.web.app" }],
      thumbnail: "",
      image: "",
    },
    {
      title: "Nothing BOT Comedy",
      type: "WhatsApp Bot",
      summary:
        "Bot workflow used by Bangalore comedians for spot curation; supported a weekly active user base of 150+ comics.",
      tags: ["Twilio", "WhatsApp", "Automation"],
      links: [{ label: "GitHub", url: "https://github.com/amrit-dash/Nothing-BOT-Comedy" }],
      thumbnail: "",
      image: "",
    },
    {
      title: "ASAP - Customer Grouping",
      type: "Apps Script Automation",
      summary:
        "Fuzzy customer grouping tool for consulting workflows, built to accelerate decision support and customer segmentation.",
      tags: ["Apps Script", "Google Workspace", "Automation"],
      links: [{ label: "Documentation", url: "https://docs.google.com/document/d/1omFaGxy4gHuwoJK1VQ7cvItkUfbLBPELfN9nB-xFVB8/edit?usp=sharing" }],
      thumbnail: "",
      image: "",
    },
  ],
  achievements: [
    "AIR 1 in Digit CTC VI (Crack the Code).",
    "Runner-up at Run IO Hackathon (NIT Rourkela).",
    "Highflyer Intern of the Quarter + Star Team Award at HighRadius.",
    "Tech speaker for Actions on Google workshops and sessions.",
  ],
  certifications: [
    "Make Automation Expert (Levels 1-4).",
    "Google Cloud Essentials.",
    "Build Interactive Apps with Google Assistant.",
    "Machine Learning APIs.",
    "Kubernetes in Google Cloud.",
    "Leadership Axelerator Program (LeAP).",
  ],
  interests: ["Stand-up Comedy", "Tech DIY", "Magic", "Tech Talks", "Gaming", "Travel + Food Exploration"],
  ui: {
    heroMode: "retro-console",
    sectionAnimation: "stagger-fade",
    experienceLayout: "timeline",
    projectCardStyle: "glass-grid",
  },
};

export const PORTFOLIO_DB_PATH = "portfolio/content";
export const ADMIN_SETTINGS_PATH = "portfolio/adminSettings";
