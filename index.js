const version = "0.0.3"

let allowedDomains = process?.env?.ALLOWED_REMOTE_DOMAINS?.split(",") || ["*"];
let imgproxyUrl = process?.env?.IMGPROXY_URL || "http://imgproxy:8080";
if (process.env.NODE_ENV === "development") {
    imgproxyUrl = "http://localhost:8888"
}
allowedDomains = allowedDomains.map(d => d.trim());

// URL 轉換函數
function transformUrl(originalUrl) {
    // ImageKit URL 轉換: https://ik.imagekit.io/sysport/xx -> cdn.sysports.de/blog/xx
    if (originalUrl.startsWith('https://ik.imagekit.io/sysport/')) {
        const path = originalUrl.replace('https://ik.imagekit.io/sysport/', '');
        return `https://cdn.sysports.de/blog/${path}`;
    }
    
    // S3 URL 轉換: https://ny-1s.enzonix.com/bucket-1286-1793/xx -> cdn.sysports.de/sy/xx
    if (originalUrl.startsWith('https://ny-1s.enzonix.com/bucket-1286-1793/')) {
        const path = originalUrl.replace('https://ny-1s.enzonix.com/bucket-1286-1793/', '');
        return `https://cdn.sysports.de/sy/${path}`;
    }
    
    // 如果不匹配任何規則，返回原始 URL
    return originalUrl;
}

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
    
    // 應用 URL 轉換
    const transformedSrc = transformUrl(src);
    
    const origin = new URL(transformedSrc).hostname;
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
        const proxyUrl = `${imgproxyUrl}/${preset}/resize:fill:${width}:${height}/q:${quality}/plain/${transformedSrc}`
        const image = await fetch(proxyUrl, {
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
