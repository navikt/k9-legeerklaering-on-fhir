import React, { useContext } from 'react';
import { FHIRContext } from '@/app/context/FHIRContext';
import {
    BodyLong,
    Button,
    DatePicker,
    Link,
    ReadMore,
    Select,
    Textarea,
    TextField,
    useDatepicker
} from '@navikt/ds-react';
import { useForm } from 'react-hook-form';
import Section from '@/app/components/Section';
import { tekst } from '@/utils/tekster';

type Periode = {
    fra: Date;
    til: Date;
}

type Diagnose = {
    kode: string;
    term: string;
}

type Barn = {
    navn: string;
    ident: string;
    foedselsdato: Date;
}

type Lege = {
    navn: string;
    hrpNummer: string;
}

type Adresse = {
    gate: string;
    postnummer: string;
    poststed: string;
}

type Sykehus = {
    navn: string;
    telefon: string;
    adresse: Adresse;
}

type LegeerklaeringFormData = {
    barn: Barn;
    legensVurdering: string;
    hoveddiagnose: Diagnose;
    hoveddiagnosekode: string;
    bidiagnoser: Diagnose[];
    tilsynPeriode: Periode;
    innleggelsesPeriode: Periode;
    lege: Lege;
    sykehus: Sykehus;
};

export default function Legeerklaering() {
    const {datepickerProps, inputProps} = useDatepicker({
        today: new Date()
    });

    const {patient, practitioner, client} = useContext(FHIRContext);

    const {
        register,
        handleSubmit,
        formState: {errors}
    } = useForm<LegeerklaeringFormData>();

    const diagnoser: Diagnose[] = [
        {
            kode: "A00",
            term: "Kolera"
        },
        {
            kode: "A01",
            term: "Tyfoid- og paratyfoidfeber"
        },
        {
            kode: "A02",
            term: "Andre salmonellose"
        }
    ];


    const onSubmit = (data: any) => {
        console.log(data);
    };

    const pasientNavn = patient?.name?.pop();
    const pasientensFulleNavn = pasientNavn !== undefined ? `${pasientNavn?.family}, ${pasientNavn?.given?.pop()}` : "";

    const legensNavn = practitioner?.name?.pop();
    const legensFulleNavn = legensNavn !== undefined ? `${legensNavn?.family}, ${legensNavn?.given?.pop()}` : "";

    return <form onSubmit={handleSubmit(onSubmit)}>
        <>
            <Section
                title={tekst("legeerklaering.om-barnet.tittel")}
                helpText={tekst("legeerklaering.om-barnet.hjelpetekst")}
            >
                <TextField
                    label={tekst("legeerklaering.felles.navn.label")}
                    defaultValue={pasientensFulleNavn}
                    {...register("barn.navn", {required: true})}
                    error={errors.barn?.navn ? tekst("legeerklaering.om-barnet.navn.paakrevd") : ""}
                    className="w-1/2 mb-4"
                />
                <div className="mb-4">
                    <TextField
                        label={tekst("legeerklaering.om-barnet.ident.label")}
                        {...register("barn.ident", {required: true})}
                        error={errors.barn?.ident ? tekst("legeerklaering.om-barnet.ident.paakrevd") : ""}
                        className="w-1/2 mb-4"
                    />
                    <DatePicker{...datepickerProps}>
                        <DatePicker.Input
                            label={tekst("legeerklaering.om-barnet.foedselsdato.label")}
                            {...inputProps}
                            {...register("barn.foedselsdato", {required: true})}
                            error={errors.barn?.foedselsdato ? tekst("legeerklaering.om-barnet.foedselsdato.paakrevd") : ""}
                        />
                    </DatePicker>
                </div>
            </Section>

            <Section
                title={tekst("legeerklaering.legens-vurdering.tittel")}
                helpText={tekst("legeerklaering.legens-vurdering.hjelpetekst")}
            >
                <ReadMore
                    size='small'
                    header={tekst("legeerklaering.legens-vurdering.les-mer.tittel")}
                    className="mb-8">
                    {tekst("legeerklaering.legens-vurdering.les-mer.tekst")}
                </ReadMore>
                <Textarea
                    label={tekst("legeerklaering.legens-vurdering.label")}
                    {...register("legensVurdering", {required: true})}
                    error={errors.legensVurdering ? tekst("legeerklaering.legens-vurdering.paakrevd") : ""}
                    minRows={10}
                />
            </Section>

            <Section
                title={tekst("legeerklaering.diagnose.tittel")}
                helpText={tekst("legeerklaering.diagnose.hjelpetekst")}
            >
                <Select
                    label={tekst("legeerklaering.diagnose.hoveddiagnose.label")}
                    {...register("hoveddiagnosekode", {required: true})}
                    error={errors.hoveddiagnosekode ? tekst("legeerklaering.diagnose.hoveddiagnose.paakrevd") : ""}
                    className="w-1/2 mb-4"
                >
                    {diagnoser.map((diagnose) => (
                        <option key={diagnose.kode}
                                value={diagnose.term}>{diagnose.kode} - {diagnose.term}</option>
                    ))}
                </Select>

                <Select
                    label={tekst("legeerklaering.diagnose.bidiagnoser.label")}
                    {...register("bidiagnoser", {required: true})}
                    error={errors.bidiagnoser ? tekst("legeerklaering.diagnose.bidiagnoser.paakrevd") : ""}
                    className="w-1/2 mb-4"
                >
                    {diagnoser.map((diagnose) => (
                        <option key={diagnose.kode}
                                value={diagnose.term}>{diagnose.kode} - {diagnose.term}</option>
                    ))}
                </Select>
            </Section>

            <Section
                title={tekst("legeerklaering.tilsyn-varighet.tittel")}
                helpText={tekst("legeerklaering.tilsyn-varighet.hjelpetekst")}
            >
                <div className="flex space-x-4">
                    <DatePicker{...datepickerProps}>
                        <DatePicker.Input
                            label={tekst("legeerklaering.tilsyn-varighet.fom.label")}
                            {...inputProps}
                            {...register("tilsynPeriode.fra", {required: true})}
                            error={errors.tilsynPeriode?.fra ? tekst("legeerklaering.tilsyn-varighet.fom.paakrevd") : ""}
                        />
                    </DatePicker>
                    <DatePicker{...datepickerProps}>
                        <DatePicker.Input
                            label={tekst("legeerklaering.tilsyn-varighet.tom.label")}
                            {...inputProps}
                            {...register("tilsynPeriode.til", {required: true})}
                            error={errors.tilsynPeriode?.til ? tekst("legeerklaering.tilsyn-varighet.tom.paakrevd") : ""}
                        />
                    </DatePicker>
                </div>
            </Section>

            <Section title={tekst("legeerklaering.innleggelse-varighet.tittel")}>
                <div className="flex space-x-4">
                    <DatePicker{...datepickerProps}>
                        <DatePicker.Input
                            label={tekst("legeerklaering.innleggelse-varighet.fom.label")}
                            {...inputProps}
                            {...register("tilsynPeriode.fra", {required: true})}
                            error={errors.innleggelsesPeriode?.fra ? tekst("legeerklaering.innleggelse-varighet.fom.paakrevd") : ""}
                        />
                    </DatePicker>
                    <DatePicker{...datepickerProps}>
                        <DatePicker.Input
                            label={tekst("legeerklaering.innleggelse-varighet.tom.label")}
                            {...inputProps}
                            {...register("tilsynPeriode.til", {required: true})}
                            error={errors.tilsynPeriode?.til ? tekst("legeerklaering.innleggelse-varighet.tom.paakrevd") : ""}
                        />
                    </DatePicker>
                </div>
            </Section>

            <Section title={tekst("legeerklaering.om-legen.tittel")}>
                <TextField
                    defaultValue={legensFulleNavn}
                    label={tekst("legeerklaering.felles.navn.label")}
                    {...register("lege.navn", {required: true})}
                    error={errors.lege?.navn ? tekst("legeerklaering.om-legen.navn.paakrevd") : ""}
                    className="mb-4 w-1/2"
                />
                <TextField
                    label={tekst("legeerklaering.om-legen.hrp-nummer.label")}
                    {...register("lege.hrpNummer", {required: true})}
                    error={errors.lege?.hrpNummer ? tekst("legeerklaering.om-legen.hrp-nummer.paakrevd") : ""}
                    className="w-1/2"
                />
            </Section>

            <Section title="Opplysninger om sykehuset">
                <div className="flex space-x-4 mb-4">
                    <TextField
                        label={tekst("legeerklaering.felles.navn.label")}
                        {...register("sykehus.navn", {required: true})}
                        error={errors.sykehus?.navn ? tekst("legeerklaering.om-sykuset.navn.paakrevd") : ""}
                        className="w-1/2"
                    />
                    <TextField
                        label={tekst("legeerklaering.om-sykuset.tlf.label")}
                        type="tel"
                        {...register("sykehus.telefon", {required: true})}
                        error={errors.sykehus?.telefon ? tekst("legeerklaering.om-sykuset.tlf.paakrevd") : ""}
                        className="w-1/3"
                    /></div>
                <TextField
                    label={tekst("legeerklaering.om-sykuset.gateadresse.label")}
                    {...register("sykehus.adresse.gate", {required: true})}
                    error={errors.sykehus?.adresse?.gate ? tekst("legeerklaering.om-sykuset.gateadresse.paakrevd") : ""}
                    className="mb-4"
                />
                <div className="flex mb-4 space-x-4">
                    <TextField
                        label={tekst("legeerklaering.om-sykuset.postnummer.label")}
                        {...register("sykehus.adresse.postnummer", {required: true})}
                        error={errors.sykehus?.adresse?.postnummer ? tekst("legeerklaering.om-sykuset.postnummer.paakrevd") : ""}
                        className="w-1/4"
                    />
                    <TextField
                        label={tekst("legeerklaering.om-sykuset.poststed.label")}
                        type="number"
                        max={9999}
                        {...register("sykehus.adresse.poststed", {required: true})}
                        error={errors.sykehus?.adresse?.poststed ? tekst("legeerklaering.om-sykuset.poststed.paakrevd") : ""}
                        className="w-1/2"
                    />
                </div>
            </Section>

            <div className="ml-4 mt-4 mb-16"><Button type="submit">Registrer</Button></div>

            <Section title="Kontakt oss">
                <BodyLong>
                    Har du flere spørsmål eller behov for mer veiledning? Her finner du mer <Link
                    target="_blank"
                    href="https://www.nav.no/samarbeidspartner/pleiepenger-barn#legeerklering-pleiepenger"> informasjon
                    for helsepersonell om pleiepenger for sykt barn</Link>. Du kan også ringe oss på
                    telefon
                    55 55 33 36.
                </BodyLong>
            </Section>
        </>
    </form>
}
