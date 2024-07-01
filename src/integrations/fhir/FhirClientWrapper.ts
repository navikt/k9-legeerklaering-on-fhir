import Practitioner, {PartialPractitioner} from "@/models/Practitioner";
import {R4} from "@ahryman40k/ts-fhir-types";
import {validateOrThrow} from "@/integrations/fhir/fhirValidator";
import {
    dateTimeResolver,
    dnrFromIdentifiers,
    fnrFromIdentifiers,
    iPractitionerRoleFromListing,
    iResourceListFromArray,
    officialHumanNameResolver,
    organizationNumberFromIdentifiers,
    phoneContactResolver,
    postalAddressResolver,
    resolvePractitionerFromIPractitioner,
    resolvePractitionerFromIPractitionerRole,
} from "@/integrations/fhir/resolvers";
import Patient from "@/models/Patient";
import Client from "fhirclient/lib/Client";
import {FhirApi} from "@/integrations/fhir/FhirApi";
import Hospital from "@/models/Hospital";
import IncompletePractitioner from "@/models/errors/IncompletePractitioner";
import InitData from "@/models/InitData";
import {DocumentReferenceStatusKind, IBinary, IDocumentReference} from '@ahryman40k/ts-fhir-types/lib/R4';
import {createAndValidateDocumentReferencePayload} from '@/integrations/fhir/utils/payloads';
import {LegeerklaeringDokumentReferanse} from "@/models/LegeerklaeringDokumentReferanse";
import {base64ToBlob, blobToBase64} from "@/utils/base64";
import {DipsDepartmentReference} from "@/models/DipsDepartmentReference";


export default class FhirClientWrapper implements FhirApi {
    private readonly client: Client;

    public constructor(client: Client) {
        this.client = client;
    }

    public async getHospital(organizationReference: string): Promise<Hospital> {
        const org = validateOrThrow(R4.RTTI_Organization.decode(await this.client.request(organizationReference)))
        const {id, name} = org
        if (id === undefined || id.length === 0 || name === undefined || name.length === 0) {
            throw new Error(`organization (hospital) with reference ${organizationReference} is missing required props (id and/or name)`)
        }
        const organizationNumber = organizationNumberFromIdentifiers(org.identifier || [])
        const address = postalAddressResolver(org.address)
        const phoneNumber = phoneContactResolver(org.telecom)
        return {
            ehrId: id,
            organizationNumber,
            name,
            phoneNumber,
            address,
        }
    }

    /**
     * TODO
     *
     * Varierende implementasjoner av SMART on FHIR har gjort til at data vi trenger ikke alltid
     * er tilgjengelig. Ved å følge implementasjonsguide --> https://docs.smarthealthit.org/client-js/
     * ser man at {client.getUserId()} og/eller {client.getFhirUser()} skal returnere ID på innlogget
     * bruker.
     *
     * Vi følger dokumentasjonen og forventer at bruker skal være satt, derfor vil dette ikke fungere
     * for enkelte EPJ-leverandører.
     *
     * DIPS and WebMed are separated as an illustration of complexity
     */
    protected async getWebMedPractitioner(): Promise<Practitioner & {
        readonly organizationReference: string | undefined
    }> {
        // this.client.getUserId() || this.client.getFhirUser() --> skal inneholde data
        // this.client.state.tokenResponse?.["practitioner"] --> eneste som fungerer, men følger en dårlig standard

        const userId = await this.client.state.tokenResponse?.["practitioner"]

        let iPractitioner

        if (userId) {
            console.info(`[DEBUG] requesting practitioner from request(Patient/${userId})`)
            iPractitioner = await this.client.request<Practitioner>(`Patient/${userId}`)
        } else {
            console.info("[DEBUG] setting practitioner from client.user.read")
            iPractitioner = await this.client.user.read<Practitioner>()
        }

        if (R4.RTTI_Practitioner.is(iPractitioner)) {
            const practitioner = resolvePractitionerFromIPractitioner(iPractitioner)
            console.info("[DEBUG] practitioner", JSON.stringify(practitioner))

            if (practitioner.ehrId !== undefined && practitioner.name !== undefined) {
                return {
                    ehrId: practitioner.ehrId,
                    name: practitioner.name,
                    activeSystemUser: practitioner.activeSystemUser,
                    // TODO Resolve these:
                    organizationReference: undefined,
                    hprNumber: undefined,
                    practitionerRoleId: undefined,
                    departmentReference: undefined,
                }
            }
            console.warn("[DEBUG] practitioner.ehrId and practitioner.name is undefined", JSON.stringify(practitioner))
        } else {
            console.warn("[DEBUG] client.user.read() is not R4.RTTI_Practitioner", JSON.stringify(iPractitioner))
        }

        throw new Error(`Could not get practitioner via client.request, or via client.user.read`)
    }

