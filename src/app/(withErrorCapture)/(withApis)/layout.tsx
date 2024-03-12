'use client'

import ChildrenProp from "@/utils/ChildrenProp";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { clientInitInBrowser } from "@/integrations/fhir/clientInit";
import { useAsyncInit } from "@/app/hooks/useAsyncInit";
import FhirApiContext from "@/app/(withErrorCapture)/(withApis)/FhirApiContext";
import { configureLogger } from "@navikt/next-logger";
import { initFakeFhirApi1 } from "@/app/simulation/fakeFhirApi1";
import { clearFakeFhirApiName, FakeFhirApiName, getFakeFhirApiName, } from "@/app/simulation/fakeFhirApiFlag";
import AltLink from "@/app/(withErrorCapture)/(withApis)/alt/AltLink";
import SimulationIndicator from "@/app/components/simulation/SimulationIndicator";
import SelfApiContext from "@/app/(withErrorCapture)/(withApis)/SelfApiContext";
import { SelfClient } from "@/integrations/self/SelfClient";
import Client from "fhirclient/lib/Client";
import { FhirApi } from "@/integrations/fhir/FhirApi";
import ProxiedFhirClientWrapper from "@/integrations/fhir/ProxiedFhirClientWrapper";
import { recognizedServers } from "@/integrations/fhir/recognizedServers";
import FhirClientWrapper from "@/integrations/fhir/FhirClientWrapper";
import { BaseApi, BaseApiContext, useBaseApi } from "@/app/(withErrorCapture)/(withApis)/BaseApi";

export const dynamic = 'force-dynamic'

configureLogger({
    apiPath: '/api/logger',
})


const Layout = ({children}: ChildrenProp) => {
    const searchParams = useSearchParams()
    const isLaunch = searchParams.has("launch")
    const fakeFhirApiName = useRef<FakeFhirApiName | null>(null)
    useEffect(() => {
        if(!isLaunch) {
            fakeFhirApiName.current = getFakeFhirApiName()
        } else {
            clearFakeFhirApiName()
        }
    }, [isLaunch])

    // This callback can create the raw fhirclient instance
    const fhirClientFactory: () => Promise<Client> = useCallback(() => {
        return clientInitInBrowser(isLaunch)
    }, [isLaunch])
    // This callback can create a FhirApi instance, real or fake
    const fhirApiFactory: () => Promise<FhirApi> = useCallback(() => {
        if (fakeFhirApiName.current === "fake1") {
            return initFakeFhirApi1()
        } else {
            return fhirClientFactory().then(client => {
                const serverUrl = client.state.serverUrl
                console.debug("========== fhirClientFactory, serverUrl ", serverUrl)
                if(client.state.serverUrl === recognizedServers.WEBMED_TEST) {
                    return new FhirClientWrapper(client)
                }
                return new ProxiedFhirClientWrapper(client)
            })
        }
    }, [fhirClientFactory, fakeFhirApiName])

    const fhirApi = useAsyncInit(fhirApiFactory)

    // The SelfClient needs to be able to retrieve the fhir client auth token so it can pass it to our own server
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
        <SimulationIndicator simulationName={fakeFhirApiName.current ||undefined}/>
    </>
}

export default Layout