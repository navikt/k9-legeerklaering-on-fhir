import LegeerklaeringDokument from "@/models/LegeerklaeringDokument";
import { PSBLegeerklæringInnsending, Navn } from "@/integrations/helseopplysningerserver/types/HelseopplysningerTypes";


const somNavn = (navn: string): Navn => {
    const navnArray = navn.split(",");
    return {
        fornavn: navnArray[1],
        etternavn: navnArray[0],
    };
};

export const mapTilPSBLegeerklæringInnsending = (data: LegeerklaeringDokument): PSBLegeerklæringInnsending => {
    return ({
        legeerklæring: {
            dokumentReferanse: data.dokumentReferanse,
            pasient: {
                navn: somNavn(data.barn.name),
                id: data.barn.fnr!!,
                fødselsdato: data.barn.birthDate!!,
            },
            vurderingAvBarnet: data.vurderingAvBarnet,
            vurderingAvOmsorgspersoner: data.vurderingAvOmsorgspersoner,
            hoveddiagnose: {
                term: data.hoveddiagnose?.text!!,
                kode: data.hoveddiagnose?.code!!,
            },
            bidiagnoser: data.bidiagnoser.map(bidiagnose => ({
                term: bidiagnose.text,
                kode: bidiagnose.code,
            })),
            tilsynsPeriode: {
                fom: data.tilsynPeriode.start!!,
                tom: data.tilsynPeriode.end!!,
            },
            innleggelsesPerioder: data.innleggelsesPerioder
                .filter(innleggelse => Object.keys(innleggelse).length > 0)
                .map(innleggelse => ({
                    fom: innleggelse.start!!,
                    tom: innleggelse.end!!,
                }))
        },
        lege: {
            navn: somNavn(data.lege.name),
            hpr: data.lege.hprNumber!,
        },
        sykehus: {
            navn: data.sykehus.name,
            telefonnummer: data.sykehus.phoneNumber!!,
            adresse: {
                gateadresse: data.sykehus.address?.line1!!,
                gateadresse2: data.sykehus.address?.line2,
                postkode: data.sykehus.address?.postalCode!!,
                by: data.sykehus.address?.city!!,
            }
        }
    } );
};
