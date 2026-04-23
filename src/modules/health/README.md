# Health Module

A centralized vault for medical history, prescriptions, vaccinations, and health tracking for family members and pets.

## Overview

The Health module provides a comprehensive way to manage health records for multiple profiles (self, family members, or pets). It tracks conditions, medications, vaccinations, doctor visits, lab results, and physical measurements.

## Data Schema (HealthProfile)

The module uses the `HealthProfileSchema` (defined in `src/lib/schemas.ts`):

- **Basic Info**: Name, type (`self`, `family`, `pet`), relation, date of birth, blood group, gender, and emergency contact.
- **Allergies**: A simple list of strings.
- **Conditions**: Array of objects tracking name, diagnosed date, status (`active`, `managed`, `resolved`), and notes.
- **Medications**: Tracks dosage, prescriber, start/end dates, refill dates, and status (`active`, `completed`, `discontinued`).
- **Vaccinations**: Logs administration date, next due date, provider, and batch number.
- **Visits**: Tracks doctor visits by type (`checkup`, `emergency`, `dental`, etc.), facility, diagnosis, cost, and currency.
- **Lab Results**: Logs test name, value, unit, reference range, and status (`normal`, `borderline`, `abnormal`).
- **Measurements**: Physical tracking of height (cm) and weight (kg) over time.
- **Documents**: Attachment tracking for prescriptions, bills, lab reports, and more.

## Features

- **Multi-Profile Support**: Separate tracking for humans and pets.
- **Smart Alerts**: Automatically identifies overdue vaccinations and medication refills.
- **Trend Tracking**: Monitor physical measurements and lab results over time.
- **Document Management**: Keep digital copies of medical paperwork linked to profiles.
- **Bento Widget**: Quick summary of active meds, conditions, and upcoming vaccination requirements.

## Components

- **AdminView.tsx**: The main interface for managing health profiles.
- **Widget.tsx**: A dashboard summary component showing alerts and high-level stats.
- **components/**:
  - `OverviewTab.tsx`: Profile summary and quick insights.
  - `MedicationsTab.tsx`: Active and past medication management.
  - `VaccinationsTab.tsx`: Vaccination history and booster scheduling.
  - `LabResultsTab.tsx`: Clinical test results with status indicators.
  - `BodyStatsTab.tsx`: Height/Weight tracking and BMI calculation.
  - `DocumentsTab.tsx`: Medical document vault.

## Implementation Details

- **Module ID**: `health`
- **Content Type**: `health_profile`
- **Icon**: `HeartPulse` (from Lucide React)
