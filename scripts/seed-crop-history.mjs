#!/usr/bin/env node
/**
 * Seed script for Crop History module.
 * Seeds coffee crop settings + historical data from the user's spreadsheet.
 * Run: node scripts/seed-crop-history.mjs
 */
import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
for (const line of envFile.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
}

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function main() {
    await client.connect();
    const db = client.db("lifeos");

    // 1. Seed settings
    const cropSettings = {
        sources: [
            { id: "old_home", name: "Old Home" },
            { id: "balehalli_thota", name: "Balehalli Thota" },
            { id: "raki_mane", name: "Raki Mane" },
        ],
        crops: [
            {
                id: "coffee",
                name: "Coffee",
                scheduleType: "yearly",
                sourceFields: [
                    { id: "undried", name: "Undried", type: "number", unit: "kg" },
                    { id: "ot", name: "OT", type: "number", unit: "%" },
                ],
                summaryFields: [
                    { id: "avg_price", name: "Avg Price", type: "number", unit: "₹/50kg bag" },
                ],
                constants: [
                    { id: "UNDRIED_TO_BAG_CONVERT", name: "UNDRIED_TO_BAG_CONVERT", value: 120 },
                ],
                calculatedFields: [
                    { id: "total_weight", name: "Total Weight", formula: "SUM(undried)", format: "number", unit: "kg" },
                    { id: "avg_ot", name: "Average OT", formula: "WEIGHTED_AVG(ot, undried)", format: "percentage" },
                    { id: "approx_bags", name: "Approx Bags", formula: "ROUND(SUM(undried) / UNDRIED_TO_BAG_CONVERT, 1)", format: "number" },
                    { id: "approx_income", name: "Approx Income", formula: "approx_bags * avg_price", format: "currency" },
                ],
                analyticsConfig: { yieldFieldId: "undried", revenueFieldId: "approx_income" },
            },
        ],
    };

    console.log("Setting crop history settings...");
    await db.collection("system").updateOne(
        { _id: "global" },
        { $set: { cropHistorySettings: cropSettings } }
    );
    console.log("Settings saved.");

    // 2. Seed historical records from user's spreadsheet
    // Data from the user's coffee spreadsheet:
    // Areas: Old Home, Balehalli Thota, Raki Mane
    // Periods: 2021-22, 2022-23, 2023-24, 2024-25
    const records = [
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2023-04-01"),
            payload: {
                crop_id: "coffee",
                schedule_period: "2022-23",
                source_data: {
                    old_home: { undried: 6870, ot: 26 },
                    balehalli_thota: { undried: 5403, ot: 26 },
                    raki_mane: { undried: 6819, ot: 26 },
                },
                summary_data: { avg_price: 3800 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2024-04-01"),
            payload: {
                crop_id: "coffee",
                schedule_period: "2023-24",
                source_data: {
                    old_home: { undried: 4252, ot: 26 },
                    balehalli_thota: { undried: 7680, ot: 26 },
                    raki_mane: { undried: 4692, ot: 26 },
                },
                summary_data: { avg_price: 7800 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2025-04-01"),
            payload: {
                crop_id: "coffee",
                schedule_period: "2024-25",
                source_data: {
                    old_home: { undried: 11500, ot: 26.8 },
                    balehalli_thota: { undried: 8400, ot: 26.8 },
                    raki_mane: { undried: 12500, ot: 26.8 },
                },
                summary_data: { avg_price: 12500 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2026-04-01"),
            payload: {
                crop_id: "coffee",
                schedule_period: "2025-26",
                source_data: {
                    old_home: { undried: 5432, ot: 26.8 },
                    balehalli_thota: { undried: 6313, ot: 26.8 },
                    raki_mane: { undried: 5350, ot: 26.8 },
                },
                summary_data: { avg_price: 10000 },
                notes: "",
            },
        },
    ];

    // 3. Seed Pepper crop config into settings
    cropSettings.crops.push({
        id: "pepper",
        name: "Pepper",
        scheduleType: "yearly",
        sourceFields: [
            { id: "weight", name: "Weight", type: "number", unit: "kg" },
        ],
        summaryFields: [
            { id: "avg_price", name: "Avg Price", type: "number", unit: "₹/kg" },
        ],
        constants: [],
        calculatedFields: [
            { id: "total_weight", name: "Total Weight", formula: "SUM(weight)", format: "number", unit: "kg" },
            { id: "total_amount", name: "Total Amount", formula: "total_weight * avg_price", format: "currency" },
        ],
        analyticsConfig: { yieldFieldId: "weight", revenueFieldId: "total_amount" },
    });

    // Re-save settings with pepper added
    console.log("Updating settings with Pepper crop...");
    await db.collection("system").updateOne(
        { _id: "global" },
        { $set: { cropHistorySettings: cropSettings } }
    );

    // 4. Seed Pepper records
    const pepperRecords = [
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2022-04-01"),
            payload: {
                crop_id: "pepper",
                schedule_period: "2021-22",
                source_data: {
                    old_home: { weight: 2098 },
                    balehalli_thota: { weight: 1703 },
                    raki_mane: { weight: 1509 },
                },
                summary_data: { avg_price: 49 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2023-04-01"),
            payload: {
                crop_id: "pepper",
                schedule_period: "2022-23",
                source_data: {
                    old_home: { weight: 2013 },
                    balehalli_thota: { weight: 1818 },
                    raki_mane: { weight: 1214 },
                },
                summary_data: { avg_price: 49 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2024-04-01"),
            payload: {
                crop_id: "pepper",
                schedule_period: "2023-24",
                source_data: {
                    old_home: { weight: 2200 },
                    balehalli_thota: { weight: 1653 },
                    raki_mane: { weight: 1491 },
                },
                summary_data: { avg_price: 54 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2025-04-01"),
            payload: {
                crop_id: "pepper",
                schedule_period: "2024-25",
                source_data: {
                    old_home: { weight: 2803 },
                    balehalli_thota: { weight: 3270 },
                    raki_mane: { weight: 793 },
                },
                summary_data: { avg_price: 53.5 },
                notes: "",
            },
        },
        {
            module_type: "crop_history",
            is_public: false,
            created_at: new Date("2026-04-01"),
            payload: {
                crop_id: "pepper",
                schedule_period: "2025-26",
                source_data: {
                    old_home: { weight: 380 },
                    balehalli_thota: { weight: 525 },
                    raki_mane: { weight: 170 },
                },
                summary_data: { avg_price: 61 },
                notes: "",
            },
        },
    ];

    records.push(...pepperRecords);

    // Clear existing crop_history records first
    const deleted = await db.collection("content").deleteMany({ module_type: "crop_history" });
    console.log(`Cleared ${deleted.deletedCount} existing crop_history records.`);

    const result = await db.collection("content").insertMany(records);
    console.log(`Inserted ${result.insertedCount} crop history records.`);

    console.log("\nDone! Coffee crop data seeded successfully.");
    console.log("Periods: 2022-23, 2023-24, 2024-25, 2025-26");
    console.log("Areas: Old Home, Balehalli Thota, Raki Mane");
}

main().catch(console.error).finally(() => client.close());
