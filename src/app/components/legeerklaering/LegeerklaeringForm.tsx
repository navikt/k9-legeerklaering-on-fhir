import React from 'react';
import {
    Alert,
    BodyShort,
    Button,
    Heading,
    HStack,
    ReadMore,
    Textarea,
    TextField,
    useDatepicker,
    VStack
} from '@navikt/ds-react';
import { Controller, SubmitErrorHandler, useForm } from 'react-hook-form';
import Section from '@/app/components/Section';
import { tekst } from '@/utils/tekster';
import HoveddiagnoseSelect from "@/app/components/diagnosekoder/HoveddiagnoseSelect";
import BidiagnoseSelect from "@/app/components/diagnosekoder/BidiagnoseSelect";
import Practitioner from "@/models/Practitioner";
import Patient from "@/models/Patient";
import Hospital from "@/models/Hospital";
import * as yup from "yup";
import { ObjectSchema } from "yup";
import { type Diagnosekode } from "@navikt/diagnosekoder";
import { yupResolver } from "@hookform/resolvers/yup";
import LegeerklaeringData from "@/app/components/legeerklaering/LegeerklaeringData";
import DatePeriod from "@/models/DatePeriod";
import MultiDatePeriodInput from "@/app/components/multidateperiod/MultiDatePeriodInput";
import { logger } from '@navikt/next-logger';
import RelatedPerson from "@/models/RelatedPerson";
import { componentSize } from '@/utils/constants';
import { ChevronRightIcon } from '@navikt/aksel-icons';

export interface EhrInfoLegeerklaeringForm {
    readonly doctor: Practitioner | undefined;
    readonly patient: Patient | undefined;
    readonly hospital: Hospital | undefined;
    onFormSubmit: (data: LegeerklaeringData) => void
}

function undefinedIfNull<T>(something: T | undefined | null): T | undefined {
    if (something === null) {
        return undefined
    }
    return something
}

const diagnosekodeValidation: ObjectSchema<Diagnosekode> = yup.object({
    code: yup.string().required().min(4).max(10),
    text: yup.string().required()
})

const tilsynsPeriodValidation: ObjectSchema<DatePeriod> = yup.object({
    start: yup.date().required("Fra dato er påkrevd"),
    end: yup.date().required("Til dato er påkrevd"),
}).test({
    name: 'datePeriodStartBeforeEnd',
    skipAbsent: true,
    message: `Periode start må være før slutt`,
    test: (period) =>
        period.start === undefined ||
        period.end === undefined ||
        period.start.getTime() <= period.end.getTime()
})

const innleggelsesPeriodValidation: ObjectSchema<DatePeriod> = yup.object({
    start: yup.date().optional(),
    end: yup.date().optional(),
}).test({
    name: 'datePeriodStartBeforeEnd',
    skipAbsent: true,
    message: `Periode start må være før slutt`,
    test: (period) =>
        period.start === undefined ||
        period.end === undefined ||
        period.start.getTime() <= period.end.getTime()
})

const caretakerValidation: ObjectSchema<RelatedPerson> = yup.object({
    name: yup.string().required(`Omsorgsperson navn påkrevd`),
    ehrId: yup.string().required(`Omsorgsperson ehrId påkrevd`),
    fnr: yup.string().nullable().required()
})

