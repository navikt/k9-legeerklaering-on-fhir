import { oauth2 } from 'fhirclient';

import Client from 'fhirclient/lib/Client';
import fhirClientId from "@/auth/fhir/fhirClientId";
import { FhirInitError } from "@/integrations/fhir/FhirInitError";

/**
 * Initializes the smart client. If the URL is a "launch url" coming from the EHR system, that is used, and the resulting
 * authentication token is stored in local browser storage. As part of the initial auth process, this will do a redirect
 * round trip to the smart server. When it is not a launch URL, it looks for and uses the auth token stored in browser local
 * storage. If the auth token is not found in local storage, or is expired it will give a "not authorized" error. The
 * user must then reauthenticate by opening the window again from the EHR system to get a new launch url.
 *
 * Supported FHIR scopes can be found [here](https://build.fhir.org/ig/HL7/smart-app-launch/scopes-and-launch-context.html#app-launch-scopes-and-launch-context)
 *
 * @param isLaunch set to true when launching a new context in an existing window/tab, to force a re-authentication
 */
export const clientInitInBrowser = async (isLaunch: boolean): Promise<Client> => {
    try {
        if (isLaunch) {
            sessionStorage.clear();
        }

        const client: Client = await oauth2.init({
            clientId: fhirClientId,
            scope: "openid profile fhirUser launch patient/*.read",
            redirectUri: "/"
        });

        // TODO replace with FHIR.oauth2.ready()
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
