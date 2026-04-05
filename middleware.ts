import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // In a real app, we'd check a secure cookie or JWT
    // For this POC, we check the localStorage values (which aren't accessible in middleware)
    // or a bypass cookie.
    
    // For now, let's just ensure the path is consistent with the role if provided in cookies
    const userRole = request.cookies.get('user-role')?.value;
    
    if (userRole) {
      if (userRole === 'worker' && !pathname.startsWith('/dashboard/user')) {
        return NextResponse.redirect(new URL('/dashboard/user', request.url));
      }
      if (userRole === 'zonal_admin' && !pathname.startsWith('/dashboard/zonal')) {
        return NextResponse.redirect(new URL('/dashboard/zonal', request.url));
      }
      if (userRole === 'control_admin' && !pathname.startsWith('/dashboard/control')) {
        return NextResponse.redirect(new URL('/dashboard/control', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
