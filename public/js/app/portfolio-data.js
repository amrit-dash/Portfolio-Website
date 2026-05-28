export const defaultPortfolioData = {
  profile: {
    name: "Amrit Dash",
    title: "AI & Automation Engineer",
    tagline:
      "Software engineer with 5 years of experience shipping automation systems — from Cash Application consulting to education ops at Contour Education.",
    location: "India · Remote-friendly",
    status:
      "Currently Automation Engineer at Contour Education · Open to impactful automation, AI, and product engineering collaborations.",
    summary:
      "Software Engineer with 5 years of experience in implementing automation projects. Worked as a consultant to implement Cash Application Automation for 2 years. Being a logical thinker who prioritizes real-world applications over textbook approaches to problem-solving, I have adopted a fail-first and fix-fast approach as a personality trait. Outside of work, I do stand-up comedy to keep following my passion. I am always seeking new adventures, driven by wanderlust and a knack for discovering good food.",
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
    customCursor: true,
  },
  scores: [
    { label: "IELTS", value: "8.0" },
    { label: "GRE", value: "306.5" },
    { label: "CGPA", value: "7.90" },
  ],
  skills: [
    "Google Apps Script",
    "Make.com · Zapier · n8n",
    "Monday.com · HubSpot CRM",
    "Node.js · React · TypeScript",
    "LLM Agents + RAG",
    "Firebase Tools",
    "Flutter · Dart",
    "Shopify Liquid",
    "WhatsApp · Twilio Bots",
    "Actions on Google",
    "SQL · C/C++ · Java",
    "HTML · CSS · JavaScript",
  ],
  experience: [
    {
      company: "Contour Education",
      role: "Automation Engineer",
      period: "08/2025 - Present",
      highlights: [
        "Driving end-to-end automation of student onboarding, class allocation, attendance tracking, and parent-student communication.",
        "Building CRM-centric workflows with Make.com, Zapier, n8n, Google Apps Script, and Monday.com.",
      ],
      primary: true,
    },
    {
      company: "Freelance (Project-Based)",
      role: "Software Engineer",
      period: "09/2024 - 07/2025",
      highlights: [
        "Flutter Developer, CDT Koraput — Coffee Mapper android app for plantation tracking in Koraput, Odisha.",
        "AI Engineer, BeGig — custom LLM chatbot with RAG integration for a client engagement.",
        "Shopify Developer, Kunsquad — custom Liquid components for an e-commerce startup in Bhubaneswar.",
        "Software Developer, Nothing Bot Comedy — WhatsApp bot for spot curation at a Bangalore comedy club.",
      ],
    },
    {
      company: "Axelerant Technologies",
      role: "Business Automation Engineer",
      period: "07/2023 - 08/2024",
      highlights: [
        "Developed automation scenarios for manual business processes using Make, Zapier, Apps Script, and Zoho Automations.",
        "Built end-to-end employee onboarding, appraisal, and offboarding automation systems.",
        "Maintained and optimized automations for cost efficiency and reliability.",
      ],
    },
    {
      company: "HighRadius Corporation",
      role: "Script Automation Team Lead",
      period: "07/2022 - 06/2023",
      highlights: [
        "Built ASAP (Apps Script Automation Projects) tools adopted for daily consultant operations.",
        "Tools used for project management, team management, and faster data gathering.",
      ],
    },
    {
      company: "HighRadius Corporation",
      role: "Automation Consultant / Engineer",
      period: "2021 - 2022",
      highlights: [
        "Received PPO after co-op training on Cash Application Automation (CAA).",
        "Implemented CAA for Zurich Insurance, CrediQ, and Heritage Crystal Clean (live 2021–2022).",
        "Managed 2 resources for Bureau Veritas CAA implementation (live 2022).",
        "Worked with Bank of America clients on faster cash automation implementations.",
      ],
    },
  ],
  education: [
    {
      school: "KIIT University",
      degree: "Bachelor of Technology — Computer Science and Engineering",
      period: "04/2017 - 04/2021",
      details:
        "CGPA 7.90. Active in developer communities, hackathons, and technical events throughout the program.",
    },
  ],
  volunteer: [
    "Google Developers Group, Bhubaneswar — Volunteer",
    "Developers Student Club KIIT — Core Team Member",
    "HackDAV — Co-organized India's first high-school level hackathon",
    "UNFPA — Internship (07/2019 - 08/2019)",
  ],
  projects: [
    {
      title: "GenkiFlow IDE",
      type: "Next.js Web App",
      summary:
        "Web-based IDE embedding Google Genkit AI for code generation, refactoring, and summarization with a multi-tab editor and persistent browser file system.",
      tags: ["Next.js", "Genkit", "AI IDE"],
      links: [{ label: "GitHub", url: "https://github.com/the-AoG-guy" }],
      thumbnail: "",
      image: "",
    },
    {
      title: "Coffee Mapper",
      type: "Flutter Android App",
      summary:
        "Field operations app for Coffee Development Trust, Koraput — agents track plantations across regions and capture district-level records.",
      tags: ["Flutter", "Android", "Field Ops"],
      links: [
        { label: "Play Store", url: "https://play.google.com/store/apps/details?id=com.coffee.mapper" },
        { label: "GitHub", url: "https://github.com/amrit-dash/coffee-mapper-android" },
      ],
      thumbnail: "images/portfolio/coffeeMapper.jpg",
      image: "images/portfolio/gallery/coffeeMapper.jpg",
    },
    {
      title: "Coffee Mapper Dashboard",
      type: "Flutter Web Project",
      summary:
        "Web dashboard with integrated map views and report generation for tracked coffee plantation regions.",
      tags: ["Flutter Web", "Maps", "Dashboard"],
      links: [
        { label: "Live Site", url: "https://coffee-mapper-dashboard.web.app" },
        { label: "GitHub", url: "https://github.com/amrit-dash/coffee-mapper-web" },
      ],
      thumbnail: "images/portfolio/cdtKoraput.jpg",
      image: "images/portfolio/gallery/dashboard.jpg",
    },
    {
      title: "Nothing BOT Comedy",
      type: "WhatsApp Bot",
      summary:
        "WhatsApp bot for Bangalore comedy club spot curation — 150+ comics used it weekly to check venue availability.",
      tags: ["Twilio", "WhatsApp", "Apps Script"],
      links: [
        { label: "Message Bot", url: "https://wa.me/message/OGQRIVZ7W7JAN1" },
        { label: "GitHub", url: "https://github.com/amrit-dash/Nothing-BOT-Comedy" },
      ],
      thumbnail: "images/portfolio/nbc.jpg",
      image: "images/portfolio/gallery/nbc.jpg",
    },
    {
      title: "ASAP - Customer Grouping",
      type: "Apps Script Project",
      summary:
        "Apps Script Automation Project that recommends customer groups from similar-sounding customer names for consulting workflows.",
      tags: ["Apps Script", "Google Workspace", "Automation"],
      links: [
        { label: "Live Tool", url: "https://fuzzy-customer-group-generator.firebaseapp.com" },
        { label: "Docs", url: "https://docs.google.com/document/d/1omFaGxy4gHuwoJK1VQ7cvItkUfbLBPELfN9nB-xFVB8/edit?usp=sharing" },
      ],
      thumbnail: "images/portfolio/asapCG.jpg",
      image: "images/portfolio/gallery/asapCG.jpg",
    },
    {
      title: "Make Automation Projects",
      type: "Make.com Automation",
      summary:
        "Advanced automation scenarios including DSM Bot for daily status meetings and Cricket Bot for prediction and engagement workflows.",
      tags: ["Make.com", "Apps Script", "Slack", "ChatGPT"],
      links: [{ label: "GitHub", url: "https://github.com/amrit-dash/Make-Automation-Projects" }],
      thumbnail: "images/portfolio/make.jpg",
      image: "images/portfolio/gallery/make.jpg",
    },
    {
      title: "Kunsquad Website",
      type: "Shopify Liquid",
      summary:
        "Custom pages and widget assets using Shopify Liquid for an e-commerce startup in Bhubaneswar.",
      tags: ["Shopify", "Liquid", "E-commerce"],
      links: [{ label: "About Page", url: "https://www.kunsquad.com/pages/about-us" }],
      thumbnail: "images/portfolio/kunsquad.jpg",
      image: "images/portfolio/gallery/kunsquad.jpg",
    },
    {
      title: "Miss Lily",
      type: "Actions on Google",
      summary:
        "Personal health-mate Action on Google — assists with healthy living, disease management, and medicine scheduling.",
      tags: ["Actions on Google", "Voice", "Health"],
      links: [],
      thumbnail: "",
      image: "",
    },
    {
      title: "Ms. BOOKERS'",
      type: "Actions on Google",
      summary:
        "E-commerce presence for book rental startup BOOKERS' on Actions on Google — product sold with associated user base.",
      tags: ["Actions on Google", "E-commerce"],
      links: [],
      thumbnail: "",
      image: "",
    },
    {
      title: "DSC KIIT",
      type: "Flutter Android App",
      summary:
        "Flutter app for internal operations of Developers Student Club KIIT.",
      tags: ["Flutter", "Android", "Community"],
      links: [],
      thumbnail: "",
      image: "",
    },
  ],
  achievements: [
    "AIR 1 in Digit CTC VI (Crack the Code) — India's toughest annual cryptic hunt by Digit.",
    "Runners Up at Run IO Hackathon (NIT Rourkela).",
    "Highflyer Intern of the Quarter Award (Q2, 2021) at HighRadius.",
    "Star Team Award (Q3, 2021) at HighRadius.",
    "Tech speaker — Actions on Google workshops at IIIT Bhubaneswar, CVRCE, DevExpo, and more.",
  ],
  certifications: [
    "Make Automation Expert — Levels 1–4 (07/2024 - 07/2026).",
    "Google Cloud Essentials · Machine Learning APIs · Kubernetes in Google Cloud (Qwiklabs).",
    "Build Interactive Apps with Google Assistant (Qwiklabs).",
    "Leadership Axelerator Program (LeAP) — Effective Listening, Empathy, Lead With Integrity.",
  ],
  interests: [
    "Stand-Up Comedy",
    "Tech DIY",
    "Magic",
    "Model United Nations",
    "Tech Talks",
    "Gaming",
    "Travel & Food",
  ],
  ui: {
    heroMode: "retro-console",
    sectionAnimation: "stagger-fade",
    experienceLayout: "timeline",
    projectCardStyle: "glass-grid",
    customCursor: true,
    showJourneyRail: true,
  },
};

export const PORTFOLIO_DB_PATH = "portfolio/content";
export const ADMIN_SETTINGS_PATH = "portfolio/adminSettings";
export const DEV_ADMIN_SESSION_KEY = "portfolio-dev-admin-session";
