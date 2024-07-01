const fhirAuthOptions = {
    clientId: `NAV_legeerklaering`,
    scope: `openid profile fhirUser launch patient/*.read`,
    redirectUri: `/`,
}

export default fhirAuthOptions