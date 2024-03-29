interface AddresseInfo {
    gateadresse: string;
    gateadresse2?: string;
    postkode: string;
    by: string;
}

interface Diagnose {
    term: string;
    kode: string;
}

export interface PSBLegeerklæringInnsending {
    legeerklæring: PSBLegeerklæring;
    lege: Lege;
    sykehus: Sykehus;
}

interface Lege {
    navn: Navn;
    hpr: string;
}

export interface Navn {
    fornavn: string;
    etternavn: string;
}

export interface PSBLegeerklæring {
    readonly dokumentReferanse: string;
    pasient: Pasient;
    vurderingAvBarnet: string;
    vurderingAvOmsorgspersoner?: string;
    hoveddiagnose: Diagnose;
    bidiagnoser: Diagnose[];
    tilsynsPeriode: Periode;
    innleggelsesPerioder: Periode[];
}

interface Sykehus {
    navn: string;
    telefonnummer: string;
    adresse: AddresseInfo;
}

interface Pasient {
    navn: Navn;
    id: string;
    fødselsdato: Date;
}

interface Periode {
    fom: Date;
    tom: Date;
}
