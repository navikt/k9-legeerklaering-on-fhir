'use client';

import {Heading} from '@navikt/ds-react';
import Header from '@/app/components/Header';
import React, {useEffect, useState} from 'react';
import LegeerklaeringForm, {EhrInfoLegeerklaeringForm} from '@/app/components/legeerklaering/LegeerklaeringForm';
import {clientInitInBrowser} from "@/integrations/fhir/clientInit";
import AboutExpansionCard from "@/app/components/legeerklaering/AboutExpansionCard";
import ErrorDisplay from "@/app/components/legeerklaering/ErrorDisplay";
import LoadingIndicator from "@/app/components/legeerklaering/LoadingIndicator";
import ContactInfoSection from "@/app/components/legeerklaering/ContactInfoSection";
import type NextPageProps from "@/utils/NextPageProps";


interface PageState extends EhrInfoLegeerklaeringForm {
    readonly loading: boolean;
    readonly error: Error | null;
}

export default function Home({searchParams}: NextPageProps) {
    const [state, setState] = useState<PageState>({
        loading: true,
        error: null,
        doctor: undefined,
        patient: undefined,
        hospital: undefined,
    })
    useEffect(() => {
        const fetchFun = async () => {
            try {
                // If url has query argument "iss" set, this is a new launch from EHR system, so force a reauthorization.
                const reAuth = searchParams["iss"] !== undefined;
                const api = await clientInitInBrowser(reAuth)
                const [doctor, patient, hospital] = await Promise.all([api.getDoctor(), api.getPatient(), api.getHospital()]);
                setState(state => ({
                    loading: state.loading,
                    doctor,
                    patient,
                    hospital,
                    error: null,
                }))
            } catch (e) {
                if(e instanceof Error) {
                    const error: Error = e;
                    setState(state => ({...state, error}));
                } else {
                    setState(state => ({...state, error: new Error(`${e}`)}))
                }
            } finally {
                setState(state => ({...state, loading: false}))
            }
        }
        fetchFun()
        return;
    }, [])

    return (
        <div>
            <Header doctor={state.doctor}/>
            <div className="mx-auto mt-16 max-w-4xl p-4 pb-32 ">
                <Heading level="1" size="xlarge">Legeerklæring - pleiepenger sykt barn</Heading>
                <AboutExpansionCard />
                {
                    state.error ?
                        <ErrorDisplay heading="Feil ved lasting av EHR info" error={state.error} /> :
                        state.loading ? <LoadingIndicator /> :
                            <LegeerklaeringForm doctor={state.doctor} patient={state.patient} hospital={state.hospital} />
                }
                <ContactInfoSection />
            </div>
        </div>
    )
}
