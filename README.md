# Furnitech ERP

A comprehensive, multi-tenant **Enterprise Resource Planning (ERP)** system built for furniture manufacturing businesses. Furnitech ERP streamlines operations across sales, production, inventory, procurement, customer relationships, and more — all in one unified platform with an integrated AI layer.

---

## ✨ Features

### 🏢 Core ERP Modules
| Module | Description |
|---|---|
| **CRM** | Manage leads, inquiries, and customer relationships |
| **Quotations** | Create, track, and convert quotations to orders |
| **Orders** | Full order lifecycle — pre-production to dispatch |
| **Inventory** | Real-time stock tracking with auto-restock suggestions |
| **Raw Materials** | Procurement and goods receipt note (GRN) management |
| **Products** | Product catalogue and configuration management |
| **Customers** | Customer profiles, ledgers, and payment history |
| **Vendors** | Vendor onboarding, orders, and payments |
| **Staff** | HR — employee records and role assignments |
| **Machines** | Machine register and maintenance tracking |
| **Transport** | Delivery order and dispatch management |
| **Drawings** | CAD drawing uploads and approval workflows |
| **Payments** | Razorpay-integrated payment tracking and advance management |
| **Subscriptions** | Organisation subscription and feature access control |

### 🤖 AI & Automation
- **AI Chat Assistant** — in-app chatbot for instant support and data queries
- **Smart Automation** — workflow automation and suggestion engine
- **Customer Insights** — AI-driven analytics on customer behaviour
- **Inventory Scanner** — YOLO-based furniture detection from floor-plan PDFs
- **AI Alerts** — proactive smart alerts and reminders

### 👥 Multi-role Dashboards
Role-aware dashboards tailored for:
- Super Admin / Admin
- Sales Manager & Salesman
- Head of Sales (HOS)
- Design Department Head
- Pre-production & Post-production Teams
- Vendor Portal
- Transport Team

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Admin Frontend** | React 18, Vite, Tailwind CSS, Recharts |
| **Org Frontend** | React 18, Vite, Tailwind CSS, Chart.js |
| **Authentication** | JWT (jsonwebtoken) |
| **AI / ML** | Python, YOLOv8, PyTorch, Google Gemini API |
| **Payments** | Razorpay |
| **Email** | Nodemailer |
| **PDF Generation** | PDFKit |
| **Spreadsheets** | Google Sheets API, xlsx |
| **File Storage** | Multer (local), Google Drive |

---

## 📁 Project Structure

```
Furnitech-ERP/
├── backend/              # Express API server
│   ├── config/           # Database & app configuration
│   ├── controllers/      # Route controllers
│   ├── jobs/             # Background jobs (stock monitoring, reminders)
│   ├── middleware/       # Auth, rate-limiting, validation
│   ├── models/
│   │   ├── shared/       # Cross-tenant models (Org, User, Role, etc.)
│   │   └── vlite/        # Tenant-specific models (Order, Quotation, etc.)
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic services
│   └── server.js         # App entry point
│
├── frontend-admin/       # Super-admin control panel (React + Vite)
│   └── src/
│       ├── pages/        # Dashboard, Organisations, Payments, etc.
│       └── components/   # Shared UI components
│
├── frontend-org/         # Organisation portal (React + Vite)
│   └── src/
│       ├── pages/        # All ERP module pages
│       └── components/   # Shared UI components
│
├── AI/                   # Python AI services
│   ├── smart_automation/ # Automation API
│   ├── customer_insights/# Customer analytics
│   ├── inventory_scanner/# YOLO furniture detection
│   ├── ai_support/       # AI support service
│   └── datasets/         # YOLO training datasets
│
└── scripts/              # Database migration and utility scripts
```

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** v6+ (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Python** 3.10+ *(required only for AI features)*

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/VeerMedi/Furnitech-ERP.git
cd Furnitech-ERP
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs dependencies for the root, backend, `frontend-admin`, and `frontend-org` in one command.

### 3. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env   # if an example file exists, otherwise create it manually
```

Populate the following variables:

```env
# Server
NODE_ENV=development
PORT=5001

# Database
MONGODB_URI=mongodb://localhost:27017/vlite

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Organisation (single-tenant)
VLITE_ORG_ID=<your_organization_id>
VLITE_ORG_SLUG=vlite-furnitures

# Razorpay (payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# Google Sheets (optional)
GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json

# AI (optional)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Seed initial data

```bash
# Create a super-admin account
npm run create-superadmin

# (Optional) Create demo organisations
npm run create-demo-orgs
```

---

## ▶️ Running the Application

Each service runs independently. Open a separate terminal for each:

```bash
# Backend API (http://localhost:5001)
npm run dev:backend

# Admin frontend (http://localhost:5173)
npm run dev:admin

# Organisation frontend (http://localhost:5174)
npm run dev:org
```

### Health Check

```
GET http://localhost:5001/health
```

---

## 🔌 API Overview

All endpoints are prefixed with `/api/`:

| Prefix | Description |
|---|---|
| `/api/auth` | Authentication (login, register, refresh) |
| `/api/admin` | Super-admin management |
| `/api/org` | Organisation settings |
| `/api/users` | User management |
| `/api/roles` | Role & permission management |
| `/api/crm` | CRM — leads and pipeline |
| `/api/customers` | Customer records |
| `/api/inquiries` | Sales inquiries |
| `/api/quotations` | Quotation CRUD |
| `/api/orders` | Order management |
| `/api/products` | Product catalogue |
| `/api/rawmaterial` | Raw material procurement |
| `/api/inventory` | Inventory stock |
| `/api/vendors` | Vendor management |
| `/api/staff` | Staff & HR |
| `/api/machines` | Machine register |
| `/api/transports` | Transport & dispatch |
| `/api/drawings` | Drawing management |
| `/api/payments` | Payment records |
| `/api/subscription` | Subscription management |
| `/api/ai-chat` | AI Chat service |
| `/api/automation` | Smart automation |
| `/api/insights` | Customer insights |
| `/api/ai/support` | AI support service |
| `/api/dashboard` | Dashboard statistics |

---

## 🤖 AI Services (Python)

The `AI/` directory contains optional Python-based AI services.

### Setup

```bash
cd AI
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Start AI services

```bash
python start_ai_services.py
```

### Furniture Detection (YOLO)

The inventory scanner uses a YOLO model to detect furniture items from floor-plan PDFs.  
See [`AI/datasets/README.md`](AI/datasets/README.md) for dataset setup and training instructions.

---

## 🧪 Running Tests

```bash
# Backend tests (Jest)
cd backend && npm test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.
