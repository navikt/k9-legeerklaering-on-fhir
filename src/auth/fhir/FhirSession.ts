import * as jose from 'jose';
import { FhirAuthError } from "@/auth/fhir/FhirAuthError";
import { JwtVerificationInput } from "@/auth/fhir/JwtVerificationInput";
import { isIssuer, Issuer } from "@/auth/fhir/Issuer";
import { HprNumber, isHprNumber } from "@/models/HprNumber";
import { FhirSessionIssuers } from "@/auth/fhir/FhirSessionIssuers";
import fhirAuthOptions from "@/auth/fhir/fhirAuthOptions";

export class FhirSession {
    /**
     * This constructor should only be directly called by "fromVerifiedJWT" or to create session objects in testing.
     * @param issuer
     * @param hprNumber
     */
    constructor(
        public readonly issuer: Issuer,
        public readonly hprNumber: HprNumber,
    ) {
    }

    static async fromVerifiedJWT(verificationInput: JwtVerificationInput): Promise<FhirSession> {
        const options: jose.JWTVerifyOptions = {
            issuer: FhirSessionIssuers.all,             // Verify that issuer is one of the valid ones.
            algorithms: ['RS256', 'edDSA', 'ES256'],    // Verify that approved algorithm is used.
        }
        const expectedClientId = fhirAuthOptions.clientId
        try {
            const { payload, protectedHeader } = await jose.jwtVerify(verificationInput.jwt, verificationInput.getKey, options)
            // To verify that the received JWT is issued for our app, and not some other, we verify that the client_id
            // matches expected value. (The aud claim from opendips does not seem to hold any valuable info about this.)
            const clientId = payload['client_id']
            if(clientId === expectedClientId) {
                if(isIssuer(payload.iss)) {
                    // hpr-nummer claim is probably DIPS specific. Maybe not neccessary to have either, or solvable in some other way if needed.
                    const hprNummer = payload['hpr-nummer']
                    if(hprNummer === undefined) {
                        throw new FhirAuthError(`No hpr-nummer claim found in JWT`)
                    }
                    if(isHprNumber(hprNummer)) {
                        return new FhirSession(payload.iss, hprNummer)
                    } else {
                        throw new FhirAuthError(`Invalid hpr-nummer claim in JWT`)
                    }
                } else {
                    throw new FhirAuthError(`jwt iss ("${payload.iss}") has invalid format`)
                }
            } else {
                throw new FhirAuthError(`jwt client_id ("${clientId}") does not equal "${expectedClientId}"`)
            }
        } catch (err) {
            if(err instanceof jose.errors.JOSEError) {
                throw new FhirAuthError(`JWT verification failure (${err.code}): ${err.message}`, {cause: err})
            } else {
                throw err;
            }
        }
    }
}
