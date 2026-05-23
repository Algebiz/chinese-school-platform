import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const { name, email, password, phone } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered", code: "EMAIL_EXISTS" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { phone: phone ?? null },
      })
      await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          familyId: family.id,
        },
      })
    })

    // Send welcome email (non-fatal — registration already succeeded)
    try {
      console.log('Sending welcome email to:', email)
      await sendWelcomeEmail(email, name)
      console.log('Welcome email sent successfully to:', email)
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr)
    }

    return NextResponse.json({ success: true, data: { message: "Registration successful" } })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
