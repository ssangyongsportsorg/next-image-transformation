const version = "0.0.3"

let allowedDomains = process?.env?.ALLOWED_REMOTE_DOMAINS?.split(",") || ["*.ssangyongsports.eu.org", "*.sysports.de"];
let imgproxyUrl = process?.env?.IMGPROXY_URL || "http://imgproxy:8080";
if (process.env.NODE_ENV === "development") {
    imgproxyUrl = "http://localhost:8888"
}
allowedDomains = allowedDomains.map(d => d.trim());

Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/") {
            return new Response(`<h3>這是雙龍體育圖片cdn和壓縮系統</h3><script>
window.location.href=
"https://ssangyongsports.eu.org/";
</script>`, {
                headers: {
                    "Content-Type": "text/html",
                },
            });
        }

        if (url.pathname === "/health") {
            return new Response("OK");
        };
        if (url.pathname.startsWith("/image/")) return await resize(url);
        return Response.redirect("https://ssangyongsports.eu.org", 302);
    }
});

async function resize(url) {
    const preset = "pr:sharp"
    const src = url.pathname.split("/").slice(2).join("/");
    const origin = new URL(src).hostname;
    const allowed = allowedDomains.filter(domain => {
        if (domain === "*") return true;
        if (domain === origin) return true;
        if (domain.startsWith("*.") && origin.endsWith(domain.split("*.").pop())) return true;
        return false;
    })
    if (allowed.length === 0) {
        return new Response(`不允許其他網站壓縮圖片及cdn加速：https://ssangyongsports.eu.org`, { status: 403 });
    }
    const width = url.searchParams.get("width") || 0;
    const height = url.searchParams.get("height") || 0;
    const quality = url.searchParams.get("quality") || 75;
    try {
        const url = `${imgproxyUrl}/${preset}/resize:fill:${width}:${height}/q:${quality}/plain/${src}`
        const image = await fetch(url, {
            headers: {
                "Accept": "image/avif,image/webp,image/apng,*/*",
            }
        })
        const headers = new Headers(image.headers);
        headers.set("Server", "NextImageTransformation");
        return new Response(image.body, {
            headers
        })
    } catch (e) {
        console.log(e)
        return new Response("Error resizing image")
    }
}
