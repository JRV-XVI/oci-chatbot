import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define las rutas que NO requieren autenticación
const publicRoutes = ['/login', '/signup'];

function handleProxy(request: NextRequest) {
  // 1. Obtener el token de las cookies
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.includes(currentPath);

  // 2. Si NO hay token y la ruta NO es pública -> Redirigir a /login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Si SÍ hay token y trata de entrar a /login o /signup -> Redirigir al inicio (/)
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si todo está correcto, dejar que la petición continúe
  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  return handleProxy(request);
}

export default proxy;

// Configurar en qué rutas se debe ejecutar este middleware
export const config = {
  matcher: [
    /*
     * Ignorar todas las rutas internas de Next.js y archivos estáticos:
     * - api (rutas de API de Next.js)
     * - _next (internals de Next en dev/prod)
     * - cualquier archivo estático con extensión (.jpg, .png, .svg, .css, .js, etc.)
     */
    '/((?!api|_next|.*\\..*).*)',
  ],
};