const schema: ObjectSchema<LegeerklaeringData> = yup.object({
    barn: yup.object({
        name: yup.string().trim()
            .required(tekst("legeerklaering.om-barnet.navn.paakrevd"))
            .min(3, ({min}) => `Minimum ${min} tegn må skrives inn`)
            .max(150, ({max}) => `Maks ${max} tegn tillatt`),
        fnr: yup.string().trim()
            .required(tekst("legeerklaering.om-barnet.ident.paakrevd"))
            .min(11, ({min}) => `Må vere minimum ${min} tegn`)
            .max(40, ({max, value}) => `Maks ${max} tegn tillatt (${value.length})`),
        ehrId: yup.string().required("ehrId må eksistere"),
        birthDate: yup.date().required(tekst("legeerklaering.om-barnet.foedselsdato.paakrevd")),
        caretakers: yup.array().of(caretakerValidation).default([])
    }),
    lege: yup.object({
        ehrId: yup.string().required("legens epj systemid er påkrevd"),
        hprNumber: yup.string().required(tekst("legeerklaering.om-legen.hpr-nummer.paakrevd")),
        name: yup.string().required(tekst("legeerklaering.om-legen.navn.paakrevd")),
        activeSystemUser: yup.boolean().required("legens systemstatus (aktiv) er påkrevd")
    }),
    sykehus: yup.object({
        ehrId: yup.string().optional(),
        organizationNumber: yup.string().optional(),
        name: yup.string().trim().required(tekst("legeerklaering.om-sykehuset.navn.paakrevd")),
        phoneNumber: yup.string().trim().required(tekst("legeerklaering.om-sykehuset.tlf.paakrevd")),
        address: yup.object({
            line1: yup.string().trim().required(tekst("legeerklaering.om-sykehuset.gateadresse.paakrevd")),
            line2: yup.string().trim().optional(),
            postalCode: yup.string()
                .required(tekst("legeerklaering.om-sykehuset.postnummer.paakrevd"))
                .min(4, ({min}) => `Må være minimum ${min} siffer`)
                .max(5, ({max}) => `Kan være maks ${max} siffer`)
                .matches(/^[0-9]{4,5}$/, oops => `Bare tall tillat ${oops.label}`),
            city: yup.string().required(tekst("legeerklaering.om-sykehuset.poststed.paakrevd")),
        }).required()
    }),
    hoveddiagnose: diagnosekodeValidation.optional().default(undefined),
    bidiagnoser: yup.array().of(diagnosekodeValidation).required(),
    legensVurdering: yup.string().trim().required(tekst("legeerklaering.legens-vurdering.barn.paakrevd")),
    vurderingAvOmsorgspersoner: yup.string().trim().required(tekst("legeerklaering.legens-vurdering.omsorgsperson.paakrevd")),
    tilsynPerioder: yup.array().of(tilsynsPeriodValidation).min(1, ({min}) => `Minimum ${min} periode må spesifiseres`).required(),
    innleggelsesPerioder: yup.array().of(innleggelsesPeriodValidation).optional()
})

