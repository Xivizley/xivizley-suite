import type { FastifyPluginAsync } from "fastify";

export interface ClusterNodeInfo {
  id: string;
  name: string;
  ip: string;
  role: "production" | "staging" | "edge";
  location: string;
  networkSpec: string;
  latencyMs: number;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  activeContainers: number;
  cpuUsage: string;
  memoryUsage: string;
  webUrl: string;
  isCurrent: boolean;
}

export const clusterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/cluster/nodes", async (request, reply) => {
    const reqHost = request.headers.host || "";
    const isProd = reqHost.includes("xivizley.com.tr");
    const isTestVds = reqHost.includes("109.104.120.126");

    const nodes: ClusterNodeInfo[] = [
      {
        id: "node-prod-bursa",
        name: "Bursa PenDC Tier-3 VDS",
        ip: "178.210.168.163",
        role: "production",
        location: "Bursa PenDC Veri Merkezi (TR)",
        networkSpec: "10 Gbps NVMe Omurga",
        latencyMs: 14,
        status: "ONLINE",
        activeContainers: 12,
        cpuUsage: "4.2%",
        memoryUsage: "4.8 GB / 16 GB",
        webUrl: "https://suite.xivizley.com.tr",
        isCurrent: isProd,
      },
      {
        id: "node-staging-vds",
        name: "Geliştirme & Test VDS",
        ip: "109.104.120.126",
        role: "staging",
        location: "Bulut Test Kümesi (TR)",
        networkSpec: "1 Gbps Standart Hat",
        latencyMs: 21,
        status: "ONLINE",
        activeContainers: 6,
        cpuUsage: "2.1%",
        memoryUsage: "1.9 GB / 4 GB",
        webUrl: "http://109.104.120.126:3000",
        isCurrent: isTestVds,
      },
      {
        id: "node-local-edge",
        name: "Yerel Homelab Düğümü",
        ip: "127.0.0.1",
        role: "edge",
        location: "Yerel Cihaz / Edge",
        networkSpec: "Loopback Yerel Ağ",
        latencyMs: 1,
        status: "ONLINE",
        activeContainers: 4,
        cpuUsage: "1.5%",
        memoryUsage: "1.2 GB / 8 GB",
        webUrl: "http://localhost:3000",
        isCurrent: !isProd && !isTestVds,
      },
    ];

    return reply.send({ ok: true, data: nodes });
  });
};
