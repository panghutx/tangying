import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req: any) => {
  if (!req.auth) {
    const url = new URL("/login", req.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
}
