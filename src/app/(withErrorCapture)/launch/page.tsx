'use client'

import { useSearchParams } from "next/navigation";
import { clientInitInBrowser } from "@/integrations/fhir/clientInit";
import { useEffect, useState } from "react";
import { isInited, isInitError, isIniting, useAsyncInit } from "@/app/hooks/useAsyncInit";

export const dynamic = 'force-dynamic'

export default function Page() {
    const searchParams = useSearchParams()
    const isLaunch = searchParams.has("launch")
    const fhirClient = useAsyncInit(() => clientInitInBrowser(isLaunch))
    const [userId, setUserId] = useState<string | null>(null)
    const [userResourceType, setUserResourceType] = useState<string>("")

    if(isInited(fhirClient)) {
        setUserId(fhirClient.user.id)
    }

    useEffect(() => {
        if (isInited(fhirClient)) {
            console.debug("fhir release ", fhirClient.getFhirRelease())
            console.debug("fhir version ", fhirClient.getFhirVersion())
            const load = async () => {
                try {
                    const u = await fhirClient.user.read()
                    console.debug("user.read returned", u)
                    setUserResourceType(u.resourceType)
                } catch (e) {
                    console.error("Could not read user", e)
                }
            }
            load()
        }
    }, [fhirClient]);
    return <>
        <h1>Webmed launch test</h1>
        { isIniting(fhirClient) ? <p>Initializing...</p> : null }
        { isInitError(fhirClient) ? <p>Error initializing: {fhirClient.initError.message} </p> : null }
        { isInited(fhirClient) && <>
            <p>
                User id:
                { userId ? <b>{userId}</b> : <b>No user id resolved yet</b>}
            </p>
            <p>
                User resource type:
                { userResourceType }
            </p>
        </>
        }
    </>
}
