import dns from "node:dns/promises";
import net from "node:net";
import { URL } from "node:url";

/**
 * 判斷 IPv4 是否為私有/保留位址
 */
function isPrivateIPv4(ip: string) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true;

    const [a, b] = parts;
    return (
        a === 10 ||                           // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
        (a === 192 && b === 168) ||           // 192.168.0.0/16
        a === 127 ||                          // 127.0.0.0/8
        (a === 169 && b === 254) ||           // 169.254.0.0/16
        a === 0 ||                            // 0.0.0.0/8
        (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 (CGNAT)
        (a === 192 && b === 0) ||             // 192.0.0.0/24
        (a === 192 && b === 0) ||             // 192.0.2.0/24
        (a === 198 && b === 51) ||            // 198.51.100.0/24
        (a === 203 && b === 0) ||             // 203.0.113.0/24
        a >= 224                              // 224.0.0.0/4 (Multicast) + 240.0.0.0/4
    );
};

/**
 * 判斷 IPv6 是否為私有/保留位址
 */
function isPrivateIPv6(ip: string) {
    const lower = ip.toLowerCase();
    return (
        lower === "::1" ||                   // loopback
        lower.startsWith("fc") ||            // fc00::/7
        lower.startsWith("fd") ||            // fc00::/7
        lower.startsWith("fe80") ||          // link-local
        lower.startsWith("::ffff:") && isPrivateIPv4(lower.replace("::ffff:", "")) // IPv4-mapped
    );
};

/**
 * 檢查 URL 是否安全（非私有 IP、非本地）
 */
export async function isSafeURL(urlString: string): Promise<boolean> {
    let url;
    try {
        url = new URL(urlString);
    } catch {
        return false;
    };

    // 只允許 http / https
    if (!["http:", "https:"].includes(url.protocol)) return false;

    // 主機名稱不能為空
    if (!url.hostname) return false;

    // 如果主機名稱是 IP，直接檢查
    if (net.isIP(url.hostname)) {
        const ip = url.hostname;
        if (net.isIPv4(ip)) return !isPrivateIPv4(ip);
        if (net.isIPv6(ip)) return !isPrivateIPv6(ip);
        return false;
    };

    // 解析 DNS，檢查所有回傳的 IP
    try {
        const addresses = await dns.lookup(url.hostname, { all: true });
        for (const { address, family } of addresses) {
            if (family === 4 && isPrivateIPv4(address)) return false;
            if (family === 6 && isPrivateIPv6(address)) return false;
        };
    } catch {
        return false; // DNS 解析失敗
    };

    return true;
};