    /**
     * TODO
     *
     * For DIPS, accessing the client.user.read or similar did not work, have to request the "PractitionerRole" like we do below instead.
     * This seems to contain the Practitioner info we in the smart api demo would get back from client.user.read.
     * I suspect this is a non-standard API call. Will perhaps need to make this more dynamic to adapt to other EHR systems.
     * E.g. perhaps first check if client.user.id is set, and try using the standard client.user.read call if so. If the standard
     * way is not available, go on to try this method. A potential problem with just using client.user.read, though, is that maybe
     * the info about what organization (hospital) the practitioner is working for might not be available then.
     *
     * We use the flat option to directly get a ResourceList back instead of a Bundle wrapper object. Believe this is generally
     * a good option to use, based on explanation at https://docs.smarthealthit.org/client-js/client.html
     *
     * DIPS and WebMed are separated as an illustration of complexity
     */
    public async getDipsPractitioner(): Promise<Practitioner & { readonly organizationReference: string | undefined }> {
        console.info("Attempting to get practitioner via PractitionerRole")

        const resourceList = iResourceListFromArray(await this.client.request<unknown[]>("PractitionerRole/$getCurrentUser", {flat: true}))
        const iPractitionerRole = iPractitionerRoleFromListing(resourceList)

        if (iPractitionerRole === undefined) {
            throw new Error("No PractitionerRole found in the $getCurrentUser bundle")
        }

        const practitionerFromRole = resolvePractitionerFromIPractitionerRole(iPractitionerRole)
        // If the practitioner info resolved from practitioner role is complete, return it

        if (
            practitionerFromRole.ehrId !== undefined &&
            practitionerFromRole.hprNumber !== undefined &&
            practitionerFromRole.name !== undefined
        ) {
            return {
                ehrId: practitionerFromRole.ehrId,
                hprNumber: practitionerFromRole.hprNumber,
                name: practitionerFromRole.name,
                practitionerRoleId: iPractitionerRole.id,
                activeSystemUser: practitionerFromRole.activeSystemUser === undefined ? true : practitionerFromRole.activeSystemUser,
                organizationReference: iPractitionerRole.organization?.reference,
                departmentReference: practitionerFromRole.departmentReference,
            }
        }

        // Practitioner role did not have complete info, try getting it from Practitioner endpoint
        if (iPractitionerRole?.practitioner?.reference === undefined) {
            throw new Error(`No practitioner reference in PractitionerRole from $getCurrentUser`)
        }

        const iPractitioner = validateOrThrow(R4.RTTI_Practitioner.decode(await this.client.request(iPractitionerRole.practitioner.reference)))
        const partialPractitioner = resolvePractitionerFromIPractitioner(iPractitioner)
        const mergedPractitioner: PartialPractitioner = {
            ...practitionerFromRole,
            ...partialPractitioner,
        }

        if (
            mergedPractitioner.ehrId !== undefined &&
            mergedPractitioner.hprNumber !== undefined &&
            mergedPractitioner.name !== undefined
        ) {
            return {
                ehrId: mergedPractitioner.ehrId,
                hprNumber: mergedPractitioner.hprNumber,
                practitionerRoleId: iPractitionerRole.id,
                name: mergedPractitioner.name,
                activeSystemUser: mergedPractitioner.activeSystemUser,
                organizationReference: iPractitionerRole.organization?.reference,
                departmentReference: mergedPractitioner.departmentReference,
            }
        } else {
            throw new IncompletePractitioner(mergedPractitioner)
        }
    }

    public async getPractitioner(): Promise<Practitioner & { readonly organizationReference: string | undefined }> {
        try {
            return this.getWebMedPractitioner()
        } catch (err) {
            console.error(err)
        }
        return this.getDipsPractitioner()
    }

    public async createDocument(patientEhrId: string, practitionerRoleId: string, custodianReference: DipsDepartmentReference, description: LegeerklaeringDokumentReferanse, pdf: Blob): Promise<string> {
        const pdfAsBase64 = await blobToBase64(pdf);
        const documentReference = createAndValidateDocumentReferencePayload(
            patientEhrId,
            practitionerRoleId,
            custodianReference,
            DocumentReferenceStatusKind._current,
            description,
            [
                {
                    "attachment": {
                        "contentType": "application/pdf",
                        "data": pdfAsBase64,
                    }
                }
            ]
        )

        const created = await this.client.request<IDocumentReference>(
            {
                url: "DocumentReference",
                method: "POST",
                body: JSON.stringify(documentReference),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        if (created.id === undefined) {
            throw new Error(`Document was created, but returned without id.`)
        }
        return created.id
    }

    public async getDocumentPdf(documentId: string): Promise<Blob> {
        const url = new URL(`Binary/${documentId}`, this.client.state.serverUrl);
        const binary = validateOrThrow(R4.RTTI_Binary.decode(await this.client.request<IBinary>({
            url,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })))
        if (binary.contentType === "application/pdf") {
            if (binary.data !== undefined) {
                return await base64ToBlob(binary.data, binary.contentType)
            } else {
                throw new Error(`binary document ${documentId}: data undefined`)
            }
        } else {
            throw new Error(`binary document ${documentId}: contentType not pdf (${binary.contentType})`)
        }
    }

    public async getPatient(): Promise<Patient> {
        const patient = validateOrThrow(R4.RTTI_Patient.decode(await this.client.patient.read<Patient>()));
        const name = officialHumanNameResolver(patient.name)
        const ehrId = patient.id
        const fnr = patient.identifier instanceof Array && (fnrFromIdentifiers(patient.identifier) || dnrFromIdentifiers(patient.identifier)) || null
        const birthDate = dateTimeResolver(patient.birthDate)

        if (ehrId !== undefined && name !== undefined) {
            return {
                name,
                ehrId,
                fnr,
                birthDate,
            }
        } else {
            throw new Error(`Patient returned from EHR system missing id and/or name (id: ${ehrId})`);
        }
    }

    public async getInitState(): Promise<InitData> {
        const practitioner = await this.getPractitioner()
        const patientPromise = this.getPatient()
        const hospital = practitioner.organizationReference !== undefined ? await this.getHospital(practitioner.organizationReference) : undefined;
        return {
            patient: await patientPromise,
            practitioner,
            hospital,
        }
    }
}
