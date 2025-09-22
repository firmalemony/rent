import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await prisma.property.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Ensure DB user exists for foreign key before creating property
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: (session.user as any).email ?? null,
        name: (session.user as any).name ?? null,
      },
    });
    const body = await req.json();
    const created = await prisma.property.create({
      data: {
        userId: session.user.id,
        address: body.address,
        latitude: body.coords?.lat ?? null,
        longitude: body.coords?.lng ?? null,
        layout: body.params.layout,
        areaSqm: Number(body.params.areaSqm),
        balcony: Boolean(body.params.balcony),
        cellar: Boolean(body.params.cellar),
        garage: Boolean(body.params.garage),
        condition: body.params.condition || "",
        floor: body.params.floor === "" ? null : Number(body.params.floor),
        elevator: Boolean(body.params.elevator),
        furnished: Boolean(body.params.furnished),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


