import { LegeerklaeringTekster } from '@/app/components/legeerklaering/legeerklaering-tekster';
import { LegeerklaeringOppsummeringTekster } from '@/app/components/legeerklaering/legeerklaering-oppsummering-tekster';


const tekster = {
    ...LegeerklaeringTekster,
    ...LegeerklaeringOppsummeringTekster
}

export const tekst = (tekst: keyof typeof tekster): string => {
    const verdi = tekster[tekst]
    if (verdi === undefined) {

        return undefined as any
    }
    return verdi
}

export const getLedetekst = (text: string, data: any): string => {
    if (text === undefined || data === undefined) {
        return ''
    }
    let newtext = text
    Object.keys(data).forEach((key) => {
        const regex = new RegExp(key, 'g')
        newtext = newtext.replace(regex, data[key])
    })
    return newtext
}
