import {oauth2 as SMART} from "fhirclient";
import {useEffect, useState} from "react";
import Client from "fhirclient/lib/Client";
import {useSearchParams} from "next/navigation";
import fhirAuthOptions from "@/auth/fhir/fhirAuthOptions";

export function useFhirClient() {
    const [fhirClient, setFhirClient] = useState<Client | null>(null)
    const searchParams = useSearchParams()
    const isLaunch = searchParams.has('launch')

    useEffect(() => {
        const initializeClient = async () => {
            if (isLaunch) {
                const client = await SMART.init(fhirAuthOptions)
                console.info("fhirClient initialized", JSON.stringify(client))
                setFhirClient(client)
            } else {
                const client = await SMART.ready()
                console.info("fhirClient ready", JSON.stringify(client))
                setFhirClient(client)
            }
        }
        initializeClient();
    }, [isLaunch]);

    return fhirClient;
}