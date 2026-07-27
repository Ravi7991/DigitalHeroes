import { NextRequest, NextResponse } from 'next/server';

async function handleProxy(req: NextRequest) {
  const rawBackendUrl = process.env.BACKEND_API_URL || 'http://localhost:5000';
  const backendBaseUrl = rawBackendUrl.replace(/\/$/, '');
  const pathname = req.nextUrl.pathname;
  const targetPath = pathname.replace(/^\/api/, '');
  const search = req.nextUrl.search;
  
  const targetUrl = `${backendBaseUrl}${targetPath}${search}`;

  const headers = new Headers();
  
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  let body: string | undefined = undefined;
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    body = await req.text();
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const dataText = await res.text();
    const resHeaders = new Headers();
    
    const resContentType = res.headers.get('content-type');
    if (resContentType) resHeaders.set('content-type', resContentType);

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) resHeaders.set('set-cookie', setCookie);

    return new NextResponse(dataText, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Backend service unavailable. Please check that the backend is running.' },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const PUT = handleProxy;
export const OPTIONS = handleProxy;
