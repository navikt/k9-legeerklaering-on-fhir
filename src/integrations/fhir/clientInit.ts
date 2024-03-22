import { oauth2 } from 'fhirclient';

import Client from 'fhirclient/lib/Client';
import fhirClientId from "@/auth/fhir/fhirClientId";
import { FhirInitError } from "@/integrations/fhir/FhirInitError";

/**
 * Initializes the smart client. If the URL is a "launch url" coming from the EHR system, that is used, and the resulting
 * authentication token is stored in local browser storage. As part of the initial auth process, this will do a redirect
 * roundtrip to the smart server. When it is not a launch URL, it looks for and uses the auth token stored in browser local
 * storage. If the auth token is not found in local storage, or is expired it will give a "not authorized" error. The
 * user must then reauthenticate by opening the window again from the EHR system to get a new launch url.
 *
 * @param isLaunch set to true when launching a new context in a existing window/tab, to force a re-authentication
 */
export const clientInitInBrowser = async (isLaunch: boolean): Promise<Client> => {
    try {
        if (isLaunch) {
            sessionStorage.clear();
        }

        const client: Client = await oauth2.init({
            clientId: fhirClientId,
            /** SUPPORTED SCOPES
             * openid
             * profile
             * fhirUser
             * launch
             * launch/patient - UNUSED
             * launch/encounter - UNUSED
             * patient/*.*
             * user/*.* - UNUSED
             * offline_access - UNUSED
            **/
            scope: "openid profile fhirUser launch patient/*.*",
            redirectUri: "/"
        });

        const clientInitIsComplete = client.patient.id !== null && client.state.tokenResponse?.access_token !== undefined;
        if (!clientInitIsComplete) {
            // TODO This should not happen according to how i interpret the client doc/code. Looks like some sort of race condition?
            console.warn(`client init not complete. patient id: ${client.patient.id}, token set? ${client.state.tokenResponse?.access_token !== undefined}`)

        }
        return client
    } catch (e) {
        if(e instanceof Error && e.message.startsWith("No server url found. It must be specified")) {
            throw new FhirInitError(e.message)
        } else {
            throw e
        }
    }
}

export const clientCopyWithProxyUrl = (client: Client, proxyUrl: URL): Client =>  {
    const newClientState = {
        ...client.state,
        serverUrl: proxyUrl.toString(),
    }
    return new Client(client.environment, newClientState)
}

// XXX Wanted to create a initOnServer function here, and possibly do some server side rendering. Turned out to be a
// bit difficult. (must create adapter with solution for sharing state storage between server and client(?))
// export const clientInitOnServer = async (authToken: string): Promise<FhirService> => {
// }
