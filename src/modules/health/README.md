# Health Module

A centralized vault for medical history, prescriptions, vaccinations, and health tracking for family members and pets.

## Overview

The Health module provides a comprehensive way to manage health records for multiple profiles (self, family members, or pets). It tracks conditions, medications, vaccinations, doctor visits, lab results, and physical measurements.

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
- **Documents**: Attachment tracking for prescriptions, bills, lab reports, discharge summaries, and insurance papers.
- **Metadata**: Support for custom tags and general notes per profile.

## Features

- **Multi-Profile Support**: Separate, isolated tracking for humans and pets.
- **Smart Alerts**: Automatically identifies overdue vaccinations, upcoming medication refills, and abnormal lab results.
- **Trend Tracking**: Interactive visualization of physical measurements (weight trends) and lab result history.
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

## Implementation Details

- **Module ID**: `health`
- **Content Type**: `health_profile`
- **Icon**: `HeartPulse` (from Lucide React)
- **State Management**: Uses local state for filtering and active profile selection, with API-driven persistence.
