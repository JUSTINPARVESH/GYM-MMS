# Gym Membership Management System - Documentation

## 1. Project Overview
The **Gym Membership Management System** is a comprehensive web application designed to streamline gym operations, member tracking, and subscription management. It provides gym administrators with a powerful dashboard to monitor member status, payments, and business growth.

## 2. Technologies Used
- **Frontend:** React.js, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Node.js, Express.js (Vite Middleware)
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Auth (Google Login)

## 3. System Architecture
**User → React Frontend → Node.js / Express Backend (Vite) → Firebase Firestore Database**

The frontend communicates with Firestore directly for real-time data updates using the `onSnapshot` listener. Authentication is handled via Firebase Auth, ensuring secure access to the admin dashboard.

## 4. Project Folder Structure
```
gym-membership-system
├── src
│   ├── components
│   │   ├── Navbar.tsx
│   │   ├── MemberCard.tsx
│   │   ├── Sidebar.tsx
│   │   └── ErrorBoundary.tsx
│   ├── pages
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AddMember.tsx
│   │   └── MembersList.tsx
│   ├── services
│   │   └── firebase.ts
│   ├── App.tsx
│   └── main.tsx
├── server.ts
├── firestore.rules
└── firebase-blueprint.json
```

## 5. File Path Flow (Request Flow)
**React Page (AddMember.tsx)**
↓
**Firebase Service (addDoc)**
↓
**Firestore Security Rules (Validation)**
↓
**Firestore Database**

## 6. System Modules
- **Admin Login Module:** Secure entry for gym staff.
- **Dashboard Module:** Visual analytics of revenue and member status.
- **Add Member Module:** Form to register new members with plan selection.
- **View Members Module:** Searchable list of all registered members.
- **Membership Plan Module:** Management of different subscription tiers.
- **Payment Status Module:** Tracking of paid vs. pending memberships.
- **Search Member Module:** Real-time filtering of member records.

## 7. Database Design (Firestore)
**Collection: `members`**
- `MemberID` (Document ID)
- `name`: string
- `age`: number
- `phoneNumber`: string
- `gender`: string
- `membershipPlan`: string
- `joinDate`: timestamp
- `expiryDate`: timestamp
- `paymentStatus`: string
- `status`: string (Active, Expiring Soon, Expired)

## 8. CRUD Operations
- **Create:** Add new member records via `addDoc`.
- **Read:** Fetch and listen to member data via `onSnapshot`.
- **Update:** Modify member details or payment status via `updateDoc`.
- **Delete:** Remove member records via `deleteDoc`.

## 9. Unique Features
- **Automatic Expiry Alerts:** Visual indicators for memberships ending within 7 days.
- **Smart Dashboard Analytics:** Real-time charts for revenue and member distribution.
- **Auto-Calculation:** Expiry dates are automatically calculated based on the selected plan (1, 3, 6, or 12 months).
- **Status Indicators:** Color-coded badges for Active, Expiring, and Expired states.

## 10. Advantages
- Reduces manual paperwork.
- Centralized data management.
- Real-time tracking of revenue and member retention.
- Improved communication with payment reminders.

## 11. Future Enhancements
- SMS/Email integration for automated alerts.
- Online payment gateway integration.
- Mobile app for members to track their own progress.
- Workout and diet plan assignment module.
