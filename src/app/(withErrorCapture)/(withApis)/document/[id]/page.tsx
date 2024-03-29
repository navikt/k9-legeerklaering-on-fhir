'use client'
import FhirApiContext from "@/app/(withErrorCapture)/(withApis)/FhirApiContext";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { isInited, isInitError, isIniting } from "@/app/hooks/useAsyncInit";
import { Alert, BodyShort, Box, Heading, VStack } from "@navikt/ds-react";
import { BaseApiContext } from "@/app/(withErrorCapture)/(withApis)/BaseApi";
import TopBar from "@/app/components/topbar/TopBar";
import NavNextLink from "@/app/components/NavNextLink";
import LoadingIndicator from "@/app/components/legeerklaering/LoadingIndicator";
import PdfIframe from "@/app/(withErrorCapture)/(withApis)/document/[id]/PdfIframe";
import CenterColumn from "@/app/components/CenterColumn";

export default function DocumentViewPage({params}: {params: {id: string}}) {
    const fhirApi = useContext(FhirApiContext)
    const baseApi = useContext(BaseApiContext)
    const [pdfBlob, setPdfBlob] = useState<Blob | undefined>()

    const loadDocument = useCallback(async() => {
        if (isInited(fhirApi)) {
            // XXX Consider try/catch to get local error handling
            setPdfBlob(await fhirApi.getDocumentPdf(params.id))
        } else if(isInitError(fhirApi)) {
            throw fhirApi.initError
        }
    }, [fhirApi, params])

    useEffect(() => {
        loadDocument()
    }, [loadDocument]);

    const reload = async () => {
        await Promise.all([baseApi.refreshInitData(), loadDocument()])
    }

    return <VStack>
        <TopBar
            loading={baseApi.loading !== false || isIniting(fhirApi)}
            reload={reload}
            user={baseApi.initData?.practitioner}
        />
        <CenterColumn>
            <VStack gap="6">
                <Alert variant="success">
                    <Heading size="medium">Legeerklæring lagret</Heading>
                    <BodyShort size="small" spacing>Legeerklæringen er nå lagret i pasientens journal.</BodyShort>
                </Alert>
                <Alert variant="info">
                    <BodyShort size="small" spacing>Husk at den/de som skal søke om pleiepenger må få den overlevert elektronisk
                        eller via papirutskrift, slik at den kan legges ved søknad til NAV.</BodyShort>
                    <BodyShort size="small" spacing>Pdf vises under i tilfelle du ønsker å skrive den ut med en gang.</BodyShort>
                </Alert>
                <Box className="flex justify-center">
                    Lukk fanen, eller gå&nbsp;<NavNextLink href="/">til ny utfylling</NavNextLink>
                </Box>
            </VStack>
                <Heading size="small">Lagret PDF:</Heading>
            {
                pdfBlob !== undefined ?
                    <PdfIframe pdf={pdfBlob} width="100%" height="1250px"/> :
                    <LoadingIndicator txt="Henter PDF" />
            }
        </CenterColumn>
    </VStack>
}