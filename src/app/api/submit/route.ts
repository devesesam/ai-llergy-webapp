import { NextRequest, NextResponse } from "next/server";
import type { AllergenSubmission } from "@/lib/allergens";

export async function POST(request: NextRequest) {
  try {
    const body: AllergenSubmission = await request.json();

    const { allergens, customAllergy } = body;

    // Validate input
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Log the submission (in production, this would go to a database or webhook)
    console.log("Allergen submission received:", {
      allergens,
      customAllergy,
      timestamp: new Date().toISOString(),
    });

    // TODO: In the future, this is where you would:
    // 1. Send to a webhook for processing
    // 2. Query a menu database to filter items
    // 3. Generate a custom menu PDF
    // 4. Store the submission for analytics

    return NextResponse.json({
      success: true,
      message: "Allergens received",
      data: {
        allergens,
        customAllergy,
      },
    });
  } catch (error) {
    console.error("Error processing allergen submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
