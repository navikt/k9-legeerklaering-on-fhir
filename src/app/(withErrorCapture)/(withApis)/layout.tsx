'use client'

import ChildrenProp from "@/utils/ChildrenProp";
import {useCallback} from "react";
import {configureLogger} from "@navikt/next-logger";
import {useSearchParams} from "next/navigation";
import {oauth2 as SMART} from "fhirclient";
import FhirApiContext from "@/app/(withErrorCapture)/(withApis)/FhirApiContext";
import SelfApiContext from "@/app/(withErrorCapture)/(withApis)/SelfApiContext";
import fhirAuthOptions from "@/auth/fhir/fhirAuthOptions";
import AltLink from "@/app/(withErrorCapture)/(withApis)/alt/AltLink";
import {BaseApi, BaseApiContext, useBaseApi} from "@/app/(withErrorCapture)/(withApis)/BaseApi";
import {SelfClient} from "@/integrations/self/SelfClient";
import {useAsyncInit} from "@/app/hooks/useAsyncInit";
import FhirClientWrapper from "@/integrations/fhir/FhirClientWrapper";
import ProxiedFhirClientWrapper from "@/integrations/fhir/ProxiedFhirClientWrapper";
import {FhirApi} from "@/integrations/fhir/FhirApi";
import {recognizedServers} from "@/integrations/fhir/recognizedServers";
import Client from "fhirclient/lib/Client";

export const dynamic = 'force-dynamic'

configureLogger({
    apiPath: '/api/logger',
})

const Layout = ({children}: ChildrenProp) => {
    const searchParams = useSearchParams()
    const isLaunch = searchParams.has('launch')

    const fhirClientFactory: () => Promise<Client> = useCallback(async () => {
        if (isLaunch) {
            return SMART.init(fhirAuthOptions).then(client => {
                console.info("fhirClient initialized", JSON.stringify(client))
                return client
            })
        } else {
            return SMART.ready().then(client => {
                console.info("fhirClient ready", JSON.stringify(client))
                return client
            })
        }
    }, [isLaunch])

    const fhirApiFactory: () => Promise<FhirApi> = useCallback(async () => {
        const client = await fhirClientFactory()

        const serverUrl = client.state.serverUrl
        console.info("FHIR server url:", serverUrl)

        if (serverUrl === recognizedServers.OPENDIPS_TEST) {
            /* TODO Open DIPS (test) krever at man legger til api-key på kallene,
                derfor er dette en løsning kun for bruk med Open DIPS */
            console.info("Redirecting all traffic through proxy", serverUrl)
            return new ProxiedFhirClientWrapper(client)
        }

        console.info("Direct client initialization from server", serverUrl)
        return new FhirClientWrapper(client)
    }, [fhirClientFactory])

    const fhirApi = useAsyncInit(fhirApiFactory)

    // The SelfClient needs to be able to retrieve the fhir client auth token, so it can pass it to our own server
    const fhirAuthTokenResolver = async () => {
        const fhirClient = await fhirClientFactory()
        return fhirClient.getAuthorizationHeader()
    }
    const selfApi = new SelfClient(fhirAuthTokenResolver)
    const baseApi: BaseApi = useBaseApi(fhirApi)

    return <>
        <FhirApiContext.Provider value={fhirApi}>
            <SelfApiContext.Provider value={selfApi}>
                <BaseApiContext.Provider value={baseApi}>
                    {children}
                </BaseApiContext.Provider>
            </SelfApiContext.Provider>
        </FhirApiContext.Provider>
        <AltLink></AltLink>
    </>
}

export default Layout