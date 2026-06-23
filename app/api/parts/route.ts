import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("flodraulic");
    const collection = db.collection("parts");

    const filter: Record<string, unknown> = {};
    if (query) {
      filter.$or = [
        { partNumber: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { manufacturerPartNumber: { $regex: query, $options: "i" } },
        { supplier: { $regex: query, $options: "i" } },
      ];
    }
    if (category) {
      filter.category = category;
    }

    const [parts, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({ parts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Parts API error:", error);
    return NextResponse.json({ error: "Failed to fetch parts" }, { status: 500 });
  }
}