export default function LegeerklaeringForm({doctor, hospital, onFormSubmit, patient}: EhrInfoLegeerklaeringForm) {
    const {
        control,
        register,
        setValue,
        handleSubmit,
        formState: {errors, defaultValues},
    } = useForm<LegeerklaeringData>({
        resolver: yupResolver(schema),
        defaultValues: {
            barn: {
                name: patient?.name,
                ehrId: patient?.ehrId,
                fnr: patient?.fnr,
                birthDate: patient?.birthDate,
            },
            lege: {
                hprNumber: doctor?.hprNumber,
                name: doctor?.name,
                activeSystemUser: doctor?.activeSystemUser || false,
                ehrId: doctor?.ehrId,
            },
            sykehus: {
                name: hospital?.name,
                phoneNumber: hospital?.phoneNumber,
                address: {
                    line1: hospital?.address?.line1,
                    line2: hospital?.address?.line2,
                    postalCode: hospital?.address?.postalCode,
                    city: hospital?.address?.city,
                }
            },
            hoveddiagnose: undefined,
            bidiagnoser: [],
            legensVurdering: undefined,
            vurderingAvOmsorgspersoner: undefined,
            tilsynPerioder: [{
                start: undefined,
                end: undefined,
            }],
            innleggelsesPerioder: [{
                start: undefined,
                end: undefined,
            }]
        }
    })

    const {
        datepickerProps: barnFoedselDatepickerProps,
        inputProps: barnFoedselsInputProps
    } = useDatepicker({
        defaultSelected: patient?.birthDate,
        onDateChange: (dato) => {
            setValue('barn.birthDate', dato, {shouldDirty: true, shouldTouch: true, shouldValidate: true})
        }
    });

    const onSubmit = (data: LegeerklaeringData) => {
        onFormSubmit(data)
    };

    const onError: SubmitErrorHandler<LegeerklaeringData> = errors => {
        logger.warn("form validation errors", errors)
    }

    const erOver18 = (fødselsdato: Date | undefined): boolean => {
        if (!fødselsdato) {
            return false;
        }

        const idag = new Date();
        const attenÅrSiden = new Date(idag.getFullYear() - 18, idag.getMonth(), idag.getDate());
        return fødselsdato <= attenÅrSiden;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)}>
            {erOver18(defaultValues?.barn?.birthDate) && <VStack className="mt-4" gap="4">
                <Alert variant="warning">
                    <Heading size="small">Obs! Pasienten er over 18 år</Heading>
                    <BodyShort size="small">
                        Du må inkludere i vurderingen av barnets tilstand om pasienten er utviklingshemmet i tillegg til
                        svært alvorlig eller livstruende syk.
                    </BodyShort>
                    <br/>
                </Alert>
            </VStack>
            }

            <Section>
                <TextField
                    size={componentSize}
                    label={tekst("legeerklaering.om-barnet.tittel")}
                    readOnly
                    defaultValue={`${defaultValues?.barn?.name} (${defaultValues?.barn?.fnr})`}
                    className="w-1/2"
                />
            </Section>

            <Section>
                <Textarea
                    size={componentSize}
                    label={tekst("legeerklaering.legens-vurdering.barn.label")}
                    description={
                        <ReadMore size={componentSize}
                                  header={tekst("legeerklaering.legens-vurdering.barn.les-mer.tittel")}>
                            {tekst("legeerklaering.legens-vurdering.barn.les-mer.tekst")}
                        </ReadMore>
                    }
                    {...register("legensVurdering", {required: true})}
                    error={errors.legensVurdering?.message}
                    minRows={5}
                />
            </Section>

            <Section>
                <Textarea
                    size={componentSize}
                    label={tekst("legeerklaering.legens-vurdering.omsorgsperson.label")}
                    description={
                        <ReadMore size={componentSize}
                                  header={tekst("legeerklaering.legens-vurdering.omsorgsperson.les-mer.tittel")}>
                            {tekst("legeerklaering.legens-vurdering.omsorgsperson.les-mer.tekst")}
                        </ReadMore>
                    }
                    {...register("vurderingAvOmsorgspersoner", {required: true})}
                    error={errors.vurderingAvOmsorgspersoner?.message}
                    minRows={5}
                />
            </Section>

            <Section>
                <Controller
                    control={control}
                    name="hoveddiagnose"
                    render={({field: {onChange, value}}) => (
                        <HoveddiagnoseSelect className="mb-4" value={value} onChange={onChange}
                                             error={errors.hoveddiagnose?.message}/>
                    )}
                />

                <Controller
                    control={control}
                    name="bidiagnoser"
                    render={({field: {onChange, value}}) => (
                        <BidiagnoseSelect className="mb-4" value={value} onChange={onChange}
                                          error={errors.bidiagnoser?.message}/>
                    )}
                />
            </Section>

            <Section
                title={tekst("legeerklaering.innleggelse-varighet.tittel")}
            >
                <Controller
                    control={control}
                    name="innleggelsesPerioder"
                    render={({field: {onChange, value}}) => (
                        <MultiDatePeriodInput
                            value={value ?? []}
                            onChange={onChange}
                            error={errors.innleggelsesPerioder?.message}
                            valueErrors={errors.innleggelsesPerioder?.map?.(e => e?.start?.message || e?.end?.message || e?.message)}
                        />
                    )}
                />
            </Section>

            <Section
                title={tekst("legeerklaering.tilsyn-varighet.tittel")}
            >
                <Controller
                    control={control}
                    name="tilsynPerioder"
                    render={({field: {onChange, value}}) => (
                        <MultiDatePeriodInput
                            value={value}
                            onChange={onChange}
                            error={errors.tilsynPerioder?.message}
                            valueErrors={errors.tilsynPerioder?.map?.(e => e?.start?.message || e?.end?.message || e?.message)} // maps validation errors to the correct input row in MultiDatePeriodInput
                        />
                    )}
                />
            </Section>

            <VStack className="mt-8" gap={"4"}>
                <HStack>
                    <Button
                        size={componentSize}
                        type="submit"
                        icon={<ChevronRightIcon aria-hidden/>}
                        iconPosition="right"
                    >
                        Til oppsummering
                    </Button>
                </HStack>
            </VStack>
        </form>
    )
}
