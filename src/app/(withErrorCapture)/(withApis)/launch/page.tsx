'use client'

import {oauth2 as SMART} from 'fhirclient';
import {useEffect} from "react";
import fhirAuthOptions from "@/auth/fhir/fhirAuthOptions";

export const dynamic = 'force-dynamic'

export default function Launch() {
    sessionStorage.clear();

    useEffect(() => {
        SMART.authorize(fhirAuthOptions).catch(err => {
            throw new Error("Autorisering av SMART klienten feilet", err)
        })
    });

    return <>
        <h1>SMART on FHIR launch</h1>
        <p>Du blir videresendt automatisk</p>
    </>
}
