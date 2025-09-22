import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe<any>("SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", result });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: String(error?.message || error) }, { status: 500 });
  }
}





