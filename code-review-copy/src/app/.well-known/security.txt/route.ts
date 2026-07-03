export async function GET() {
  const body = `Contact: mailto:kalyanofficial980@gmail.com
Preferred-Languages: en, te, hi
Policy: https://securemsme-ai-live.vercel.app/legal/responsible-disclosure
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
