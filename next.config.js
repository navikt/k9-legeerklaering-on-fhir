/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    env: {
        FHIR_CLIENT_ID: process.env.FHIR_CLIENT_ID,
        FHIR_BASE_URL: process.env.FHIR_BASE_URL,
        FHIR_SUBSCRIPTION_KEY: process.env.FHIR_SUBSCRIPTION_KEY,
    },
    experimental: {
        typedRoutes: true,
        serverActions: true,
    },
}

module.exports = nextConfig
