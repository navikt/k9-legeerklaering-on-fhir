import { NextResponse } from 'next/server';
import { fhirclient } from 'fhirclient/lib/types';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { IPractitionerRole } from '@ahryman40k/ts-fhir-types/lib/R4';
import { validateOrThrow } from '@/integrations/fhir/fhirValidator';
import { fhirConfiguration } from '@/integrations/fhir/FhirConfiguration';
import Bundle = fhirclient.FHIR.Bundle;

export const GET = async (): Promise<NextResponse<IPractitionerRole>> => {
    console.log("Fetching current user")
    const {fhirbaseurl, fhirsubscriptionkey, authorization} = fhirConfiguration();

    const response = await fetch(`${fhirbaseurl}/PractitionerRole/$getCurrentUser`, {
        headers: {
            "Authorization": authorization,
            "dips-subscription-key": fhirsubscriptionkey
        }
    });

    const bundle: Bundle = await response.json();
    if (!bundle.entry || bundle.entry.length === 0) {
        throw new Error("No entries found in the bundle.");
    }

    const practitionerRole = validateOrThrow(R4.RTTI_PractitionerRole.decode(bundle.entry[0].resource));
    return NextResponse.json(practitionerRole)
}
