import 'server-only';
import { HelseopplysningerApi } from "@/integrations/helseopplysningerserver/HelseopplysningerApi";
import { getServerEnv } from "@/utils/env";
import { PSBLegeerklæringInnsending } from "@/integrations/helseopplysningerserver/types/HelseopplysningerTypes";
import getServerHelseToken from "@/auth/azure/getServerHelseToken";

export default class HelseopplysningerClient implements HelseopplysningerApi {
    async generatePdf(innsending: PSBLegeerklæringInnsending): Promise<Blob> {
        const helseopplysningerBaseUrl = getServerEnv().HELSEOPPLYSNINGER_SERVER_BASE_URL

        const tokenSet = await getServerHelseToken();

        const pdfResponse = await fetch(`${helseopplysningerBaseUrl}/pdf/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenSet.access_token}`
            },
            body: JSON.stringify(innsending)
        })
        if (pdfResponse.ok) {
            return await pdfResponse.blob()
        } else {
            throw new Error(`Unexpected status code when generating pdf (${pdfResponse.status} - ${pdfResponse.statusText}).`, {
                cause: await pdfResponse.text()
            })
        }
    }
}