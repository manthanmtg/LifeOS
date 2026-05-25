# Health Module

A centralized vault for medical history, prescriptions, vaccinations, and health tracking for family members and pets.

## Overview

The Health module manages private `health_profile` records through the shared LifeOS content API. Each profile represents one person or pet and keeps medical history, current care items, lab readings, body measurements, and related documents in one payload.

| Contract | Value |
| --- | --- |
| Module ID | `health` |
| Content Type | `health_profile` |
| Registry Icon | `HeartPulse` |
| Public Visibility | Private by default |
| Primary API | `/api/content?module_type=health_profile` |
| Widget API | `/api/widgets/summary?module_type=health_profile` |

## Data Schema (HealthProfile)

The module uses the `HealthProfileSchema` (defined in `src/lib/schemas.ts`):

- **Basic Info**: Name, type (`self`, `family`, `pet`), relation, date of birth, blood group, gender, avatar/profile pic, emergency contact, and insurance information.
- **Allergies**: A list of strings for known sensitivities.
- **Conditions**: Array of objects tracking name, diagnosed date, status (`active`, `managed`, `resolved`), and detailed notes.
- **Medications**: Tracks dosage, prescriber, start/end dates, refill dates, status (`active`, `completed`, `discontinued`), and notes.
- **Vaccinations**: Logs administration date, next due date, provider, batch number, and notes.
- **Visits**: Tracks doctor visits by type (`checkup`, `emergency`, `dental`, etc.), facility, doctor name, diagnosis, prescription, cost, and currency.
- **Lab Results**: Logs test name, value, unit, reference range, status (`normal`, `borderline`, `abnormal`), and clinical notes.
- **Measurements**: Physical tracking of height (cm) and weight (kg) over time with date logging.
- **Documents**: Attachment tracking for prescriptions, bills, lab reports, discharge summaries, insurance papers, imaging, and other medical files. Attachments accept image MIME types and PDFs.
- **Metadata**: Support for custom tags and general notes per profile.

Date fields are stored as ISO date-time strings. Currency defaults to `INR` for visits, and arrays default to empty lists so new profiles can start with only required demographic fields.

## Features

- **Multi-Profile Support**: Separate, isolated tracking for humans and pets.
- **Smart Alerts**: Flags active medication refills and vaccination due dates as overdue or due soon. The admin view uses the shared 30-day due window, while the Bento Grid widget highlights urgent seven-day alerts.
- **Trend Tracking**: Shows weight trend bars from measurements and grouped lab result mini-trends by test name.
- **Document Management**: Centralized digital vault for medical paperwork linked directly to specific health events or profiles.
- **Timeline Insights**: Contextual dashboard showing the next follow-up, latest visit, and most recent lab results at a glance.
- **Bento Widget**: Dashboard summary component showing alert counts, active meds/conditions, and upcoming requirements.

## Components

### Main Views
- **AdminView.tsx**: The primary interface for managing all health profiles, featuring a searchable list and detailed tabbed view.
- **Widget.tsx**: A compact Bento-style dashboard component for quick status updates.

### Core Components
- **ProfileCard.tsx**: Visual summary card for a health profile in the main list.
- **AlertsBanner.tsx**: Contextual warning system for overdue items or critical health alerts.
- **HealthMetrics.tsx**: Quick-look statistics (Total profiles, Alert counts, etc.).
- **OverviewInsightsPanel.tsx**: Detailed snapshot showing the medical timeline and recent activities.
- **ProfileFormModal.tsx**: Comprehensive form for creating or editing health profiles, including image cropping for avatars.

### Tabbed Detail Views
- **OverviewTab.tsx**: Dashboard-style overview of a single profile with insights and summary grids.
- **MedicationsTab.tsx**: Management interface for current and historical medications.
- **VaccinationsTab.tsx**: Vaccination schedule and history log.
- **VisitsTab.tsx**: Searchable history of medical consultations and procedures.
- **LabResultsTab.tsx**: Clinical test result management with status highlighting.
- **BodyStatsTab.tsx**: Physical measurement tracking with weight trend visualization.
- **DocumentsTab.tsx**: Categorized medical document vault.

## API Example

Create a minimal profile through the shared Discriminator Pattern API:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "health_profile",
    is_public: false,
    payload: {
      name: "Avery",
      type: "family",
      relation: "Parent",
      blood_group: "unknown",
      allergies: [],
      conditions: [],
      medications: [
        {
          id: crypto.randomUUID(),
          name: "Vitamin D",
          dosage: "1000 IU",
          refill_date: "2026-06-01T00:00:00.000Z",
          status: "active",
        },
      ],
      vaccinations: [],
      visits: [],
      lab_results: [],
      measurements: [],
      documents: [],
      tags: ["annual-checkup"],
    },
  }),
});
```

## Implementation Details

- `AdminView.tsx` fetches, creates, updates, and deletes profiles through `/api/content`.
- `components/selectors.ts` owns profile filtering, attention counts, overview snapshots, lab grouping, and trend point derivation.
- `components/helpers.ts` owns date formatting, ISO date conversion, due status, initials, BMI, and empty payload generation.
- `Widget.tsx` follows the dashboard Widget Contract by fetching only the compact widget summary endpoint and rendering one hero metric plus one highlight.
- `info.md` is the concise module guidance surfaced in the admin shell.
