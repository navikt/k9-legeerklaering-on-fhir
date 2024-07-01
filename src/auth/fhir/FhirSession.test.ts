/**
 * @jest-environment node
 */

import * as jose from 'jose'
import { JWTPayload, SignJWT } from 'jose'
import { JwtVerificationInput } from "@/auth/fhir/JwtVerificationInput";
import { FhirSession } from "@/auth/fhir/FhirSession";
import { FhirAuthError } from "@/auth/fhir/FhirAuthError";
import { FhirSessionIssuers } from "@/auth/fhir/FhirSessionIssuers";
import fhirAuthOptions from "@/auth/fhir/fhirAuthOptions";

const prepareFakeValidVerificationInput = async (clientId?: string) => {
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256')
    const issuer = FhirSessionIssuers.OPENDIPS_TEST
    const hprNumber = "111222"
    const configuredClientId = clientId || fhirAuthOptions.clientId
    const fakeValidPayload: JWTPayload = {
        aud: "legeerklæring test",
        sub: "test1",
        'hpr-nummer': hprNumber,
        'client_id': configuredClientId,
    }
    const signer = new SignJWT(fakeValidPayload)
    signer.setIssuer(issuer)
    signer.setProtectedHeader({alg: 'RS256'})
    const jwt = await signer.sign(privateKey)
    return {
        fakeVerificationInput: new JwtVerificationInput(jwt, () => publicKey),
        issuer,
        hprNumber,
    }
}

describe("FhirSession", () => {
    test("valid auth token init", async () => {
        const {fakeVerificationInput, issuer, hprNumber} = await prepareFakeValidVerificationInput()

        const session = await FhirSession.fromVerifiedJWT(fakeVerificationInput)
        expect(session.issuer).toEqual(issuer)
        expect(session.hprNumber).toEqual(hprNumber)
    })

    test("with changed hpr-nummer claim the verification should fail", async () => {
        const { fakeVerificationInput, issuer, hprNumber } = await prepareFakeValidVerificationInput()
        // This is the encoded payload with hpr-nummer set to 666 instead of 111222
        const modifiedEncodedPayload = "eyJhdWQiOiJsZWdlZXJrbMOmcmluZyB0ZXN0Iiwic3ViIjoidGVzdDEiLCJocHItbnVtbWVyIjoiNjY2IiwiaXNzIjoiaHR0cHM6Ly9hcGkuZGlwcy5uby9kaXBzLm9hdXRoIn0"
        // Created a jwt token where the claims part has been modified after it was signed
        const [header, _, signature] = fakeVerificationInput.jwt.split(".")
        const jwtTampered = `${header}.${modifiedEncodedPayload}.${signature}`

        const sessionPromise = FhirSession.fromVerifiedJWT( new JwtVerificationInput(jwtTampered, fakeVerificationInput.getKey))
        await expect(sessionPromise).rejects.toThrow(FhirAuthError)
        await expect(sessionPromise).rejects.toThrow('JWT verification failure (ERR_JWS_SIGNATURE_VERIFICATION_FAILED): signature verification failed')
    })

    test("with changed client_id claim the verification should fail", async () => {
        const { fakeVerificationInput, issuer, hprNumber } = await prepareFakeValidVerificationInput()
        // This is the encoded payload with client_id set to 'Some_other_app' instead of configuredClientId
        const modifiedEncodedPayload = "eyJhdWQiOiJsZWdlZXJrbMOmcmluZyB0ZXN0Iiwic3ViIjoidGVzdDEiLCJocHItbnVtbWVyIjoiMTExMjIyIiwiaXNzIjoiaHR0cHM6Ly9hcGkuZGlwcy5uby9kaXBzLm9hdXRoIiwiY2xpZW50X2lkIjoiU29tZV9vdGhlcl9hcHAifQ"
        // Created a jwt token where the claims part has been modified after it was signed
        const [header, _, signature] = fakeVerificationInput.jwt.split(".")
        const jwtTampered = `${header}.${modifiedEncodedPayload}.${signature}`

        const sessionPromise = FhirSession.fromVerifiedJWT( new JwtVerificationInput(jwtTampered, fakeVerificationInput.getKey))
        await expect(sessionPromise).rejects.toThrow(FhirAuthError)
        await expect(sessionPromise).rejects.toThrow('JWT verification failure (ERR_JWS_SIGNATURE_VERIFICATION_FAILED): signature verification failed')
    })

    test("with wrong client_id claim the verification should fail", async () => {
        const otherClientId = "Some_other_app"
        const { fakeVerificationInput, issuer, hprNumber } = await prepareFakeValidVerificationInput(otherClientId)

        const sessionPromise = FhirSession.fromVerifiedJWT(fakeVerificationInput)
        expect(sessionPromise).rejects.toThrow(FhirAuthError)
    })

    test("with key mismatch verification should fail", async () => {
        const {  fakeVerificationInput: fakeVerificationInput1 } = await prepareFakeValidVerificationInput()
        const { fakeVerificationInput: fakeVerificationInput2 } = await prepareFakeValidVerificationInput()
        const mismatchingVerificationInput = new JwtVerificationInput(fakeVerificationInput1.jwt, fakeVerificationInput2.getKey)
        const sessionPromise = FhirSession.fromVerifiedJWT(mismatchingVerificationInput)
        await expect(sessionPromise).rejects.toThrow(FhirAuthError)
    })
})